-- Migration: Add deleted_at column to tests table
-- Date: 2026-01-26
-- Description: Add deletion tracking for tests removed from codebase

-- Add deleted_at column to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add index for performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_tests_deleted_at ON tests(deleted_at);

-- Create deleted tests summary view
CREATE OR REPLACE VIEW deleted_tests_summary AS
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
ORDER BY t.deleted_at DESC;

COMMENT ON COLUMN tests.deleted_at IS 'Timestamp when test was detected as deleted from codebase';
COMMENT ON VIEW deleted_tests_summary IS 'Tests that have been deleted from the codebase with historical context';
