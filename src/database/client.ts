/**
 * Iudex - Database Client
 * PostgreSQL connection pool with query execution and error handling
 */

import fs from 'fs';
import pg from 'pg';
import { getLogger } from '../core/logger.js';
import type { DatabaseConfig, Logger } from '../types/index.js';

const { Pool } = pg;
type PoolClient = pg.PoolClient;

let logger: Logger;
function getLoggerInstance(): Logger {
  if (!logger) {
    logger = getLogger().child({ module: 'database' });
  }
  return logger;
}

/** Database client configuration */
interface ClientConfig extends DatabaseConfig {
  poolSize?: number;
  keepAliveTimeout?: number;
  connectionTimeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  retryMaxDelay?: number;
  retryOnConstraintViolation?: boolean;
  retryOnDeadlock?: boolean;
}

/** Query result */
interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  duration: number;
  rowCount: number | null;
}

/** Transaction options */
interface TransactionOptions {
  maxRetries?: number;
  enableRetry?: boolean;
}

/** Savepoint result */
interface SavepointResult<T> {
  success: boolean;
  result: T | null;
  error: Error | null;
}

/** Pool statistics */
interface PoolStats {
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  transactions: {
    total: number;
    rollbacks: number;
    retries: number;
    constraintViolations: number;
    deadlocks: number;
  };
}

/** Metrics tracking */
interface Metrics {
  transactionCount: number;
  rollbackCount: number;
  retryCount: number;
  constraintViolationCount: number;
  deadlockCount: number;
}

/** Retry configuration */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryOnConstraintViolation: boolean;
  retryOnDeadlock: boolean;
}

/** Database error with code */
interface DatabaseError extends Error {
  code?: string;
}

/**
 * Database Client class
 * Manages PostgreSQL connection pool and query execution
 */
export class DatabaseClient {
  private config: pg.PoolConfig;
  private retryConfig: RetryConfig;
  private pool: pg.Pool | null = null;
  private isConnected = false;
  private metrics: Metrics;

  /**
   * Resolve CA certificate from environment variable or file
   * Handles escaped newlines (\n) in certificate strings
   *
   * @param certContent - Direct certificate content from DB_CA_CERT
   * @returns Resolved certificate string or undefined
   */
  private resolveCACert(certContent?: string): string | undefined {
    // First, check for file path
    const certFile = process.env.DB_CA_CERT_FILE;
    if (certFile) {
      try {
        return fs.readFileSync(certFile, 'utf-8');
      } catch (error) {
        getLoggerInstance().warn('Failed to read CA certificate file', {
          file: certFile,
          error: (error as Error).message
        });
      }
    }

    // Use direct cert content if provided
    if (certContent) {
      // Convert escaped newlines to actual newlines
      // This handles certs passed as: "-----BEGIN...\nMII...\n-----END..."
      return certContent.replace(/\\n/g, '\n');
    }

    return undefined;
  }

  /**
   * Parse SSL configuration from config object or environment variables
   * Supports DigitalOcean and other cloud providers with self-signed certificates
   *
   * Environment variables:
   * - DB_SSL: 'true', 'false', or 'require' to enable/disable SSL
   *   - 'require': SSL enabled, no certificate verification (for DigitalOcean, etc.)
   *   - 'true': SSL enabled with certificate verification
   * - DB_SSL_REJECT_UNAUTHORIZED: 'true' or 'false' to override certificate verification
   * - DB_CA_CERT: CA certificate content (supports escaped \n for newlines)
   * - DB_CA_CERT_FILE: Path to CA certificate file
   */
  private parseSSLConfig(
    configSsl?: boolean | { rejectUnauthorized: boolean; ca?: string }
  ): boolean | { rejectUnauthorized: boolean; ca?: string } | undefined {
    // If config explicitly provides SSL settings, use them
    if (configSsl !== undefined) {
      // If it's an object, return as-is (supports { rejectUnauthorized: false, ca: '...' })
      if (typeof configSsl === 'object') {
        return configSsl;
      }
      // If it's a boolean false, disable SSL
      if (configSsl === false) {
        return false;
      }
      // If it's boolean true, check env vars for additional config
    }

    // Check environment variables
    const dbSsl = process.env.DB_SSL?.toLowerCase();
    const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase();
    const caCert = process.env.DB_CA_CERT;
    const caCertFile = process.env.DB_CA_CERT_FILE;

    // If DB_SSL is explicitly 'false', disable SSL
    if (dbSsl === 'false') {
      return false;
    }

    // If DB_SSL is 'true' or 'require', or if CA cert is provided, enable SSL
    if (dbSsl === 'true' || dbSsl === 'require' || caCert || caCertFile) {
      // Determine rejectUnauthorized:
      // - 'require' mode: no cert verification (like PostgreSQL sslmode=require)
      // - 'true' mode: verify certs by default
      // - Explicit DB_SSL_REJECT_UNAUTHORIZED overrides both
      let rejectUnauthorized: boolean;
      if (rejectUnauthorizedEnv !== undefined) {
        // Explicit override takes precedence
        rejectUnauthorized = rejectUnauthorizedEnv !== 'false';
      } else if (dbSsl === 'require') {
        // 'require' mode: SSL without cert verification (DigitalOcean, etc.)
        rejectUnauthorized = false;
      } else {
        // Default: verify certificates
        rejectUnauthorized = true;
      }

      const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
        rejectUnauthorized
      };

      // Add CA certificate if provided (from env var or file)
      const resolvedCert = this.resolveCACert(caCert);
      if (resolvedCert) {
        sslConfig.ca = resolvedCert;
      }

      return sslConfig;
    }

    // If configSsl was true but no env vars set, return true (use pg defaults)
    if (configSsl === true) {
      return true;
    }

    // Default: no SSL
    return false;
  }

  constructor(config: ClientConfig = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || parseInt(process.env.DB_PORT || '5432', 10),
      database: config.database || process.env.DB_NAME || 'iudex',
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD,
      ssl: this.parseSSLConfig(config.ssl),
      max: config.poolSize || 10,
      idleTimeoutMillis: config.keepAliveTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000,
    };

    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.retryBaseDelay || 100,
      maxDelay: config.retryMaxDelay || 2000,
      retryOnConstraintViolation: config.retryOnConstraintViolation !== false,
      retryOnDeadlock: config.retryOnDeadlock !== false
    };

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
  async connect(): Promise<void> {
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
        getLoggerInstance().error('Unexpected database pool error', { error: err.message, stack: err.stack });
      });

    } catch (error) {
      const err = error as Error;
      getLoggerInstance().error('Failed to connect to database', { error: err.message, stack: err.stack });
      throw error;
    }
  }

  /**
   * Execute a query with parameters
   */
  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const res = await this.pool!.query(text, params);
      const duration = Date.now() - start;

      return {
        rows: res.rows as T[],
        duration,
        rowCount: res.rowCount
      };
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - start;
      getLoggerInstance().error('Database query error', {
        error: err.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        stack: err.stack
      });
      throw error;
    }
  }

  /**
   * Sleep for a specified number of milliseconds
   * Public for testing backwards compatibility
   */
  _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Public for testing backwards compatibility
   */
  _calculateBackoff(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
    return Math.floor(delay);
  }

  /**
   * Check if an error is retryable
   * Public for testing backwards compatibility
   */
  _isRetryableError(error: DatabaseError): boolean {
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
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.retryConfig.maxRetries;
    const enableRetry = options.enableRetry !== false;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const client = await this.pool!.connect();
      const startTime = Date.now();

      try {
        await client.query('BEGIN');
        this.metrics.transactionCount++;

        const result = await callback(client);

        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        if (duration > 1000) {
          getLoggerInstance().warn('Long-running transaction detected', { duration, attempt });
        }

        if (attempt > 0) {
          getLoggerInstance().info('Transaction succeeded after retry', { attempt, duration });
        }

        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        this.metrics.rollbackCount++;
        lastError = error as Error;

        const dbError = error as DatabaseError;
        const isRetryable = enableRetry && this._isRetryableError(dbError);
        const canRetry = attempt < maxRetries && isRetryable;

        if (canRetry) {
          this.metrics.retryCount++;
          const delay = this._calculateBackoff(attempt);

          getLoggerInstance().warn('Transaction failed, retrying...', {
            attempt: attempt + 1,
            maxRetries,
            errorCode: dbError.code,
            errorMessage: dbError.message,
            delayMs: delay
          });

          await this._sleep(delay);
        } else {
          if (isRetryable && attempt >= maxRetries) {
            getLoggerInstance().error('Transaction failed after max retries', {
              attempt: attempt + 1,
              errorCode: dbError.code,
              errorMessage: dbError.message
            });
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
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query<{ health: number }>('SELECT 1 as health');
      return result.rows.length === 1 && result.rows[0].health === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get pool statistics and transaction metrics
   */
  getPoolStats(): PoolStats | null {
    if (!this.pool) {
      return null;
    }

    return {
      pool: {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount
      },
      transactions: {
        total: this.metrics.transactionCount,
        rollbacks: this.metrics.rollbackCount,
        retries: this.metrics.retryCount,
        constraintViolations: this.metrics.constraintViolationCount,
        deadlocks: this.metrics.deadlockCount
      }
    };
  }

  /**
   * Reset transaction metrics
   */
  resetMetrics(): void {
    this.metrics = {
      transactionCount: 0,
      rollbackCount: 0,
      retryCount: 0,
      constraintViolationCount: 0,
      deadlockCount: 0
    };
  }

  /**
   * Log current transaction metrics
   */
  logMetrics(): void {
    const stats = this.getPoolStats();
    getLoggerInstance().info('Database connection pool and transaction metrics', {
      pool: stats?.pool,
      transactions: stats?.transactions
    });
  }

  /**
   * Create a savepoint within a transaction
   */
  async savepoint(client: PoolClient, name: string): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`SAVEPOINT ${safeName}`);
    getLoggerInstance().debug('Created savepoint', { savepoint: safeName });
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(client: PoolClient, name: string): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`ROLLBACK TO SAVEPOINT ${safeName}`);
    getLoggerInstance().debug('Rolled back to savepoint', { savepoint: safeName });
  }

  /**
   * Release a savepoint
   */
  async releaseSavepoint(client: PoolClient, name: string): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`RELEASE SAVEPOINT ${safeName}`);
    getLoggerInstance().debug('Released savepoint', { savepoint: safeName });
  }

  /**
   * Execute a block of code with automatic savepoint management
   */
  async withSavepoint<T>(
    client: PoolClient,
    name: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<SavepointResult<T>> {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');

    await this.savepoint(client, safeName);

    try {
      const result = await callback(client);
      await this.releaseSavepoint(client, safeName);
      return { success: true, result, error: null };
    } catch (error) {
      await this.rollbackToSavepoint(client, safeName);
      getLoggerInstance().warn('Savepoint rolled back due to error', {
        savepoint: safeName,
        error: (error as Error).message
      });
      return { success: false, result: null, error: error as Error };
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
    }
  }
}

/**
 * Create and connect a database client
 */
export async function createClient(config?: ClientConfig): Promise<DatabaseClient> {
  const client = new DatabaseClient(config);
  await client.connect();
  return client;
}

export default { DatabaseClient, createClient };
