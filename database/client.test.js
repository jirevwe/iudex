// Unit tests for DatabaseClient retry logic and transaction handling
import { jest } from '@jest/globals';
import { DatabaseClient } from './client.js';

describe('DatabaseClient - Transaction and Retry Logic', () => {
  let client;
  let mockPool;

  beforeEach(() => {
    // Mock pool
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0,
      on: jest.fn()
    };

    client = new DatabaseClient({
      host: 'localhost',
      database: 'test',
      user: 'test',
      password: 'test'
    });

    client.pool = mockPool;
    client.isConnected = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (client) {
      client.resetMetrics();
    }
  });

  describe('Retry Configuration', () => {
    test('should initialize with default retry config', () => {
      expect(client.retryConfig.maxRetries).toBe(3);
      expect(client.retryConfig.baseDelay).toBe(100);
      expect(client.retryConfig.maxDelay).toBe(2000);
      expect(client.retryConfig.retryOnConstraintViolation).toBe(true);
      expect(client.retryConfig.retryOnDeadlock).toBe(true);
    });

    test('should accept custom retry config', () => {
      const customClient = new DatabaseClient({
        maxRetries: 5,
        retryBaseDelay: 200,
        retryMaxDelay: 5000,
        retryOnConstraintViolation: false
      });

      expect(customClient.retryConfig.maxRetries).toBe(5);
      expect(customClient.retryConfig.baseDelay).toBe(200);
      expect(customClient.retryConfig.maxDelay).toBe(5000);
      expect(customClient.retryConfig.retryOnConstraintViolation).toBe(false);
    });
  });

  describe('_isRetryableError()', () => {
    test('should identify unique constraint violation as retryable', () => {
      const error = { code: '23505', message: 'duplicate key' };
      expect(client._isRetryableError(error)).toBe(true);
      expect(client.metrics.constraintViolationCount).toBe(1);
    });

    test('should identify deadlock as retryable', () => {
      const error = { code: '40P01', message: 'deadlock detected' };
      expect(client._isRetryableError(error)).toBe(true);
      expect(client.metrics.deadlockCount).toBe(1);
    });

    test('should identify serialization failure as retryable', () => {
      const error = { code: '40001', message: 'serialization failure' };
      expect(client._isRetryableError(error)).toBe(true);
      expect(client.metrics.deadlockCount).toBe(1);
    });

    test('should not retry other errors', () => {
      const error = { code: '42P01', message: 'undefined table' };
      expect(client._isRetryableError(error)).toBe(false);
    });

    test('should respect retryOnConstraintViolation config', () => {
      client.retryConfig.retryOnConstraintViolation = false;
      const error = { code: '23505', message: 'duplicate key' };
      expect(client._isRetryableError(error)).toBe(false);
    });

    test('should respect retryOnDeadlock config', () => {
      client.retryConfig.retryOnDeadlock = false;
      const error = { code: '40P01', message: 'deadlock detected' };
      expect(client._isRetryableError(error)).toBe(false);
    });
  });

  describe('_calculateBackoff()', () => {
    test('should calculate exponential backoff', () => {
      const delay0 = client._calculateBackoff(0);
      const delay1 = client._calculateBackoff(1);
      const delay2 = client._calculateBackoff(2);

      // With jitter, delays should be roughly exponential
      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(200); // base * 1.3 (max jitter)

      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(300);

      expect(delay2).toBeGreaterThanOrEqual(400);
      expect(delay2).toBeLessThanOrEqual(600);
    });

    test('should respect maxDelay', () => {
      const delay = client._calculateBackoff(10); // Very high attempt
      expect(delay).toBeLessThanOrEqual(client.retryConfig.maxDelay);
    });
  });

  describe('transaction() - Success Cases', () => {
    test('should execute transaction successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('result');
      const result = await client.transaction(callback);

      expect(result).toBe('result');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(client.metrics.transactionCount).toBe(1);
      expect(client.metrics.rollbackCount).toBe(0);
    });

    test('should pass client to callback', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('result');
      await client.transaction(callback);

      expect(callback).toHaveBeenCalledWith(mockClient);
    });
  });

  describe('transaction() - Retry Logic', () => {
    test('should retry on unique constraint violation', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const constraintError = new Error('duplicate key');
      constraintError.code = '23505';

      let attemptCount = 0;
      const callback = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw constraintError;
        }
        return 'success';
      });

      // Mock sleep to avoid delays in tests
      client._sleep = jest.fn().mockResolvedValue();

      const result = await client.transaction(callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(2);
      expect(client.metrics.retryCount).toBe(1);
      expect(client.metrics.constraintViolationCount).toBe(1);
      expect(client._sleep).toHaveBeenCalled();
    });

    test('should retry on deadlock', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const deadlockError = new Error('deadlock detected');
      deadlockError.code = '40P01';

      let attemptCount = 0;
      const callback = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw deadlockError;
        }
        return 'success';
      });

      client._sleep = jest.fn().mockResolvedValue();

      const result = await client.transaction(callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(2);
      expect(client.metrics.retryCount).toBe(1);
      expect(client.metrics.deadlockCount).toBe(1);
    });

    test('should fail after max retries', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          // Mock BEGIN, COMMIT, ROLLBACK queries
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const constraintError = new Error('duplicate key');
      constraintError.code = '23505';
      const callback = jest.fn().mockRejectedValue(constraintError);

      client._sleep = jest.fn().mockResolvedValue();

      await expect(client.transaction(callback)).rejects.toThrow();

      // Should try initial + 3 retries = 4 times total
      expect(callback).toHaveBeenCalledTimes(4);
      expect(client.metrics.retryCount).toBe(3);
    });

    test('should not retry non-retryable errors', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const otherError = new Error('undefined table');
      otherError.code = '42P01';
      const callback = jest.fn().mockRejectedValue(otherError);

      await expect(client.transaction(callback)).rejects.toThrow();

      // Should only try once
      expect(callback).toHaveBeenCalledTimes(1);
      expect(client.metrics.retryCount).toBe(0);
    });

    test('should respect custom maxRetries option', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const constraintError = new Error('duplicate key');
      constraintError.code = '23505';
      const callback = jest.fn().mockRejectedValue(constraintError);

      client._sleep = jest.fn().mockResolvedValue();

      await expect(
        client.transaction(callback, { maxRetries: 1 })
      ).rejects.toThrow();

      // Should try initial + 1 retry = 2 times total
      expect(callback).toHaveBeenCalledTimes(2);
    });

    test('should disable retry when enableRetry is false', async () => {
      const createMockClient = () => ({
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
      });
      mockPool.connect.mockImplementation(() => Promise.resolve(createMockClient()));

      const constraintError = new Error('duplicate key');
      constraintError.code = '23505';
      const callback = jest.fn().mockRejectedValue(constraintError);

      await expect(
        client.transaction(callback, { enableRetry: false })
      ).rejects.toThrow();

      // Should only try once (no retries)
      expect(callback).toHaveBeenCalledTimes(1);
      expect(client.metrics.retryCount).toBe(0);
    });
  });

  describe('transaction() - Rollback', () => {
    test('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(client.transaction(callback, { enableRetry: false })).rejects.toThrow('Test error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(client.metrics.rollbackCount).toBe(1);
    });
  });

  describe('Metrics', () => {
    test('should track transaction metrics', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('result');

      await client.transaction(callback);
      await client.transaction(callback);

      expect(client.metrics.transactionCount).toBe(2);
    });

    test('should return metrics in getPoolStats', () => {
      client.metrics.transactionCount = 10;
      client.metrics.rollbackCount = 2;
      client.metrics.retryCount = 3;

      const stats = client.getPoolStats();

      expect(stats.transactions.total).toBe(10);
      expect(stats.transactions.rollbacks).toBe(2);
      expect(stats.transactions.retries).toBe(3);
    });

    test('should reset metrics', () => {
      client.metrics.transactionCount = 10;
      client.metrics.rollbackCount = 2;
      client.metrics.retryCount = 3;

      client.resetMetrics();

      expect(client.metrics.transactionCount).toBe(0);
      expect(client.metrics.rollbackCount).toBe(0);
      expect(client.metrics.retryCount).toBe(0);
    });
  });

  describe('Savepoints', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
    });

    test('should create a savepoint', async () => {
      await client.savepoint(mockClient, 'test_savepoint');

      expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT test_savepoint');
    });

    test('should sanitize savepoint names', async () => {
      await client.savepoint(mockClient, 'test-savepoint!@#');

      expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT test_savepoint___');
    });

    test('should rollback to a savepoint', async () => {
      await client.rollbackToSavepoint(mockClient, 'test_savepoint');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT test_savepoint');
    });

    test('should release a savepoint', async () => {
      await client.releaseSavepoint(mockClient, 'test_savepoint');

      expect(mockClient.query).toHaveBeenCalledWith('RELEASE SAVEPOINT test_savepoint');
    });

    describe('withSavepoint()', () => {
      test('should create and release savepoint on success', async () => {
        const callback = jest.fn().mockResolvedValue('success');

        const result = await client.withSavepoint(mockClient, 'test_sp', callback);

        expect(result.success).toBe(true);
        expect(result.result).toBe('success');
        expect(result.error).toBe(null);
        expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT test_sp');
        expect(mockClient.query).toHaveBeenCalledWith('RELEASE SAVEPOINT test_sp');
      });

      test('should rollback to savepoint on error', async () => {
        const error = new Error('Test error');
        const callback = jest.fn().mockRejectedValue(error);

        const result = await client.withSavepoint(mockClient, 'test_sp', callback);

        expect(result.success).toBe(false);
        expect(result.result).toBe(null);
        expect(result.error).toBe(error);
        expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT test_sp');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT test_sp');
      });

      test('should pass client to callback', async () => {
        const callback = jest.fn().mockResolvedValue('success');

        await client.withSavepoint(mockClient, 'test_sp', callback);

        expect(callback).toHaveBeenCalledWith(mockClient);
      });

      test('should sanitize savepoint name in withSavepoint', async () => {
        const callback = jest.fn().mockResolvedValue('success');

        await client.withSavepoint(mockClient, 'test-sp!', callback);

        expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT test_sp_');
        expect(mockClient.query).toHaveBeenCalledWith('RELEASE SAVEPOINT test_sp_');
      });
    });
  });
});
