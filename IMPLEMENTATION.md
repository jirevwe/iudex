# Iudex - Implementation Guide

## 📊 Current Status

**Progress:** Week 1 + Week 2 (Days 6-8) Complete ✅

### ✅ Completed (Weeks 1-2)
- **Core Framework** - Test runner, DSL, HTTP client, console reporter, CLI
- **Data Persistence** - PostgreSQL schema, connection pooling, test repository
- **Test Identity** - Slug-based tracking (auto-generated or explicit)
- **History Tracking** - Complete audit trail of test changes
- **Analytics Views** - Latest runs, flaky tests, regressions, health scores
- **17 Integration Tests** - HTTPBin examples demonstrating framework

### 🎯 Next Priority (Week 2: Days 9-13)
- **Governance Engine** - API standards enforcement
- **Security Scanner** - Vulnerability detection
- **Advanced Reporting** - Governance/security insights

### 📈 Stats
- **Unit Tests:** 139 passing
- **Integration Tests:** 17 passing (HTTPBin examples)
- **Database Tables:** 5 (test_suites, test_runs, tests, test_history, test_results)
- **Analytics Views:** 6 (latest runs, endpoint success rates, flaky tests, regressions, health scores, daily stats)
- **Code Coverage:** Core framework complete

---

## 📋 Complete Roadmap

### Week 1: Core Framework (Days 1-5)

#### Day 1-2: Test Runner
**File:** `core/runner.js`

**Implementation:**
```javascript
import { getTestSuites } from './dsl.js';
import { createClient } from './http-client.js';

export class TestRunner {
  constructor(config) {
    this.config = config;
    this.results = [];
  }

  async run(testFiles) {
    // 1. Load test files dynamically
    for (const file of testFiles) {
      await import(file);
    }

    // 2. Get test suites
    const suites = getTestSuites();

    // 3. Execute each suite
    for (const suite of suites) {
      await this.runSuite(suite);
    }

    return this.results;
  }

  async runSuite(suite) {
    const client = createClient(this.config.http);

    // Run beforeAll hooks
    for (const hook of suite.hooks.beforeAll) {
      await hook({ request: client });
    }

    // Run each test
    for (const test of suite.tests) {
      if (test.skip) continue;

      // Run beforeEach hooks
      for (const hook of suite.hooks.beforeEach) {
        await hook({ request: client });
      }

      try {
        const startTime = Date.now();
        await test.fn({ request: client });
        const duration = Date.now() - startTime;

        this.results.push({
          suite: suite.name,
          test: test.name,
          status: 'passed',
          duration
        });
      } catch (error) {
        this.results.push({
          suite: suite.name,
          test: test.name,
          status: 'failed',
          error: error.message,
          stack: error.stack
        });
      }

      // Run afterEach hooks
      for (const hook of suite.hooks.afterEach) {
        await hook({ request: client });
      }
    }

    // Run afterAll hooks
    for (const hook of suite.hooks.afterAll) {
      await hook({ request: client });
    }
  }
}
```

#### Day 3: Result Collector
**File:** `core/collector.js`

**Implementation:**
```javascript
export class ResultCollector {
  constructor() {
    this.testResults = [];
    this.governanceViolations = [];
    this.securityFindings = [];
  }

  collectTestResult(result) {
    this.testResults.push(result);
  }

  collectGovernanceViolation(violation) {
    this.governanceViolations.push(violation);
  }

  collectSecurityFinding(finding) {
    this.securityFindings.push(finding);
  }

  getSummary() {
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;

    return {
      total: this.testResults.length,
      passed,
      failed,
      passRate: (passed / this.testResults.length * 100).toFixed(2),
      governanceViolations: this.governanceViolations.length,
      securityFindings: this.securityFindings.length
    };
  }
}
```

#### Day 4: Console Reporter
**File:** `reporters/console.js`

**Implementation:**
```javascript
import chalk from 'chalk';
import {table} from 'table';

export class ConsoleReporter {
    report(collector) {
        const summary = collector.getSummary();

        console.log('\\n' + chalk.bold('Iudex Test Results'));
        console.log(chalk.gray('='.repeat(50)));

        // Test results
        collector.testResults.forEach(result => {
            const icon = result.status === 'passed' ? chalk.green('✓') : chalk.red('✗');
            const time = chalk.gray(`(${result.duration}ms)`);
            console.log(`${icon} ${result.suite} > ${result.test} ${time}`);

            if (result.status === 'failed') {
                console.log(chalk.red(`  ${result.error}`));
            }
        });

        // Summary
        console.log('\n' + chalk.bold('Summary:'));
        console.log(`  Tests: ${chalk.green(summary.passed)} passed, ${chalk.red(summary.failed)} failed`);
        console.log(`  Pass Rate: ${summary.passRate}%`);
        console.log(`  Governance Violations: ${summary.governanceViolations}`);
        console.log(`  Security Findings: ${summary.securityFindings}`);
    }
}
```

#### Day 5: CLI Tool
**File:** `cli/index.js`

**Implementation:**
```javascript
#!/usr/bin/env node
import { Command } from 'commander';
import { TestRunner } from '../core/runner.js';
import { ConsoleReporter } from '../reporters/console.js';
import { loadConfig } from './config-loader.js';

const program = new Command();

program
  .name('api-guardian')
  .description('API testing framework with governance and security')
  .version('1.0.0');

program
  .command('run [pattern]')
  .description('Run API tests')
  .action(async (pattern) => {
    const config = await loadConfig();
    const runner = new TestRunner(config);
    const results = await runner.run(pattern || config.testMatch);
    
    const reporter = new ConsoleReporter();
    reporter.report(runner.collector);

    process.exit(results.some(r => r.status === 'failed') ? 1 : 0);
  });

program.parse();
```

### Week 2: Data Persistence Layer (Days 6-8)

#### Day 6: Database Schema & Client
**Files:** `database/schema.sql`, `database/client.js`

**Purpose:** Store test results in PostgreSQL for historical analysis and dashboard reporting.

**Schema Design:**
- `test_suites` - Test collections/modules
- `test_runs` - Individual test execution runs
- `test_results` - Individual test case results
- Views for analytics (latest runs, success rates, flaky tests)

**Database Client Implementation:**
```javascript
import pg from 'pg';
const { Pool } = pg;

export class DatabaseClient {
  constructor(config) {
    this.pool = new Pool({
      host: config.host || process.env.DB_HOST,
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      ssl: config.ssl || false,
      max: config.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      return { rows: res.rows, duration, rowCount: res.rowCount };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}
```

#### Day 7: Database Repository
**File:** `database/repository.js`

**Implementation:**
```javascript
export class TestRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  async createOrGetSuite(name, testType, description = null) {
    const result = await this.db.query(
      `INSERT INTO test_suites (name, test_type, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, test_type)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [name, testType, description]
    );
    return result.rows[0].id;
  }

  async createTestRun(suiteId, runData) {
    const result = await this.db.query(
      `INSERT INTO test_runs (
        suite_id, environment, branch, commit_sha, commit_message,
        status, total_tests, passed_tests, failed_tests, skipped_tests,
        duration_seconds, started_at, completed_at, triggered_by, run_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        suiteId, runData.environment, runData.branch, runData.commitSha,
        runData.commitMessage, runData.status, runData.totalTests,
        runData.passedTests, runData.failedTests, runData.skippedTests,
        runData.durationSeconds, runData.startedAt, runData.completedAt,
        runData.triggeredBy, runData.runUrl
      ]
    );
    return result.rows[0].id;
  }

  async createTestResult(runId, testData) {
    await this.db.query(
      `INSERT INTO test_results (
        run_id, test_name, test_file, endpoint, http_method,
        status, duration_seconds, response_time_ms, status_code,
        error_message, error_type, stack_trace,
        assertions_passed, assertions_failed,
        request_body, response_body
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        runId, testData.testName, testData.testFile, testData.endpoint,
        testData.httpMethod, testData.status, testData.durationSeconds,
        testData.responseTimeMs, testData.statusCode, testData.errorMessage,
        testData.errorType, testData.stackTrace, testData.assertionsPassed,
        testData.assertionsFailed, testData.requestBody, testData.responseBody
      ]
    );
  }

  async getLatestRuns(environment = null, limit = 10) {
    const query = environment
      ? `SELECT * FROM latest_test_runs WHERE environment = $1 LIMIT $2`
      : `SELECT * FROM latest_test_runs LIMIT $1`;
    const params = environment ? [environment, limit] : [limit];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getEndpointSuccessRates() {
    const result = await this.db.query(
      `SELECT * FROM endpoint_success_rates ORDER BY success_rate ASC`
    );
    return result.rows;
  }

  async getFlakyTests(minRuns = 10) {
    const result = await this.db.query(
      `SELECT * FROM flaky_tests WHERE total_runs >= $1`,
      [minRuns]
    );
    return result.rows;
  }

  async getDailyStats(days = 30) {
    const result = await this.db.query(
      `SELECT * FROM daily_test_stats
       WHERE test_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY test_date DESC`
    );
    return result.rows;
  }
}
```

#### Day 8: PostgreSQL Reporter
**File:** `reporters/postgres.js`

**Implementation:**
```javascript
import { DatabaseClient } from '../database/client.js';
import { TestRepository } from '../database/repository.js';

export class PostgresReporter {
  constructor(config) {
    this.config = config;
    this.dbClient = null;
    this.repository = null;
  }

  async initialize() {
    this.dbClient = new DatabaseClient(this.config.database);
    this.repository = new TestRepository(this.dbClient);
  }

  async report(collector) {
    try {
      await this.initialize();

      const summary = collector.getSummary();
      const metadata = collector.getMetadata();

      // Create or get test suite
      const suiteId = await this.repository.createOrGetSuite(
        metadata.suiteName || 'Default Suite',
        'iudex',
        metadata.description
      );

      // Create test run
      const runData = {
        environment: metadata.environment,
        branch: metadata.branch,
        commitSha: metadata.commitSha,
        commitMessage: metadata.commitMessage,
        status: summary.failed > 0 ? 'failed' : 'passed',
        totalTests: summary.total,
        passedTests: summary.passed,
        failedTests: summary.failed,
        skippedTests: summary.skipped || 0,
        durationSeconds: metadata.duration / 1000,
        startedAt: metadata.startTime,
        completedAt: metadata.endTime,
        triggeredBy: metadata.triggeredBy || process.env.USER,
        runUrl: metadata.runUrl
      };

      const runId = await this.repository.createTestRun(suiteId, runData);

      // Insert individual test results
      for (const result of collector.testResults) {
        const testData = {
          testName: `${result.suite} > ${result.test}`,
          testFile: result.file,
          endpoint: result.endpoint,
          httpMethod: result.method,
          status: result.status,
          durationSeconds: result.duration / 1000,
          responseTimeMs: result.responseTime,
          statusCode: result.statusCode,
          errorMessage: result.error,
          errorType: result.errorType,
          stackTrace: result.stack,
          assertionsPassed: result.assertionsPassed,
          assertionsFailed: result.assertionsFailed,
          requestBody: JSON.stringify(result.requestBody),
          responseBody: JSON.stringify(result.responseBody)
        };

        await this.repository.createTestResult(runId, testData);
      }

      console.log(`✓ Test results persisted to database (run_id: ${runId})`);
    } catch (error) {
      console.error('Failed to persist results to database:', error.message);
    } finally {
      if (this.dbClient) {
        await this.dbClient.close();
      }
    }
  }
}
```

**Configuration:**
```javascript
// iudex.config.js
export default {
  database: {
    enabled: true,
    host: 'localhost',
    port: 5432,
    database: 'iudex',
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false,
    poolSize: 10
  },
  reporters: ['console', 'postgres']
};
```

#### Slug-Based Test Identity System

**Key Design Decision:** Tests are identified by **slugs** (auto-generated or explicit), not hashes.

**How It Works:**

1. **Auto-Generated Slugs** - DSL automatically creates slugs from test names:
   ```javascript
   // Test without explicit ID
   test('should handle PUT requests', async (context) => {
     // Slug: httpbin.api.should-handle-put-requests
   });
   ```

2. **Explicit Slugs** - Developers can provide stable IDs:
   ```javascript
   describe('HTTPBin API', { prefix: 'httpbin.api' }, () => {
     test('should fetch data', async (context) => {
       // ...
     }, { id: 'get_basic' }); // Slug: httpbin.api.get_basic
   });
   ```

3. **Stable Identity Across Renames:**
   - Slug remains constant even when test name changes
   - Database tracks name/description history in `test_history` table
   - Test hash updated for skip detection (not identity)

**Benefits:**
- ✅ Tests maintain identity across renames
- ✅ Human-readable identifiers (e.g., `saas.users.onboarding.accept_terms`)
- ✅ Hierarchical namespacing via prefixes
- ✅ No complex evolution tracking needed
- ✅ Hash still available for skip detection

**Schema Highlights:**
```sql
CREATE TABLE tests (
    test_slug VARCHAR(512) NOT NULL UNIQUE,  -- Primary identifier
    test_hash VARCHAR(64) NOT NULL,          -- For skip detection
    current_name VARCHAR(512) NOT NULL,      -- Latest name
    -- ...
);

CREATE TABLE test_history (
    test_id INTEGER REFERENCES tests(id),
    name VARCHAR(512) NOT NULL,
    test_hash VARCHAR(64) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,  -- NULL = current version
    change_type VARCHAR(50)  -- 'created', 'updated'
);
```

### Week 2: Governance & Security (Days 9-13)

#### Governance Engine
**File:** `governance/engine.js`

```javascript
export class GovernanceEngine {
  constructor(rules, config) {
    this.rules = rules.filter(r => r.enabled);
    this.config = config;
    this.violations = [];
  }

  async check(request, response, endpoint) {
    for (const rule of this.rules) {
      const result = await rule.validate(request, response, endpoint);
      if (!result.passed) {
        this.violations.push(...result.violations);
      }
    }
    return this.violations;
  }
}
```

#### Security Scanner
**File:** `security/scanner.js`

```javascript
export class SecurityScanner {
  constructor(checks) {
    this.checks = checks.filter(c => c.enabled);
    this.findings = [];
  }

  async scan(request, response, endpoint) {
    for (const check of this.checks) {
      const result = await check.execute(request, response, endpoint);
      if (result.vulnerable) {
        this.findings.push(...result.findings);
      }
    }
    return this.findings;
  }
}
```

### Week 3: Advanced Reporting (Days 14-18)

#### GitHub Pages Reporter
**File:** `reporters/github-pages.js`

Generate a static HTML dashboard with:
- Test results table
- Governance violations
- Security findings
- Charts and graphs
- Historical comparison

### Week 4: Ecosystem (Days 19-23)

#### Postman Import
**File:** `plugins/postman-compat.js`

Convert Postman collections to Iudex tests.

## 🚀 Quick Implementation Strategy

### Option 1: Build from Scratch (4 weeks)
Follow the week-by-week plan above.

### Option 2: Incremental (2 weeks MVP + ongoing)
1. Week 1-2: Build MVP (runner + console reporter)
2. Use immediately for testing
3. Add governance/security/reporting incrementally

### Option 3: Use Existing + Extend
1. Use Jest/Mocha as test runner
2. Build governance/security as plugins
3. Add custom reporters

## 📁 File-by-File Checklist

### Core (Week 1) ✅ COMPLETED
- [x] core/runner.js
- [x] core/collector.js
- [x] core/dsl.js
- [x] core/http-client.js
- [x] reporters/console.js
- [x] cli/index.js

### Data Persistence (Week 2: Days 6-8) ✅ COMPLETED
- [x] database/schema.sql - Complete schema with slug-based identity
- [x] database/client.js - PostgreSQL connection pool with pg
- [x] database/repository.js - Data access layer with slug tracking
- [x] reporters/postgres.js - Persist results to database with analytics
- [x] Update iudex.config.js with database settings
- [x] Test slug enforcement (auto-generated from names)

### Governance (Week 2: Days 9-13)
- [ ] governance/engine.js
- [ ] governance/rules/versioning.js
- [ ] governance/rules/naming.js
- [ ] governance/rules/pagination.js
- [ ] governance/rules/http-methods.js

### Security (Week 2: Days 9-13)
- [ ] security/scanner.js
- [ ] security/checks/authentication.js
- [ ] security/checks/authorization.js
- [ ] security/checks/rate-limiting.js
- [ ] security/checks/ssl-tls.js
- [ ] security/checks/headers.js

### Reporting (Week 3: Days 14-18)
- [ ] reporters/github-pages.js
- [ ] reporters/json.js
- [ ] reporters/junit.js
- [ ] reporters/templates/ (HTML/CSS/JS)

### Plugins (Week 4)
- [ ] plugins/postman-compat.js
- [ ] plugins/openapi.js

## 🎯 Success Metrics

### Week 1 ✅ COMPLETED
- [x] Can run tests from CLI
- [x] Tests pass/fail correctly
- [x] Console reporter works
- [x] HTTP client functional
- [x] 139 unit tests passing

### Week 2 (Days 6-8) ✅ COMPLETED
- [x] Test results persist to PostgreSQL
- [x] Historical data queryable via views
- [x] Database views working (latest runs, success rates, flaky tests, health scores, regressions)
- [x] Multiple reporters run simultaneously (console + postgres)
- [x] Test identity via slugs (auto-generated or explicit)
- [x] Test history tracking (audit trail of changes)
- [x] Test hash for skip detection

### Week 2 (Days 9-13)
- [ ] Governance violations detected
- [ ] Security findings reported

### Week 3
- [ ] GitHub Pages report generated
- [ ] JSON/JUnit export works

### Week 4
- [ ] Postman collections can import

## 💡 Tips

1. **Start Simple:** Get basic test execution working first
2. **Test as You Go:** Write tests for the framework itself
3. **Use TypeScript:** Optional but helps with a large codebase
4. **Documentation:** Document as you code
5. **Examples:** Create examples for each feature

---

**Ready to start? Begin with Week 1, Day 1!**
