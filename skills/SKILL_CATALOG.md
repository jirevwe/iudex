# Iudex Skills Catalog

Complete reference of all available skills for building and maintaining the Iudex framework.

## Quick Reference

| Skill               | Category    | Duration   | Description                               |
|---------------------|-------------|------------|-------------------------------------------|
| `/test`             | Testing     | ~20s       | Run all tests (unit + integration)        |
| `/test-unit`        | Testing     | ~5s        | Run unit tests only (fast)                |
| `/test-integration` | Testing     | ~15s       | Run integration tests with Testcontainers |
| `/test-watch`       | Testing     | continuous | Watch mode for TDD                        |
| `/test-coverage`    | Testing     | ~25s       | Generate coverage report                  |
| `/lint`             | Quality     | ~3s        | Check code style                          |
| `/lint-fix`         | Quality     | ~5s        | Auto-fix linting issues                   |
| `/validate`         | Quality     | ~30s       | Complete validation (tests + lint)        |
| `/db-setup`         | Database    | ~10s       | Initialize database                       |
| `/db-reset`         | Database    | ~5s        | Drop and recreate database                |
| `/db-status`        | Database    | <1s        | Show database status                      |
| `/db-migrate`       | Database    | ~5s        | Apply migrations                          |
| `/dev`              | Development | continuous | Development server with watch             |
| `/examples`         | Development | ~5s        | Run example tests                         |
| `/ci-check`         | CI/CD       | ~35s       | Complete CI validation                    |
| `/pre-commit`       | CI/CD       | ~10s       | Quick pre-commit checks                   |

## Skills by Category

### 🧪 Testing Skills

#### `/test` - Complete Test Suite

- **Purpose**: Run all tests for comprehensive validation
- **Duration**: ~20 seconds
- **Requires**: Node.js, Docker
- **Use when**: Before committing, in CI, verifying changes
- **Output**: 325 tests (314 unit + 11 integration)

#### `/test-unit` - Unit Tests Only

- **Purpose**: Fast feedback loop for development
- **Duration**: ~5 seconds
- **Requires**: Node.js only
- **Use when**: During active development, TDD
- **Output**: 314 unit tests

#### `/test-integration` - Integration Tests

- **Purpose**: Verify database and end-to-end workflows
- **Duration**: ~15 seconds
- **Requires**: Node.js, Docker
- **Use when**: Testing database changes, verifying examples
- **Output**: 11 integration tests with Testcontainers

#### `/test-watch` - Watch Mode

- **Purpose**: Continuous testing during development
- **Duration**: Continuous
- **Requires**: Node.js
- **Use when**: TDD workflow, active development
- **Output**: Tests re-run on file save

#### `/test-coverage` - Coverage Report

- **Purpose**: Generate code coverage metrics
- **Duration**: ~25 seconds
- **Requires**: Node.js, Jest
- **Use when**: Before releases, quality gates
- **Output**: HTML and text coverage reports

### ✨ Code Quality Skills

#### `/lint` - ESLint Check

- **Purpose**: Verify code style and quality
- **Duration**: ~3 seconds
- **Requires**: Node.js, ESLint
- **Use when**: Before committing, in CI
- **Output**: Errors and warnings with locations

#### `/lint-fix` - Auto-Fix Issues

- **Purpose**: Automatically fix linting issues
- **Duration**: ~5 seconds
- **Requires**: Node.js, ESLint
- **Use when**: After bulk changes, before committing
- **Output**: Fixed files written to disk

#### `/validate` - Full Validation

- **Purpose**: Complete codebase validation
- **Duration**: ~30 seconds
- **Requires**: Node.js, Docker
- **Use when**: Before PR, before release
- **Output**: Combined lint + test results
- **Dependencies**: Runs lint, then test

### 🗄️ Database Skills

#### `/db-setup` - Database Initialization

- **Purpose**: Create and initialize PostgreSQL database
- **Duration**: ~10 seconds
- **Requires**: PostgreSQL, psql
- **Use when**: First-time setup, after schema changes
- **Output**: Database with full schema loaded

#### `/db-reset` - Database Reset

- **Purpose**: Drop and recreate database (clean slate)
- **Duration**: ~5 seconds
- **Requires**: PostgreSQL, psql
- **Use when**: Testing, clearing corrupted data
- **Output**: Fresh empty database
- **⚠️ Warning**: Destroys all data!

#### `/db-status` - Database Status

- **Purpose**: Check database connection and statistics
- **Duration**: <1 second
- **Requires**: PostgreSQL
- **Use when**: Debugging, monitoring
- **Output**: Connection info, table counts, recent runs

#### `/db-migrate` - Apply Migrations

- **Purpose**: Run database migrations
- **Duration**: ~5 seconds
- **Requires**: PostgreSQL, psql
- **Use when**: After pulling new migrations
- **Output**: Migration results

#### `/db-backup` - Backup Database

- **Purpose**: Create database backup
- **Duration**: ~10 seconds
- **Requires**: PostgreSQL, pg_dump
- **Use when**: Before risky operations
- **Output**: SQL dump file

### 🚀 Development Skills

#### `/dev` - Development Server

- **Purpose**: Run CLI with auto-reload on changes
- **Duration**: Continuous
- **Requires**: Node.js 18+
- **Use when**: Active development
- **Output**: Console output with auto-restart

#### `/examples` - Run Examples

- **Purpose**: Execute example tests
- **Duration**: ~5 seconds
- **Requires**: Node.js, internet (for HTTPBin)
- **Use when**: Learning, demos, verifying installation
- **Output**: 17 integration test results

#### `/build` - Build Project

- **Purpose**: Build distributable package
- **Duration**: ~10 seconds
- **Requires**: Node.js
- **Use when**: Before publishing, deployment
- **Output**: Built artifacts

#### `/clean` - Clean Artifacts

- **Purpose**: Remove build artifacts and caches
- **Duration**: <1 second
- **Requires**: None
- **Use when**: Before clean build, disk cleanup
- **Output**: Removed files listed

### 🎯 CI/CD Skills

#### `/ci-check` - CI Validation

- **Purpose**: Complete CI validation pipeline
- **Duration**: ~35 seconds
- **Requires**: Node.js, Docker
- **Use when**: In CI, before merge
- **Output**: Full validation results
- **Dependencies**: Runs lint, test, build

#### `/pre-commit` - Pre-Commit Checks

- **Purpose**: Fast checks before committing
- **Duration**: ~10 seconds
- **Requires**: Node.js
- **Use when**: Git pre-commit hook
- **Output**: Lint + unit test results
- **Dependencies**: Runs lint, test-unit

#### `/pre-push` - Pre-Push Validation

- **Purpose**: Full validation before pushing
- **Duration**: ~30 seconds
- **Requires**: Node.js, Docker
- **Use when**: Git pre-push hook
- **Output**: Complete test results
- **Dependencies**: Runs lint, test

### 📊 Reporting Skills

#### `/report-console` - Console Report

- **Purpose**: Generate formatted console report
- **Duration**: <1 second
- **Requires**: Node.js
- **Use when**: After test runs
- **Output**: Formatted console output

#### `/report-json` - JSON Report

- **Purpose**: Generate JSON test results
- **Duration**: <1 second
- **Requires**: Node.js
- **Use when**: CI integration, tooling
- **Output**: JSON file with results

#### `/report-github` - GitHub Pages Report

- **Purpose**: Generate static HTML dashboard
- **Duration**: ~5 seconds
- **Requires**: Node.js
- **Use when**: Publishing results
- **Output**: HTML/CSS/JS dashboard

## Common Workflows

### Daily Development

```bash
# Morning setup
/db-status          # Verify database

# Active development (2 terminals)
/test-watch         # Terminal 1: Tests
/dev                # Terminal 2: Dev server

# Before commit
/validate           # Full check
```

### First-Time Setup

```bash
# 1. Clone repository
git clone <repo>
cd iudex

# 2. Install dependencies
npm install

# 3. Setup database (optional)
/db-setup

# 4. Verify installation
/test
/examples

# 5. Done! Start developing
/dev
```

### Bug Fixing

```bash
# 1. Reproduce with test
/test-unit          # Find failing test

# 2. Fix in watch mode
/test-watch         # Auto-run tests

# 3. Validate fix
/test               # All tests
/lint               # Code quality

# 4. Commit
/pre-commit         # Final check
git commit
```

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Write tests first (TDD)
/test-watch

# 3. Implement feature
/dev                # Watch mode

# 4. Verify complete
/validate

# 5. Create PR
/ci-check           # Ensure CI will pass
```

### Database Changes

```bash
# 1. Backup current data
/db-backup

# 2. Modify schema
# Edit database/schema.sql

# 3. Reset database
/db-reset

# 4. Setup fresh
/db-setup

# 5. Verify with tests
/test-integration
```

### Release Preparation

```bash
# 1. Update version
npm version patch

# 2. Full validation
/ci-check

# 3. Generate reports
/test-coverage
/report-github

# 4. Build package
/build

# 5. Test package
npm pack
npm install -g ./iudex-*.tgz

# 6. Publish
npm publish
```

## Environment Variables

Skills respect these environment variables:

```bash
# Node environment
NODE_ENV=development|production

# Database configuration
DB_ENABLED=true|false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iudex
DB_USER=iudex_user
DB_PASSWORD=your_password
DB_SSL=true|false

# Test configuration
CI=true|false                  # CI environment
TEST_TIMEOUT=30000            # Test timeout in ms
VERBOSE=true|false            # Verbose output

# Development
DEBUG=*                       # Debug logging
```

## Skill Dependencies

Some skills depend on others:

```
/validate
├── /lint
└── /test
    ├── /test-unit
    └── /test-integration

/ci-check
├── /validate
└── /report-json

/pre-commit
├── /lint
└── /test-unit

/pre-push
└── /validate
```

## Performance Benchmarks

Measured on MacBook Pro (2021, M1 Pro):

| Skill             | Cold Start | Warm Start | Description          |
|-------------------|------------|------------|----------------------|
| /lint             | 3.2s       | 2.8s       | Full codebase        |
| /test-unit        | 6.8s       | 5.4s       | 314 tests            |
| /test-integration | 18.2s      | 15.1s      | With container start |
| /test             | 23.5s      | 19.8s      | All tests            |
| /validate         | 31.2s      | 27.3s      | Complete validation  |
| /db-setup         | 11.4s      | 9.2s       | Schema + migrations  |
| /db-reset         | 6.1s       | 4.8s       | Drop + recreate      |

*Cold start: First run after restart. Warm start: Subsequent runs.*

## Troubleshooting

### Verification

```bash
# Verify all skills are correctly configured
./skills/verify-skills.sh
```

### Common Issues

**Docker not running**

```bash
# Error: Cannot connect to Docker daemon
# Solution:
open -a Docker          # macOS
sudo systemctl start docker  # Linux
```

**Database connection failed**

```bash
# Error: Connection refused
# Solution:
/db-status             # Check status
brew services start postgresql  # Start PostgreSQL
```

**Tests failing unexpectedly**

```bash
# Clear caches
rm -rf node_modules/.cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Mise tasks not found**

```bash
# Verify mise installation
mise --version

# List available tasks
mise tasks

# Check task file naming
ls -la .mise-tasks/
```

## Adding New Skills

To create a new skill:

1. **Create definition file**
   ```bash
   touch skills/definitions/my-skill.md
   ```

2. **Follow template structure**
    - Metadata section
    - Description
    - Commands
    - Expected behavior
    - Usage examples
    - Troubleshooting

3. **Add to catalog**
    - Update this file
    - Add to quick reference
    - Document dependencies

4. **Test the skill**
   ```bash
   # Verify commands work
   ./skills/verify-skills.sh
   ```

5. **Document integration**
    - Add to workflows
    - Update related skills
    - Note any dependencies

## Best Practices

1. **Keep skills focused** - One task per skill
2. **Make skills idempotent** - Safe to run multiple times
3. **Provide clear output** - User should know what happened
4. **Handle errors gracefully** - Clear error messages
5. **Document dependencies** - List what's required
6. **Test regularly** - Run verify-skills.sh

## Getting Help

- **Skills documentation**: `/Users/rtukpe/Documents/dev/gotech/iudex/skills/README.md`
- **Verification script**: `./skills/verify-skills.sh`
- **Skill definitions**: `skills/definitions/`
- **Implementation guide**: `docs/IMPLEMENTATION.md`

## Contributing

When adding or modifying skills:

1. Update skill definition in `skills/definitions/`
2. Update this catalog
3. Run verification script
4. Test in multiple scenarios
5. Document any new dependencies
6. Update related workflows

---

**Last Updated**: 2026-01-26
**Total Skills**: 16
**Categories**: 5 (Testing, Quality, Database, Development, CI/CD)
