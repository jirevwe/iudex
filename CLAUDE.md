# Claude Development Guidelines for Iudex

## 🚨 CRITICAL: Implementation Validation

**NEVER consider work "complete" without running end-to-end validation.**

### Mandatory Validation Process

After implementing ANY feature or fix, you MUST:

1. **Run the validation skill**:
   ```
   /validate-implementation
   ```

2. **Or run the validation script manually**:
   ```bash
   cd examples/dashboard-express
   bash ~/.claude/skills/validate-implementation/validate.sh
   ```

### What Gets Validated

The validation process checks:

#### ✅ Environment
- Docker is running
- Database is accessible
- Services are startedchomecharc
- 

#### ✅ Database Schema
- Tables exist
- Columns are correct
- Constraints work
- Indexes created
- Migrations applied

#### ✅ Test Execution
- Tests run without errors
- Exit code is 0
- No authentication failures
- Persistence confirmed

#### ✅ Data Verification
- Data actually in database
- Counts match expectations
- New columns populated
- Constraints validate

#### ✅ UI Verification (MANDATORY for UI changes)
- **Chrome browser MUST be used**
- Dashboard loads
- New elements visible
- Filters work
- Data displays
- No console errors (F12)
- Screenshots taken

#### ✅ Documentation
- README updated
- Examples added
- Migration documented

## Common Mistakes to Avoid

### ❌ DON'T

- **DON'T** assume code works without running it
- **DON'T** skip database verification
- **DON'T** use curl instead of Chrome for UI testing
- **DON'T** commit without validation report
- **DON'T** trust "it looks right" - verify with real data

### ✅ DO

- **DO** run actual tests in the examples repository
- **DO** verify data persists to database
- **DO** open Chrome and actually look at the UI
- **DO** check for errors in console (F12)
- **DO** take screenshots of UI changes
- **DO** create validation reports
- **DO** update documentation with proof of validation

## Database Changes Checklist

When making database schema changes:

```bash
# 1. Update schema.sql
vim database/schema.sql

# 2. Create migration file
vim database/migrations/TIMESTAMP_description.js

# 3. Apply to local database
docker exec iudex-postgres psql -U iudex -d iudex_tests < database/schema.sql

# 4. Verify schema
docker exec iudex-postgres psql -U iudex -d iudex_tests -c "\d table_name"

# 5. Run tests
export DB_USER=iudex DB_PASSWORD=iudex_dev_password
npm test

# 6. Verify data
docker exec iudex-postgres psql -U iudex -d iudex_tests -c \
  "SELECT * FROM table_name ORDER BY id DESC LIMIT 5;"
```

## UI Changes Checklist

When making UI changes:

```bash
# 1. Start dashboard
npm start

# 2. Open Chrome (MANDATORY)
open -a "Google Chrome" http://localhost:3000/test-dashboard

# 3. Verify in browser:
#    - Page loads
#    - New elements visible
#    - Filters work
#    - Data displays
#    - No console errors (F12)

# 4. Take screenshots
mkdir -p screenshots/feature-name
# Save screenshots of:
#   - Main view
#   - Filters expanded
#   - New features
#   - Console showing no errors

# 5. Test interactions
#    - Click filters
#    - Search
#    - Expand/collapse
#    - All interactive elements
```

## Test Execution Checklist

```bash
# 1. Ensure database is running
docker compose up -d postgres

# 2. Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=iudex_tests
export DB_USER=iudex
export DB_PASSWORD=iudex_dev_password

# 3. Run tests
npm test

# 4. Check for success messages
# Look for:
#   - "✓ All tests passed!"
#   - "✓ Test results persisted to database"
#   - No ERROR messages

# 5. Verify in database
docker exec iudex-postgres psql -U iudex -d iudex_tests -c \
  "SELECT * FROM test_runs ORDER BY id DESC LIMIT 1;"
```

## Validation Report Format

Every implementation MUST have a validation report saved as:
```
VALIDATION_REPORT_<feature-name>_<date>.md
```

Example report structure:
```markdown
# Validation Report: Test Stubs Feature

**Date**: 2026-02-03
**Feature**: Test stubs for unimplemented tests

## Environment
- [x] Docker running
- [x] Database accessible
- [x] Services started

## Database Schema
- [x] `unimplemented_tests` column added
- [x] Constraint updated
- [x] Migration created

## Test Execution
- [x] Tests run successfully
- [x] Data persisted: run_id 7
- [x] 134 unimplemented tests tracked

## UI Verification
- [x] Chrome testing completed
- [x] Filters display correctly
- [x] Summary cards show unimplemented count
- [x] No console errors
- [x] Screenshots saved

## Issues Found
- None

## Status
✅ VALIDATED - Ready for production
```

## Integration with Workflow

```
┌─────────────────────┐
│  1. Implement       │
│     Feature         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Run Validation  │  ← MANDATORY
│     Skill           │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Issues Found?│
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
    Yes         No
     │           │
     ▼           ▼
┌─────────┐  ┌─────────┐
│ 3. Fix  │  │ 4. Create│
│ Issues  │  │ Report  │
└────┬────┘  └────┬────┘
     │            │
     └────┬───────┘
          │
          ▼
   ┌─────────────┐
   │ 5. Commit   │
   │    Code     │
   └─────────────┘
```

## File Locations

- Validation skill: `~/.claude/skills/validate-implementation/`
- Validation script: `~/.claude/skills/validate-implementation/validate.sh`
- UI testing script: `~/.claude/skills/validate-implementation/test-ui-chrome.sh`
- Reports: `./VALIDATION_REPORT_*.md`

## Quick Commands

```bash
# Run full validation
bash ~/.claude/skills/validate-implementation/validate.sh

# Run UI validation only
bash ~/.claude/skills/validate-implementation/test-ui-chrome.sh

# Run tests with correct credentials
export DB_USER=iudex DB_PASSWORD=iudex_dev_password
npm test

# Check database
docker exec iudex-postgres psql -U iudex -d iudex_tests -c "\dt"
```

## Success Criteria

Consider work complete ONLY when:

- ✅ All validation steps pass
- ✅ Tests execute successfully
- ✅ Data persists to database correctly
- ✅ UI verified in Chrome browser
- ✅ No errors in logs
- ✅ Screenshots taken
- ✅ Validation report created
- ✅ Documentation updated

## Remember

> **"It works on my machine"** is not validation.
> **"The tests passed"** without checking the database is not validation.
> **"I looked at the code"** without running it is not validation.
> **"I used curl"** instead of Chrome is not validation.

## Always:

1. **Run actual tests** in real environment
2. **Check the database** - data must be there
3. **Open Chrome** - see the UI with your eyes
4. **Check console** - F12, look for errors
5. **Take screenshots** - prove it works
6. **Create report** - document what you validated
7. **Update docs** - help future developers

---

**This is not optional. This is mandatory. Every single time.**
