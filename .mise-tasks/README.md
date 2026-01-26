# Mise Tasks

All project tasks are managed as executable scripts in this directory.

## Available Tasks

### Testing

- **`test`** - Run all tests (unit + integration)
  - Depends on: `test_unit`, `test_integration`
  - Usage: `mise run test`

- **`test_unit`** - Run Jest unit tests
  - Runs all `.test.js` files excluding examples
  - Usage: `mise run test_unit`

- **`test_integration`** - Run integration tests
  - Runs HTTPBin example tests
  - Usage: `mise run test_integration`

- **`test_watch`** - Run tests in watch mode
  - Automatically reruns tests on file changes
  - Usage: `mise run test_watch`

### Development

- **`dev`** - Run CLI in watch mode
  - Automatically restarts on file changes
  - Usage: `mise run dev`

- **`lint`** - Run ESLint
  - Checks code quality and style
  - Usage: `mise run lint`

### Database

- **`db_setup`** - Initialize PostgreSQL database
  - Creates database, user, and loads schema
  - Configurable via environment variables (DB_NAME, DB_USER, DB_PASSWORD)
  - Usage: `mise run db_setup`

- **`db_reset`** - Drop and recreate database
  - Useful for testing or resetting state
  - Usage: `mise run db_reset`

- **`db_status`** - Show database status and statistics
  - Displays connection info, test counts, and recent runs
  - Usage: `mise run db_status`

## Task File Format

Tasks use the mise file-based task format with headers:

```bash
#!/usr/bin/env bash
#MISE description="Task description here"
#MISE depends=["dependency1", "dependency2"]

set -e

# Task implementation...
```

### Headers

- `#MISE description="..."` - Task description shown in `mise tasks`
- `#MISE depends=[...]` - List of task dependencies to run first

### Best Practices

1. Always use `set -e` to exit on errors
2. Provide clear console output with echo statements
3. Use emojis for visual feedback (🧪 ✅ 🗄️ etc.)
4. Make all task files executable (`chmod +x`)
5. Use underscores instead of colons in filenames (colons become underscores)

## Adding New Tasks

1. Create a new file in `.mise-tasks/`
2. Add shebang and mise headers
3. Make it executable: `chmod +x .mise-tasks/your_task`
4. Verify: `mise tasks`

## Examples

```bash
# Run all tests
mise run test

# Setup database and run tests
mise run db_setup && mise run test

# Development workflow
mise run test_watch  # In one terminal
mise run dev         # In another terminal
```

## Note

Task file names with colons (e.g., `test:unit`) are automatically converted to underscores (e.g., `test_unit`) by mise for filesystem compatibility. Both naming conventions work when calling tasks.
