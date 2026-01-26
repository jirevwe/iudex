// Iudex - Database Repository
// Data access layer with test evolution tracking and lineage management

import crypto from 'crypto';

export class TestRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  /**
   * Generate hash for test identity
   * @param {string} name - Test name
   * @param {string|null} description - Test description
   * @returns {string} SHA256 hash
   */
  generateTestHash(name, description = null) {
    const content = `${name}||${description || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create or get a test suite
   * @param {string} name - Suite name
   * @param {string|null} description - Suite description
   * @returns {number} suite_id
   */
  async createOrGetSuite(name, description = "") {
    const result = await this.db.query(
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
   * @param {number} suiteId - Test suite ID
   * @param {Object} runData - Run metadata
   * @returns {number} run_id
   */
  async createTestRun(suiteId, runData) {
    const result = await this.db.query(
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
   *
   * Algorithm:
   * 1. Try slug lookup
   * 2. If found → update name/description/hash, increment runs, return test_id
   * 3. If not found → create a new test record with slug
   *
   * @param {Object} testData - Test information
   * @param {Object|null} clientOrTransaction - Optional client for nested transactions
   * @returns {number} test_id
   */
  async findOrCreateTest(testData, clientOrTransaction = null) {
    const executeQuery = async (client) => {
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
   * @param {number} runId - Test run ID
   * @param {Object} testData - Test result data
   * @param {Object|null} clientOrTransaction - Optional client for nested transactions
   */
  async createTestResult(runId, testData, clientOrTransaction = null) {
    const executeQuery = async (client) => {
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

      const testHash = this.generateTestHash(testData.testName, testData.testDescription);

      // Insert the test result (immutable)
      await client.query(
        `INSERT INTO test_results (
          run_id, test_id, test_name, test_description, test_hash,
          test_file, endpoint, http_method,
          status, duration_ms, response_time_ms, status_code,
          error_message, error_type, stack_trace,
          assertions_passed, assertions_failed,
          request_body, response_body
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
          testData.responseBody
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
   * @param {string|null} environment - Optional environment filter
   * @param {number} limit - Number of results
   * @returns {Array} Test runs
   */
  async getLatestRuns(environment = null, limit = 10) {
    const query = environment
      ? `SELECT * FROM latest_test_runs WHERE environment = $1 ORDER BY started_at DESC LIMIT $2`
      : `SELECT * FROM latest_test_runs ORDER BY started_at DESC LIMIT $1`;
    const params = environment ? [environment, limit] : [limit];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get endpoint success rates
   * @returns {Array} Success rate stats by endpoint
   */
  async getEndpointSuccessRates() {
    const result = await this.db.query(
      `SELECT * FROM endpoint_success_rates ORDER BY success_rate ASC LIMIT 50`
    );
    return result.rows;
  }

  /**
   * Get flaky tests
   * @param {number} minRuns - Minimum number of runs to consider
   * @returns {Array} Flaky tests
   */
  async getFlakyTests(minRuns = 5) {
    const result = await this.db.query(
      `SELECT * FROM flaky_tests WHERE total_runs >= $1 ORDER BY failure_rate DESC`,
      [minRuns]
    );
    return result.rows;
  }

  /**
   * Get recent regressions
   * @returns {Array} Tests that regressed recently
   */
  async getRecentRegressions() {
    const result = await this.db.query(
      `SELECT * FROM recent_regressions ORDER BY latest_run DESC`
    );
    return result.rows;
  }

  /**
   * Get test health scores
   * @param {number} limit - Number of results
   * @returns {Array} Test health scores
   */
  async getTestHealthScores(limit = 50) {
    const result = await this.db.query(
      `SELECT * FROM test_health_scores
       ORDER BY overall_health_score ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get daily test statistics
   * @param {number} days - Number of days to retrieve
   * @returns {Array} Daily stats
   */
  async getDailyStats(days = 30) {
    const result = await this.db.query(
      `SELECT * FROM daily_test_stats
       WHERE test_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY test_date DESC, environment`
    );
    return result.rows;
  }

  /**
   * Search tests by name (fuzzy match)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Number of results
   * @returns {Array} Matching tests
   */
  async searchTests(searchTerm, limit = 20) {
    const result = await this.db.query(
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
   * @param {number} runId - Current test run ID
   * @param {Array<string>} currentTestSlugs - Test slugs that ran in this run
   * @param {Array<string>} suiteNames - Suite names that were executed
   * @param {Object|null} clientOrTransaction - Optional client for nested transactions
   * @returns {Array} Deleted tests
   */
  async markDeletedTests(runId, currentTestSlugs, suiteNames, clientOrTransaction = null) {
    const executeQuery = async (client) => {
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
        return result.rows;
      }

      // Build the NOT IN clause with placeholders
      const placeholders = currentTestSlugs.map((_, i) => `$${i + 2}`).join(',');
      const params = [suiteNames, ...currentTestSlugs, runId];

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

      return result.rows;
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
   * @param {number} limit - Maximum number of results
   * @returns {Array} Deleted tests
   */
  async getDeletedTests(limit = 10) {
    const result = await this.db.query(
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
