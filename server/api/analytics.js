/**
 * Analytics API
 * Provides PostgreSQL-backed analytics for test trends, flaky tests, and health metrics
 */

/**
 * Fetch analytics data from PostgreSQL
 * @param {Object} client - PostgreSQL client or query function
 * @param {string} type - Analytics type
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Analytics data
 */
export async function fetchAnalytics(client, type, options = {}) {
  const handlers = {
    'flaky-tests': fetchFlakyTests,
    'regressions': fetchRegressions,
    'health-scores': fetchHealthScores,
    'daily-stats': fetchDailyStats,
    'endpoint-rates': fetchEndpointRates
  };

  const handler = handlers[type];
  if (!handler) {
    throw new Error(`Unknown analytics type: ${type}`);
  }

  return await handler(client, options);
}

/**
 * Fetch flaky tests - tests with inconsistent pass/fail rates
 */
async function fetchFlakyTests(client, options = {}) {
  const { limit = 20, days = 30 } = options;

  const query = `
    WITH test_runs AS (
      SELECT
        test_name,
        test_slug,
        status,
        COUNT(*) as run_count
      FROM test_results
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY test_name, test_slug, status
    ),
    flaky_candidates AS (
      SELECT
        test_name,
        test_slug,
        SUM(run_count) as total_runs,
        SUM(CASE WHEN status = 'failed' THEN run_count ELSE 0 END) as failures,
        MAX(CASE WHEN status = 'failed' THEN timestamp END) as last_failure
      FROM test_results
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY test_name, test_slug
      HAVING SUM(CASE WHEN status = 'failed' THEN run_count ELSE 0 END) > 0
         AND SUM(CASE WHEN status = 'passed' THEN run_count ELSE 0 END) > 0
    )
    SELECT
      test_name,
      test_slug,
      total_runs,
      failures,
      ROUND((failures::numeric / total_runs), 2) as failure_rate,
      last_failure
    FROM flaky_candidates
    WHERE total_runs >= 5  -- Only tests with at least 5 runs
      AND (failures::numeric / total_runs) BETWEEN 0.1 AND 0.9  -- 10-90% failure rate
    ORDER BY failure_rate DESC, total_runs DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);

  return {
    available: true,
    data: result.rows.map(row => ({
      testName: row.test_name,
      testSlug: row.test_slug,
      totalRuns: parseInt(row.total_runs),
      failures: parseInt(row.failures),
      failureRate: parseFloat(row.failure_rate),
      lastFailure: row.last_failure
    }))
  };
}

/**
 * Fetch regressions - tests that recently started failing
 */
async function fetchRegressions(client, options = {}) {
  const { limit = 20, days = 7 } = options;

  const query = `
    WITH recent_failures AS (
      SELECT DISTINCT ON (test_slug)
        test_name,
        test_slug,
        status,
        timestamp,
        run_id
      FROM test_results
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      ORDER BY test_slug, timestamp DESC
    ),
    historical_status AS (
      SELECT
        test_slug,
        COUNT(CASE WHEN status = 'passed' THEN 1 END) as recent_passes,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as recent_failures
      FROM test_results
      WHERE timestamp BETWEEN NOW() - INTERVAL '${days * 2} days' AND NOW() - INTERVAL '${days} days'
      GROUP BY test_slug
    )
    SELECT
      rf.test_name,
      rf.test_slug,
      rf.timestamp as failure_timestamp,
      rf.run_id,
      hs.recent_passes as previous_passes
    FROM recent_failures rf
    LEFT JOIN historical_status hs ON rf.test_slug = hs.test_slug
    WHERE rf.status = 'failed'
      AND (hs.recent_passes > 5 OR hs.recent_failures = 0)
    ORDER BY rf.timestamp DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);

  return {
    available: true,
    data: result.rows.map(row => ({
      testName: row.test_name,
      testSlug: row.test_slug,
      failureTimestamp: row.failure_timestamp,
      runId: row.run_id,
      previousPasses: parseInt(row.previous_passes || 0)
    }))
  };
}

/**
 * Fetch health scores - overall test suite health metrics
 */
async function fetchHealthScores(client, options = {}) {
  const { days = 30 } = options;

  const query = `
    WITH daily_metrics AS (
      SELECT
        DATE_TRUNC('day', timestamp) as date,
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(duration) as avg_duration
      FROM test_results
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', timestamp)
    )
    SELECT
      date,
      total_tests,
      passed,
      failed,
      ROUND((passed::numeric / NULLIF(total_tests, 0)) * 100, 2) as pass_rate,
      ROUND(avg_duration) as avg_duration_ms
    FROM daily_metrics
    ORDER BY date DESC
  `;

  const result = await client.query(query);

  return {
    available: true,
    data: result.rows.map(row => ({
      date: row.date,
      totalTests: parseInt(row.total_tests),
      passed: parseInt(row.passed),
      failed: parseInt(row.failed),
      passRate: parseFloat(row.pass_rate || 0),
      avgDuration: parseInt(row.avg_duration_ms || 0)
    }))
  };
}

/**
 * Fetch daily statistics - aggregated test run stats by day
 */
async function fetchDailyStats(client, options = {}) {
  const { days = 30 } = options;

  const query = `
    SELECT
      DATE_TRUNC('day', timestamp) as date,
      COUNT(DISTINCT run_id) as total_runs,
      COUNT(*) as total_tests,
      COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_tests,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
      COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_tests,
      ROUND(AVG(duration)) as avg_duration
    FROM test_results
    WHERE timestamp > NOW() - INTERVAL '${days} days'
    GROUP BY DATE_TRUNC('day', timestamp)
    ORDER BY date DESC
  `;

  const result = await client.query(query);

  return {
    available: true,
    data: result.rows.map(row => ({
      date: row.date,
      totalRuns: parseInt(row.total_runs),
      totalTests: parseInt(row.total_tests),
      passed: parseInt(row.passed_tests),
      failed: parseInt(row.failed_tests),
      skipped: parseInt(row.skipped_tests),
      avgDuration: parseInt(row.avg_duration || 0)
    }))
  };
}

/**
 * Fetch endpoint success rates - API endpoint reliability
 */
async function fetchEndpointRates(client, options = {}) {
  const { limit = 20, days = 30 } = options;

  const query = `
    SELECT
      endpoint,
      method,
      COUNT(*) as total_calls,
      COUNT(CASE WHEN status = 'passed' THEN 1 END) as successful,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      ROUND((COUNT(CASE WHEN status = 'passed' THEN 1 END)::numeric / COUNT(*)) * 100, 2) as success_rate,
      ROUND(AVG(duration)) as avg_duration
    FROM test_results
    WHERE timestamp > NOW() - INTERVAL '${days} days'
      AND endpoint IS NOT NULL
    GROUP BY endpoint, method
    HAVING COUNT(*) >= 5  -- Only endpoints with at least 5 calls
    ORDER BY failed DESC, success_rate ASC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);

  return {
    available: true,
    data: result.rows.map(row => ({
      endpoint: row.endpoint,
      method: row.method,
      totalCalls: parseInt(row.total_calls),
      successful: parseInt(row.successful),
      failed: parseInt(row.failed),
      successRate: parseFloat(row.success_rate || 0),
      avgDuration: parseInt(row.avg_duration || 0)
    }))
  };
}

/**
 * Create a simple wrapper for MCP postgres tool or pg client
 */
export function createAnalyticsClient(queryFn) {
  return {
    query: async (sql, params = []) => {
      // Adapt to MCP or pg client
      if (typeof queryFn === 'function') {
        return await queryFn(sql, params);
      }
      throw new Error('Invalid query function provided');
    }
  };
}
