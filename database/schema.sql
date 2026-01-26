-- Iudex Framework Database Schema
-- PostgreSQL with Test Evolution Tracking
--
-- Key Concepts:
-- 1. Tests are identified by slug (auto-generated from name or explicit)
-- 2. Test results are immutable - a new row for each run
-- 3. Tests maintain stable identity via slug, allowing name changes
-- 4. Test hash stored for skip detection (not for evolution tracking)

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS test_history CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS test_runs CASCADE;
DROP TABLE IF EXISTS test_suites CASCADE;

-- Test Suites (Collections/Modules)
CREATE TABLE IF NOT EXISTS test_suites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Runs (Each execution of tests)
CREATE TABLE IF NOT EXISTS test_runs (
    id SERIAL PRIMARY KEY,
    suite_id INTEGER REFERENCES test_suites(id),
    environment VARCHAR(50) NOT NULL, -- dev, staging, prod
    branch VARCHAR(255),
    commit_sha VARCHAR(40),
    commit_message TEXT,
    status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'error'
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    skipped_tests INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    triggered_by VARCHAR(255), -- GitHub username or 'CI'
    run_url TEXT, -- GitHub Actions run URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_test_counts CHECK (
        total_tests = passed_tests + failed_tests + skipped_tests
    )
);

-- Tests (Unique test definitions tracked by slug)
-- This table tracks the IDENTITY of tests allowing names to change
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    test_hash VARCHAR(64) NOT NULL, -- SHA256(name + description) - for skip detection
    test_slug VARCHAR(512) NOT NULL, -- Human-readable ID (e.g., 'saas.users.onboarding.accept_terms')
    current_name VARCHAR(512) NOT NULL, -- Latest name
    current_description TEXT, -- Latest description
    suite_name VARCHAR(255), -- Which suite this test belongs to
    test_file VARCHAR(255), -- File path
    endpoint VARCHAR(500), -- API endpoint being tested
    http_method VARCHAR(10), -- GET, POST, PUT, DELETE, etc.

    -- Lifecycle
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_runs INTEGER DEFAULT 0,
    last_status VARCHAR(20), -- Latest status: 'passed', 'failed', 'skipped'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint on slug (primary identifier)
    UNIQUE(test_slug)
);

-- Test History (Tracks all name/description changes)
-- This gives us a complete audit trail of test evolution
CREATE TABLE IF NOT EXISTS  test_history (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    name VARCHAR(512) NOT NULL,
    description TEXT,
    test_hash VARCHAR(64) NOT NULL,
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP, -- NULL means current version
    changed_by VARCHAR(255), -- Who made the change
    change_type VARCHAR(50), -- 'updated', 'created'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Results (Individual test execution results - IMMUTABLE LOG)
-- Every test run creates a new row - we NEVER update test results
CREATE TABLE IF NOT EXISTS  test_results (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES tests(id), -- Links to test identity

    -- Denormalized for query performance (snapshot at time of run)
    test_name VARCHAR(512) NOT NULL,
    test_description TEXT,
    test_hash VARCHAR(64) NOT NULL,
    test_file VARCHAR(255),
    endpoint VARCHAR(500),
    http_method VARCHAR(10),

    -- Result data
    status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped', 'error'
    duration_ms INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    error_type VARCHAR(255),
    stack_trace TEXT,
    assertions_passed INTEGER,
    assertions_failed INTEGER,
    request_body TEXT,
    response_body TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    -- Prevent accidental updates
    CONSTRAINT immutable_results CHECK (updated_at IS NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_runs_environment ON test_runs(environment);
CREATE INDEX IF NOT EXISTS idx_test_runs_branch ON test_runs(branch);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite_id ON test_runs(suite_id);

CREATE INDEX IF NOT EXISTS idx_tests_hash ON tests(test_hash);
CREATE INDEX IF NOT EXISTS idx_tests_slug ON tests(test_slug);
CREATE INDEX IF NOT EXISTS idx_tests_current_name ON tests(current_name);
CREATE INDEX IF NOT EXISTS idx_tests_suite_name ON tests(suite_name);
CREATE INDEX IF NOT EXISTS idx_tests_endpoint ON tests(endpoint);
CREATE INDEX IF NOT EXISTS idx_tests_last_seen ON tests(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_history_test_id ON test_history(test_id);
CREATE INDEX IF NOT EXISTS idx_test_history_valid_range ON test_history(valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_hash ON test_results(test_hash);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_endpoint ON test_results(endpoint);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON test_suites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR ANALYTICS AND REGRESSION TRACKING
-- =====================================================

-- Latest test run per environment
CREATE OR REPLACE VIEW latest_test_runs AS
SELECT DISTINCT ON (suite_id, environment)
    tr.*,
    ts.name as suite_name
FROM test_runs tr
JOIN test_suites ts ON tr.suite_id = ts.id
ORDER BY suite_id, environment, started_at DESC;

-- Test success rate by endpoint (using test identity)
CREATE OR REPLACE VIEW endpoint_success_rates AS
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
GROUP BY t.id, t.endpoint, t.http_method, t.current_name, t.last_seen_at;

-- Flaky tests (tests that sometimes pass, sometimes fail)
-- Uses test identity to track across renames
CREATE OR REPLACE VIEW flaky_tests AS
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
ORDER BY failure_rate DESC;

-- Regression detection (tests that were passing but now failing)
CREATE OR REPLACE VIEW recent_regressions AS
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
ORDER BY lr.latest_run DESC;

-- Daily test statistics
CREATE OR REPLACE VIEW daily_test_stats AS
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
ORDER BY test_date DESC, environment;

-- Test health score (combines multiple metrics)
CREATE OR REPLACE VIEW test_health_scores AS
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
ORDER BY overall_health_score ASC;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample test suites
INSERT INTO test_suites (name, description) VALUES
('HTTPBin API', 'Tests for HTTPBin example endpoints'),
('Users API', 'Tests for user management endpoints');

-- Table comments
COMMENT ON TABLE test_suites IS 'Test collections or modules';
COMMENT ON TABLE test_runs IS 'Individual test execution runs';
COMMENT ON TABLE tests IS 'Unique test definitions tracked by slug - stable identity across renames';
COMMENT ON TABLE test_history IS 'Complete audit trail of test name/description changes';
COMMENT ON TABLE test_results IS 'Immutable log of test execution results';

COMMENT ON COLUMN tests.test_hash IS 'SHA256 hash of (name + description) - for skip detection';
COMMENT ON COLUMN tests.test_slug IS 'Human-readable stable ID (e.g., saas.users.onboarding.accept_terms) - auto-generated from name if not provided';

COMMENT ON VIEW latest_test_runs IS 'Most recent test run for each suite and environment';
COMMENT ON VIEW endpoint_success_rates IS 'Success rate statistics grouped by endpoint using test identity';
COMMENT ON VIEW flaky_tests IS 'Tests that intermittently fail - tracked via stable slugs';
COMMENT ON VIEW recent_regressions IS 'Tests that were passing but now failing (last 7 days)';
COMMENT ON VIEW test_health_scores IS 'Multi-dimensional health metrics for each test';
