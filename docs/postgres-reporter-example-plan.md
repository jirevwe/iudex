# Postgres Reporter Showcase - Implementation Plan

## Executive Summary

Transform `dashboard-express` example into a production-ready Postgres-backed test dashboard that demonstrates ALL Iudex features with Docker Compose, CI/CD integration, and team collaboration workflow.

**Goal**: Create a comprehensive, working example that developers can clone and run immediately to see Postgres reporter features in action.

---

## 1. Overview

### What We're Building

A complete Postgres reporter showcase that demonstrates:
- **Test Evolution Tracking** - Rename tests, track history via test slugs
- **Deletion Detection** - Automatic marking when tests removed from suite
- **Git Metadata** - Branch, commit SHA, commit messages captured
- **Analytics Features** - Flaky tests, regressions, health scores, daily trends
- **Dual-Mode Operation** - Single-transaction (small) vs batched (large reports)
- **Docker Development** - One-command setup for local development
- **CI/CD Integration** - GitHub Actions with remote Postgres
- **Team Collaboration** - Shared database for multiple developers/CI

### Architecture

```
Local Development:
  Tests → Postgres Reporter → Local Postgres (Docker) → Express Dashboard → Chrome

GitHub Actions (CI/CD):
  Tests → Postgres Reporter → Remote Postgres → Same DB
                                             ↓
  Team Member → Express Dashboard → Remote Postgres → Chrome
```

### Current State vs Target State

**Current (`dashboard-express`):**
- Basic Express server
- Static JSON files in `.iudex/results/`
- No database, no analytics
- No Docker setup
- Minimal documentation

**Target:**
- Enhanced Express server with Postgres integration
- DatabaseClient + TestRepository for analytics
- Docker Compose (Postgres + Dashboard)
- GitHub Actions workflow
- Comprehensive documentation with validation steps
- httpbin tests demonstrating all features

---

## 2. File Structure

```
dashboard-express/
├── docker-compose.yml              # NEW - Local dev environment
├── docker-compose.prod.yml         # NEW - Production-like setup
├── Dockerfile.dashboard            # NEW - Dashboard container
├── .env.example                    # NEW - Environment template
├── .dockerignore                   # NEW - Docker ignore
├── server.js                       # MODIFIED - Add Postgres analytics
├── package.json                    # MODIFIED - Add pg dependency
├── iudex.config.js                 # NEW - Enable Postgres reporter
├── README.md                       # NEW - Comprehensive guide
├── .github/
│   └── workflows/
│       └── test-and-report.yml     # NEW - CI/CD workflow
├── tests/
│   └── httpbin.test.js             # NEW - Copy from httpbin-tests
├── scripts/
│   ├── init-db.sh                  # NEW - Database initialization
│   └── wait-for-postgres.sh        # NEW - Health check
└── docs/
    ├── ARCHITECTURE.md             # NEW - System design
    ├── LOCAL_SETUP.md              # NEW - Setup guide
    └── CI_CD_SETUP.md              # NEW - CI/CD guide
```

---

## 3. Implementation Plan

### Phase 1: Docker Compose Setup

**File: `docker-compose.yml`**

Create Docker Compose configuration with:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: iudex-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-iudex}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-iudex_dev_password}
      POSTGRES_DB: ${DB_NAME:-iudex_tests}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../../iudex/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-iudex}"]
      interval: 5s
      timeout: 5s
      retries: 5

  dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
    container_name: iudex-dashboard
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-iudex_tests}
      DB_USER: ${DB_USER:-iudex}
      DB_PASSWORD: ${DB_PASSWORD:-iudex_dev_password}
      DB_SSL: "false"
      NODE_ENV: development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run dev

volumes:
  postgres_data:
    driver: local
```

**File: `Dockerfile.dashboard`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**File: `.env.example`**

```env
# PostgreSQL Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=iudex_tests
DB_USER=iudex
DB_PASSWORD=iudex_dev_password_change_me
DB_SSL=false

# Dashboard Server
PORT=3000
NODE_ENV=development

# Postgres Reporter
POSTGRES_ENABLED=true
REPORTER_BATCH_SIZE=100
```

**File: `.dockerignore`**

```
node_modules
.git
.env
.iudex
npm-debug.log
.DS_Store
```

### Phase 2: Postgres Reporter Configuration

**File: `iudex.config.js`**

```javascript
export default {
  reporters: [
    'console',
    {
      reporter: 'postgres',
      config: {
        // Connection
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'iudex_tests',
        user: process.env.DB_USER || 'iudex',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true',

        // Performance
        enableBatching: true,
        batchSize: parseInt(process.env.REPORTER_BATCH_SIZE || '100'),

        // Error handling
        throwOnError: process.env.CI === 'true',

        // Pool
        poolSize: 10
      }
    },
    {
      reporter: 'json',
      config: {
        outputDir: '.iudex/results',
        pretty: true
      }
    }
  ]
};
```

### Phase 3: Enhanced Express Server

**File: `server.js` (simplified - analytics endpoints auto-mounted by library)**

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createExpressDashboard } from 'iudex/server/express';
import { DatabaseClient } from 'iudex/database/client';
import { TestRepository } from 'iudex/database/repository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database connection for analytics
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'iudex_tests',
  user: process.env.DB_USER || 'iudex',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
};

let dbClient;
let repository;

async function initializeDatabase() {
  try {
    dbClient = new DatabaseClient(dbConfig);
    await dbClient.connect();
    repository = new TestRepository(dbClient);
    console.log('✅ Connected to PostgreSQL');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    console.log('⚠️  Dashboard will run without analytics features');
  }
}

await initializeDatabase();

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Iudex Postgres Dashboard Example</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .feature { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .status { padding: 5px 10px; border-radius: 3px; font-size: 14px; }
        .status.connected { background: #d4edda; color: #155724; }
        .status.disconnected { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <h1>🛡️ Iudex Postgres Dashboard Example</h1>

      <p>Database Status: <span class="status ${repository ? 'connected' : 'disconnected'}">
        ${repository ? '✅ Connected' : '❌ Disconnected'}
      </span></p>

      <h2>🎯 Quick Links</h2>
      <div class="feature">
        <strong>📊 Test Dashboard:</strong> <a href="/test-dashboard">/test-dashboard</a>
        <p>View test results with Postgres-powered analytics</p>
      </div>

      ${repository ? `
      <h2>🔧 Analytics API Endpoints (Auto-mounted)</h2>
      <div class="feature">
        <strong>Flaky Tests:</strong> <a href="/test-dashboard/api/analytics/flaky-tests">/test-dashboard/api/analytics/flaky-tests</a>
      </div>
      <div class="feature">
        <strong>Regressions:</strong> <a href="/test-dashboard/api/analytics/regressions">/test-dashboard/api/analytics/regressions</a>
      </div>
      <div class="feature">
        <strong>Health Scores:</strong> <a href="/test-dashboard/api/analytics/health-scores">/test-dashboard/api/analytics/health-scores</a>
      </div>
      <div class="feature">
        <strong>Deleted Tests:</strong> <a href="/test-dashboard/api/analytics/deleted-tests">/test-dashboard/api/analytics/deleted-tests</a>
      </div>
      <div class="feature">
        <strong>Daily Stats:</strong> <a href="/test-dashboard/api/analytics/daily-stats">/test-dashboard/api/analytics/daily-stats</a>
      </div>
      <div class="feature">
        <strong>Database Health:</strong> <a href="/test-dashboard/api/db-health">/test-dashboard/api/db-health</a>
      </div>
      ` : '<p><em>Analytics endpoints require Postgres connection</em></p>'}

      <h2>🚀 Getting Started</h2>
      <ol>
        <li>Run tests: <code>npm test</code></li>
        <li>Visit <a href="/test-dashboard">Test Dashboard</a></li>
        <li>Check analytics endpoints above</li>
        <li>Explore features in README.md</li>
      </ol>
    </body>
    </html>
  `);
});

// Mount dashboard with Postgres analytics
// When repository is provided, the handler automatically mounts all analytics endpoints
app.use('/test-dashboard', createExpressDashboard({
  resultsDir: path.join(__dirname, '.iudex', 'results'),
  title: 'HTTPBin API Tests - Postgres Analytics',
  theme: 'light',
  repository // Analytics endpoints auto-mounted when repository provided
}));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/test-dashboard`);
  if (repository) {
    console.log(`📈 Analytics: http://localhost:${PORT}/test-dashboard/api/analytics/*`);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️  Shutting down gracefully...');
  if (dbClient) {
    await dbClient.close();
  }
  process.exit(0);
});
```

**Key Simplification:**
- User only initializes DatabaseClient and TestRepository
- Pass `repository` to `createExpressDashboard()`
- Library automatically mounts all analytics endpoints under the dashboard path
- Endpoints available at `/test-dashboard/api/analytics/*`
- Much cleaner user code - no manual endpoint implementation needed

**File: `package.json` (modified)**

```json
{
  "name": "iudex-postgres-dashboard-example",
  "version": "1.0.0",
  "type": "module",
  "description": "Comprehensive Postgres reporter showcase with analytics",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node ../../iudex/cli/index.js run tests/*.test.js",
    "test:verbose": "npm test -- --verbose",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f dashboard",
    "docker:reset": "docker-compose down -v && docker-compose up -d",
    "db:health": "curl http://localhost:3000/api/db-health"
  },
  "dependencies": {
    "iudex": "file:../../iudex",
    "express": "^4.18.2",
    "pg": "^8.11.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Phase 4: Test Suite Integration

**File: `tests/httpbin.test.js`**

Copy from `/Users/rtukpe/Documents/dev/gotech/iudex-examples/httpbin-tests/httpbin.test.js` with modifications:

```javascript
import { describe, test, expect } from 'iudex';

// Add explicit test IDs for evolution tracking demonstration
describe('HTTPBin API Tests', { prefix: 'httpbin.api' }, () => {
  let baseUrl;

  beforeEach(async (context) => {
    baseUrl = 'https://seal-app-7wdhb.ondigitalocean.app';
  });

  test('should retrieve GET endpoint with parameters', async (context) => {
    const response = await context.request.get(`${baseUrl}/get`, {
      params: { foo: 'bar', test: 'example' }
    });

    expect(response.status).toBe(200);
    expect(response.data.args.foo[0]).toBe('bar');
    expect(response.data.args.test[0]).toBe('example');
  }, { id: 'get_with_params' });  // Explicit ID for evolution tracking

  // ... copy rest of tests with explicit IDs

  // Add a test that will be "deleted" for demonstration
  test('should handle deprecated auth endpoint [WILL BE DELETED]', async (context) => {
    // This test demonstrates deletion detection
    const response = await context.request.get(`${baseUrl}/basic-auth/user/passwd`);
    expect(response.status).toBe(200);
  }, { id: 'deprecated_basic_auth' });
});
```

### Phase 5: Database Initialization Scripts

**File: `scripts/init-db.sh`**

```bash
#!/bin/bash
set -e

echo "🔧 Initializing Iudex database..."

# Load environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-iudex}"
DB_NAME="${DB_NAME:-iudex_tests}"

# Wait for Postgres
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do
  echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Database already created by docker-entrypoint-initdb.d
echo "📊 Database '$DB_NAME' initialized with schema"
echo "✅ Ready to accept test results!"
```

**File: `scripts/wait-for-postgres.sh`**

```bash
#!/bin/bash
set -e

host="${DB_HOST:-postgres}"
max_attempts=30
attempt=0

until PGPASSWORD=$DB_PASSWORD psql -h "$host" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ PostgreSQL connection timeout after $max_attempts attempts"
    exit 1
  fi
  echo "⏳ Waiting for PostgreSQL (attempt $attempt/$max_attempts)..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"
```

Make both scripts executable:
```bash
chmod +x scripts/*.sh
```

### Phase 6: GitHub Actions Workflow

**File: `.github/workflows/test-and-report.yml`**

```yaml
name: Run Tests with Postgres Reporting

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours for trend data

jobs:
  test-and-report:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git metadata

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: iudex-examples/dashboard-express/package-lock.json

      - name: Install Iudex dependencies
        run: |
          cd iudex
          npm install

      - name: Install example dependencies
        run: |
          cd iudex-examples/dashboard-express
          npm install

      - name: Run tests with Postgres reporter
        env:
          # Remote Postgres configuration from secrets
          DB_HOST: ${{ secrets.POSTGRES_HOST }}
          DB_PORT: ${{ secrets.POSTGRES_PORT }}
          DB_NAME: ${{ secrets.POSTGRES_DATABASE }}
          DB_USER: ${{ secrets.POSTGRES_USER }}
          DB_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          DB_SSL: 'true'
          POSTGRES_ENABLED: 'true'
          CI: 'true'
        run: |
          cd iudex-examples/dashboard-express
          npm test

      - name: Upload test results artifact (fallback)
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ github.run_number }}
          path: iudex-examples/dashboard-express/.iudex/results/
          retention-days: 30

      - name: Comment PR with test results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            const resultsDir = 'iudex-examples/dashboard-express/.iudex/results/';
            const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('run-'));

            if (files.length === 0) {
              console.log('No test results found');
              return;
            }

            const latestFile = files.sort().reverse()[0];
            const results = JSON.parse(fs.readFileSync(path.join(resultsDir, latestFile), 'utf-8'));

            const passRate = results.summary.total > 0
              ? ((results.summary.passed / results.summary.total) * 100).toFixed(1)
              : 0;

            const emoji = results.summary.failed === 0 ? '✅' : '❌';

            const comment = `
            ## ${emoji} Test Results - Run #${context.runNumber}

            | Metric | Value |
            |--------|-------|
            | Total Tests | ${results.summary.total} |
            | Passed | ${results.summary.passed} ✅ |
            | Failed | ${results.summary.failed} ❌ |
            | Skipped | ${results.summary.skipped} ⊘ |
            | Duration | ${(results.summary.duration / 1000).toFixed(2)}s |
            | Pass Rate | ${passRate}% |

            **Branch:** \`${results.metadata.gitInfo?.branch || 'unknown'}\`
            **Commit:** \`${results.metadata.gitInfo?.commit?.slice(0, 7) || 'unknown'}\`

            📊 [View Full Dashboard](https://your-dashboard-url.com/test-dashboard)
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Phase 7: Comprehensive Documentation

**File: `README.md`**

```markdown
# Iudex Postgres Dashboard Example

> 📊 **Comprehensive showcase** of Iudex's Postgres reporter with analytics, test evolution tracking, and team collaboration.

## 🎯 What This Example Demonstrates

This example showcases **ALL** Postgres reporter features:

1. **Test Evolution Tracking** - Rename tests, maintain history via test slugs
2. **Deletion Detection** - Automatically mark deleted tests
3. **Git Metadata** - Capture branch, commit, author information
4. **Analytics Features** - Flaky tests, regressions, health scores, daily trends
5. **Dual-Mode Operation** - Single-transaction (small) vs batched (large reports)
6. **Docker Development** - One-command local setup
7. **CI/CD Integration** - GitHub Actions with remote Postgres
8. **Team Collaboration** - Shared database for multiple developers

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Git

### Setup (3 commands)

```bash
# 1. Start services (Postgres + Dashboard)
docker-compose up -d

# 2. Run tests
npm test

# 3. Open dashboard
open http://localhost:3000/test-dashboard
```

That's it! The database schema is automatically initialized on first run.

## 📚 Table of Contents

- [Architecture](#architecture)
- [Features In Depth](#features-in-depth)
- [Local Development](#local-development)
- [CI/CD Setup](#cicd-setup)
- [API Endpoints](#api-endpoints)
- [Validation Steps](#validation-steps)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

```
┌─────────────────┐
│  Developer      │
│  Runs Tests     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Postgres        │─────▶│  PostgreSQL      │
│ Reporter        │      │  Database        │
└─────────────────┘      └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Express         │
                         │  Dashboard       │
                         │  + Analytics API │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Chrome Browser  │
                         └──────────────────┘
```

## ✨ Features In Depth

### 1. Test Evolution Tracking

**What it does:** Maintains test identity across renames using stable slugs.

**Try it:**
```bash
# 1. Run tests
npm test

# 2. Rename a test in tests/httpbin.test.js
# Change: 'should retrieve GET endpoint'
# To: 'should fetch GET endpoint successfully'

# 3. Run tests again
npm test

# 4. Check test history in database
npm run query:history
```

The test_slug (`httpbin.api.get_with_params`) stays the same, but name changes are tracked in `test_history` table.

### 2. Deletion Detection

**What it does:** Automatically marks tests as deleted when they're removed from suite.

**Try it:**
```bash
# 1. Run tests
npm test

# 2. Comment out 2-3 tests in tests/httpbin.test.js

# 3. Run tests again
npm test

# 4. Check deleted tests
curl http://localhost:3000/api/analytics/deleted-tests | jq
```

You'll see the deleted tests with `deleted_at` timestamp and lifecycle information.

**Resurrection:** Uncomment the tests and run again - they're automatically restored!

### 3. Git Metadata Capture

**What it does:** Automatically captures git branch, commit SHA, and commit message.

**Verify:**
```bash
# Check latest run
curl http://localhost:3000/api/runs | jq '.runs[0].gitInfo'
```

Shows:
```json
{
  "branch": "feature/postgres-showcase",
  "commit": "a1b2c3d4...",
  "message": "Add comprehensive Postgres example"
}
```

### 4. Analytics Features

#### Flaky Tests
Tests that pass sometimes, fail sometimes (10-90% failure rate).

```bash
curl http://localhost:3000/api/analytics/flaky-tests | jq
```

#### Recent Regressions
Tests that were passing but now failing (7-day window).

```bash
curl http://localhost:3000/api/analytics/regressions | jq
```

#### Health Scores
Multi-dimensional test health metrics (success rate, stability, performance).

```bash
curl http://localhost:3000/api/analytics/health-scores | jq
```

#### Daily Stats
Aggregated daily statistics for trend analysis.

```bash
curl http://localhost:3000/api/analytics/daily-stats?days=7 | jq
```

### 5. Dual-Mode Operation

**Small reports (<100 tests):** Single transaction (atomic, fast)
**Large reports (100+ tests):** Batched (100 per batch, scalable)

Mode is automatically selected based on test count.

**Verify batching:**
```bash
# Check console output when running large test suite
npm test

# Look for: "Using batched mode for 350 tests (4 batches)"
```

## 💻 Local Development

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Default values work out of the box for Docker Compose.

### Development Workflow

```bash
# Start services
docker-compose up -d

# Watch logs
docker-compose logs -f dashboard

# Run tests
npm test

# View dashboard
open http://localhost:3000

# Stop services
docker-compose down

# Reset database (clean slate)
docker-compose down -v
docker-compose up -d
```

### Development Commands

```bash
npm run dev           # Start server with hot reload
npm test              # Run tests with Postgres reporting
npm test:verbose      # Run tests with verbose output
npm run docker:up     # Start Docker services
npm run docker:down   # Stop Docker services
npm run docker:logs   # View dashboard logs
npm run docker:reset  # Reset everything (fresh start)
npm run db:health     # Check database connection
```

## 🔄 CI/CD Setup

### GitHub Actions Integration

This example includes a complete GitHub Actions workflow that demonstrates:
- Remote Postgres connection
- Scheduled runs for trend data
- PR comments with test results
- Artifact uploads as fallback

### Setting Up Remote Postgres

**Option 1: DigitalOcean Managed Database**

1. Create Managed Database (PostgreSQL 15+)
2. Note connection details
3. Initialize schema:
   ```bash
   psql "postgresql://user:pass@host:port/db?sslmode=require" < ../../iudex/database/schema.sql
   ```

**Option 2: AWS RDS**

1. Create RDS PostgreSQL instance
2. Configure security groups
3. Initialize schema (same as above)

### Configure GitHub Secrets

Add these secrets to your repository:

- `POSTGRES_HOST` - Database hostname
- `POSTGRES_PORT` - Database port (usually 5432)
- `POSTGRES_DATABASE` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

### Workflow Triggers

- **Push to main:** Run tests on every commit
- **Pull requests:** Run tests and comment results
- **Schedule:** Run every 6 hours for trend data

## 🔌 API Endpoints

### Dashboard

| Endpoint | Description |
|----------|-------------|
| `/` | Home page with links |
| `/test-dashboard` | Main dashboard UI |

### Test Results

| Endpoint | Description |
|----------|-------------|
| `/api/runs` | List test runs (paginated) |
| `/api/run/:runId` | Get specific run details |

### Analytics (Requires Postgres)

| Endpoint | Query Params | Description |
|----------|--------------|-------------|
| `/test-dashboard/api/analytics/flaky-tests` | `?minRuns=5` | Tests with 10-90% failure rate |
| `/test-dashboard/api/analytics/regressions` | - | Tests that were passing, now failing |
| `/test-dashboard/api/analytics/health-scores` | `?limit=20` | Test health metrics |
| `/test-dashboard/api/analytics/deleted-tests` | `?limit=10` | Recently deleted tests |
| `/test-dashboard/api/analytics/daily-stats` | `?days=30` | Daily aggregated statistics |
| `/test-dashboard/api/db-health` | - | Database connection health |

**Note:** Analytics endpoints are automatically mounted by the library when `repository` is provided to `createExpressDashboard()`. No manual endpoint implementation needed.

### Example API Usage

```bash
# Get flaky tests (minimum 5 runs)
curl http://localhost:3000/test-dashboard/api/analytics/flaky-tests?minRuns=5 | jq

# Get health scores (top 20)
curl http://localhost:3000/test-dashboard/api/analytics/health-scores?limit=20 | jq

# Get daily stats (last 7 days)
curl http://localhost:3000/test-dashboard/api/analytics/daily-stats?days=7 | jq

# Check database health
curl http://localhost:3000/test-dashboard/api/db-health | jq
```

## ✅ Validation Steps (Chrome)

Follow these steps to validate all features work correctly.

### Step 1: Basic Setup

```bash
# Terminal 1: Start services
docker-compose up -d

# Terminal 2: Run tests
npm test
```

**Chrome:**
1. Open http://localhost:3000
2. ✅ Verify home page loads
3. ✅ Verify "Database Status: Connected" shows green
4. Click "Test Dashboard" link
5. ✅ Verify dashboard loads with test results

### Step 2: Test Results Display

**Chrome Dashboard:**
1. ✅ Verify list of test runs appears
2. Click on latest run
3. ✅ Verify test details display (pass/fail, duration)
4. ✅ Verify git metadata shows (branch, commit)
5. ✅ Verify governance and security sections present

### Step 3: Analytics Endpoints

**Chrome:**
1. Open http://localhost:3000/test-dashboard/api/analytics/flaky-tests
2. ✅ Verify JSON response (may be empty initially)
3. Open /test-dashboard/api/analytics/health-scores
4. ✅ Verify health metrics displayed
5. Open /test-dashboard/api/db-health
6. ✅ Verify database connection status shows healthy

**DevTools:**
1. Open Chrome DevTools (F12)
2. Network tab
3. ✅ Verify no errors
4. ✅ Verify API responses are 200 OK

### Step 4: Test Evolution

**Terminal:**
```bash
# 1. Note current test count
npm test | grep "Total:"

# 2. Edit tests/httpbin.test.js
# Rename: 'should retrieve GET endpoint'
# To: 'should fetch GET endpoint successfully'

# 3. Run tests again
npm test
```

**Chrome:**
1. Refresh dashboard
2. ✅ Verify test count unchanged
3. ✅ Verify renamed test appears with new name
4. ✅ Verify test slug remained same (check database or API)

### Step 5: Deletion Detection

**Terminal:**
```bash
# 1. Run tests
npm test

# 2. Comment out 2 tests in tests/httpbin.test.js

# 3. Run tests again
npm test
```

**Chrome:**
1. Open http://localhost:3000/test-dashboard/api/analytics/deleted-tests
2. ✅ Verify deleted tests appear in JSON
3. ✅ Verify `deleted_at` timestamp present
4. ✅ Verify lifecycle information shown

**Resurrection Test:**
```bash
# Uncomment the tests
npm test
```

**Chrome:**
1. Refresh /test-dashboard/api/analytics/deleted-tests
2. ✅ Verify tests no longer in deleted list

### Step 6: Batching Mode

**Terminal:**
```bash
# Create large test file with 150+ tests
# (Or run with existing tests multiple times)

npm test

# Look for console output:
# "Using batched mode for 150 tests (2 batches)"
```

✅ Verify no errors during batching
✅ Verify all results appear in dashboard

### Step 7: Multiple Runs (Trend Data)

**Terminal:**
```bash
# Run tests 5 times
for i in {1..5}; do npm test; sleep 2; done
```

**Chrome:**
1. Refresh http://localhost:3000/test-dashboard
2. ✅ Verify multiple runs listed
3. ✅ Verify chronological order
4. Click different runs
5. ✅ Verify each run loads correctly

## 🐛 Troubleshooting

### Database Connection Failed

**Symptom:** "Failed to connect to PostgreSQL"

**Solutions:**
```bash
# Check if Postgres container is running
docker-compose ps

# If not running, start it
docker-compose up -d postgres

# Check logs
docker-compose logs postgres

# Verify network
docker network inspect dashboard-express_default
```

### Schema Not Initialized

**Symptom:** "relation 'test_runs' does not exist"

**Solution:**
```bash
# Reset database and reinitialize
docker-compose down -v
docker-compose up -d
```

The schema is automatically loaded from `../../iudex/database/schema.sql` on first start.

### Port 3000 Already in Use

**Solution:**
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Restart
docker-compose restart dashboard
```

### Analytics Show Empty

**Reason:** Need multiple test runs for analytics data.

**Solution:**
```bash
# Run tests multiple times
for i in {1..10}; do npm test; sleep 2; done

# Now check analytics
curl http://localhost:3000/api/analytics/health-scores
```

### Tests Not Persisting to Database

**Check:**
1. ✅ `POSTGRES_ENABLED=true` in `.env`
2. ✅ Database credentials correct
3. ✅ Postgres container running

```bash
# Verify reporter config
cat iudex.config.js

# Test database connection
npm run db:health
```

## 📊 Database Schema

The Postgres reporter uses 5 core tables:

- **test_suites** - Test collections/modules
- **test_runs** - Individual test executions
- **tests** - Unique test definitions (by slug)
- **test_history** - Audit trail of test changes
- **test_results** - Immutable log of individual results

Schema location: `../../iudex/database/schema.sql`

## 🎓 Learn More

- **Architecture Deep Dive:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Local Setup Guide:** [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)
- **CI/CD Setup:** [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)
- **Main Iudex Docs:** [../../README.md](../../README.md)

## 🤝 Team Collaboration Workflow

### Scenario: Team Using Shared Remote Postgres

**Setup:**
1. Create remote Postgres (DigitalOcean, AWS RDS)
2. Initialize schema
3. Share connection details with team

**Developer 1 (Local):**
```bash
# Configure .env to use remote Postgres
DB_HOST=your-remote-host.db.ondigitalocean.com
DB_PORT=25060
DB_SSL=true
DB_USER=iudex
DB_PASSWORD=secure-password
DB_NAME=iudex_production

# Run tests
npm test
```

**Developer 2 (Local):**
```bash
# Same .env configuration
# Run tests
npm test
```

**CI/CD (GitHub Actions):**
- Configured with same remote Postgres
- Runs on every commit
- Scheduled runs for trend data

**Team Dashboard Access:**
- Deploy Express server pointing to remote Postgres
- Team accesses https://dashboard.example.com
- Everyone sees all test runs from:
  - Local developer runs
  - CI/CD runs
  - Scheduled runs

**Benefits:**
- Centralized test history
- Trend analysis across team
- Flaky test detection across all runs
- Shared analytics dashboard

## 📝 License

Same as main Iudex project.
```

### Phase 8: Supporting Documentation

**File: `docs/ARCHITECTURE.md`**

```markdown
# Architecture Documentation

## System Overview

[Detailed system design, component interactions, data flow, technology choices]

## Database Schema

[Deep dive into each table, relationships, indexes, constraints]

## Reporter Implementation

[How Postgres reporter works, batching strategy, error handling]

## Dashboard Server

[Express integration, API design, analytics implementation]
```

**File: `docs/LOCAL_SETUP.md`**

```markdown
# Local Development Setup Guide

## Prerequisites

[Detailed prerequisites with version requirements]

## Step-by-Step Setup

[Comprehensive setup instructions with screenshots]

## Development Workflow

[Day-to-day development patterns, best practices]

## Debugging Tips

[Common issues and solutions, debug techniques]
```

**File: `docs/CI_CD_SETUP.md`**

```markdown
# CI/CD Setup Guide

## GitHub Actions Configuration

[Detailed workflow explanation]

## Remote Postgres Setup

[Step-by-step for DigitalOcean, AWS RDS, etc.]

## Secrets Management

[How to configure secrets securely]

## Scheduled Runs

[Setting up scheduled runs for trend data]
```

---

## 4. Implementation Timeline

### Phase 0: Library Enhancement (2-3 hours)
**CRITICAL: Implement in iudex library FIRST**

#### A. Frontend Assets Bundling

**Strategy:** Bundle all frontend assets (HTML, CSS, JS) in the library so users don't need to manage them.

**Current Structure:**
```
/Users/rtukpe/Documents/dev/gotech/iudex/templates/dashboard/
├── index.html
└── assets/
    ├── css/dashboard.css
    └── js/
        ├── data-loader.js
        ├── dashboard.js
        └── components/*.js
```

**No Changes Needed:** Assets already bundled in library at `/Users/rtukpe/Documents/dev/gotech/iudex/templates/dashboard/`

**DashboardServer** already serves these assets:
- `/` or `/index.html` → Serves HTML with injected config
- `/assets/*` → Serves CSS, JS files

**User Benefit:**
- Users get a complete working dashboard UI without any frontend knowledge
- No need to copy or maintain HTML/CSS/JS files
- Updates to UI happen in library, all users benefit
- Just mount the handler and it works

#### B. Analytics Endpoints Auto-Mounting

**File: `/Users/rtukpe/Documents/dev/gotech/iudex/server/handlers/express.js`**

Enhance Express handler to auto-mount analytics endpoints when repository is provided:

```javascript
// Add analytics endpoint mounting
function mountAnalyticsEndpoints(router, repository, dbClient) {
  router.get('/api/analytics/flaky-tests', async (req, res) => {
    try {
      const minRuns = parseInt(req.query.minRuns || '5');
      const flakyTests = await repository.getFlakyTests(minRuns);
      res.json({ flakyTests, count: flakyTests.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/analytics/regressions', async (req, res) => {
    try {
      const regressions = await repository.getRecentRegressions();
      res.json({ regressions, count: regressions.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/analytics/deleted-tests', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '10');
      const deletedTests = await repository.getDeletedTests(limit);
      res.json({ deletedTests, count: deletedTests.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/analytics/health-scores', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '20');
      const healthScores = await repository.getTestHealthScores(limit);
      res.json({ healthScores, count: healthScores.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/analytics/daily-stats', async (req, res) => {
    try {
      const days = parseInt(req.query.days || '30');
      const dailyStats = await repository.getDailyStats(days);
      res.json({ dailyStats, count: dailyStats.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/db-health', async (req, res) => {
    try {
      const isHealthy = await dbClient.healthCheck();
      const stats = dbClient.getPoolStats();
      res.json({ healthy: isHealthy, stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// In createExpressDashboard function
export function createExpressDashboard(config = {}) {
  const router = express.Router();
  const server = new DashboardServer(config);

  // Mount dashboard routes
  router.get('/', (req, res) => server.handleRequest(req, res));
  router.get('/index.html', (req, res) => server.handleRequest(req, res));
  router.get('/assets/*', (req, res) => server.handleRequest(req, res));
  router.get('/api/runs', (req, res) => server.handleRequest(req, res));
  router.get('/api/run/:runId', (req, res) => server.handleRequest(req, res));
  router.get('/api/analytics', (req, res) => server.handleRequest(req, res));

  // Auto-mount analytics endpoints if repository provided
  if (config.repository && config.dbClient) {
    mountAnalyticsEndpoints(router, config.repository, config.dbClient);
    console.log('✅ Analytics endpoints auto-mounted at /api/analytics/*');
  }

  return router;
}
```

**Similar changes for Fastify and HTTP handlers**

### Phase 1: Docker Foundation (1-2 hours)
- Create docker-compose.yml
- Create Dockerfile.dashboard
- Create .env.example and .dockerignore
- Test: `docker-compose up` works

### Phase 2: Configuration (30 min)
- Create iudex.config.js
- Update package.json
- Create initialization scripts
- Test: Configuration loads correctly

### Phase 3: Server Enhancement (1-2 hours)
- Modify server.js
- Add DatabaseClient integration
- Add custom analytics endpoints
- Test: All endpoints respond

### Phase 4: Test Integration (30 min)
- Copy httpbin tests
- Add explicit test IDs
- Run tests
- Test: Results persist to Postgres

### Phase 5: GitHub Actions (1 hour)
- Create workflow file
- Document secrets setup
- Test workflow with test Postgres
- Test: CI/CD works

### Phase 6: Documentation (2-3 hours)
- Write comprehensive README
- Create architecture docs
- Create setup guides
- Add validation steps

### Phase 7: Validation (2 hours)
- Complete Chrome validation checklist
- Test all features
- Test CI/CD workflow
- Fix any issues found

**Total Estimated Time: 8-11 hours**

---

## 5. Critical Files Summary

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `docker-compose.yml` | Foundation - defines entire local environment |
| 2 | `server.js` | Core integration - adds Postgres analytics to Express |
| 3 | `iudex.config.js` | Critical config - enables Postgres reporter |
| 4 | `.github/workflows/test-and-report.yml` | CI/CD demo - shows remote integration |
| 5 | `README.md` | Essential docs - enables developers to use example |
| 6 | `tests/httpbin.test.js` | Test suite - demonstrates all features |
| 7 | `scripts/init-db.sh` | Database setup - initializes schema |
| 8 | `.env.example` | Configuration template - guides setup |

---

## 6. Chrome Validation Checklist

Complete this checklist to verify implementation:

**Basic Setup:**
- [ ] `docker-compose up -d` starts both services
- [ ] http://localhost:3000 loads home page
- [ ] Database status shows "Connected"
- [ ] Dashboard link works

**Dashboard Functionality:**
- [ ] Test runs list appears
- [ ] Click run loads details
- [ ] Git metadata displays
- [ ] Pass/fail status shown correctly

**Analytics Endpoints:**
- [ ] /api/analytics/flaky-tests returns JSON
- [ ] /api/analytics/regressions returns JSON
- [ ] /api/analytics/health-scores returns JSON
- [ ] /api/analytics/deleted-tests returns JSON
- [ ] /api/db-health shows healthy status

**Test Evolution:**
- [ ] Rename test preserves test slug
- [ ] Test history tracked in database
- [ ] Dashboard shows updated name

**Deletion Detection:**
- [ ] Commented tests marked as deleted
- [ ] Deleted tests API shows them
- [ ] Uncommenting tests resurrects them

**Batching:**
- [ ] Large test suite triggers batched mode
- [ ] All results persist correctly
- [ ] No errors during batching

**DevTools:**
- [ ] No JavaScript errors in console
- [ ] Network requests succeed (200 OK)
- [ ] No CORS errors

**CI/CD:**
- [ ] GitHub Actions workflow runs
- [ ] Tests persist to remote Postgres
- [ ] PR comments work
- [ ] Artifacts upload

---

## 7. Success Criteria

The implementation is successful when:

1. ✅ Local setup works with single `docker-compose up` command
2. ✅ Dashboard displays test results in Chrome
3. ✅ All analytics endpoints return valid data
4. ✅ Test evolution tracking works (rename test, check history)
5. ✅ Deletion detection works (comment out test, check deleted API)
6. ✅ Batching mode works for large test suites
7. ✅ GitHub Actions workflow runs successfully
8. ✅ CI/CD persists to remote Postgres
9. ✅ Multiple team members can view shared results
10. ✅ All features validated in Chrome (checklist complete)

---

## 8. Library Enhancement - Analytics Endpoints Auto-Mounting

**Critical Design Decision:**

Analytics endpoints should live in the Iudex library, not in user code. This provides much better DX:

**Before (Bad DX):**
```javascript
// User has to manually implement all analytics endpoints
app.get('/api/analytics/flaky-tests', async (req, res) => { ... });
app.get('/api/analytics/regressions', async (req, res) => { ... });
// ... 6 more endpoints
```

**After (Good DX):**
```javascript
// User just passes repository, library auto-mounts everything
app.use('/test-dashboard', createExpressDashboard({
  resultsDir: '.iudex/results',
  repository // That's it! All endpoints auto-mounted
}));
```

**Implementation Location:**
- `/Users/rtukpe/Documents/dev/gotech/iudex/server/handlers/express.js`
- `/Users/rtukpe/Documents/dev/gotech/iudex/server/handlers/fastify.js`
- `/Users/rtukpe/Documents/dev/gotech/iudex/server/handlers/http.js`

**Auto-Mounted Endpoints:**
- `/test-dashboard/api/analytics/flaky-tests`
- `/test-dashboard/api/analytics/regressions`
- `/test-dashboard/api/analytics/health-scores`
- `/test-dashboard/api/analytics/deleted-tests`
- `/test-dashboard/api/analytics/daily-stats`
- `/test-dashboard/api/db-health`

**Benefits:**
- User code stays clean and simple
- Consistent API across all examples
- Easy to update analytics features in library
- No duplicate code across examples
- Better maintainability

### Frontend Assets Strategy

**Dashboard UI is already bundled in library:**
- Location: `/Users/rtukpe/Documents/dev/gotech/iudex/templates/dashboard/`
- DashboardServer automatically serves HTML, CSS, JS
- User gets complete working UI without any frontend code

**User Experience:**
```javascript
// User writes this:
app.use('/test-dashboard', createExpressDashboard({
  resultsDir: '.iudex/results',
  repository
}));

// And gets:
// - Full dashboard UI (HTML, CSS, JS)
// - All analytics endpoints
// - No frontend build step
// - No asset management
// - Just works!
```

**Why This Works:**
- Dashboard template already exists in library
- DashboardServer handles asset serving
- Config injection happens server-side
- Users don't need to know HTML/CSS/JS
- Library updates benefit all users automatically

**Example Structure:**
```
User's project/
├── server.js           # Only file user needs to write
├── package.json        # Add iudex dependency
└── tests/              # User's test files

iudex library/          # Everything else lives here
├── templates/
│   └── dashboard/      # UI assets
├── server/
│   └── handlers/       # Backend logic
└── database/           # Analytics queries
```

## 9. Key Design Decisions

### Why Repurpose dashboard-express?
- Has Express foundation already
- Can add Postgres incrementally
- Shows migration path from static to Postgres
- Familiar structure for developers

### Why Docker Compose?
- Industry standard
- One-command setup
- Matches production patterns
- Easy team onboarding
- Service networking built-in

### Why httpbin Tests?
- Already exist (copy, don't create)
- Real API testing scenarios
- Easy to demonstrate evolution (rename)
- Easy to demonstrate deletion (comment out)
- Multiple test types for analytics

### Why Remote Postgres for CI/CD?
- Realistic team collaboration
- Persistent trend data
- Shared visibility
- Production-like deployment
- Central test history

### Why Comprehensive Documentation?
- Developers must be able to use it
- Chrome validation essential
- Troubleshooting saves time
- Shows real-world usage
- Enables team adoption

---

**End of Implementation Plan**
