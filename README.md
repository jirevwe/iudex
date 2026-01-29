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

**Week 1 + Week 2 Complete ✅**

- **499 unit tests passing** (100% pass rate)
- **17 integration tests** (HTTPBin examples)
- **PostgreSQL persistence layer** fully functional with transaction support
- **Slug-based test identity** with history tracking and deletion detection
- **Governance framework** with 5 rules fully implemented and tested
- **Security scanner** with 6 checks fully implemented and tested
- **Comprehensive documentation** for governance and security features

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

### 📚 Comprehensive Standard Library

**Postman-like utilities** available in every test via the `std` object:

```javascript
test('create user with utilities', async ({ std, request }) => {
  // Generate test data
  const user = {
    id: std.crypto.uuid(),
    email: std.random.email(),
    name: std.random.fullName(),
    createdAt: std.datetime.nowISO()
  };

  // Create HMAC signature
  const signature = std.crypto.hmacSHA256(
    std.encode.json(user),
    'secret-key'
  );

  // Make authenticated request
  const response = await request.post('/users', user, {
    headers: { 'X-Signature': signature }
  });

  expect(response).toHaveStatus(201);
});
```

**Available Utilities:**
- **Encoding/Decoding** - Base64, URL, JSON
- **Cryptography** - Hash functions (MD5, SHA256, SHA512), HMAC, UUID, random bytes
- **String Manipulation** - Case conversion (camelCase, snake_case, kebab-case), truncation, padding
- **Date/Time** - Formatting, parsing, arithmetic, comparison
- **Random Data** - Realistic test data (emails, names, phone numbers, addresses, UUIDs)
- **Object/Array Utilities** - Deep operations (pick, omit, merge, flatten, unique, sort)
- **Validators** - Format validation (email, URL, UUID, IP, JSON, phone, hex)

See the [Standard Library Reference](docs/STANDARD_LIBRARY.md) for complete API documentation.

### 🛡️ Built-in Governance Rules

**Opt-in enforcement** of API best practices:
- **REST Standards** - HTTP method validation, status codes, resource naming
- **API Versioning** - Detect and validate versioning in URL/headers
- **Naming Conventions** - Enforce kebab-case, snake_case, or camelCase consistency
- **HTTP Methods** - Validate method semantics (PUT vs PATCH, GET safety)
- **Pagination** - Detect missing pagination on large collections

> **Note**: Governance checks must be explicitly enabled via `governance: { enabled: true }` in config

### 🔒 Security Scanning

**Opt-in vulnerability detection** with CWE mappings:
- 🔴 **Critical:** Password exposure (CWE-200), Insecure auth over HTTP (CWE-319)
- 🟠 **High:** Missing authentication (CWE-306), IDOR vulnerabilities (CWE-639)
- 🟡 **Medium:** Missing rate limiting (CWE-770), Security headers (CWE-693)
- 🟢 **Low:** Incomplete rate limit metadata, Aggressive rate limiting

**Security Checks**:
- **Sensitive Data** - Detects passwords, API keys, tokens, PII in responses
- **Authentication** - Validates auth mechanisms and flags weak schemes
- **Authorization** - Detects IDOR and privilege escalation attempts
- **Rate Limiting** - Ensures rate limits are present and configured
- **SSL/TLS** - Enforces HTTPS and secure cookie settings
- **Security Headers** - Validates HSTS, CSP, CORS, and other headers

> **Note**: Security checks must be explicitly enabled via `security: { enabled: true }` in config

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

### 🎨 Interactive Dashboard

Visualize test results with the built-in web dashboard:

**Option 1: Mount on Your Server**

```javascript
import express from 'express';
import { createExpressDashboard } from 'iudex/server/express';

const app = express();

// Mount dashboard at /test-dashboard
app.use('/test-dashboard', createExpressDashboard({
  resultsDir: '.iudex/results',
  title: 'API Test Dashboard'
}));

app.listen(3000);
// Visit: http://localhost:3000/test-dashboard
```

**Option 2: Generate Static Dashboard**

```javascript
// iudex.config.js
export default {
  reporters: [
    'console',
    {
      reporter: 'github-pages',
      config: {
        outputDir: 'docs/test-reports',
        title: 'Test Dashboard',
        includeHistorical: true
      }
    }
  ]
};
```

Then deploy to GitHub Pages or any static hosting.

**Dashboard Features:**
- 📊 Real-time test results and trends
- 🔍 Filterable test table with search
- ⚠️ Governance violations panel
- 🔒 Security findings overview
- 📈 Historical run comparison
- 🌐 Works with Express, Fastify, or standalone

**Supported Frameworks:**
- Express (`iudex/server/express`)
- Fastify (`iudex/server/fastify`)
- Raw Node.js HTTP (`iudex/server/http`)
- Static generation (`github-pages` reporter)

See [DASHBOARD_GUIDE.md](./docs/DASHBOARD_GUIDE.md) for complete setup guide with examples.

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

  // Governance rules (opt-in)
  governance: {
    enabled: true,  // Must be explicitly set to true
    rules: {
      'rest-standards': { enabled: true, severity: 'error' },
      'versioning': { enabled: true, severity: 'warning' },
      'naming-conventions': { enabled: true, severity: 'info' },
      'http-methods': { enabled: true, severity: 'error' },
      'pagination': { enabled: true, severity: 'warning' }
    }
  },

  // Security checks (opt-in)
  security: {
    enabled: true,  // Must be explicitly set to true
    checks: {
      'sensitive-data': { enabled: true },
      'authentication': { enabled: true },
      'authorization': { enabled: true },
      'rate-limiting': { enabled: true },
      'ssl-tls': { enabled: true },
      'headers': { enabled: true }
    }
  },

  // Threshold enforcement for CI/CD
  thresholds: {
    governanceViolations: {
      error: 0,      // Fail on any errors
      warning: 10    // Allow up to 10 warnings
    },
    securityFindings: {
      critical: 0,   // Fail on any critical findings
      high: 0        // Fail on any high findings
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

### ✅ Week 1: Core Framework (Complete)
- [x] Test DSL with lifecycle hooks (core/dsl.js)
- [x] HTTP Client with request/response capture (core/http-client.js)
- [x] Test Runner with timeout and retry support (core/runner.js)
- [x] Result Collector with aggregation (core/collector.js)
- [x] Console Reporter with color output (reporters/console.js)
- [x] PostgreSQL Reporter with persistence (reporters/postgres.js)
- [x] JSON Reporter for CI/CD (reporters/json.js)
- [x] CLI Tool with run command (cli/index.js)
- [x] Configuration System (iudex.config.js)

### ✅ Week 2: Governance & Security (Complete)
- [x] Governance Engine (governance/engine.js)
- [x] 5 Governance Rules:
  - [x] REST Standards (rest-standards.js)
  - [x] API Versioning (versioning.js)
  - [x] Naming Conventions (naming-conventions.js)
  - [x] HTTP Methods with PUT/PATCH validation (http-methods.js)
  - [x] Pagination (pagination.js)
- [x] Security Scanner (security/scanner.js)
- [x] 6 Security Checks:
  - [x] Sensitive Data Exposure (sensitive-data.js)
  - [x] Authentication Validation (authentication.js)
  - [x] Authorization & IDOR Detection (authorization.js)
  - [x] Rate Limiting (rate-limiting.js)
  - [x] SSL/TLS & Secure Cookies (ssl-tls.js)
  - [x] Security Headers & CORS (headers.js)
- [x] 499 unit tests (100% pass rate)
- [x] Integration with test runner (opt-in design)
- [x] Threshold enforcement in CLI
- [x] Comprehensive documentation (docs/GOVERNANCE.md, docs/SECURITY.md)

### ✅ Week 3: Reporting & Analytics (Complete)
- [x] PostgreSQL persistence with slug-based identity
- [x] Transaction support with savepoints
- [x] Test deletion detection
- [x] GitHub Pages static dashboard
- [x] Flaky test detection views
- [x] Regression tracking views
- [x] Health score calculations
- [x] Historical trend analysis
- [x] Analytics API with PostgreSQL integration
- [x] Interactive dashboard with 4 tabs (Tests, Governance, Security, Analytics)

### 📅 Week 4: Ecosystem & Plugins (Planned)
- [ ] Postman collection import
- [ ] OpenAPI spec validation
- [ ] Custom rule/check plugins
- [ ] Backend API integration
- [ ] Advanced reporting features

## Development Roadmap

### ✅ Week 1-2: Foundation Complete
- Core test framework with 499 passing tests
- PostgreSQL persistence with transaction support
- Governance framework with 5 rules
- Security scanner with 6 checks
- Comprehensive documentation

### 🚧 Week 3: Advanced Reporting (Current)
- GitHub Pages dashboard
- Analytics views (flaky tests, regressions, health scores)
- Historical trend visualization
- Performance metrics

### 📅 Week 4: Ecosystem & Plugins (Upcoming)
- Postman collection import
- OpenAPI spec validation
- Custom rule/check plugin system
- Backend API integration
- Extended documentation and examples

## Documentation

- **[Governance Guide](docs/GOVERNANCE.md)** - Complete reference for all 5 governance rules
- **[Security Guide](docs/SECURITY.md)** - Complete reference for all 6 security checks with CWE mappings
- **[Implementation Summary](docs/IMPLEMENTATION_COMPLETE_SUMMARY.md)** - Detailed implementation overview
- **Examples** - See `examples/governance-security-demo.test.js` for comprehensive examples

## License

MIT

## Support

- 📖 Documentation: See docs/ folder
- 🐛 Issues: GitHub Issues
- 💬 Questions: GitHub Discussions

---

**Made with ❤️ for API testing excellence**
