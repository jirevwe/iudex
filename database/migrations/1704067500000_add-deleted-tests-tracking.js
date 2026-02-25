/* eslint-disable camelcase */

/**
 * Migration: Add Deleted Tests Tracking
 *
 * Adds deleted_test_ids column to test_runs table to track which tests
 * were deleted/missing in each specific run. This prevents deleted tests
 * from appearing as deleted in historical runs where they actually executed.
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Add deleted_test_ids column
  pgm.addColumn('test_runs', {
    deleted_test_ids: {
      type: 'jsonb',
      default: pgm.func("'[]'::jsonb")
    }
  });

  // Add GIN index for efficient JSONB querying
  pgm.createIndex('test_runs', 'deleted_test_ids', {
    name: 'idx_test_runs_deleted_test_ids',
    method: 'gin'
  });

  // Add column comment
  pgm.sql(`
    COMMENT ON COLUMN test_runs.deleted_test_ids IS
    'Array of test IDs that were deleted/missing in this specific run'
  `);
};

export const down = (pgm) => {
  // Remove comment
  pgm.sql(`
    COMMENT ON COLUMN test_runs.deleted_test_ids IS NULL
  `);

  // Drop index
  pgm.dropIndex('test_runs', 'deleted_test_ids', {
    name: 'idx_test_runs_deleted_test_ids',
    ifExists: true
  });

  // Drop column
  pgm.dropColumn('test_runs', 'deleted_test_ids', { ifExists: true });
};
