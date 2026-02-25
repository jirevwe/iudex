/* eslint-disable camelcase */

/**
 * Migration: Create Core Tables
 *
 * Creates the foundational tables for the Iudex test tracking system:
 * - test_suites: Test collections or modules
 * - test_runs: Individual test execution runs
 * - tests: Unique test definitions tracked by slug
 * - test_history: Audit trail of test changes
 * - test_results: Immutable log of execution results
 *
 * Also includes indexes and triggers for automated timestamp updates.
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Create test_suites table
  pgm.createTable('test_suites', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true, unique: true },
    description: 'text',
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Create test_runs table
  pgm.createTable('test_runs', {
    id: 'id',
    suite_id: {
      type: 'integer',
      references: 'test_suites',
      onDelete: 'NO ACTION'
    },
    environment: { type: 'varchar(50)', notNull: true },
    branch: 'varchar(255)',
    commit_sha: 'varchar(40)',
    commit_message: 'text',
    status: { type: 'varchar(20)', notNull: true },
    total_tests: { type: 'integer', notNull: true, default: 0 },
    passed_tests: { type: 'integer', notNull: true, default: 0 },
    failed_tests: { type: 'integer', notNull: true, default: 0 },
    skipped_tests: { type: 'integer', notNull: true, default: 0 },
    duration_ms: { type: 'integer', notNull: true, default: 0 },
    started_at: { type: 'timestamp', notNull: true },
    completed_at: 'timestamp',
    triggered_by: 'varchar(255)',
    run_url: 'text',
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Add constraint for valid test counts
  pgm.addConstraint('test_runs', 'valid_test_counts', {
    check: 'total_tests = passed_tests + failed_tests + skipped_tests'
  });

  // Create tests table
  pgm.createTable('tests', {
    id: 'id',
    test_hash: { type: 'varchar(64)', notNull: true },
    test_slug: { type: 'varchar(512)', notNull: true, unique: true },
    current_name: { type: 'varchar(512)', notNull: true },
    current_description: 'text',
    suite_name: 'varchar(255)',
    test_file: 'varchar(255)',
    endpoint: 'varchar(500)',
    http_method: 'varchar(10)',
    first_seen_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    last_seen_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp', default: null },
    total_runs: { type: 'integer', default: 0 },
    last_status: 'varchar(20)',
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Create test_history table
  pgm.createTable('test_history', {
    id: 'id',
    test_id: {
      type: 'integer',
      notNull: true,
      references: 'tests',
      onDelete: 'CASCADE'
    },
    name: { type: 'varchar(512)', notNull: true },
    description: 'text',
    test_hash: { type: 'varchar(64)', notNull: true },
    valid_from: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    valid_to: 'timestamp',
    changed_by: 'varchar(255)',
    change_type: 'varchar(50)',
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Create test_results table
  pgm.createTable('test_results', {
    id: 'id',
    run_id: {
      type: 'integer',
      notNull: true,
      references: 'test_runs',
      onDelete: 'CASCADE'
    },
    test_id: {
      type: 'integer',
      notNull: true,
      references: 'tests',
      onDelete: 'NO ACTION'
    },
    test_name: { type: 'varchar(512)', notNull: true },
    test_description: 'text',
    test_hash: { type: 'varchar(64)', notNull: true },
    test_file: 'varchar(255)',
    endpoint: 'varchar(500)',
    http_method: 'varchar(10)',
    status: { type: 'varchar(20)', notNull: true },
    duration_ms: { type: 'integer', notNull: true, default: 0 },
    response_time_ms: 'integer',
    status_code: 'integer',
    error_message: 'text',
    error_type: 'varchar(255)',
    stack_trace: 'text',
    assertions_passed: 'integer',
    assertions_failed: 'integer',
    request_body: 'text',
    response_body: 'text',
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: 'timestamp'
  });

  // Add immutability constraint
  pgm.addConstraint('test_results', 'immutable_results', {
    check: 'updated_at IS NULL'
  });

  // Create indexes for test_runs
  pgm.createIndex('test_runs', 'environment', { name: 'idx_test_runs_environment' });
  pgm.createIndex('test_runs', 'branch', { name: 'idx_test_runs_branch' });
  pgm.createIndex('test_runs', 'status', { name: 'idx_test_runs_status' });
  pgm.createIndex('test_runs', 'started_at', {
    name: 'idx_test_runs_started_at',
    method: 'btree',
    order: 'DESC'
  });
  pgm.createIndex('test_runs', 'suite_id', { name: 'idx_test_runs_suite_id' });

  // Create indexes for tests
  pgm.createIndex('tests', 'test_hash', { name: 'idx_tests_hash' });
  pgm.createIndex('tests', 'test_slug', { name: 'idx_tests_slug' });
  pgm.createIndex('tests', 'current_name', { name: 'idx_tests_current_name' });
  pgm.createIndex('tests', 'suite_name', { name: 'idx_tests_suite_name' });
  pgm.createIndex('tests', 'endpoint', { name: 'idx_tests_endpoint' });
  pgm.createIndex('tests', 'last_seen_at', {
    name: 'idx_tests_last_seen',
    method: 'btree',
    order: 'DESC'
  });
  pgm.createIndex('tests', 'deleted_at', { name: 'idx_tests_deleted_at' });

  // Create indexes for test_history
  pgm.createIndex('test_history', 'test_id', { name: 'idx_test_history_test_id' });
  pgm.createIndex('test_history', ['valid_from', 'valid_to'], {
    name: 'idx_test_history_valid_range'
  });

  // Create indexes for test_results
  pgm.createIndex('test_results', 'run_id', { name: 'idx_test_results_run_id' });
  pgm.createIndex('test_results', 'test_id', { name: 'idx_test_results_test_id' });
  pgm.createIndex('test_results', 'test_hash', { name: 'idx_test_results_test_hash' });
  pgm.createIndex('test_results', 'status', { name: 'idx_test_results_status' });
  pgm.createIndex('test_results', 'endpoint', { name: 'idx_test_results_endpoint' });
  pgm.createIndex('test_results', 'created_at', {
    name: 'idx_test_results_created_at',
    method: 'btree',
    order: 'DESC'
  });

  // Create trigger function for updating updated_at timestamp
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;`
  );

  // Create triggers for test_suites
  pgm.createTrigger('test_suites', 'update_test_suites_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  // Create triggers for tests
  pgm.createTrigger('tests', 'update_tests_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

export const down = (pgm) => {
  // Drop triggers
  pgm.dropTrigger('tests', 'update_tests_updated_at', { ifExists: true });
  pgm.dropTrigger('test_suites', 'update_test_suites_updated_at', { ifExists: true });

  // Drop trigger function
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Drop tables in reverse order (respecting foreign keys)
  pgm.dropTable('test_results', { ifExists: true, cascade: true });
  pgm.dropTable('test_history', { ifExists: true, cascade: true });
  pgm.dropTable('tests', { ifExists: true, cascade: true });
  pgm.dropTable('test_runs', { ifExists: true, cascade: true });
  pgm.dropTable('test_suites', { ifExists: true, cascade: true });
};
