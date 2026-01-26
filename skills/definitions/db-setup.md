# Skill: db-setup

Initialize PostgreSQL database with schema and migrations.

## Metadata

- **Name**: db-setup
- **Category**: Database
- **Dependencies**: PostgreSQL installed
- **Requires**: PostgreSQL, psql client

## Description

Sets up the Iudex database from scratch:
1. Creates database if it doesn't exist
2. Creates database user with appropriate permissions
3. Loads the schema from `database/schema.sql`
4. Applies all migrations from `database/migrations/`
5. Verifies setup with connection test

## Commands

```bash
# Run database setup
mise run db_setup

# Or manually:
# psql -U postgres -c "CREATE DATABASE iudex"
# psql -U postgres -d iudex -f database/schema.sql
```

## Configuration

Database settings are configured via environment variables (see `mise.toml`):

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iudex
DB_USER=iudex_user
DB_PASSWORD=your_password  # Set this!
DB_SSL=false
DB_POOL_SIZE=10
```

## Expected Behavior

### Success

```
🗄️  Setting up Iudex database...
✅ Database created: iudex
✅ User created: iudex_user
✅ Schema loaded: database/schema.sql
✅ Migrations applied: 2
✅ Database setup complete!

Tables created:
  - test_suites
  - test_runs
  - tests
  - test_history
  - test_results

Views created:
  - latest_test_runs
  - endpoint_success_rates
  - flaky_tests
  - recent_regressions
  - test_health_scores
  - daily_test_stats
```

## Prerequisites

1. **PostgreSQL installed**
   ```bash
   # Check PostgreSQL
   psql --version

   # If not installed:
   # macOS: brew install postgresql
   # Linux: apt-get install postgresql
   ```

2. **PostgreSQL running**
   ```bash
   # macOS
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

3. **Environment variables set**
   ```bash
   # Edit mise.toml or export:
   export DB_PASSWORD="your_secure_password"
   ```

## Usage Examples

### Initial Setup
```bash
/db-setup
```

### After Schema Changes
```bash
# Drop and recreate
/db-reset

# Setup fresh
/db-setup
```

### Verify Setup
```bash
/db-status
```

## Schema Details

The setup creates the following structure:

### Tables
- **test_suites** - Test collections/modules
- **test_runs** - Individual test execution runs
- **tests** - Unique test definitions (slug-based identity)
- **test_history** - Audit trail of test name/description changes
- **test_results** - Individual test case results (immutable log)

### Analytics Views
- **latest_test_runs** - Most recent test executions
- **endpoint_success_rates** - Success rates per API endpoint
- **flaky_tests** - Tests with intermittent failures
- **recent_regressions** - Previously passing tests now failing
- **test_health_scores** - Multi-dimensional test health metrics
- **daily_test_stats** - Historical daily statistics

## Migrations

Migrations are applied in order:

1. `001_initial_schema.sql` - Base schema (if using migrations)
2. `002_add_deleted_at.sql` - Add deletion detection
3. Future migrations...

## Troubleshooting

### PostgreSQL Not Running

**Error**: `psql: could not connect to server`

**Solution**: Start PostgreSQL
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Permission Denied

**Error**: `permission denied to create database`

**Solution**: Run as postgres user or grant permissions
```bash
sudo -u postgres psql
CREATE ROLE iudex_user WITH LOGIN PASSWORD 'your_password';
ALTER ROLE iudex_user CREATEDB;
```

### Database Already Exists

**Error**: `database "iudex" already exists`

**Solution**: Use `/db-reset` to drop and recreate, or connect to existing database

### Schema File Not Found

**Error**: `database/schema.sql: No such file or directory`

**Solution**: Ensure you're in project root:
```bash
cd /path/to/iudex
/db-setup
```

## Related Skills

- `/db-reset` - Drop and recreate database
- `/db-migrate` - Apply new migrations only
- `/db-status` - Check database status
- `/db-backup` - Backup database

## Security Notes

1. **Never commit DB_PASSWORD** to version control
2. Use strong passwords in production
3. Enable SSL for production databases (DB_SSL=true)
4. Restrict database user permissions appropriately
5. Regular backups recommended

## CI/CD Integration

For CI environments, setup is automatic with Testcontainers:

```yaml
# GitHub Actions
- name: Run Tests
  run: npm test  # Testcontainers handles setup
```

For manual CI database setup:

```yaml
- name: Setup Database
  run: |
    export DB_PASSWORD=${{ secrets.DB_PASSWORD }}
    mise run db_setup
```

## Next Steps

After setup:
1. Verify with `/db-status`
2. Run tests to populate data: `/test`
3. Check data: `/db-status` again
4. Run examples: `/examples`

## Documentation

See also:
- `database/README.md` - Database architecture
- `database/schema.sql` - Full schema definition
- `docs/IMPLEMENTATION.md` - Week 2 implementation details
