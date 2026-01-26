# Skill: examples

Run example tests to demonstrate framework features.

## Metadata

- **Name**: examples
- **Category**: Development
- **Dependencies**: None
- **Requires**: Node.js

## Description

Executes the example test files that demonstrate Iudex framework capabilities:
- HTTPBin API tests (integration examples)
- Simple test examples
- Test failure scenarios
- Various assertion patterns

Perfect for:
- Learning framework features
- Verifying framework works
- Testing new installations
- Demonstrating to stakeholders

## Commands

```bash
# Run example tests
npm run test:integration

# Or use CLI directly:
# node cli/index.js run

# Alternative: Use mise
# mise run examples
```

## Example Files

### 1. HTTPBin Examples (`examples/httpbin.test.js`)

Demonstrates:
- GET/POST/PUT/PATCH/DELETE requests
- JSON request/response handling
- Status code assertions
- Response time validation
- Header checking

17 integration tests covering real HTTP interactions.

### 2. Simple Examples (`examples/simple.test.js`)

Basic framework usage:
- Test suite structure
- Async test functions
- Assertions
- beforeEach/afterEach hooks

### 3. Failure Examples (`examples/with-failures.test.js`)

Shows error handling:
- Assertion failures
- HTTP errors
- Timeout scenarios
- Network issues

Useful for testing error reporting.

## Expected Behavior

### Success

```
🧪 Running example tests...

HTTPBin API Tests
  ✓ should handle GET requests (234ms)
  ✓ should handle POST requests (198ms)
  ✓ should handle PUT requests (156ms)
  ✓ should validate status codes (89ms)
  ...

✅ 17 tests passed

📊 Summary:
  Total: 17
  Passed: 17 (100%)
  Failed: 0
  Duration: 3.2s
```

## Usage Examples

### Basic Run
```bash
/examples
```

### Verbose Output
```bash
node cli/index.js run --verbose
```

### Run Specific Example
```bash
# Run only HTTPBin tests
node cli/index.js run examples/httpbin.test.js
```

### With Database Persistence
```bash
# Results saved to PostgreSQL if configured
DB_ENABLED=true /examples
```

## What You'll See

### Test Execution
- Progress indicators
- Real-time status updates
- Request/response logging (if verbose)
- Timing information

### Console Output
```
Iudex Test Runner

Environment: development
Tests: examples/**/*.test.js

HTTPBin API Tests
  → should handle GET requests... ✓ (234ms)
  → should handle POST requests... ✓ (198ms)
  ...

Tests: 17 passed, 0 failed
Time: 3.2s
```

### Database Results (if enabled)
- Test run recorded in `test_runs`
- Individual results in `test_results`
- Available via `/db-status`

## Example Breakdown

### HTTPBin Tests

**Purpose**: Test real HTTP operations

```javascript
test('should handle GET requests', async ({ request }) => {
  const response = await request.get('https://httpbin.org/get');
  expect(response).toHaveStatus(200);
  expect(response.body).toHaveProperty('url');
});
```

**Tests**:
- GET basic
- GET with query params
- POST JSON data
- PUT updates
- PATCH partial updates
- DELETE operations
- Response validation
- Header checking
- Status codes
- Response times

### Simple Tests

**Purpose**: Demonstrate basic features

```javascript
describe('Simple Tests', () => {
  test('should pass', async () => {
    expect(true).toBe(true);
  });
});
```

## Real-World Use Cases

### 1. Onboarding

New developers run examples to:
- Verify installation
- Learn syntax
- See framework in action
- Understand patterns

### 2. Testing Changes

After framework changes:
```bash
/examples  # Verify nothing broke
```

### 3. Documentation

Examples serve as living documentation:
- Show actual usage
- Always up-to-date
- Executable documentation

### 4. Demos

Show stakeholders:
```bash
/examples --verbose  # Full output
```

## Customization

### Add Your Own Examples

```javascript
// examples/my-example.test.js
import { describe, test, expect } from '../core/dsl.js';

describe('My API', { prefix: 'my' }, () => {
  test('my test', async ({ request }) => {
    // Your test here
  }, { id: 'my_test' });
});
```

Then run:
```bash
/examples
```

### Disable Specific Examples

Skip tests temporarily:

```javascript
test.skip('not ready yet', async () => {
  // Won't run
});
```

## Performance

- **HTTPBin tests**: ~3-4 seconds (network calls)
- **Simple tests**: <1 second (no network)
- **All examples**: ~3-5 seconds total

Network-dependent, may vary.

## Troubleshooting

### Network Errors

**Error**: `ENOTFOUND httpbin.org`

**Solution**: Check internet connection
```bash
ping httpbin.org
```

### HTTPBin Down

If HTTPBin is unavailable:
- Examples will fail (expected)
- Framework is still working
- Try again later or use different endpoint

### Timeouts

**Error**: `Request timeout`

**Solution**: Increase timeout or check network
```javascript
request.get(url, { timeout: 10000 }) // 10 seconds
```

### Database Errors (if enabled)

If database persistence fails:
- Examples still run
- Results just won't be saved
- Check `/db-status`

## CI/CD Integration

```yaml
# GitHub Actions
- name: Run Examples
  run: npm run test:integration

- name: Verify Framework
  run: node cli/index.js run examples/
```

## Related Skills

- `/test-integration` - Run all integration tests
- `/test` - Run all tests
- `/dev` - Development mode
- `/db-status` - View saved results

## Learning Path

1. **Start with simple examples**
   ```bash
   node cli/index.js run examples/simple.test.js
   ```

2. **Try HTTPBin examples**
   ```bash
   node cli/index.js run examples/httpbin.test.js
   ```

3. **Understand failures**
   ```bash
   node cli/index.js run examples/with-failures.test.js
   ```

4. **Create your own**
   - Copy an example
   - Modify for your API
   - Run and iterate

## Best Practices

1. **Keep Examples Simple**
   - One concept per example
   - Clear variable names
   - Good comments

2. **Examples Should Always Pass**
   - Except `with-failures.test.js`
   - Examples are trust anchors
   - Fix immediately if broken

3. **Update Examples with New Features**
   - Add examples for new assertions
   - Show new patterns
   - Keep documentation current

4. **Use Examples in Tests**
   - Examples themselves are integration tests
   - Verify framework works end-to-end

## Next Steps

After running examples:
- ✅ Framework verified working
- ✅ Syntax understood
- ✅ Ready to write your own tests

Create your first test:
```javascript
// tests/my-api.test.js
import { describe, test, expect } from 'iudex';

describe('My API', () => {
  test('health check', async ({ request }) => {
    const response = await request.get('/health');
    expect(response).toHaveStatus(200);
  });
});
```

## See Also

- `examples/` - Example files directory
- `README.md` - Usage documentation
- `docs/IMPLEMENTATION.md` - Framework details
