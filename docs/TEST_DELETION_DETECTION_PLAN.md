# Plan: Implement Test Deletion Detection

## Current State Analysis

**Problem**: The framework currently has NO affordance for detecting when a test is deleted from the codebase.

**What exists today**:
- Tests are uniquely identified by `test_slug` (e.g., `saas.ui.should-display-welcome-message`)
- The `tests` table tracks `first_seen_at` and `last_seen_at` timestamps
- When a test runs, `last_seen_at` is updated to `CURRENT_TIMESTAMP`
- If a test is removed from code, it simply stops appearing in runs - the old record persists with a stale `last_seen_at`
- There's no explicit "deleted" flag or reporting mechanism

**Why this matters**:
- Teams need to know when tests are removed (intentionally or accidentally)
- Deleted tests may indicate removed features or deprecated functionality
- Historical data for deleted tests should be preserved for audit purposes
- Test coverage metrics need to account for test deletion

## Solution Design

### Overview
Add deletion detection by:
1. Tracking which test slugs appear in each test run
2. After a run completes, comparing current tests vs. previously seen tests for the same suite
3. Marking tests that didn't appear as "deleted" with a `deleted_at` timestamp
4. Reporting deleted tests in console output and analytics

### Key Implementation Details

#### 1. Database Schema Changes

**File**: `database/schema.sql`

Add a `deleted_at` column to the `tests` table:

```sql
ALTER TABLE tests ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
CREATE INDEX idx_tests_deleted_at ON tests(deleted_at);
```

**Migration approach**:
- Add column to schema file
- Create a migration script in `database/migrations/002_add_deleted_at.sql`
- Update schema setup to run migrations

#### 2. Repository Layer - Detection Logic

**File**: `database/repository.js`

Add a new method `markDeletedTests(runId, currentTestSlugs, suiteNames)`:

```javascript
/**
 * Mark tests as deleted if they didn't appear in the current run
 * @param {number} runId - Current test run ID
 * @param {Array<string>} currentTestSlugs - Test slugs that ran in this run
 * @param {Array<string>} suiteNames - Suite names that were executed
 */
async markDeletedTests(runId, currentTestSlugs, suiteNames) {
  // Find tests that:
  // 1. Belong to one of the executed suites
  // 2. Were NOT in the current run (slug not in currentTestSlugs)
  // 3. Are not already marked as deleted (deleted_at IS NULL)
  // 4. Were seen before (last_seen_at < run start time)

  const result = await this.db.query(`
    UPDATE tests
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE suite_name = ANY($1)
      AND test_slug NOT IN (${currentTestSlugs.map((_, i) => `$${i + 2}`).join(',')})
      AND deleted_at IS NULL
      AND last_seen_at < (
        SELECT started_at FROM test_runs WHERE id = $${currentTestSlugs.length + 2}
      )
    RETURNING id, test_slug, current_name, suite_name
  `, [suiteNames, ...currentTestSlugs, runId]);

  return result.rows;
}
```

Add a query method to retrieve deleted tests:

```javascript
/**
 * Get tests that were marked as deleted
 * @param {number} limit - Maximum number of results
 * @returns {Array} Deleted tests
 */
async getDeletedTests(limit = 10) {
  const result = await this.db.query(`
    SELECT
      id,
      test_slug,
      current_name,
      suite_name,
      last_seen_at,
      deleted_at,
      total_runs
    FROM tests
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}
```

#### 3. PostgreSQL Reporter - Trigger Detection

**File**: `reporters/postgres.js`

Update the `report()` method to call deletion detection after persisting test results:

```javascript
async report(collector) {
  // ... existing code to persist results ...

  // After creating test results (line 121, after the for loop):

  // Track deletion: collect current test slugs and suite names
  const testResults = collector.getAllResults();
  const currentTestSlugs = testResults
    .map(r => r.testId)
    .filter(slug => slug != null);

  const suiteNames = [...new Set(testResults.map(r => r.suite))];

  // Mark tests as deleted if they didn't appear in this run
  const deletedTests = await this.repository.markDeletedTests(
    runId,
    currentTestSlugs,
    suiteNames
  );

  if (deletedTests.length > 0) {
    console.log(`\n🗑️  Deleted tests detected: ${deletedTests.length}`);
    deletedTests.forEach(test => {
      console.log(`   - ${test.current_name} (${test.test_slug})`);
    });
  }

  // ... rest of existing code ...
}
```

Update `showAnalytics()` to include deleted tests:

```javascript
async showAnalytics() {
  // ... existing analytics code ...

  // Get recently deleted tests
  const deletedTests = await this.repository.getDeletedTests(5);
  if (deletedTests.length > 0) {
    console.log(`\n🗑️  Recently deleted tests: ${deletedTests.length}`);
    deletedTests.slice(0, 3).forEach(test => {
      console.log(`   - ${test.current_name} (last seen: ${test.last_seen_at})`);
    });
  }
}
```

#### 4. Analytics View for Deleted Tests

**File**: `database/schema.sql`

Add a view to show deleted tests with useful context:

```sql
-- View: Deleted Tests Summary
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
```

## Critical Files to Modify

1. **database/schema.sql** (lines 52-74)
   - Add `deleted_at TIMESTAMP DEFAULT NULL` column to `tests` table
   - Add index on `deleted_at` for performance
   - Add `deleted_tests_summary` view

2. **database/migrations/** (new directory)
   - Create `001_initial_schema.sql` (current schema)
   - Create `002_add_deleted_at.sql` (migration for new column)

3. **database/repository.js** (after line 248)
   - Add `markDeletedTests(runId, currentTestSlugs, suiteNames)` method
   - Add `getDeletedTests(limit)` method

4. **reporters/postgres.js** (lines 96-121)
   - After persisting test results, call deletion detection
   - Update console output to show deleted tests
   - Update `showAnalytics()` to include deleted tests (line 143)

5. **reporters/postgres.js** (lines 184-225)
   - Add 'deleted_tests' case to `getAnalytics()` method

## Edge Cases to Handle

1. **Suite-level detection**: Only mark tests as deleted if their suite was executed
   - Don't mark tests as deleted if their suite wasn't part of the run
   - Example: If only `saas.api` suite runs, don't mark `saas.ui` tests as deleted

2. **Resurrection**: If a "deleted" test reappears in a later run
   - Set `deleted_at` back to `NULL`
   - Update in `findOrCreateTest()` method (line 113-125)

3. **Empty test files**: If a test file exists but has no tests
   - This is handled automatically (no tests = no slugs in current run)

4. **Test slug changes**: If a test's slug changes (rename with new explicit ID)
   - Old slug will be marked deleted
   - New slug will be created as a new test
   - This is expected behavior (different identity = different test)

## Testing Strategy

### Manual Testing with "should display welcome message"

**Test file**: `examples/httpbin.test.js` (line 5-7)

**Test slug**: `saas.ui.should-display-welcome-message`

#### Step 1: Establish Baseline
```bash
# Ensure PostgreSQL is running and configured
node cli/index.js run examples/httpbin.test.js

# Verify test appears in database
psql -d iudex -c "SELECT test_slug, current_name, deleted_at FROM tests WHERE test_slug = 'saas.ui.should-display-welcome-message';"
# Expected: deleted_at = NULL
```

#### Step 2: Remove Test and Re-run
```bash
# Manually remove the test from httpbin.test.js (lines 5-7)
# Keep the describe block, just remove the test() call

node cli/index.js run examples/httpbin.test.js

# Expected console output:
# 🗑️  Deleted tests detected: 1
#    - should display welcome message (saas.ui.should-display-welcome-message)

# Verify in database
psql -d iudex -c "SELECT test_slug, current_name, last_seen_at, deleted_at FROM tests WHERE test_slug = 'saas.ui.should-display-welcome-message';"
# Expected: deleted_at = <recent timestamp>
```

#### Step 3: Test Resurrection
```bash
# Re-add the test to httpbin.test.js

node cli/index.js run examples/httpbin.test.js

# Verify deletion flag is cleared
psql -d iudex -c "SELECT test_slug, current_name, deleted_at FROM tests WHERE test_slug = 'saas.ui.should-display-welcome-message';"
# Expected: deleted_at = NULL (resurrected)
```

#### Step 4: Test Suite Isolation
```bash
# Remove test from saas.ui suite

# Run only saas.api suite (or other suite)
# Verify saas.ui test is NOT marked as deleted (suite wasn't run)

# Run saas.ui suite specifically
# NOW verify test IS marked as deleted
```

### Automated Test Coverage

**File**: `tests/unit/repository.test.js` (new file)

Create unit tests for:
- `markDeletedTests()` with various scenarios
- `getDeletedTests()` query
- Resurrection logic in `findOrCreateTest()`

**File**: `tests/integration/deletion-detection.test.js` (new file)

Create integration tests for:
- Full workflow: create test → run → delete → detect
- Multiple tests deleted in same run
- Mixed scenario: some tests stay, some deleted
- Suite isolation (deletion only affects executed suites)

## Verification Checklist

After implementation, verify:

- [ ] Schema migration runs successfully
- [ ] `deleted_at` column added to `tests` table
- [ ] Index on `deleted_at` exists
- [ ] `deleted_tests_summary` view returns results
- [ ] Deleting a test from code marks it as deleted after next run
- [ ] Console output shows deleted tests
- [ ] Analytics shows deleted tests in summary
- [ ] Deleted test can be "resurrected" by re-adding to code
- [ ] Suite isolation works (only executed suites trigger deletion detection)
- [ ] Historical test results for deleted tests are preserved
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual test with "should display welcome message" succeeds

## Risk Assessment

**Low risk changes**:
- Adding a nullable column doesn't break existing code
- Detection logic runs AFTER results are persisted (failure won't block reporting)
- No changes to test execution or result collection

**Potential issues**:
- Performance: Need to ensure deletion detection query is efficient (mitigated by index on `deleted_at`)
- Suite isolation: Must ensure we only check for deletions in suites that actually ran (handled in query logic)

## Alternative Approaches Considered

1. **Soft delete via status flag**: Instead of `deleted_at`, use a `status` enum
   - Rejected: Timestamp provides more information and aligns with existing `first_seen_at`/`last_seen_at` pattern

2. **Mark deleted on next run only**: Compare current run vs. immediate previous run
   - Rejected: Could miss deletions if test file isn't run frequently

3. **Hard delete**: Actually remove test records when deleted
   - Rejected: Loses historical data and audit trail

## Success Criteria

1. After removing a test from code and running the suite, the test is marked with `deleted_at`
2. Console output clearly indicates deleted tests
3. Deleted tests appear in analytics queries
4. Re-adding a deleted test clears the `deleted_at` flag
5. Deletion detection only affects suites that were executed
6. All existing functionality continues to work unchanged
