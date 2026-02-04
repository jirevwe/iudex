# Test Run Grouping & Test Stubs - Implementation Plan

**Date:** 2026-02-04
**Status:** Implemented

## Investigation Summary

### User Issue
> Running 4 test files creates 4 separate test_runs instead of 1.

### ROOT CAUSE FOUND

**Bug Location**: `cli/index.js` line 29

```javascript
// CURRENT (BUG):
.command('run [pattern]')  // Single argument - only takes FIRST file!

// FIX:
.command('run [patterns...]')  // Variadic argument - takes ALL files
```

**What's Happening**:
1. Shell expands `tests/*.test.js` → 5 separate file paths
2. Commander.js only captures the FIRST file as `pattern`
3. The remaining 4 files are silently ignored!
4. Result: Only 48 tests from `feature-planning-example.test.js` are run

**Why 176 tests worked in run 6**: That run was likely executed with a quoted glob pattern `"tests/*.test.js"` which prevented shell expansion, allowing Node.js glob to handle it properly.

---

## Implementation Plan

### Fix 1: CLI Variadic Arguments (Required)

**File:** `cli/index.js` line 29

Change from single pattern to variadic patterns:

```javascript
// BEFORE:
.command('run [pattern]')

// AFTER:
.command('run [patterns...]')
```

Update the action handler at line 37:

```javascript
// BEFORE:
.action(async (pattern, options) => {
    // ...
    const testFiles = await loadTestFiles(pattern || config.testMatch);

// AFTER:
.action(async (patterns, options) => {
    // ...
    // If patterns provided, use them; otherwise fall back to config
    const testPatterns = patterns && patterns.length > 0 ? patterns : config.testMatch;
    const testFiles = await loadTestFiles(testPatterns);
```

### Fix 2: Script Quoting (Recommended)

**File:** `dashboard-express/scripts/run-tests.sh`

Quote the glob pattern to prevent shell expansion:

```bash
# BEFORE:
node ../../iudex/cli/index.js run tests/*.test.js "$@" --verbose

# AFTER:
node ../../iudex/cli/index.js run "tests/*.test.js" "$@" --verbose
```

---

## Files Modified

1. **`cli/index.js`** - Fix variadic argument parsing (CRITICAL)
2. **`dashboard-express/scripts/run-tests.sh`** - Quote glob pattern (RECOMMENDED)

---

## Verification

After fix, run:
```bash
cd /Users/rtukpe/Documents/dev/gotech/iudex-examples/dashboard-express
npm test
```

**Expected Result:**
- Total: 176+ tests (all 5 files combined)
- Single test_run in database with all tests grouped

### Test File Counts
```
feature-planning-example.test.js: 49 tests
payment-api-stubs.test.js:        61 tests
user-api-stubs.test.js:           35 tests
httpbin.test.js:                  30 tests
minimal-stub-example.test.js:      6 tests
─────────────────────────────────────────
Total:                           181 tests
```

---

## Test Stubs Feature Status - ALREADY IMPLEMENTED

No changes needed - test stubs are fully implemented:

| Feature | Status | Location |
|---------|--------|----------|
| `test.stub()` | Done | `core/dsl.js:126` |
| `'todo'` status | Done | `core/runner.js:160-165` |
| TODO Summary Card | Done | `templates/dashboard/index.html:74-78` |
| "TODO Only" filter | Done | `templates/dashboard/index.html:138` |
| "Deleted Only" filter | Done | `templates/dashboard/index.html:139` |

---

## Implementation Results

### Database Verification

| Run ID | Total Tests | Notes |
|--------|-------------|-------|
| **11** | **176** | After fix - all tests grouped |
| **10** | **176** | After fix - all tests grouped |
| 9 | 48 | Before fix - only 1 file captured |
| 8 | 4 | Before fix - partial |
| 6 | 176 | Quoted glob worked correctly |

### Test Output
```
Summary:
  Total: 176 | Passed: 42 | Failed: 0 | TODO: 134
  Duration: 16.57s
  Success Rate: 23.9%

✓ All tests passed!
```
