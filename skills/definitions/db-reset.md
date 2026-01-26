# Skill: db-reset

Drop and recreate the PostgreSQL database (clean slate).

## Metadata

- **Name**: db-reset
- **Category**: Database
- **Dependencies**: PostgreSQL installed
- **Requires**: PostgreSQL, psql client
- **Danger Level**: ⚠️ DESTRUCTIVE - Drops all data

## Description

Completely removes the existing database and recreates it fresh. This is useful for:
- Resetting to a clean state during development
- Testing database setup procedures
- Clearing corrupted data
- Starting fresh after schema changes

⚠️ **Warning**: This command destroys all data in the database!

## Commands

```bash
# Drop and recreate database
mise run db_reset

# Followed automatically by setup
# mise run db_setup
```

## Expected Behavior

### Success

```
⚠️  Resetting Iudex database...
🗑️  Dropping database: iudex
✅ Database dropped
✅ Database recreated
✅ Schema reloaded
✅ Database reset complete!
```

## Safety Checks

The script includes safety prompts:

```bash
Are you sure you want to drop the database 'iudex'?
This will delete ALL data! (yes/no):
```

Type `yes` to proceed or anything else to cancel.

## Usage Examples

### Development Reset
```bash
/db-reset
```

### Reset and Verify
```bash
/db-reset
/db-status
```

### Reset Before Tests
```bash
/db-reset
/test
```

## When to Use

✅ **Good use cases:**
- Development environment cleanup
- Testing database setup scripts
- After major schema changes
- Clearing test data between manual test runs

❌ **Never use in:**
- Production environments
- Staging with important data
- Any environment with data you need

## Alternative: Use Testcontainers

For testing, consider using Testcontainers instead:

```bash
# Integration tests automatically create fresh databases
/test-integration
```

Testcontainers provide:
- Automatic fresh database per test run
- No manual reset needed
- Complete isolation
- No risk to existing data

## Troubleshooting

### Permission Denied

**Error**: `must be owner of database`

**Solution**: Run with appropriate PostgreSQL user permissions
```bash
# Usually handled automatically by mise task
# Or run as postgres user:
sudo -u postgres psql -c "DROP DATABASE iudex"
```

### Database In Use

**Error**: `database "iudex" is being accessed by other users`

**Solution**: Close all connections first
```bash
# Find active connections
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname = 'iudex'"

# Terminate connections
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'iudex'"

# Then reset
/db-reset
```

### PostgreSQL Not Running

**Error**: `could not connect to server`

**Solution**: Start PostgreSQL
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

## Related Skills

- `/db-setup` - Initial database setup
- `/db-status` - Check database state
- `/db-backup` - Backup before reset
- `/test-integration` - Use Testcontainers instead

## Backup First!

If you need to preserve data, backup first:

```bash
# Backup
/db-backup

# Reset
/db-reset

# If needed, restore from backup
psql -U postgres -d iudex < backup.sql
```

## Production Safety

To prevent accidental production resets, check environment:

```bash
if [ "$NODE_ENV" = "production" ]; then
  echo "❌ Cannot reset production database!"
  exit 1
fi
```

(This check should be in the mise task)

## Next Steps

After reset:
1. ✅ Database is clean and empty
2. Run `/test` to populate with test data
3. Check `/db-status` to see new state
4. Continue development

## See Also

- `database/README.md` - Database documentation
- `database/schema.sql` - Schema definition
- `.mise-tasks/db_reset` - Implementation script
