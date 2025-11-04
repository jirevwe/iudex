# Iudex - Implementation Guide

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

        console.log('\\n' + chalk.bold('API Guardian Test Results'));
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

### Week 2: Governance & Security (Days 6-10)

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

### Week 3: Reporting (Days 11-15)

#### GitHub Pages Reporter
**File:** `reporters/github-pages.js`

Generate a static HTML dashboard with:
- Test results table
- Governance violations
- Security findings
- Charts and graphs
- Historical comparison

### Week 4: Ecosystem (Days 16-20)

#### Postman Import
**File:** `plugins/postman-compat.js`

Convert Postman collections to API Guardian tests.

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

### Core (Week 1)
- [ ] core/runner.js
- [ ] core/collector.js
- [ ] reporters/console.js
- [ ] cli/index.js
- [ ] cli/config-loader.js

### Governance (Week 2)
- [ ] governance/engine.js
- [ ] governance/rules/versioning.js
- [ ] governance/rules/naming.js
- [ ] governance/rules/pagination.js
- [ ] governance/rules/http-methods.js

### Security (Week 2)
- [ ] security/scanner.js
- [ ] security/checks/authentication.js
- [ ] security/checks/authorization.js
- [ ] security/checks/rate-limiting.js
- [ ] security/checks/ssl-tls.js
- [ ] security/checks/headers.js

### Reporting (Week 3)
- [ ] reporters/github-pages.js
- [ ] reporters/backend.js
- [ ] reporters/json.js
- [ ] reporters/junit.js
- [ ] reporters/templates/ (HTML/CSS/JS)

### Plugins (Week 4)
- [ ] plugins/postman-compat.js
- [ ] plugins/openapi.js

## 🎯 Success Metrics

- [ ] Can run tests from CLI
- [ ] Tests pass/fail correctly
- [ ] Governance violations detected
- [ ] Security findings reported
- [ ] GitHub Pages report generated
- [ ] Backend integration works
- [ ] Postman collections can import

## 💡 Tips

1. **Start Simple:** Get basic test execution working first
2. **Test as You Go:** Write tests for the framework itself
3. **Use TypeScript:** Optional but helps with a large codebase
4. **Documentation:** Document as you code
5. **Examples:** Create examples for each feature

---

**Ready to start? Begin with Week 1, Day 1!**
