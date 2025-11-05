# Iudex Framework 🛡️

> JavaScript-first API testing framework with built-in governance, security, and persistence

## Why Iudex?

- ✅ **JavaScript Native** - Your team already knows it
- ✅ **Data Persistence** - PostgreSQL-backed test history and analytics
- ✅ **Smart Test Identity** - Stable slugs maintain history across renames
- ✅ **Governance Built-in** - Enforces API best practices automatically
- ✅ **Security First** - Detects vulnerabilities as you test
- ✅ **Rich Analytics** - Flaky test detection, health scores, regression tracking
- ✅ **CI/CD Ready** - Integrates seamlessly with GitHub Actions
- ✅ **No Vendor Lock-in** - Open source, your tests, your control

## Current Status

**Week 1 + Week 2 (Days 6-8) Complete ✅**

- 139 unit tests passing
- 17 integration tests (HTTPBin examples)
- PostgreSQL persistence layer fully functional
- Slug-based test identity with history tracking

## Quick Start

### Installation

```bash
npm install iudex --save-dev
```

### Write Your First Test

```javascript
// tests/users.test.js
import { describe, test, expect } from 'iudex';

describe('Users API', { prefix: 'users' }, () => {
  test('should get all users', async ({ request }) => {
    const response = await request.get('/api/users');

    expect(response).toHaveStatus(200);
    expect(response.body).toBeArray();
    expect(response).toRespondWithin(500);
  }, { id: 'list_all' }); // Slug: users.list_all

  test('should create user', async ({ request }) => {
    const response = await request.post('/api/users', {
      body: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    });

    expect(response).toHaveStatus(201);
    expect(response.body).toHaveProperty('id');
  }, { id: 'create' }); // Slug: users.create
});
```

**Note:** Test IDs are optional. If not provided, Iudex auto-generates slugs from test names.

### Run Tests

```bash
npx iudex run
```

### Generate Report

```bash
npx iudex report --format github-pages --output docs/
```

## Features

### 🧪 Intuitive Test DSL

Write tests like you're used to with Jest/Mocha syntax.

### 🛡️ Built-in Governance Rules

Automatically enforces:
- REST standards (HTTP methods, status codes)
- Resource naming conventions
- API versioning
- Pagination requirements
- Consistent error formats

### 🔒 Security Scanning

Detects vulnerabilities:
- 🔴 **Critical:** Passwords, API keys in responses
- 🟠 **High:** JWT tokens in body, missing auth
- 🟡 **Medium:** PII exposure, missing headers
- 🟢 **Low:** IP addresses, rate limiting

### 💾 Data Persistence & Analytics

PostgreSQL-backed test history:
- **Slug-based Identity** - Tests maintain history across renames
- **Complete Audit Trail** - Track every test name/description change
- **Flaky Test Detection** - Identify intermittently failing tests
- **Regression Tracking** - Catch tests that were passing but now failing
- **Health Scores** - Multi-dimensional test health metrics
- **Success Rates** - Per-endpoint and overall statistics
- **Daily Trends** - Historical data for trend analysis

```javascript
// Auto-generated slugs (from test names)
test('should handle PUT requests', async (context) => {
  // Slug: httpbin.api.should-handle-put-requests
});

// Explicit slugs (stable across renames)
test('Verify user creation endpoint', async (context) => {
  // ...
}, { id: 'create_user' }); // Slug: users.create_user
```

**Analytics Views:**
```sql
-- Get flaky tests
SELECT * FROM flaky_tests WHERE failure_rate > 10;

-- Get recent regressions
SELECT * FROM recent_regressions WHERE latest_run > NOW() - INTERVAL '7 days';

-- Get test health scores
SELECT * FROM test_health_scores ORDER BY overall_health_score ASC LIMIT 10;
```

### 📊 Beautiful Reports

- Console output with colors
- GitHub Pages static dashboard
- Backend API integration
- JSON/JUnit for CI/CD

## Configuration

Create \`iudex.config.js\`:

```javascript
export default {
  testMatch: ['tests/**/*.test.js'],

  http: {
    baseURL: process.env.API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`
    }
  },

  // Database persistence (optional)
  database: {
    enabled: process.env.DB_ENABLED !== 'false',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'iudex',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' || false,
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 10
  },

  governance: {
    enabled: true,
    rules: {
      'rest-standards': { enabled: true, severity: 'error' },
      'versioning': { enabled: true, severity: 'warning' }
    }
  },

  security: {
    enabled: true,
    checks: {
      'sensitive-data': { enabled: true },
      'authentication': { enabled: true }
    }
  },

  reporters: [
    'console',
    'postgres',  // Persist to PostgreSQL
    ['github-pages', { output: 'docs/' }]
  ]
};
```

## CLI Commands

```bash
# Run tests
iudex run [pattern]

# Generate report
iudex report --format github-pages --output docs/

# Import Postman collection
iudex import collection.json --output tests/

# Validate API spec
iudex validate --spec openapi.yaml
```

## CI/CD Integration

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - run: npm install
      
      - name: Run Tests
        env:
          API_BASE_URL: \${{ secrets.API_BASE_URL }}
          API_KEY: \${{ secrets.API_KEY }}
        run: npx iudex run

      - name: Generate Report
        run: npx iudex report --format github-pages --output docs/
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## Project Structure

```
iudex/
├── core/
│   ├── dsl.js              # Test definition DSL
│   ├── runner.js           # Test execution engine
│   ├── http-client.js      # HTTP wrapper
│   └── collector.js        # Result aggregation
├── governance/
│   ├── engine.js           # Governance rule engine
│   └── rules/              # Built-in rules
├── security/
│   ├── scanner.js          # Security scanner
│   └── checks/             # Security checks
├── reporters/
│   ├── console.js          # Terminal output
│   ├── github-pages.js     # Static site generator
│   └── backend.js          # Backend publisher
├── cli/
│   └── index.js            # CLI interface
└── examples/
    └── users.test.js       # Example tests
```

## Assertions API

```javascript
// Status codes
expect(response).toHaveStatus(200)

// Headers
expect(response).toHaveHeader('content-type')
expect(response).toHaveSecurityHeaders()

// Body
expect(response.body).toHaveProperty('id')
expect(response.body).toBeArray()
expect(response.body).toHaveLength(10)

// Performance
expect(response).toRespondWithin(500)

// Governance
expect(response).toHaveApiVersion()
expect(response).toHaveRateLimit()
```

## Implementation Status

### ✅ Completed
- [x] Test DSL (core/dsl.js)
- [x] HTTP Client (core/http-client.js)
- [x] Example Governance Rule (governance/rules/rest-standards.js)
- [x] Example Security Check (security/checks/sensitive-data.js)
- [x] Configuration System (iudex.config.js)
- [x] Example Tests (examples/users.test.js)

### ⏳ To Implement (4-week roadmap)
- [ ] Test Runner (core/runner.js)
- [ ] Result Collector (core/collector.js)
- [ ] Governance Engine (governance/engine.js)
- [ ] Security Scanner (security/scanner.js)
- [ ] Console Reporter (reporters/console.js)
- [ ] GitHub Pages Reporter (reporters/github-pages.js)
- [ ] Backend Reporter (reporters/backend.js)
- [ ] CLI Tool (cli/index.js)
- [ ] Additional Governance Rules
- [ ] Additional Security Checks
- [ ] Postman Import Plugin
- [ ] OpenAPI Plugin

## 4-Week Implementation Plan

### Week 1: Core Framework (MVP)
- Test Runner
- Result Collector
- Console Reporter
- Basic CLI

### Week 2: Governance & Security
- Governance Engine + 5 rules
- Security Scanner + 6 checks
- Integration

### Week 3: Reporting
- GitHub Pages generator
- Backend publisher
- JSON/JUnit reporters

### Week 4: Ecosystem
- Postman import
- OpenAPI generation
- Documentation
- Examples

## License

MIT

## Support

- 📖 Documentation: See docs/ folder
- 🐛 Issues: GitHub Issues
- 💬 Questions: GitHub Discussions

---

**Made with ❤️ for API testing excellence**
