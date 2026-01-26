# Skill: test-unit

Run unit tests only (fast, no Docker required).

## Metadata

- **Name**: test-unit
- **Category**: Testing
- **Dependencies**: None
- **Requires**: Node.js

## Description

Executes only the unit tests using Jest. This is faster than running all tests because it:
- Skips integration tests
- Doesn't require Docker/Testcontainers
- Uses mocks for external dependencies

Perfect for rapid development feedback loops.

## Commands

```bash
# Run unit tests
npm run test:unit

# Alternative: Use mise
# mise run test_unit
```

## Expected Behavior

### Success

```
Test Suites: 11 passed, 11 total
Tests:       314 passed, 314 total
Time:        ~5-8 seconds
```

## Coverage

Unit tests cover:
- `core/dsl.js` - Test DSL (describe, test, expect)
- `core/http-client.js` - HTTP client wrapper
- `core/runner.js` - Test execution engine
- `core/collector.js` - Result aggregation
- `core/logger.js` - Logging abstraction
- `database/client.js` - Database client (mocked pool)
- `database/repository.js` - Data access layer (mocked)
- `reporters/postgres.js` - PostgreSQL reporter (mocked)
- `reporters/json.js` - JSON reporter

## Usage Examples

### Basic Usage
```bash
/test-unit
```

### Watch Mode for Development
```bash
/test-watch
# or
npm run test:unit -- --watch
```

### Run Specific Test File
```bash
npm run test:unit -- core/dsl.test.js
```

### With Coverage
```bash
npm run test:unit -- --coverage
```

## Performance

- **Duration**: ~5-8 seconds
- **No Docker required**
- **No database setup needed**
- **Perfect for TDD workflows**

## Related Skills

- `/test` - Run all tests (unit + integration)
- `/test-integration` - Run only integration tests
- `/test-watch` - Run unit tests in watch mode
- `/pre-commit` - Quick validation before commit

## Development Workflow

```bash
# 1. Start watch mode
/test-watch

# 2. Make changes to code

# 3. Tests auto-run on save

# 4. Fix any failures

# 5. Run full test suite before commit
/test
```

## CI/CD Integration

Useful for fast CI feedback:

```yaml
# GitHub Actions - Fast check
- name: Quick Unit Tests
  run: npm run test:unit

- name: Full Test Suite
  run: npm test
  if: github.event_name == 'pull_request'
```

## Troubleshooting

### Tests Not Found

Ensure you're in the project root:
```bash
cd /path/to/iudex
/test-unit
```

### Jest Not Found

Install dependencies:
```bash
npm install
```

## Next Steps

- Fast feedback: ✅ Unit tests pass
- Before commit: Run `/test` for full validation
- During development: Use `/test-watch`
