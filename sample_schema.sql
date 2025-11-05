-- API Testing Dashboard Database Schema
-- PostgreSQL

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS test_runs CASCADE;
DROP TABLE IF EXISTS test_suites CASCADE;

-- Test Suites (Collections/Modules)
CREATE TABLE test_suites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- 'postman' or 'pytest'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, test_type)
);

-- Test Runs (Each execution of tests)
CREATE TABLE test_runs (
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
    duration_seconds DECIMAL(10, 3),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    triggered_by VARCHAR(255), -- GitHub username or 'CI'
    run_url TEXT, -- GitHub Actions run URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_test_counts CHECK (
        total_tests = passed_tests + failed_tests + skipped_tests
    )
);

-- Test Results (Individual test results)
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_name VARCHAR(500) NOT NULL,
    test_file VARCHAR(255),
    endpoint VARCHAR(500),
    http_method VARCHAR(10), -- GET, POST, PUT, DELETE, etc.
    status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped', 'error'
    duration_seconds DECIMAL(10, 3),
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    error_type VARCHAR(255),
    stack_trace TEXT,
    assertions_passed INTEGER,
    assertions_failed INTEGER,
    request_body TEXT,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_test_runs_environment ON test_runs(environment);
CREATE INDEX idx_test_runs_branch ON test_runs(branch);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_started_at ON test_runs(started_at DESC);
CREATE INDEX idx_test_runs_suite_id ON test_runs(suite_id);

CREATE INDEX idx_test_results_run_id ON test_results(run_id);
CREATE INDEX idx_test_results_status ON test_results(status);
CREATE INDEX idx_test_results_test_name ON test_results(test_name);
CREATE INDEX idx_test_results_endpoint ON test_results(endpoint);
CREATE INDEX idx_test_results_http_method ON test_results(http_method);

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

-- Views for common queries

-- Latest test run per environment
CREATE OR REPLACE VIEW latest_test_runs AS
SELECT DISTINCT ON (suite_id, environment)
    tr.*,
    ts.name as suite_name,
    ts.test_type
FROM test_runs tr
JOIN test_suites ts ON tr.suite_id = ts.id
ORDER BY suite_id, environment, started_at DESC;

-- Test success rate by endpoint
CREATE OR REPLACE VIEW endpoint_success_rates AS
SELECT 
    endpoint,
    http_method,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_runs,
    ROUND(100.0 * SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    MIN(response_time_ms) as min_response_time_ms
FROM test_results
WHERE endpoint IS NOT NULL
GROUP BY endpoint, http_method;

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
    AVG(duration_seconds) as avg_duration_seconds
FROM test_runs
GROUP BY DATE(started_at), environment
ORDER BY test_date DESC, environment;

-- Flaky tests (tests that sometimes pass, sometimes fail)
CREATE OR REPLACE VIEW flaky_tests AS
SELECT 
    test_name,
    endpoint,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    ROUND(100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*), 2) as failure_rate
FROM test_results
WHERE status IN ('passed', 'failed')
GROUP BY test_name, endpoint
HAVING 
    SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) > 0 
    AND SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) > 0
    AND COUNT(*) >= 10
ORDER BY failure_rate DESC;

-- Insert sample data for testing
INSERT INTO test_suites (name, test_type, description) VALUES
('Users API', 'postman', 'Tests for user management endpoints'),
('Orders API', 'postman', 'Tests for order management endpoints'),
('Users API', 'pytest', 'Python tests for user management endpoints'),
('Orders API', 'pytest', 'Python tests for order management endpoints');

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE test_suites IS 'Test collections or modules';
COMMENT ON TABLE test_runs IS 'Individual test execution runs';
COMMENT ON TABLE test_results IS 'Individual test case results within a run';
COMMENT ON VIEW latest_test_runs IS 'Most recent test run for each suite and environment';
COMMENT ON VIEW endpoint_success_rates IS 'Success rate statistics grouped by endpoint';
COMMENT ON VIEW daily_test_stats IS 'Daily aggregated test statistics';
COMMENT ON VIEW flaky_tests IS 'Tests that intermittently fail';
