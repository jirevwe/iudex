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
   * @param {string} description - Test description
   * @returns {string} SHA256 hash
   */
  generateTestHash(name, description = '') {
    const content = `${name}||${description || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create or get a test suite
   * @param {string} name - Suite name
   * @param {string} description - Suite description
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
        runData.durationSeconds,
        runData.startedAt,
        runData.completedAt,
        runData.triggeredBy,
        runData.runUrl
      ]
    );
    return result.rows[0].id;
  }

  /**
   * Find or create a test record with evolution tracking
   * This is the core of test identity management
   *
   * Algorithm:
   * 1. Compute hash of (name + description)
   * 2. Look for exact hash match
   * 3. If found, update last_seen_at and return test_id
   * 4. If not found, look for similar test by name (potential evolution)
   * 5. If similar test found, create new test record linked via previous_test_id
   * 6. If no similar test, create new test record
   *
   * @param {Object} testData - Test information
   * @returns {number} test_id
   */
  async findOrCreateTest(testData) {
    const {
      name,
      description = null,
      suiteName = null,
      testFile = null,
      endpoint = null,
      httpMethod = null
    } = testData;

    const testHash = this.generateTestHash(name, description);

    // 1. Try exact hash match (test unchanged)
    let result = await this.db.query(
      `SELECT id FROM tests WHERE test_hash = $1`,
      [testHash]
    );

    if (result.rows.length > 0) {
      const testId = result.rows[0].id;

      // Update last_seen_at
      await this.db.query(
        `UPDATE tests
         SET last_seen_at = CURRENT_TIMESTAMP,
             total_runs = total_runs + 1
         WHERE id = $1`,
        [testId]
      );

      return testId;
    }

    // 2. Look for similar test by exact name match (potential evolution)
    result = await this.db.query(
      `SELECT id, test_hash, current_name, current_description
       FROM tests
       WHERE current_name = $1
       AND suite_name = $2
       ORDER BY last_seen_at DESC
       LIMIT 1`,
      [name, suiteName]
    );

    let previousTestId = null;
    let evolutionReason = null;

    if (result.rows.length > 0) {
      const previousTest = result.rows[0];
      previousTestId = previousTest.id;

      // Determine what changed
      const nameChanged = previousTest.current_name !== name;
      const descChanged = (previousTest.current_description || '') !== (description || '');

      if (nameChanged && descChanged) {
        evolutionReason = 'both_changed';
      } else if (nameChanged) {
        evolutionReason = 'name_changed';
      } else if (descChanged) {
        evolutionReason = 'description_changed';
      }
    }

    // 3. Create new test record
    result = await this.db.query(
      `INSERT INTO tests (
        test_hash, current_name, current_description,
        suite_name, test_file, endpoint, http_method,
        previous_test_id, evolution_reason,
        first_seen_at, last_seen_at, total_runs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      RETURNING id`,
      [
        testHash,
        name,
        description,
        suiteName,
        testFile,
        endpoint,
        httpMethod,
        previousTestId,
        evolutionReason
      ]
    );

    const newTestId = result.rows[0].id;

    // 4. Record in test_history
    await this.db.query(
      `INSERT INTO test_history (
        test_id, name, description, test_hash,
        valid_from, change_type
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
      [
        newTestId,
        name,
        description,
        testHash,
        evolutionReason || 'created'
      ]
    );

    // 5. If this evolved from a previous test, update the history
    if (previousTestId) {
      await this.db.query(
        `UPDATE test_history
         SET valid_to = CURRENT_TIMESTAMP
         WHERE test_id = $1 AND valid_to IS NULL`,
        [previousTestId]
      );
    }

    return newTestId;
  }

  /**
   * Create a test result record (immutable)
   * @param {number} runId - Test run ID
   * @param {Object} testData - Test result data
   */
  async createTestResult(runId, testData) {
    // First, find or create the test record
    const testId = await this.findOrCreateTest({
      name: testData.testName,
      description: testData.testDescription,
      suiteName: testData.suiteName,
      testFile: testData.testFile,
      endpoint: testData.endpoint,
      httpMethod: testData.httpMethod
    });

    const testHash = this.generateTestHash(testData.testName, testData.testDescription);

    // Insert the test result (immutable)
    await this.db.query(
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
        testData.durationSeconds,
        testData.responseTimeMs,
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
    await this.db.query(
      `UPDATE tests
       SET last_status = $1
       WHERE id = $2`,
      [testData.status, testId]
    );
  }

  /**
   * Get latest test runs
   * @param {string} environment - Optional environment filter
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
   * Get complete test history including all evolved versions
   * @param {number} testId - Test ID
   * @returns {Array} Complete test history across all versions
   */
  async getTestCompleteHistory(testId) {
    const result = await this.db.query(
      `SELECT * FROM get_test_complete_history($1)`,
      [testId]
    );
    return result.rows;
  }

  /**
   * Get test evolution chain
   * @param {number} testId - Test ID
   * @returns {Array} Evolution lineage
   */
  async getTestEvolutionChain(testId) {
    const result = await this.db.query(
      `SELECT * FROM test_evolution_chain
       WHERE current_test_id = $1
       ORDER BY generation`,
      [testId]
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
}
