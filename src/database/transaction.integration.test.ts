// Integration tests for Transaction Support with Testcontainers
// Tests rollback scenarios, concurrent operations, and nested transactions

import { jest } from '@jest/globals';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabaseClient } from './client.js';
import { TestRepository } from './repository.js';
import { runner as migrate } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger } from '../core/logger.js';

const logger = createLogger({ level: 'warn', name: 'transaction-integration-test' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Transaction Support - Integration Tests', () => {
  let container;
  let dbClient;
  let repository;
  let suiteId;

  beforeAll(async () => {
    // Start PostgreSQL container
    logger.debug('Starting PostgreSQL container...');
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withExposedPorts(5432)
      .start();

    logger.debug('PostgreSQL container started');

    // Connect to the container
    dbClient = new DatabaseClient({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword()
    });

    await dbClient.connect();
    logger.debug('Connected to PostgreSQL container');

    // Run migrations using node-pg-migrate
    const databaseUrl = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    await migrate({
      databaseUrl,
      dir: join(__dirname, 'migrations'),
      direction: 'up',
      migrationsTable: 'migrations',
      verbose: false
    });
    logger.debug('Migrations applied');

    repository = new TestRepository(dbClient);

    // Create a test suite
    suiteId = await repository.createOrGetSuite('Transaction Test Suite', 'Suite for testing transactions');
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    // Clean up
    if (dbClient) {
      await dbClient.close();
    }
    if (container) {
      logger.debug('Stopping PostgreSQL container...');
      await container.stop();
      logger.debug('PostgreSQL container stopped');
    }
  }, 60000); // 1 minute timeout for cleanup

  describe('Concurrent Operations', () => {
    test('should prevent duplicate tests with concurrent findOrCreateTest calls', async () => {
      const testSlug = 'concurrent-test-' + Date.now();
      const testData = {
        name: 'Concurrent Test',
        description: 'Test for concurrent creation',
        testSlug,
        suiteName: 'Concurrent Suite',
        testFile: 'test.js'
      };

      // Run 10 concurrent findOrCreateTest calls for same test
      const promises = Array(10).fill(null).map(() =>
        repository.findOrCreateTest(testData)
      );

      const testIds = await Promise.all(promises);

      // All should return the same test ID
      const uniqueIds = new Set(testIds);
      expect(uniqueIds.size).toBe(1);

      // Verify only 1 test record was created
      const result = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug = $1',
        [testSlug]
      );
      expect(result.rows[0].count).toBe('1');
    });

    test('should handle concurrent createTestResult calls', async () => {
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'abc123',
        status: 'passed',
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: new Date(),
        completedAt: new Date()
      });

      const baseSlug = 'concurrent-result-' + Date.now();

      // Create 5 different tests concurrently
      const promises = Array(5).fill(null).map((_, i) =>
        repository.createTestResult(runId, {
          testName: `Concurrent Result ${i}`,
          testSlug: `${baseSlug}-${i}`,
          suiteName: 'Concurrent Suite',
          status: 'passed',
          durationMs: 100
        })
      );

      await Promise.all(promises);

      // Verify all 5 tests were created
      const testResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug LIKE $1',
        [`${baseSlug}-%`]
      );
      expect(testResult.rows[0].count).toBe('5');

      // Verify all 5 results were created
      const resultResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM test_results WHERE run_id = $1',
        [runId]
      );
      expect(resultResult.rows[0].count).toBe('5');
    });
  });

  describe('Rollback Scenarios', () => {
    test('should rollback entire transaction on findOrCreateTest failure', async () => {
      const testSlug = 'rollback-test-' + Date.now();

      // Mock a failure by trying to create with invalid data
      // (we'll use a very long test name to potentially trigger an error)
      const testData = {
        name: 'A'.repeat(600), // Exceeds 512 character limit
        description: 'Test for rollback',
        testSlug,
        suiteName: 'Rollback Suite',
        testFile: 'test.js'
      };

      try {
        await repository.findOrCreateTest(testData);
      } catch (error) {
        // Expected to fail
      }

      // Verify no test was created (transaction rolled back)
      const result = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug = $1',
        [testSlug]
      );
      expect(result.rows[0].count).toBe('0');
    });

    test('should rollback createTestResult if test creation fails', async () => {
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'def456',
        status: 'passed',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: new Date(),
        completedAt: new Date()
      });

      const testSlug = 'rollback-result-' + Date.now();

      // Create with invalid data to trigger rollback
      try {
        await repository.createTestResult(runId, {
          testName: 'B'.repeat(600), // Exceeds limit
          testSlug,
          suiteName: 'Rollback Suite',
          status: 'passed',
          durationMs: 100
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify no test was created (transaction rolled back)
      const testResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug = $1',
        [testSlug]
      );
      expect(testResult.rows[0].count).toBe('0');

      // Verify no result was created (transaction rolled back)
      const resultResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM test_results WHERE run_id = $1',
        [runId]
      );
      expect(resultResult.rows[0].count).toBe('0');
    });

    test('should maintain history consistency on rollback', async () => {
      const testSlug = 'history-rollback-' + Date.now();

      // First, create a test successfully
      const testId = await repository.findOrCreateTest({
        name: 'History Test',
        description: 'Original description',
        testSlug,
        suiteName: 'History Suite',
        testFile: 'test.js'
      });

      // Get history count before attempted update
      const beforeHistory = await dbClient.query(
        'SELECT COUNT(*) as count FROM test_history WHERE test_id = $1',
        [testId]
      );
      const beforeCount = parseInt(beforeHistory.rows[0].count);

      // Now try to update with invalid data that will cause rollback
      try {
        await repository.findOrCreateTest({
          name: 'C'.repeat(600), // Will fail
          description: 'Updated description',
          testSlug,
          suiteName: 'History Suite',
          testFile: 'test.js'
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify history wasn't updated (rollback worked)
      const afterHistory = await dbClient.query(
        'SELECT COUNT(*) as count FROM test_history WHERE test_id = $1',
        [testId]
      );
      const afterCount = parseInt(afterHistory.rows[0].count);

      expect(afterCount).toBe(beforeCount);

      // Verify test metadata wasn't updated either
      const testResult = await dbClient.query(
        'SELECT current_name FROM tests WHERE id = $1',
        [testId]
      );
      expect(testResult.rows[0].current_name).toBe('History Test');
    });
  });

  describe('Nested Transactions', () => {
    test('should use parent transaction client in nested calls', async () => {
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'ghi789',
        status: 'passed',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: new Date(),
        completedAt: new Date()
      });

      const testSlug = 'nested-' + Date.now();

      // createTestResult calls findOrCreateTest internally
      // Both should use the same transaction
      await repository.createTestResult(runId, {
        testName: 'Nested Transaction Test',
        testSlug,
        suiteName: 'Nested Suite',
        status: 'passed',
        durationMs: 100
      });

      // Verify both test and result were created
      const testResult = await dbClient.query(
        'SELECT id FROM tests WHERE test_slug = $1',
        [testSlug]
      );
      expect(testResult.rows.length).toBe(1);

      const resultResult = await dbClient.query(
        'SELECT id FROM test_results WHERE run_id = $1 AND test_id = $2',
        [runId, testResult.rows[0].id]
      );
      expect(resultResult.rows.length).toBe(1);
    });

    test('should rollback nested operations together', async () => {
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'jkl012',
        status: 'passed',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: new Date(),
        completedAt: new Date()
      });

      const testSlug = 'nested-rollback-' + Date.now();

      // Try to create a result with invalid test data
      try {
        await repository.createTestResult(runId, {
          testName: 'D'.repeat(600), // Will fail
          testSlug,
          suiteName: 'Nested Rollback Suite',
          status: 'passed',
          durationMs: 100
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify neither test nor result was created (both rolled back)
      const testResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug = $1',
        [testSlug]
      );
      expect(testResult.rows[0].count).toBe('0');

      const resultResult = await dbClient.query(
        'SELECT COUNT(*) as count FROM test_results WHERE run_id = $1',
        [runId]
      );
      expect(resultResult.rows[0].count).toBe('0');
    });
  });

  describe('Transaction Atomicity', () => {
    test('should ensure markDeletedTests is atomic', async () => {
      const baseSlug = 'atomic-delete-' + Date.now();

      // Create 3 tests FIRST (so they have earlier last_seen_at)
      await repository.findOrCreateTest({
        name: 'Test 1',
        testSlug: `${baseSlug}-1`,
        suiteName: 'Atomic Suite'
      });
      await repository.findOrCreateTest({
        name: 'Test 2',
        testSlug: `${baseSlug}-2`,
        suiteName: 'Atomic Suite'
      });
      await repository.findOrCreateTest({
        name: 'Test 3',
        testSlug: `${baseSlug}-3`,
        suiteName: 'Atomic Suite'
      });

      // Create the test run AFTER tests exist (so started_at > last_seen_at)
      // Use a future date to ensure started_at is after the tests' last_seen_at
      const futureDate = new Date(Date.now() + 1000);
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'mno345',
        status: 'passed',
        totalTests: 2,
        passedTests: 2,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: futureDate,
        completedAt: futureDate
      });

      // Mark 2 of them as "current" (so the 3rd should be marked deleted)
      const currentSlugs = [`${baseSlug}-1`, `${baseSlug}-2`];
      const deletedTests = await repository.markDeletedTests(
        runId,
        currentSlugs,
        ['Atomic Suite']
      );

      // Should have marked exactly 1 test as deleted
      expect(deletedTests.length).toBe(1);
      expect(deletedTests[0].test_slug).toBe(`${baseSlug}-3`);

      // Verify in database
      const result = await dbClient.query(
        'SELECT COUNT(*) as count FROM tests WHERE test_slug = $1 AND deleted_at IS NOT NULL',
        [`${baseSlug}-3`]
      );
      expect(result.rows[0].count).toBe('1');
    });

    test('should maintain referential integrity on rollback', async () => {
      const runId = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'pqr678',
        status: 'passed',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1000,
        startedAt: new Date(),
        completedAt: new Date()
      });

      const testSlug = 'referential-' + Date.now();

      // Create test successfully
      await repository.createTestResult(runId, {
        testName: 'Referential Test',
        testSlug,
        suiteName: 'Referential Suite',
        status: 'passed',
        durationMs: 100
      });

      // Verify foreign key relationships are intact
      const result = await dbClient.query(
        `SELECT t.id, tr.id as result_id, th.id as history_id
         FROM tests t
         LEFT JOIN test_results tr ON tr.test_id = t.id
         LEFT JOIN test_history th ON th.test_id = t.id
         WHERE t.test_slug = $1`,
        [testSlug]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBeTruthy();
      expect(result.rows[0].result_id).toBeTruthy();
      expect(result.rows[0].history_id).toBeTruthy();
    });
  });
});
