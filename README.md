# API Guardian Framework 🛡️

> JavaScript-first API testing framework with built-in governance and security

## Why API Guardian?

- ✅ **JavaScript Native** - Your team already knows it
- ✅ **Compatible** - Works with postman-request and modern tools
- ✅ **Governance Built-in** - Enforces API best practices automatically
- ✅ **Security First** - Detects vulnerabilities as you test
- ✅ **GitHub Pages** - Beautiful static reports
- ✅ **CI/CD Ready** - Integrates seamlessly
- ✅ **No Vendor Lock-in** - Open source, your tests, your control

## Quick Start

### Installation

```bash
npm install api-guardian --save-dev
```

### Write Your First Test

```javascript
// tests/users.test.js
import { describe, test, expect } from 'api-guardian';

describe('Users API', () => {
  test('should get all users', async ({ request }) => {
    const response = await request.get('/api/users');
    
    expect(response).toHaveStatus(200);
    expect(response.body).toBeArray();
    expect(response).toRespondWithin(500);
  });

  test('should create user', async ({ request }) => {
    const response = await request.post('/api/users', {
      body: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    });

    expect(response).toHaveStatus(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Run Tests

```bash
npx api-guardian run
```

### Generate Report

```bash
npx api-guardian report --format github-pages --output docs/
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

### 📊 Beautiful Reports

- Console output with colors
- GitHub Pages static dashboard
- Backend API integration
- JSON/JUnit for CI/CD

## Configuration

Create \`guardian.config.js\`:

```javascript
export default {
  testMatch: ['tests/**/*.test.js'],
  
  http: {
    baseURL: process.env.API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`
    }
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
    ['github-pages', { output: 'docs/' }]
  ]
};
```

## CLI Commands

```bash
# Run tests
api-guardian run [pattern]

# Generate report
api-guardian report --format github-pages --output docs/

# Import Postman collection
api-guardian import collection.json --output tests/

# Validate API spec
api-guardian validate --spec openapi.yaml
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
        run: npx api-guardian run
      
      - name: Generate Report
        run: npx api-guardian report --format github-pages --output docs/
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## Project Structure

```
api-guardian/
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
- [x] Configuration System (guardian.config.js)
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
