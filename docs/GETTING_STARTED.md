# Getting Started with Iudex

Complete guide to set up and run your first API tests with Iudex.

## Installation

```bash
npm install --save-dev iudex
```

## Quick Start (No Database)

Get started in 60 seconds without database setup:

### 1. Create a test file

```javascript
// tests/api.test.js
import { describe, it, expect } from 'iudex';

describe('HTTPBin API', () => {
  it('should return JSON', async ({ request }) => {
    const response = await request.get('https://httpbin.org/json');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('slideshow');
  });

  it('should echo headers', async ({ request }) => {
    const response = await request.get('https://httpbin.org/headers', {
      headers: { 'X-Custom-Header': 'test-value' }
    });
    expect(response.status).toBe(200);
    expect(response.data.headers).toHaveProperty('X-Custom-Header');
  });
});
```

### 2. Run tests

```bash
npx iudex run
```

That's it! Results display in your terminal.

---

## With PostgreSQL Persistence

To track test history, detect regressions, and generate analytics, add PostgreSQL:

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker:**
```bash
docker run --name iudex-postgres \
  -e POSTGRES_PASSWORD=iudex_pass \
  -e POSTGRES_DB=iudex_test_results \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE iudex_test_results;
CREATE USER iudex_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE iudex_test_results TO iudex_user;

# Connect to the database and grant schema permissions
\c iudex_test_results
GRANT ALL ON SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iudex_user;

\q
```

### 3. Configure Iudex

Create `iudex.config.js` in your project root:

```javascript
export default {
  // Test patterns
  testMatch: ['tests/**/*.test.js'],

  // Enable reporters
  reporters: [
    'console',      // Terminal output
    'postgres'      // Database persistence
  ],

  // Database configuration
  database: {
    host: 'localhost',
    port: 5432,
    database: 'iudex_test_results',
    user: 'iudex_user',
    password: process.env.DB_PASSWORD || 'your_password_here',

    // Auto-run migrations on first connection (development only)
    autoMigrate: process.env.NODE_ENV !== 'production'
  }
};
```

**💡 Pro tip:** Use environment variables for passwords:

```bash
# .env
DB_PASSWORD=your_password_here
```

### 4. Choose Your Setup Method

#### Option A: Automatic (Development)

Just run your tests! Migrations run automatically:

```bash
npx iudex run
```

First run output:
```
[iudex] Database not initialized. Running migrations automatically...
[iudex] ✅ Database migrations completed
[iudex] Running tests...
```

#### Option B: Manual (Production)

Run migrations explicitly before running tests:

```bash
# Run migrations
npx iudex db:migrate

# Then run tests
npx iudex run
```

### 5. Verify Setup

```bash
# Check migration status
npx iudex db:migrate --status

# View tables in database
psql -d iudex_test_results -c "\dt"
```

You should see:
- `test_suites` - Test collections
- `test_runs` - Test execution history
- `tests` - Individual test definitions
- `test_results` - Detailed test results
- `migrations` - Migration tracking

---

## Configuration Options

### Full Configuration Example

```javascript
// iudex.config.js
export default {
  // Test file patterns
  testMatch: [
    'tests/**/*.test.js',
    'e2e/**/*.test.js'
  ],

  // Timeout settings
  timeout: 30000,      // 30 seconds default
  retries: 0,          // No retries by default
  bail: false,         // Continue on failures

  // Reporters
  reporters: [
    'console',
    'postgres',
    ['json', { outputFile: './results.json' }]
  ],

  // HTTP settings
  http: {
    baseURL: 'https://api.example.com',
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`
    }
  },

  // Database configuration
  database: {
    // Connection
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'iudex_test_results',
    user: process.env.DB_USER || 'iudex_user',
    password: process.env.DB_PASSWORD,

    // Migration
    autoMigrate: process.env.NODE_ENV === 'development',

    // Connection pooling
    poolSize: 10,
    idleTimeout: 30000,
    connectionTimeout: 2000,

    // SSL (for production)
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  },

  // Governance rules
  governance: {
    rules: {
      requiredHeaders: ['Authorization', 'Content-Type'],
      deprecatedEndpoints: ['/api/v1/old-endpoint']
    }
  },

  // Security checks
  security: {
    enabled: true,
    checkSSL: true,
    checkHeaders: true
  },

  // Thresholds (fail build if exceeded)
  thresholds: {
    testPassRate: 95,  // Minimum 95% pass rate
    governanceViolations: {
      error: 0,        // No governance errors allowed
      warning: 5       // Max 5 governance warnings
    },
    securityFindings: {
      critical: 0,
      high: 0,
      medium: 5
    }
  }
};
```

---

## CLI Commands

### Running Tests

```bash
# Run all tests
npx iudex run

# Run specific pattern
npx iudex run tests/auth/**/*.test.js

# With options
npx iudex run --timeout 60000 --retries 2 --bail --verbose
```

### Database Migrations

```bash
# Run migrations
npx iudex db:migrate

# Check migration status (dry-run)
npx iudex db:migrate --status

# Rollback last migration
npx iudex db:migrate --down

# Create new migration
npx iudex db:migrate --create add_custom_field
```

---

## CI/CD Setup

### GitHub Actions

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: iudex_test_results
          POSTGRES_USER: iudex_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Run Migrations
        run: npx iudex db:migrate
        env:
          DB_HOST: localhost
          DB_USER: iudex_user
          DB_PASSWORD: test_password
          DB_NAME: iudex_test_results

      - name: Run Tests
        run: npx iudex run
        env:
          DB_HOST: localhost
          DB_USER: iudex_user
          DB_PASSWORD: test_password
```

---

## Next Steps

### View Analytics

After running tests with PostgreSQL:

```sql
-- Connect to database
psql -d iudex_test_results

-- View flaky tests
SELECT * FROM flaky_tests WHERE failure_rate > 10;

-- View recent regressions
SELECT * FROM recent_regressions;

-- View test health scores
SELECT
  current_name,
  overall_health_score,
  success_rate
FROM test_health_scores
WHERE overall_health_score < 70
ORDER BY overall_health_score ASC;
```

### Add More Tests

```javascript
import { describe, it, expect } from 'iudex';

describe('User API', () => {
  it('should create user', async ({ request }) => {
    const response = await request.post('/api/users', {
      name: 'John Doe',
      email: 'john@example.com'
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.name).toBe('John Doe');
  });

  it('should list users', async ({ request }) => {
    const response = await request.get('/api/users');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should handle validation errors', async ({ request }) => {
    const response = await request.post('/api/users', {
      name: '', // Invalid
      email: 'not-an-email'
    });

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('errors');
  });
});
```

---

## Troubleshooting

### "Database not initialized. Migrations required."

**Solution:** Run migrations:
```bash
npx iudex db:migrate
```

Or enable auto-migration in `iudex.config.js`:
```javascript
database: {
  autoMigrate: true  // For development only
}
```

### Connection Refused

**Problem:** PostgreSQL not running

**Solution:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Docker
docker start iudex-postgres
```

### Permission Denied

**Problem:** Database user lacks permissions

**Solution:**
```sql
GRANT ALL ON SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iudex_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iudex_user;
```

---

## Documentation

- [Database Setup](./database/README.md) - Detailed database configuration
- [API Reference](./docs/API.md) - Complete API documentation
- [Examples](./examples/) - Real-world examples

---

## Support

- GitHub Issues: [github.com/yourusername/iudex/issues](https://github.com/yourusername/iudex/issues)
- Documentation: [docs.iudex.dev](https://docs.iudex.dev)
