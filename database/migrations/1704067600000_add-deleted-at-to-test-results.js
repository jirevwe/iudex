/* eslint-disable camelcase */

/**
 * Migration: Add deleted_at to test_results
 *
 * Adds deleted_at column to test_results table to track per-run deletion status.
 * This fixes the design flaw where tests.deleted_at is global and causes
 * incorrect deletedAt values in historical run queries.
 *
 * Solution:
 * - Store deletion timestamp in test_results (per-run, immutable)
 * - Insert synthetic test_results rows for deleted tests
 * - Query simplifies to single SELECT from test_results
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Add deleted_at column to test_results
  pgm.addColumn('test_results', {
    deleted_at: {
      type: 'timestamp',
      default: null
    }
  });

  // Add index for deleted tests queries
  pgm.createIndex('test_results', 'deleted_at', {
    name: 'idx_test_results_deleted_at'
  });

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN test_results.deleted_at IS
    'Timestamp when this test was detected as deleted in this specific run. NULL means test ran normally.';
  `);
};

export const down = (pgm) => {
  // Drop index
  pgm.dropIndex('test_results', 'deleted_at', {
    name: 'idx_test_results_deleted_at',
    ifExists: true
  });

  // Drop column
  pgm.dropColumn('test_results', 'deleted_at', { ifExists: true });
};
