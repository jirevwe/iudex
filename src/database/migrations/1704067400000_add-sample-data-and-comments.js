/* eslint-disable camelcase */

/**
 * Migration: Add Sample Data and Comments
 *
 * Adds:
 * - Sample test suites for testing and documentation
 * - Descriptive comments on tables, columns, and views
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Insert sample test suites
  pgm.sql(`
    INSERT INTO test_suites (name, description) VALUES
    ('HTTPBin API', 'Tests for HTTPBin example endpoints'),
    ('Users API', 'Tests for user management endpoints')
  `);

  // Add table comments
  pgm.sql(`
    COMMENT ON TABLE test_suites IS 'Test collections or modules';
    COMMENT ON TABLE test_runs IS 'Individual test execution runs';
    COMMENT ON TABLE tests IS 'Unique test definitions tracked by slug - stable identity across renames';
    COMMENT ON TABLE test_history IS 'Complete audit trail of test name/description changes';
    COMMENT ON TABLE test_results IS 'Immutable log of test execution results'
  `);

  // Add column comments
  pgm.sql(`
    COMMENT ON COLUMN tests.test_hash IS 'SHA256 hash of (name + description) - for skip detection';
    COMMENT ON COLUMN tests.test_slug IS 'Human-readable stable ID (e.g., saas.users.onboarding.accept_terms) - auto-generated from name if not provided'
  `);

  // Add view comments
  pgm.sql(`
    COMMENT ON VIEW latest_test_runs IS 'Most recent test run for each suite and environment';
    COMMENT ON VIEW endpoint_success_rates IS 'Success rate statistics grouped by endpoint using test identity';
    COMMENT ON VIEW flaky_tests IS 'Tests that intermittently fail - tracked via stable slugs';
    COMMENT ON VIEW recent_regressions IS 'Tests that were passing but now failing (last 7 days)';
    COMMENT ON VIEW test_health_scores IS 'Multi-dimensional health metrics for each test';
    COMMENT ON VIEW deleted_tests_summary IS 'Tests that have been deleted from the codebase with historical context'
  `);
};

export const down = (pgm) => {
  // Remove comments (set to NULL)
  pgm.sql(`
    COMMENT ON TABLE test_suites IS NULL;
    COMMENT ON TABLE test_runs IS NULL;
    COMMENT ON TABLE tests IS NULL;
    COMMENT ON TABLE test_history IS NULL;
    COMMENT ON TABLE test_results IS NULL;
    COMMENT ON COLUMN tests.test_hash IS NULL;
    COMMENT ON COLUMN tests.test_slug IS NULL;
    COMMENT ON VIEW latest_test_runs IS NULL;
    COMMENT ON VIEW endpoint_success_rates IS NULL;
    COMMENT ON VIEW flaky_tests IS NULL;
    COMMENT ON VIEW recent_regressions IS NULL;
    COMMENT ON VIEW test_health_scores IS NULL;
    COMMENT ON VIEW deleted_tests_summary IS NULL
  `);

  // Remove sample data
  pgm.sql(`
    DELETE FROM test_suites WHERE name IN ('HTTPBin API', 'Users API')
  `);
};
