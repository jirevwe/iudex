// Iudex - Database Client
// PostgreSQL connection pool with query execution and error handling

import pg from 'pg';
import { getLogger } from '../core/logger.js';

const { Pool } = pg;
const logger = getLogger().child({ module: 'database' });

export class DatabaseClient {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'iudex',
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD,
      ssl: config.ssl !== undefined ? config.ssl : false,
      max: config.poolSize || 10,
      idleTimeoutMillis: config.keepAliveTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000,
    };

    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize the connection pool
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      this.pool = new Pool(this.config);

      // Test connection
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error({ error: err.message, stack: err.stack }, 'Unexpected database pool error');
      });

    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to connect to database');
      throw error;
    }
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Object} - {rows, duration, rowCount}
   */
  async query(text, params = []) {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;

      return {
        rows: res.rows,
        duration,
        rowCount: res.rowCount
      };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error({
        error: error.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        stack: error.stack
      }, 'Database query error');
      throw error;
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param {Function} callback - Async function that receives a client
   */
  async transaction(callback) {
    if (!this.isConnected) {
      await this.connect();
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if the database is healthy
   * @returns {boolean}
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length === 1 && result.rows[0].health === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get pool statistics
   * @returns {Object}
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  /**
   * Close the connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
    }
  }
}

/**
 * Create and connect a database client
 * @param {Object} config - Database configuration
 * @returns {DatabaseClient}
 */
export async function createClient(config) {
  const client = new DatabaseClient(config);
  await client.connect();
  return client;
}
