/**
 * Iudex - Database Repository
 * Data access layer with test evolution tracking and lineage management
 */

import crypto from 'crypto';
import type { DatabaseClient } from './client.js';
import type { TestStatus } from '../types/index.js';
import type pg from 'pg';

type PoolClient = pg.PoolClient;

/** Test run data for creation */
export interface TestRunData {
  environment?: string;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  status: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests?: number;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy?: string;
  runUrl?: string;
}

/** Test data for finding or creating tests */
export interface TestData {
  name: string;
  description?: string | null;
  testSlug: string;
  suiteName?: string | null;
  testFile?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
}

/** Test result data for recording */
export interface TestResultData {
  testName: string;
  testDescription?: string | null;
  testSlug: string;
  suiteName?: string | null;
  testFile?: string | null;
  endpoint?: string | null;
  httpMethod?: string | null;
  status: TestStatus;
  durationMs?: number | null;
  responseTimeMs?: number | null;
  statusCode?: number | null;
  errorMessage?: string | null;
  errorType?: string | null;
  stackTrace?: string | null;
  assertionsPassed?: number | null;
  assertionsFailed?: number | null;
  requestBody?: string | null;
  responseBody?: string | null;
  deletedAt?: Date | null;
}

/** Test run record from database */
export interface TestRunRecord {
  id: number;
  suite_id: number;
  environment?: string;
  branch?: string;
  commit_sha?: string;
  commit_message?: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  todo_tests?: number;
  duration_ms: number;
  started_at: Date;
  completed_at?: Date;
  triggered_by?: string;
  run_url?: string;
}

/** Endpoint success rate record */
export interface EndpointSuccessRate {
  endpoint: string;
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  success_rate: number;
}

/** Flaky test record */
export interface FlakyTest {
  test_id: number;
  test_name: string;
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  failure_rate: number;
}

/** Test health score record */
export interface TestHealthScore {
  test_id: number;
  test_name: string;
  overall_health_score: number;
  total_runs: number;
  last_status: string;
}

/** Daily test statistics record */
export interface DailyTestStats {
  test_date: Date;
  environment: string;
  total_runs: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
}

/** Test search result */
export interface TestSearchResult {
  id: number;
  test_hash: string;
  current_name: string;
  current_description?: string;
  suite_name?: string;
  endpoint?: string;
  total_runs: number;
  last_status?: string;
  last_seen_at?: Date;
}

/** Deleted test record */
export interface DeletedTest {
  id: number;
  test_slug: string;
  current_name: string;
  suite_name?: string;
  last_seen_at?: Date;
  deleted_at?: Date;
  total_runs: number;
}

/** Regression record */
export interface RegressionRecord {
  test_id: number;
  test_name: string;
  previous_status: string;
  current_status: string;
  latest_run: Date;
}

/**
 * Test Repository
 * Data access layer for test results and analytics
 */
export class TestRepository {
  public db: DatabaseClient;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient;
  }

  /**
   * Generate hash for test identity
   */
  generateTestHash(name: string, description: string | null = null): string {
    const content = `${name}||${description || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create or get a test suite
   */
  async createOrGetSuite(name: string, description: string = ""): Promise<number> {
    const result = await this.db.query<{ id: number }>(
      `INSERT INTO test_suites (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [name, description]
    );
    return result.rows[0].id;
  }

  /**
   * Create a test run record
   */
  async createTestRun(suiteId: number, runData: TestRunData): Promise<number> {
    const result = await this.db.query<{ id: number }>(
      `INSERT INTO test_runs (
        suite_id, environment, branch, commit_sha, commit_message,
        status, total_tests, passed_tests, failed_tests, skipped_tests,
        duration_ms, started_at, completed_at, triggered_by, run_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        suiteId,
        runData.environment,
        runData.branch,
        runData.commitSha,
        runData.commitMessage,
        runData.status,
        runData.totalTests,
        runData.passedTests,
        runData.failedTests,
        runData.skippedTests,
        runData.durationMs != null ? Math.round(runData.durationMs) : 0,
        runData.startedAt,
        runData.completedAt,
        runData.triggeredBy,
        runData.runUrl
      ]
    );
    return result.rows[0].id;
  }

  /**
   * Find or create a test record using slug-based identity
   * Tests are always identified by slug (auto-generated or explicit)
   */
  async findOrCreateTest(testData: TestData, clientOrTransaction: PoolClient | null = null): Promise<number> {
    const executeQuery = async (client: PoolClient): Promise<number> => {
      const {
        name,
        description = null,
        testSlug,
        suiteName = null,
        testFile = null,
        endpoint = null,
        httpMethod = null
      } = testData;

      if (!testSlug) {
        throw new Error('testSlug is required for test identification');
      }

      const testHash = this.generateTestHash(name, description);

      // 1. Try slug lookup
      let result = await client.query(
        `SELECT id FROM tests WHERE test_slug = $1`,
        [testSlug]
      );

      if (result.rows.length > 0) {
        const testId = result.rows[0].id;

        // Update test metadata (name/description/suite/file may have changed)
        // Also clear deleted_at if test was previously marked as deleted (resurrection)
        await client.query(
          `UPDATE tests
           SET current_name = $1,
               current_description = $2,
               test_hash = $3,
               suite_name = $4,
               test_file = $5,
               last_seen_at = CURRENT_TIMESTAMP,
               total_runs = total_runs + 1,
               endpoint = COALESCE($6, endpoint),
               http_method = COALESCE($7, http_method),
               deleted_at = NULL
           WHERE id = $8`,
          [name, description, testHash, suiteName, testFile, endpoint, httpMethod, testId]
        );

        // Record name/description change in history if hash changed
        const hashResult = await client.query(
          `SELECT test_hash FROM test_history
           WHERE test_id = $1 AND valid_to IS NULL`,
          [testId]
        );

        if (hashResult.rows.length > 0 && hashResult.rows[0].test_hash !== testHash) {
          // Close previous history entry
          await client.query(
            `UPDATE test_history
             SET valid_to = CURRENT_TIMESTAMP
             WHERE test_id = $1 AND valid_to IS NULL`,
            [testId]
          );

          // Create new history entry
          await client.query(
            `INSERT INTO test_history (
              test_id, name, description, test_hash,
              valid_from, change_type
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'updated')`,
            [testId, name, description, testHash]
          );
        }

        return testId;
      }

      // 2. Create a new test record
      result = await client.query(
        `INSERT INTO tests (
          test_hash, test_slug, current_name, current_description,
          suite_name, test_file, endpoint, http_method,
          first_seen_at, last_seen_at, total_runs
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
        RETURNING id`,
        [
          testHash,
          testSlug,
          name,
          description,
          suiteName,
          testFile,
          endpoint,
          httpMethod
        ]
      );

      const newTestId = result.rows[0].id;

      // 3. Record in test_history
      await client.query(
        `INSERT INTO test_history (
          test_id, name, description, test_hash,
          valid_from, change_type
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'created')`,
        [newTestId, name, description, testHash]
      );

      return newTestId;
    };

    // If called within an existing transaction, use that client
    if (clientOrTransaction) {
      return executeQuery(clientOrTransaction);
    }

    // Otherwise, create new transaction
    return this.db.transaction(executeQuery);
  }

  /**
   * Create a test result record (immutable)
   */
  async createTestResult(runId: number, testData: TestResultData, clientOrTransaction: PoolClient | null = null): Promise<void> {
    const executeQuery = async (client: PoolClient): Promise<void> => {
      // First, find or create the test record (pass client for nested transaction)
      const testId = await this.findOrCreateTest({
        name: testData.testName,
        description: testData.testDescription,
        testSlug: testData.testSlug,
        suiteName: testData.suiteName,
        testFile: testData.testFile,
        endpoint: testData.endpoint,
        httpMethod: testData.httpMethod
      }, client);

      const testHash = this.generateTestHash(testData.testName, testData.testDescription ?? null);

      // Insert the test result (immutable)
      await client.query(
        `INSERT INTO test_results (
          run_id, test_id, test_name, test_description, test_hash,
          test_file, endpoint, http_method,
          status, duration_ms, response_time_ms, status_code,
          error_message, error_type, stack_trace,
          assertions_passed, assertions_failed,
          request_body, response_body, deleted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          runId,
          testId,
          testData.testName,
          testData.testDescription,
          testHash,
          testData.testFile,
          testData.endpoint,
          testData.httpMethod,
          testData.status,
          testData.durationMs != null ? Math.round(testData.durationMs) : 0,
          testData.responseTimeMs != null ? Math.round(testData.responseTimeMs) : null,
          testData.statusCode,
          testData.errorMessage,
          testData.errorType,
          testData.stackTrace,
          testData.assertionsPassed,
          testData.assertionsFailed,
          testData.requestBody,
          testData.responseBody,
          testData.deletedAt || null
        ]
      );

      // Update test's last status
      await client.query(
        `UPDATE tests
         SET last_status = $1
         WHERE id = $2`,
        [testData.status, testId]
      );
    };

    // If called within an existing transaction, use that client
    if (clientOrTransaction) {
      return executeQuery(clientOrTransaction);
    }

    // Otherwise, create new transaction
    return this.db.transaction(executeQuery);
  }

  /**
   * Get latest test runs
   */
  async getLatestRuns(environment: string | null = null, limit: number = 10): Promise<TestRunRecord[]> {
    const query = environment
      ? `SELECT * FROM latest_test_runs WHERE environment = $1 ORDER BY started_at DESC LIMIT $2`
      : `SELECT * FROM latest_test_runs ORDER BY started_at DESC LIMIT $1`;
    const params = environment ? [environment, limit] : [limit];
    const result = await this.db.query<TestRunRecord>(query, params);
    return result.rows;
  }

  /**
   * Get endpoint success rates
   */
  async getEndpointSuccessRates(): Promise<EndpointSuccessRate[]> {
    const result = await this.db.query<EndpointSuccessRate>(
      `SELECT * FROM endpoint_success_rates ORDER BY success_rate ASC LIMIT 50`
    );
    return result.rows;
  }

  /**
   * Get flaky tests
   */
  async getFlakyTests(minRuns: number = 5): Promise<FlakyTest[]> {
    const result = await this.db.query<FlakyTest>(
      `SELECT * FROM flaky_tests WHERE total_runs >= $1 ORDER BY failure_rate DESC`,
      [minRuns]
    );
    return result.rows;
  }

  /**
   * Get recent regressions
   */
  async getRecentRegressions(): Promise<RegressionRecord[]> {
    const result = await this.db.query<RegressionRecord>(
      `SELECT * FROM recent_regressions ORDER BY latest_run DESC`
    );
    return result.rows;
  }

  /**
   * Get test health scores
   */
  async getTestHealthScores(limit: number = 50): Promise<TestHealthScore[]> {
    const result = await this.db.query<TestHealthScore>(
      `SELECT * FROM test_health_scores
       ORDER BY overall_health_score ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get daily test statistics
   */
  async getDailyStats(days: number = 30): Promise<DailyTestStats[]> {
    const result = await this.db.query<DailyTestStats>(
      `SELECT * FROM daily_test_stats
       WHERE test_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY test_date DESC, environment`
    );
    return result.rows;
  }

  /**
   * Search tests by name (fuzzy match)
   */
  async searchTests(searchTerm: string, limit: number = 20): Promise<TestSearchResult[]> {
    const result = await this.db.query<TestSearchResult>(
      `SELECT
        id, test_hash, current_name, current_description,
        suite_name, endpoint, total_runs, last_status, last_seen_at
       FROM tests
       WHERE current_name ILIKE $1
       ORDER BY last_seen_at DESC
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    return result.rows;
  }

  /**
   * Mark tests as deleted if they didn't appear in the current run
   */
  async markDeletedTests(
    runId: number,
    currentTestSlugs: string[],
    suiteNames: string[],
    clientOrTransaction: PoolClient | null = null
  ): Promise<DeletedTest[]> {
    const executeQuery = async (client: PoolClient): Promise<DeletedTest[]> => {
      // Handle empty currentTestSlugs case
      if (currentTestSlugs.length === 0) {
        // If no tests ran, mark all tests in the suite as deleted
        const result = await client.query(
          `UPDATE tests
           SET deleted_at = CURRENT_TIMESTAMP
           WHERE suite_name = ANY($1)
             AND deleted_at IS NULL
             AND last_seen_at < (
               SELECT started_at FROM test_runs WHERE id = $2
             )
           RETURNING id, test_slug, current_name, suite_name`,
          [suiteNames, runId]
        );
        return result.rows as DeletedTest[];
      }

      // Build the NOT IN clause with placeholders
      const placeholders = currentTestSlugs.map((_, i) => `$${i + 2}`).join(',');
      const params: (string[] | string | number)[] = [suiteNames, ...currentTestSlugs, runId];

      const result = await client.query(
        `UPDATE tests
         SET deleted_at = CURRENT_TIMESTAMP
         WHERE suite_name = ANY($1)
           AND test_slug NOT IN (${placeholders})
           AND deleted_at IS NULL
           AND last_seen_at < (
             SELECT started_at FROM test_runs WHERE id = $${currentTestSlugs.length + 2}
           )
         RETURNING id, test_slug, current_name, suite_name`,
        params
      );

      return result.rows as DeletedTest[];
    };

    // If called within an existing transaction, use that client
    if (clientOrTransaction) {
      return executeQuery(clientOrTransaction);
    }

    // Can be called standalone or within transaction
    return this.db.transaction(executeQuery);
  }

  /**
   * Get tests that were marked as deleted
   */
  async getDeletedTests(limit: number = 10): Promise<DeletedTest[]> {
    const result = await this.db.query<DeletedTest>(
      `SELECT
        id,
        test_slug,
        current_name,
        suite_name,
        last_seen_at,
        deleted_at,
        total_runs
       FROM tests
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

export default TestRepository;
