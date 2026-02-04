/**
 * Migration: Add todo_tests column to test_runs table
 *
 * This migration adds support for tracking todo tests (test stubs)
 * - Adds todo_tests column to test_runs table
 * - Updates the valid_test_counts constraint to include todo tests
 */

export const shorthands = undefined;

export async function up(pgm) {
  // Add todo_tests column
  pgm.sql(`
    ALTER TABLE test_runs
    ADD COLUMN IF NOT EXISTS todo_tests INTEGER NOT NULL DEFAULT 0;
  `);

  // Drop the old constraint
  pgm.sql(`
    ALTER TABLE test_runs
    DROP CONSTRAINT IF EXISTS valid_test_counts;
  `);

  // Add updated constraint that includes todo tests
  pgm.sql(`
    ALTER TABLE test_runs
    ADD CONSTRAINT valid_test_counts CHECK (
      total_tests = passed_tests + failed_tests + skipped_tests + todo_tests
    );
  `);
}

export async function down(pgm) {
  // Drop the updated constraint
  pgm.sql(`
    ALTER TABLE test_runs
    DROP CONSTRAINT IF EXISTS valid_test_counts;
  `);

  // Add back the old constraint (without todo tests)
  pgm.sql(`
    ALTER TABLE test_runs
    ADD CONSTRAINT valid_test_counts CHECK (
      total_tests = passed_tests + failed_tests + skipped_tests
    );
  `);

  // Remove the todo_tests column
  pgm.sql(`
    ALTER TABLE test_runs
    DROP COLUMN IF EXISTS todo_tests;
  `);
}