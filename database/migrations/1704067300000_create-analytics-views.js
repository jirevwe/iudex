/* eslint-disable camelcase */

/**
 * Migration: Create Analytics Views
 *
 * Creates analytical views for test metrics and insights:
 * - latest_test_runs: Most recent test run per suite/environment
 * - endpoint_success_rates: Success rate statistics by endpoint
 * - flaky_tests: Tests that intermittently fail
 * - recent_regressions: Tests that were passing but now failing
 * - daily_test_stats: Daily test execution statistics
 * - test_health_scores: Multi-dimensional health metrics
 * - deleted_tests_summary: Historical context for deleted tests
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Latest test run per environment
  pgm.createView('latest_test_runs', {}, `
    SELECT DISTINCT ON (suite_id, environment)
      tr.*,
      ts.name as suite_name
    FROM test_runs tr
    JOIN test_suites ts ON tr.suite_id = ts.id
    ORDER BY suite_id, environment, started_at DESC
  `);

  // Test success rate by endpoint
  pgm.createView('endpoint_success_rates', {}, `
    SELECT
      t.endpoint,
      t.http_method,
      t.current_name,
      COUNT(*) as total_runs,
      SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) as passed_runs,
      SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
      ROUND(100.0 * SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      AVG(tr.response_time_ms) as avg_response_time_ms,
      MAX(tr.response_time_ms) as max_response_time_ms,
      MIN(tr.response_time_ms) as min_response_time_ms,
      t.last_seen_at
    FROM tests t
    JOIN test_results tr ON t.id = tr.test_id
    WHERE t.endpoint IS NOT NULL
    GROUP BY t.id, t.endpoint, t.http_method, t.current_name, t.last_seen_at
  `);

  // Flaky tests (tests that sometimes pass, sometimes fail)
  pgm.createView('flaky_tests', {}, `
    SELECT
      t.id as test_id,
      t.test_hash,
      t.current_name,
      t.endpoint,
      COUNT(*) as total_runs,
      SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) as passed_count,
      SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
      ROUND(100.0 * SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) / COUNT(*), 2) as failure_rate,
      MIN(tr.created_at) as first_failure,
      MAX(tr.created_at) as last_failure
    FROM tests t
    JOIN test_results tr ON t.id = tr.test_id
    WHERE tr.status IN ('passed', 'failed')
    GROUP BY t.id, t.test_hash, t.current_name, t.endpoint
    HAVING
      SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) > 0
      AND SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) > 0
      AND COUNT(*) >= 5
    ORDER BY failure_rate DESC
  `);

  // Regression detection (tests that were passing but now failing)
  pgm.createView('recent_regressions', {}, `
    WITH latest_results AS (
      SELECT DISTINCT ON (test_id)
        test_id,
        status as latest_status,
        created_at as latest_run
      FROM test_results
      ORDER BY test_id, created_at DESC
    ),
    previous_results AS (
      SELECT DISTINCT ON (tr.test_id)
        tr.test_id,
        tr.status as previous_status,
        tr.created_at as previous_run
      FROM test_results tr
      JOIN latest_results lr ON tr.test_id = lr.test_id
      WHERE tr.created_at < lr.latest_run
      ORDER BY tr.test_id, tr.created_at DESC
    )
    SELECT
      t.id as test_id,
      t.test_hash,
      t.current_name,
      t.endpoint,
      t.suite_name,
      lr.latest_status,
      pr.previous_status,
      lr.latest_run,
      pr.previous_run,
      lr.latest_run - pr.previous_run as regression_window
    FROM tests t
    JOIN latest_results lr ON t.id = lr.test_id
    JOIN previous_results pr ON t.id = pr.test_id
    WHERE lr.latest_status = 'failed'
      AND pr.previous_status = 'passed'
      AND lr.latest_run >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    ORDER BY lr.latest_run DESC
  `);

  // Daily test statistics
  pgm.createView('daily_test_stats', {}, `
    SELECT
      DATE(started_at) as test_date,
      environment,
      COUNT(*) as total_runs,
      SUM(total_tests) as total_tests,
      SUM(passed_tests) as total_passed,
      SUM(failed_tests) as total_failed,
      ROUND(100.0 * SUM(passed_tests) / NULLIF(SUM(total_tests), 0), 2) as pass_rate,
      AVG(duration_ms) as avg_duration_ms
    FROM test_runs
    GROUP BY DATE(started_at), environment
    ORDER BY test_date DESC, environment
  `);

  // Test health score (combines multiple metrics)
  pgm.createView('test_health_scores', {}, `
    SELECT
      t.id as test_id,
      t.test_hash,
      t.current_name,
      t.endpoint,
      t.total_runs,

      -- Success rate score (0-100)
      ROUND(
        100.0 * SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) as success_rate,

      -- Stability score (lower variance = more stable)
      CASE
        WHEN COUNT(*) < 5 THEN NULL -- Not enough data
        ELSE ROUND(100.0 - (STDDEV(CASE WHEN tr.status = 'passed' THEN 0 ELSE 1 END) * 100), 2)
      END as stability_score,

      -- Performance score (based on response time consistency)
      CASE
        WHEN AVG(tr.response_time_ms) IS NULL THEN NULL
        WHEN AVG(tr.response_time_ms) = 0 THEN 100
        ELSE ROUND(100.0 - (STDDEV(tr.response_time_ms) / NULLIF(AVG(tr.response_time_ms), 0) * 10), 2)
      END as performance_score,

      -- Overall health (average of all scores)
      ROUND(
        (
          COALESCE(100.0 * SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 0) +
          COALESCE(100.0 - (STDDEV(CASE WHEN tr.status = 'passed' THEN 0 ELSE 1 END) * 100), 0)
        ) / 2.0,
        2
      ) as overall_health_score,

      t.last_seen_at,
      t.last_status
    FROM tests t
    JOIN test_results tr ON t.id = tr.test_id
    GROUP BY t.id, t.test_hash, t.current_name, t.endpoint, t.total_runs, t.last_seen_at, t.last_status
    HAVING COUNT(*) >= 3 -- Need at least 3 runs for meaningful scores
    ORDER BY overall_health_score ASC
  `);

  // Deleted tests summary view
  pgm.createView('deleted_tests_summary', {}, `
    SELECT
      t.test_slug,
      t.current_name,
      t.suite_name,
      t.endpoint,
      t.http_method,
      t.first_seen_at,
      t.last_seen_at,
      t.deleted_at,
      t.total_runs,
      t.last_status,
      EXTRACT(DAY FROM (t.deleted_at - t.first_seen_at)) as days_lived,
      (
        SELECT COUNT(*)
        FROM test_results tr
        WHERE tr.test_id = t.id AND tr.status = 'passed'
      ) as total_passes,
      (
        SELECT COUNT(*)
        FROM test_results tr
        WHERE tr.test_id = t.id AND tr.status = 'failed'
      ) as total_failures
    FROM tests t
    WHERE t.deleted_at IS NOT NULL
    ORDER BY t.deleted_at DESC
  `);
};

export const down = (pgm) => {
  // Drop views in reverse order
  pgm.dropView('deleted_tests_summary', { ifExists: true, cascade: true });
  pgm.dropView('test_health_scores', { ifExists: true, cascade: true });
  pgm.dropView('daily_test_stats', { ifExists: true, cascade: true });
  pgm.dropView('recent_regressions', { ifExists: true, cascade: true });
  pgm.dropView('flaky_tests', { ifExists: true, cascade: true });
  pgm.dropView('endpoint_success_rates', { ifExists: true, cascade: true });
  pgm.dropView('latest_test_runs', { ifExists: true, cascade: true });
};
