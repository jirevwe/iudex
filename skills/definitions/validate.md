# Skill: validate

Run comprehensive validation checks (tests + lint + build).

## Metadata

- **Name**: validate
- **Category**: Quality Assurance
- **Dependencies**: lint, test, build
- **Requires**: Node.js, Docker

## Description

Performs complete codebase validation:
1. **Linting** - Check code style and quality
2. **Unit Tests** - Fast tests with mocks
3. **Integration Tests** - Real database tests
4. **Build Check** - Verify package can be built

This is the definitive "is the code good?" check. Run before:
- Committing code
- Creating pull requests
- Deploying
- Releasing

## Commands

```bash
# Run all validation checks
npm run lint && npm test && echo "✅ All validation passed"

# Alternative breakdown:
# 1. Lint
# 2. Test (unit + integration)
# 3. Build verification
```

## Expected Behavior

### Success

```
🔍 Running ESLint...
✅ ESLint passed (0 errors, 0 warnings)

🧪 Running Tests...
  Unit Tests: 314 passed
  Integration Tests: 11 passed
✅ All tests passed (325/325)

📦 Verifying Build...
✅ Build verification passed

✅ All validation checks passed!
```

### Failure

If any check fails, validation stops:

```
🔍 Running ESLint...
❌ ESLint failed: 3 errors, 12 warnings

Fix errors before continuing.
```

## Validation Stages

### Stage 1: Linting (Fast)

```bash
npm run lint
# ~2-3 seconds
```

Checks:
- Code style consistency
- Potential bugs
- Best practice violations
- Unused variables
- Import issues

### Stage 2: Unit Tests (Fast)

```bash
npm run test:unit
# ~5-8 seconds
```

Validates:
- Core logic correctness
- Function behavior
- Edge cases
- Error handling

### Stage 3: Integration Tests (Slower)

```bash
npm run test:integration
# ~15-20 seconds
```

Verifies:
- Database operations
- End-to-end workflows
- Real external interactions
- Transaction handling

### Stage 4: Build Check (Optional)

```bash
# If build script exists
npm run build
```

Ensures:
- No TypeScript errors (if using TS)
- Bundle creation works
- Assets compile correctly

## Usage Examples

### Pre-Commit Validation
```bash
/validate
```

### Continuous Integration
```bash
# In CI pipeline
/validate
```

### Before Pull Request
```bash
/validate
/report-json  # Generate report for PR
```

### Quick Development Check
```bash
# Skip integration tests for speed
/lint && /test-unit
```

## Exit Codes

- `0` - All validation passed ✅
- `1` - Linting failed ❌
- `2` - Tests failed ❌
- `3` - Build failed ❌

## Performance

- **Linting**: ~2-3 seconds
- **Unit Tests**: ~5-8 seconds
- **Integration Tests**: ~15-20 seconds
- **Total**: ~25-35 seconds

## Related Skills

- `/lint` - Run linting only
- `/test` - Run tests only
- `/test-unit` - Fast unit tests
- `/ci-check` - CI-specific validation
- `/pre-commit` - Quick pre-commit checks

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install Dependencies
        run: npm install

      - name: Run Validation
        run: |
          npm run lint
          npm test
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running validation..."
npm run lint && npm test:unit

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Commit aborted."
  exit 1
fi

echo "✅ Validation passed"
```

## Troubleshooting

### Linting Failures

```bash
# View detailed errors
npm run lint

# Auto-fix when possible
/lint-fix
```

### Test Failures

```bash
# Run with verbose output
npm test -- --verbose

# Run specific failing test
npm test -- path/to/failing.test.js
```

### Docker Issues (Integration Tests)

```bash
# Verify Docker is running
docker ps

# Start Docker
open -a Docker  # macOS
```

### Out of Memory

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

## Best Practices

1. **Run Locally First**
   - Don't rely solely on CI
   - Catch issues before pushing

2. **Fix Incrementally**
   - Start with linting
   - Then unit tests
   - Finally integration tests

3. **Use Watch Mode During Development**
   - `/test-watch` for rapid feedback
   - Run full validation before commit

4. **Keep Tests Fast**
   - Unit tests should be < 10 seconds
   - Integration tests should be < 30 seconds

## Validation Checklist

Before committing:
- [ ] Linting passes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No console errors/warnings
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] Examples work

## Next Steps

After successful validation:
- ✅ Safe to commit
- ✅ Ready for pull request
- ✅ Can deploy with confidence

After failed validation:
- ❌ Review errors
- ❌ Fix issues
- ❌ Re-run validation
- ❌ Repeat until green

## See Also

- `docs/IMPLEMENTATION.md` - Development guide
- `docs/TESTING_RESULTS.md` - Testing documentation
- `.eslintrc.js` - Linting configuration
- `jest.config.js` - Test configuration
