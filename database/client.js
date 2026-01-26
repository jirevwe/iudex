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

    // Retry configuration
    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.retryBaseDelay || 100, // ms
      maxDelay: config.retryMaxDelay || 2000, // ms
      retryOnConstraintViolation: config.retryOnConstraintViolation !== false,
      retryOnDeadlock: config.retryOnDeadlock !== false
    };

    this.pool = null;
    this.isConnected = false;

    // Metrics for monitoring
    this.metrics = {
      transactionCount: 0,
      rollbackCount: 0,
      retryCount: 0,
      constraintViolationCount: 0,
      deadlockCount: 0
    };
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
   * Sleep for a specified number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateBackoff(attempt) {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
    return Math.floor(delay);
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Database error
   * @returns {boolean} True if error should be retried
   * @private
   */
  _isRetryableError(error) {
    // PostgreSQL error codes:
    // 23505 - unique_violation (constraint violation)
    // 40P01 - deadlock_detected
    // 40001 - serialization_failure

    if (error.code === '23505' && this.retryConfig.retryOnConstraintViolation) {
      this.metrics.constraintViolationCount++;
      return true;
    }

    if ((error.code === '40P01' || error.code === '40001') && this.retryConfig.retryOnDeadlock) {
      this.metrics.deadlockCount++;
      return true;
    }

    return false;
  }

  /**
   * Execute a transaction with multiple queries and automatic retry
   * @param {Function} callback - Async function that receives a client
   * @param {Object} options - Transaction options
   * @param {number} options.maxRetries - Override default max retries
   * @param {boolean} options.enableRetry - Enable/disable retry (default: true)
   */
  async transaction(callback, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.retryConfig.maxRetries;
    const enableRetry = options.enableRetry !== false;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const client = await this.pool.connect();
      const startTime = Date.now();

      try {
        await client.query('BEGIN');
        this.metrics.transactionCount++;

        const result = await callback(client);

        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        if (duration > 1000) {
          logger.warn({ duration, attempt }, 'Long-running transaction detected');
        }

        if (attempt > 0) {
          logger.info({ attempt, duration }, 'Transaction succeeded after retry');
        }

        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        this.metrics.rollbackCount++;
        lastError = error;

        const isRetryable = enableRetry && this._isRetryableError(error);
        const canRetry = attempt < maxRetries && isRetryable;

        if (canRetry) {
          this.metrics.retryCount++;
          const delay = this._calculateBackoff(attempt);

          logger.warn({
            attempt: attempt + 1,
            maxRetries,
            errorCode: error.code,
            errorMessage: error.message,
            delayMs: delay
          }, 'Transaction failed, retrying...');

          await this._sleep(delay);
        } else {
          if (isRetryable && attempt >= maxRetries) {
            logger.error({
              attempt: attempt + 1,
              errorCode: error.code,
              errorMessage: error.message
            }, 'Transaction failed after max retries');
          }
          throw error;
        }
      } finally {
        client.release();
      }
    }

    throw lastError;
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
   * Create a savepoint within a transaction
   * Savepoints allow partial rollback within a transaction
   * @param {Object} client - Transaction client
   * @param {string} name - Savepoint name
   */
  async savepoint(client, name) {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`SAVEPOINT ${safeName}`);
    logger.debug({ savepoint: safeName }, 'Created savepoint');
  }

  /**
   * Rollback to a savepoint
   * @param {Object} client - Transaction client
   * @param {string} name - Savepoint name
   */
  async rollbackToSavepoint(client, name) {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`ROLLBACK TO SAVEPOINT ${safeName}`);
    logger.debug({ savepoint: safeName }, 'Rolled back to savepoint');
  }

  /**
   * Release a savepoint (frees resources)
   * @param {Object} client - Transaction client
   * @param {string} name - Savepoint name
   */
  async releaseSavepoint(client, name) {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`RELEASE SAVEPOINT ${safeName}`);
    logger.debug({ savepoint: safeName }, 'Released savepoint');
  }

  /**
   * Execute a block of code with automatic savepoint management
   * If the block fails, rolls back to the savepoint
   * If it succeeds, releases the savepoint
   * @param {Object} client - Transaction client
   * @param {string} name - Savepoint name
   * @param {Function} callback - Async function to execute
   * @returns {Object} {success: boolean, result: any, error: Error}
   */
  async withSavepoint(client, name, callback) {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');

    await this.savepoint(client, safeName);

    try {
      const result = await callback(client);
      await this.releaseSavepoint(client, safeName);
      return { success: true, result, error: null };
    } catch (error) {
      await this.rollbackToSavepoint(client, safeName);
      logger.warn({
        savepoint: safeName,
        error: error.message
      }, 'Savepoint rolled back due to error');
      return { success: false, result: null, error };
    }
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
