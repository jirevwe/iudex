# Skill: test

Run all tests (unit + integration) for the Iudex framework.

## Metadata

- **Name**: test
- **Category**: Testing
- **Dependencies**: None
- **Requires**: Node.js, Docker (for integration tests)

## Description

Executes the complete test suite including:
- Unit tests (Jest)
- Integration tests (Testcontainers + PostgreSQL)

This skill provides comprehensive validation of the codebase and should be run before committing changes.

## Commands

```bash
# Run all tests with Jest
npm test

# Alternative: Use mise task
# mise run test
```

## Options

- `--verbose` - Show detailed test output
- `--coverage` - Generate code coverage report
- `--watch` - Run in watch mode (use /test-watch instead)

## Expected Behavior

### Success

```
Test Suites: 12 passed, 12 total
Tests:       325 passed, 325 total
Time:        ~15-20 seconds
```

### Failure

If tests fail:
1. Review the failure output
2. Check affected files
3. Run specific test suite: `npm test -- <pattern>`
4. Fix issues and re-run

## Prerequisites

1. **Node.js installed** (v18+)
   ```bash
   node --version
   ```

2. **Dependencies installed**
   ```bash
   npm install
   ```

3. **Docker running** (for integration tests)
   ```bash
   docker ps
   ```

## Usage Examples

### Basic Usage
```bash
/test
```

### With Coverage
```bash
npm test -- --coverage
```

### Run Specific Test Suite
```bash
npm test -- database/client.test.js
```

### Verbose Output
```bash
npm test -- --verbose
```

## Related Skills

- `/test-unit` - Run only unit tests
- `/test-integration` - Run only integration tests
- `/test-watch` - Run tests in watch mode
- `/test-coverage` - Generate coverage report
- `/validate` - Run tests + lint + other checks

## Troubleshooting

### Docker Not Running

**Error**: `connect ENOENT /var/run/docker.sock`

**Solution**: Start Docker daemon
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### Tests Timing Out

**Error**: Integration tests timeout

**Solution**:
1. Check Docker has enough resources
2. Verify PostgreSQL image is downloaded
3. Increase Jest timeout in jest.config.js

### Port Conflicts

Integration tests use Testcontainers which automatically finds available ports. No manual configuration needed.

## Performance

- **First run**: ~30-40 seconds (downloads PostgreSQL image)
- **Subsequent runs**: ~15-20 seconds
- **Unit tests only**: ~5-8 seconds

## CI/CD Integration

This skill is safe to run in CI environments:

```yaml
# GitHub Actions
- name: Run Tests
  run: npm test
```

## Output Format

```
 PASS  database/client.test.js
 PASS  database/repository.test.js
 PASS  core/dsl.test.js
 PASS  core/runner.test.js
 ...

Test Suites: 12 passed, 12 total
Tests:       325 passed, 325 total
Snapshots:   0 total
Time:        18.234 s
```

## Next Steps

After running tests:
- If all pass: ✅ Proceed with commit
- If failures: ❌ Fix issues and re-run
- Generate report: `/report-console` or `/report-json`