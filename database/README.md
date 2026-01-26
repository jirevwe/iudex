# Iudex Database Setup

PostgreSQL persistence layer for test results with evolution tracking and regression analysis.

## Features

- **Test Evolution Tracking**: Tests are identified by hash of (name + description), allowing you to track tests even when renamed
- **Immutable Test Log**: Every test run creates a new row - complete audit trail
- **Test Lineage**: Link tests across renames and changes via `previous_test_id`
- **Regression Detection**: Automatically detect when passing tests start failing
- **Flaky Test Detection**: Identify tests that intermittently fail
- **Analytics Views**: Pre-built SQL views for success rates, health scores, and more

## Quick Start

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker:**
```bash
docker run --name iudex-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=iudex_test_results \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE iudex_test_results;
CREATE USER iudex_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE iudex_test_results TO iudex_user;

# Connect to the database
\c iudex_test_results

# Grant schema privileges
GRANT ALL ON SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iudex_user;

\q
```

### 3. Initialize Schema

```bash
# From project root
psql -U iudex_user -d iudex_test_results -f database/schema.sql
```

Or using environment variables:
```bash
PGPASSWORD=your_password_here psql \
  -h localhost \
  -U iudex_user \
  -d iudex_test_results \
  -f database/schema.sql
```

### 4. Configure Iudex

Set environment variables or update `iudex.config.js`:

```bash
# .env file
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iudex_test_results
DB_USER=iudex_user
DB_PASSWORD=your_password_here
DB_SSL=false
```

Or in `iudex.config.js`:
```javascript
export default {
  database: {
    enabled: true,
    host: 'localhost',
    port: 5432,
    database: 'iudex_test_results',
    user: 'iudex_user',
    password: process.env.DB_PASSWORD,
    ssl: false
  },
  reporters: [
    'console',
    'postgres'  // Enable PostgreSQL reporter
  ]
};
```

### 5. Run Tests

```bash
npx iudex run
```

Test results will be persisted to PostgreSQL automatically!

## Database Schema

### Core Tables

- **`test_suites`**: Test collections/modules
- **`test_runs`**: Individual test execution runs
- **`tests`**: Unique test definitions tracked by hash
- **`test_history`**: Complete audit trail of test changes
- **`test_results`**: Immutable log of test execution results

### Analytics Views

- **`latest_test_runs`**: Most recent run for each suite/environment
- **`endpoint_success_rates`**: Success rates by endpoint
- **`flaky_tests`**: Tests that intermittently fail
- **`test_evolution_chain`**: Complete test lineage
- **`recent_regressions`**: Tests that were passing but now failing
- **`test_health_scores`**: Multi-dimensional health metrics
- **`daily_test_stats`**: Daily aggregated statistics

## Test Evolution

Tests are identified by a SHA256 hash of `(name + description)`. When you rename a test:

1. Iudex computes the new hash
2. Checks if it matches an existing test
3. If not, looks for a similar test by name
4. Creates a new test record linked via `previous_test_id`
5. Records the change in `test_history`

This allows you to:
- **Track test history** across renames
- **Hunt down regressions** by following the lineage chain
- **Never lose data** when tests evolve

### Example: Tracing Test History

```sql
-- Get complete history of a test including all evolved versions
SELECT * FROM get_test_complete_history(123);

-- See the evolution chain
SELECT * FROM test_evolution_chain WHERE current_test_id = 123;

-- Find all versions of a test by name
SELECT * FROM tests WHERE current_name LIKE '%user login%';
```

## Useful Queries

### Find Flaky Tests
```sql
SELECT * FROM flaky_tests WHERE failure_rate > 10 LIMIT 10;
```

### Recent Regressions
```sql
SELECT * FROM recent_regressions;
```

### Test Health Report
```sql
SELECT
  current_name,
  overall_health_score,
  success_rate,
  stability_score
FROM test_health_scores
WHERE overall_health_score < 70
ORDER BY overall_health_score ASC;
```

### Endpoint Performance
```sql
SELECT
  endpoint,
  http_method,
  success_rate,
  avg_response_time_ms,
  total_runs
FROM endpoint_success_rates
WHERE success_rate < 95
ORDER BY avg_response_time_ms DESC;
```

### Daily Trend Analysis
```sql
SELECT
  test_date,
  environment,
  pass_rate,
  total_tests,
  avg_duration_seconds
FROM daily_test_stats
WHERE environment = 'production'
ORDER BY test_date DESC
LIMIT 30;
```

## Programmatic Access

Use the PostgreSQL reporter's analytics API:

```javascript
import { PostgresReporter } from './reporters/postgres.js';

const reporter = new PostgresReporter(config);

// Get flaky tests
const flaky = await reporter.getAnalytics('flaky_tests', { minRuns: 5 });

// Get regressions
const regressions = await reporter.getAnalytics('regressions');

// Search tests
const results = await reporter.getAnalytics('search', {
  searchTerm: 'user login'
});

// Get test evolution
const evolution = await reporter.getAnalytics('evolution_chain', {
  testId: 123
});
```

## Maintenance

### Backup Database
```bash
pg_dump -U iudex_user iudex_test_results > backup.sql
```

### Restore Database
```bash
psql -U iudex_user iudex_test_results < backup.sql
```

### Vacuum and Analyze
```bash
psql -U iudex_user -d iudex_test_results -c "VACUUM ANALYZE;"
```

### Check Database Size
```sql
SELECT
  pg_size_pretty(pg_database_size('iudex_test_results')) as size;
```

## Troubleshooting

### Connection Issues

**Error: `ECONNREFUSED`**
- PostgreSQL not running: `brew services start postgresql@15`
- Wrong host/port: Check `DB_HOST` and `DB_PORT`

**Error: `password authentication failed`**
- Wrong password: Check `DB_PASSWORD`
- User doesn't exist: Run user creation steps again

**Error: `database does not exist`**
- Database not created: Run database creation steps

### Permission Issues

**Error: `permission denied for schema public`**
```sql
GRANT ALL ON SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iudex_user;
```

### Performance Issues

If you have millions of test results, consider:

1. **Partition `test_results` by date:**
```sql
-- Create monthly partitions
CREATE TABLE test_results_2024_01 PARTITION OF test_results
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

2. **Archive old test results:**
```sql
-- Move results older than 90 days to archive table
CREATE TABLE test_results_archive AS
SELECT * FROM test_results
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM test_results
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

## Advanced Configuration

### SSL/TLS Connection

```javascript
database: {
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('/path/to/ca.crt').toString(),
  }
}
```

### Connection Pooling

```javascript
database: {
  poolSize: 20, // Max connections
  idleTimeout: 30000, // 30 seconds
  connectionTimeout: 2000 // 2 seconds
}
```

### Disable Database Persistence

```bash
DB_ENABLED=false npx iudex run
```

Or remove `'postgres'` from reporters in config.

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  test:
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: iudex_test_results
          POSTGRES_USER: iudex_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Database
        run: |
          PGPASSWORD=test_password psql -h localhost -U iudex_user -d iudex_test_results -f database/schema.sql

      - name: Run Tests
        env:
          DB_HOST: localhost
          DB_USER: iudex_user
          DB_PASSWORD: test_password
        run: npm test
```

## Testing

This directory contains comprehensive tests for the database layer, including deletion detection and suite tracking functionality.

### Test Structure

#### Unit Tests (`repository.test.js`)
- Tests deletion detection logic (`markDeletedTests`)
- Tests retrieval of deleted tests (`getDeletedTests`)
- Tests suite tracking and resurrection in `findOrCreateTest`
- All tests use mocked database connections

Run unit tests:
```bash
npm test database/repository.test.js
```

#### Integration Tests (`deletion-detection.integration.test.js`)
- Tests full deletion detection workflow with real database
- Tests test resurrection (deleted tests reappearing)
- Tests suite isolation (only marking tests from executed suites as deleted)
- Tests suite tracking (updating suite_name when tests move between suites)

**Prerequisites:**
1. PostgreSQL must be running
2. Create test database: `createdb iudex_test`
3. Run schema: `psql -d iudex_test -f database/schema.sql`

**Run integration tests:**
```bash
TEST_DB_ENABLED=true DB_NAME=iudex_test npm test database/deletion-detection.integration.test.js
```

### Test Coverage

The tests ensure protection against regressions for:

**Deletion Detection:**
- ✅ Tests marked as deleted when they don't appear in a run
- ✅ Tests NOT marked as deleted if they appear in current run
- ✅ Only tests from executed suites are checked for deletion
- ✅ Already deleted tests are not marked again

**Test Resurrection:**
- ✅ `deleted_at` cleared when test reappears
- ✅ Test becomes active again after resurrection

**Suite Tracking:**
- ✅ `suite_name` updated when test moves between suites
- ✅ `test_file` updated when test moves between files
- ✅ Tests moved to different suite are not marked as deleted from old suite

**Suite Isolation:**
- ✅ Only tests in executed suites are checked for deletion
- ✅ Tests in non-executed suites remain untouched

### Continuous Integration

Example GitHub Actions configuration for integration tests:

```yaml
- name: Setup PostgreSQL
  run: |
    sudo systemctl start postgresql
    sudo -u postgres createdb iudex_test
    sudo -u postgres psql -d iudex_test -f database/schema.sql

- name: Run all tests
  env:
    TEST_DB_ENABLED: true
    DB_HOST: localhost
    DB_NAME: iudex_test
    DB_USER: postgres
  run: npm test
```

## Support

For issues, see:
- [GitHub Issues](https://github.com/yourusername/iudex/issues)
- [Documentation](https://docs.iudex.dev)
