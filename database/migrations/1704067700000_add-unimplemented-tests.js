/**
 * Migration: Add todo_tests column to test_runs table
 *
 * This migration adds support for tracking todo tests (test stubs)
 * - Adds todo_tests column to test_runs table
 * - Updates the valid_test_counts constraint to include todo tests
 */

export async function up(client) {
  await client.query('BEGIN');

  try {
    // Add todo_tests column
    await client.query(`
      ALTER TABLE test_runs
      ADD COLUMN IF NOT EXISTS todo_tests INTEGER NOT NULL DEFAULT 0;
    `);

    // Drop the old constraint
    await client.query(`
      ALTER TABLE test_runs
      DROP CONSTRAINT IF EXISTS valid_test_counts;
    `);

    // Add updated constraint that includes todo tests
    await client.query(`
      ALTER TABLE test_runs
      ADD CONSTRAINT valid_test_counts CHECK (
        total_tests = passed_tests + failed_tests + skipped_tests + todo_tests
      );
    `);

    await client.query('COMMIT');
    console.log('✓ Added todo_tests column and updated constraint');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function down(client) {
  await client.query('BEGIN');

  try {
    // Drop the updated constraint
    await client.query(`
      ALTER TABLE test_runs
      DROP CONSTRAINT IF EXISTS valid_test_counts;
    `);

    // Add back the old constraint (without todo tests)
    await client.query(`
      ALTER TABLE test_runs
      ADD CONSTRAINT valid_test_counts CHECK (
        total_tests = passed_tests + failed_tests + skipped_tests
      );
    `);

    // Remove the todo_tests column
    await client.query(`
      ALTER TABLE test_runs
      DROP COLUMN IF EXISTS todo_tests;
    `);

    await client.query('COMMIT');
    console.log('✓ Removed todo_tests column and reverted constraint');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
