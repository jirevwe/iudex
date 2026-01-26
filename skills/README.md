# Iudex Framework - Claude Code Skills

This directory contains Claude Code skills for building and maintaining the Iudex framework. Skills are reusable workflows that can be invoked via slash commands or the Skill tool.

## Available Skills

### Testing Skills

- **`/test`** - Run all tests (unit + integration)
- **`/test-unit`** - Run unit tests only
- **`/test-integration`** - Run integration tests with Testcontainers
- **`/test-watch`** - Run tests in watch mode for development
- **`/test-coverage`** - Generate test coverage report

### Database Skills

- **`/db-setup`** - Initialize PostgreSQL database with schema
- **`/db-reset`** - Drop and recreate database (clean slate)
- **`/db-migrate`** - Apply database migrations
- **`/db-status`** - Show database connection status and statistics
- **`/db-backup`** - Backup database schema and data

### Code Quality Skills

- **`/lint`** - Run ESLint to check code quality
- **`/lint-fix`** - Auto-fix ESLint issues
- **`/format`** - Format code (if formatter configured)
- **`/validate`** - Run comprehensive validation (tests + lint + types)

### Development Skills

- **`/dev`** - Start development server with file watching
- **`/examples`** - Run example tests
- **`/build`** - Build the project for distribution
- **`/clean`** - Clean build artifacts and temporary files

### Reporting Skills

- **`/report-console`** - Generate console test report
- **`/report-json`** - Generate JSON test report
- **`/report-github`** - Generate GitHub Pages report

### CI/CD Skills

- **`/ci-check`** - Run all CI checks (tests, lint, build)
- **`/pre-commit`** - Run pre-commit checks
- **`/pre-push`** - Run pre-push validation

## Usage

### In Claude Code CLI

```bash
# Run a skill
/test

# Run with arguments
/test-unit --verbose

# Chain multiple skills
/lint && /test && /build
```

### Programmatically

Skills can also be invoked via the Skill tool:

```javascript
// In Claude Code
Skill({ skill: "test", args: "--coverage" })
```

## Skill Structure

Each skill is defined in a separate file with:

1. **Metadata** - Name, description, dependencies
2. **Commands** - Shell commands to execute
3. **Validation** - Pre-conditions and checks
4. **Error Handling** - Graceful failure handling

## Creating New Skills

To create a new skill:

1. Create a new file in `skills/definitions/`
2. Follow the skill template format
3. Make it executable: `chmod +x skills/definitions/your-skill`
4. Document it in this README
5. Test the skill: `/your-skill`

## Skill Dependencies

Some skills have dependencies on others:

```
validate
├── lint
├── test-unit
├── test-integration
└── build

ci-check
├── validate
└── report-json

pre-commit
├── lint
└── test-unit

pre-push
├── test
└── build
```

## Environment Variables

Skills respect the following environment variables:

- `NODE_ENV` - Development/production mode
- `DB_*` - Database configuration (see mise.toml)
- `CI` - CI environment detection
- `VERBOSE` - Enable verbose output

## Integration with Mise

Skills complement mise tasks but serve different purposes:

- **Mise tasks**: Low-level build operations, reusable across projects
- **Skills**: High-level workflows, project-specific, AI-assistable

You can call mise tasks from within skills:

```bash
#!/usr/bin/env bash
# In a skill file
mise run db_setup
mise run test
```

## Best Practices

1. **Idempotent**: Skills should be safe to run multiple times
2. **Fast Feedback**: Provide quick status updates
3. **Fail Fast**: Exit immediately on critical errors
4. **Informative**: Clear success/failure messages
5. **Composable**: Skills should work together

## Troubleshooting

### Skill Not Found

Ensure the skill file is:
- Present in `skills/definitions/`
- Executable (`chmod +x`)
- Properly formatted

### Permission Denied

```bash
chmod +x skills/definitions/*
```

### Database Connection Issues

Check environment variables and database status:
```bash
/db-status
```

## Examples

### Development Workflow

```bash
# Initial setup
/db-setup

# Development cycle
/test-watch  # In one terminal
/dev         # In another terminal

# Before committing
/pre-commit
```

### CI/CD Workflow

```bash
# Complete validation
/ci-check

# Generate reports
/report-json
/report-github
```

### Debugging Workflow

```bash
# Check database
/db-status

# Run specific tests
/test-unit

# Verbose testing
/test --verbose

# Lint check
/lint
```

## Contributing

When adding new skills:

1. Keep them focused and single-purpose
2. Add clear error messages
3. Document dependencies
4. Update this README
5. Test in multiple scenarios

## Related Documentation

- **Mise Tasks**: `.mise-tasks/README.md`
- **Database Setup**: `database/README.md`
- **Testing Guide**: `docs/TESTING_RESULTS.md`
- **Implementation**: `docs/IMPLEMENTATION.md`
