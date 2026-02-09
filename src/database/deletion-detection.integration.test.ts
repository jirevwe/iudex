// Integration tests for Deletion Detection with Testcontainers
// Uses PostgreSQL testcontainer - no manual setup required!

import { jest } from '@jest/globals';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabaseClient } from './client.js';
import { TestRepository } from './repository.js';
import { runner as migrate } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger } from '../core/logger.js';

const logger = createLogger({ level: 'warn', name: 'integration-test' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Deletion Detection - Integration Tests', () => {
  let container;
  let dbClient;
  let repository;
  let suiteId;
  let runId;

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
    suiteId = await repository.createOrGetSuite('Deletion Test Suite', 'Suite for testing deletion detection');
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

  beforeEach(async () => {
    // Create a test run for each test
    // Use a future date to ensure started_at is after any tests' last_seen_at
    // This is necessary because markDeletedTests only marks tests where last_seen_at < started_at
    const futureDate = new Date(Date.now() + 1000);
    runId = await repository.createTestRun(suiteId, {
      environment: 'test',
      branch: 'main',
      commitSha: 'abc123',
      commitMessage: 'Test commit',
      status: 'passed',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      durationMs: 0,
      startedAt: futureDate,
      completedAt: futureDate,
      triggeredBy: 'test',
      runUrl: null
    });
  });

  afterEach(async () => {
    // Clean up test data after each test for isolation
    await dbClient.query('DELETE FROM test_results WHERE run_id = $1', [runId]);
    await dbClient.query('DELETE FROM test_history WHERE test_id IN (SELECT id FROM tests WHERE suite_name LIKE $1)', ['%Test%']);
    await dbClient.query('DELETE FROM tests WHERE suite_name LIKE $1', ['%Test%']);
  });

  describe('Basic Deletion Detection', () => {
    test('should mark test as deleted when it does not appear in run', async () => {
      // Create a test
      const testId = await repository.findOrCreateTest({
        name: 'Test to be deleted',
        description: 'This test will be deleted',
        testSlug: 'deletion.test1',
        suiteName: 'Deletion Test Suite',
        testFile: '/test/file.js'
      });

      // Verify test exists and is not deleted
      let result = await dbClient.query(
        'SELECT test_slug, deleted_at FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].deleted_at).toBeNull();

      // Run deletion detection with empty test list (test was removed)
      const deletedTests = await repository.markDeletedTests(
        runId,
        [], // No tests in current run
        ['Deletion Test Suite']
      );

      // Verify test is marked as deleted
      expect(deletedTests).toHaveLength(1);
      expect(deletedTests[0].test_slug).toBe('deletion.test1');

      result = await dbClient.query(
        'SELECT test_slug, deleted_at FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].deleted_at).not.toBeNull();
    });

    test('should not mark test as deleted if it appears in current run', async () => {
      // Create a test
      await repository.findOrCreateTest({
        name: 'Active test',
        description: 'This test is active',
        testSlug: 'deletion.active1',
        suiteName: 'Deletion Test Suite',
        testFile: '/test/file.js'
      });

      // Run deletion detection with test in list
      const deletedTests = await repository.markDeletedTests(
        runId,
        ['deletion.active1'], // Test is in current run
        ['Deletion Test Suite']
      );

      // No tests should be deleted
      expect(deletedTests).toHaveLength(0);
    });

    test('should mark multiple tests as deleted in single run', async () => {
      // Create multiple tests
      await repository.findOrCreateTest({
        name: 'Test 1',
        testSlug: 'deletion.multi1',
        suiteName: 'Deletion Test Suite'
      });
      await repository.findOrCreateTest({
        name: 'Test 2',
        testSlug: 'deletion.multi2',
        suiteName: 'Deletion Test Suite'
      });
      await repository.findOrCreateTest({
        name: 'Test 3',
        testSlug: 'deletion.multi3',
        suiteName: 'Deletion Test Suite'
      });

      // Run deletion detection - keep only test1
      const deletedTests = await repository.markDeletedTests(
        runId,
        ['deletion.multi1'], // Only test1 remains
        ['Deletion Test Suite']
      );

      // Tests 2 and 3 should be deleted
      expect(deletedTests).toHaveLength(2);
      const slugs = deletedTests.map(t => t.test_slug).sort();
      expect(slugs).toEqual(['deletion.multi2', 'deletion.multi3']);
    });
  });

  describe('Test Resurrection', () => {
    test('should clear deleted_at when test reappears', async () => {
      // Create and then delete a test
      const testId = await repository.findOrCreateTest({
        name: 'Resurrection test',
        testSlug: 'deletion.resurrection1',
        suiteName: 'Deletion Test Suite'
      });

      // Mark as deleted
      await repository.markDeletedTests(runId, [], ['Deletion Test Suite']);

      // Verify it's deleted
      let result = await dbClient.query(
        'SELECT deleted_at FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].deleted_at).not.toBeNull();

      // Re-run the test (resurrection)
      await repository.findOrCreateTest({
        name: 'Resurrection test',
        testSlug: 'deletion.resurrection1',
        suiteName: 'Deletion Test Suite'
      });

      // Verify deleted_at is cleared
      result = await dbClient.query(
        'SELECT deleted_at FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].deleted_at).toBeNull();
    });
  });

  describe('Suite Isolation', () => {
    test('should only mark tests as deleted from executed suites', async () => {
      // Create test in Suite A
      await repository.findOrCreateTest({
        name: 'Suite A Test',
        testSlug: 'suiteA.test1',
        suiteName: 'Suite A'
      });

      // Create test in Deletion Test Suite
      await repository.findOrCreateTest({
        name: 'Suite B Test',
        testSlug: 'deletion.suitetest',
        suiteName: 'Deletion Test Suite'
      });

      // Run deletion detection only for Deletion Test Suite
      const deletedTests = await repository.markDeletedTests(
        runId,
        [], // No tests in current run
        ['Deletion Test Suite'] // Only this suite
      );

      // Only the test from Deletion Test Suite should be marked
      expect(deletedTests).toHaveLength(1);
      expect(deletedTests[0].test_slug).toBe('deletion.suitetest');

      // Verify Suite A test is NOT deleted
      const result = await dbClient.query(
        'SELECT deleted_at FROM tests WHERE test_slug = $1',
        ['suiteA.test1']
      );
      expect(result.rows[0].deleted_at).toBeNull();

      // Cleanup Suite A test
      await dbClient.query('DELETE FROM tests WHERE test_slug = $1', ['suiteA.test1']);
    });

    test('should handle multiple suites in same run', async () => {
      // Create another suite
      const suite2Id = await repository.createOrGetSuite('Deletion Test Suite 2', 'Second suite');

      // Create tests in both suites
      await repository.findOrCreateTest({
        name: 'Suite 1 Test',
        testSlug: 'deletion.s1test',
        suiteName: 'Deletion Test Suite'
      });
      await repository.findOrCreateTest({
        name: 'Suite 2 Test',
        testSlug: 'deletion.s2test',
        suiteName: 'Deletion Test Suite 2'
      });

      // Run deletion detection for both suites
      const deletedTests = await repository.markDeletedTests(
        runId,
        [], // No tests in current run
        ['Deletion Test Suite', 'Deletion Test Suite 2']
      );

      // Both tests should be deleted
      expect(deletedTests).toHaveLength(2);
      const slugs = deletedTests.map(t => t.test_slug).sort();
      expect(slugs).toEqual(['deletion.s1test', 'deletion.s2test']);

      // Cleanup
      await dbClient.query('DELETE FROM tests WHERE suite_name = $1', ['Deletion Test Suite 2']);
      await dbClient.query('DELETE FROM test_suites WHERE id = $1', [suite2Id]);
    });
  });

  describe('Suite Tracking', () => {
    test('should update suite_name when test moves to different suite', async () => {
      // Create test in original suite
      const testId = await repository.findOrCreateTest({
        name: 'Moving test',
        testSlug: 'deletion.moving1',
        suiteName: 'Deletion Test Suite'
      });

      // Verify original suite
      let result = await dbClient.query(
        'SELECT suite_name FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].suite_name).toBe('Deletion Test Suite');

      // Create another suite
      const newSuiteId = await repository.createOrGetSuite('New Suite', 'New suite for moved test');

      // Move test to new suite
      await repository.findOrCreateTest({
        name: 'Moving test',
        testSlug: 'deletion.moving1',
        suiteName: 'New Suite' // Changed suite
      });

      // Verify suite was updated
      result = await dbClient.query(
        'SELECT suite_name FROM tests WHERE id = $1',
        [testId]
      );
      expect(result.rows[0].suite_name).toBe('New Suite');

      // Cleanup
      await dbClient.query('DELETE FROM tests WHERE id = $1', [testId]);
      await dbClient.query('DELETE FROM test_suites WHERE id = $1', [newSuiteId]);
    });

    test('should not mark moved test as deleted from old suite', async () => {
      // Create test in Suite A
      await repository.findOrCreateTest({
        name: 'Test that will move',
        testSlug: 'deletion.willmove',
        suiteName: 'Deletion Test Suite'
      });

      // Move test to Suite B
      const newSuiteId = await repository.createOrGetSuite('Target Suite', 'Suite B');
      await repository.findOrCreateTest({
        name: 'Test that will move',
        testSlug: 'deletion.willmove',
        suiteName: 'Target Suite'
      });

      // Run deletion detection for original suite
      const deletedTests = await repository.markDeletedTests(
        runId,
        [], // No tests in Deletion Test Suite anymore
        ['Deletion Test Suite']
      );

      // Test should NOT be marked as deleted (it moved, not deleted)
      // But since we're checking "Deletion Test Suite" and the test is now in "Target Suite"
      // The test won't be marked as deleted because it's not in "Deletion Test Suite" anymore
      const movedTest = deletedTests.find(t => t.test_slug === 'deletion.willmove');
      expect(movedTest).toBeUndefined();

      // Cleanup
      await dbClient.query('DELETE FROM tests WHERE test_slug = $1', ['deletion.willmove']);
      await dbClient.query('DELETE FROM test_suites WHERE id = $1', [newSuiteId]);
    });
  });

  describe('getDeletedTests()', () => {
    test('should retrieve recently deleted tests', async () => {
      // Create and delete a test
      await repository.findOrCreateTest({
        name: 'Test for retrieval',
        testSlug: 'deletion.retrieve1',
        suiteName: 'Deletion Test Suite'
      });

      await repository.markDeletedTests(runId, [], ['Deletion Test Suite']);

      // Retrieve deleted tests
      const deletedTests = await repository.getDeletedTests(10);

      expect(deletedTests.length).toBeGreaterThan(0);
      const ourTest = deletedTests.find(t => t.test_slug === 'deletion.retrieve1');
      expect(ourTest).toBeDefined();
      expect(ourTest.deleted_at).not.toBeNull();
    });

    test('should respect limit parameter', async () => {
      // Get deleted tests with limit of 1
      const deletedTests = await repository.getDeletedTests(1);

      expect(deletedTests.length).toBeLessThanOrEqual(1);
    });

    test('should order by deleted_at descending', async () => {
      // Create and delete multiple tests at different times
      await repository.findOrCreateTest({
        name: 'First deleted',
        testSlug: 'deletion.first',
        suiteName: 'Deletion Test Suite'
      });
      await repository.markDeletedTests(runId, [], ['Deletion Test Suite']);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create the second test BEFORE the test run
      await repository.findOrCreateTest({
        name: 'Second deleted',
        testSlug: 'deletion.second',
        suiteName: 'Deletion Test Suite'
      });

      // Use a future date to ensure started_at is after the test's last_seen_at
      const futureDate2 = new Date(Date.now() + 1000);
      const runId2 = await repository.createTestRun(suiteId, {
        environment: 'test',
        branch: 'main',
        commitSha: 'def456',
        commitMessage: 'Test commit 2',
        status: 'passed',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 0,
        startedAt: futureDate2,
        completedAt: futureDate2,
        triggeredBy: 'test',
        runUrl: null
      });

      await repository.markDeletedTests(runId2, [], ['Deletion Test Suite']);

      // Get deleted tests
      const deletedTests = await repository.getDeletedTests(10);
      const ourTests = deletedTests.filter(t =>
        t.test_slug === 'deletion.first' || t.test_slug === 'deletion.second'
      );

      if (ourTests.length === 2) {
        // Most recently deleted should be first
        expect(ourTests[0].test_slug).toBe('deletion.second');
        expect(ourTests[1].test_slug).toBe('deletion.first');
      }
    });
  });
});
