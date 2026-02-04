/**
 * Iudex - Test Runner
 * Orchestrates test execution with governance and security checks
 */

import { getTestSuites } from './dsl.js';
import { HttpClient } from './http-client.js';
import { ResultCollector } from './collector.js';
import { GovernanceEngine } from '../governance/engine.js';
import { SecurityScanner } from '../security/scanner.js';
import { createStdObject } from './utils/index.js';
import type {
  IudexConfig,
  TestStatus,
  TestError,
  GovernanceViolation,
  SecurityFinding,
  HookFn
} from '../types/index.js';

/** Test context passed to test functions */
export interface TestContext {
  request: HttpClient;
  std: ReturnType<typeof createStdObject>;
}

/** Test definition with additional fields */
interface TestDefinition {
  name: string;
  id: string;
  fn: ((context: TestContext) => void | Promise<void>) | null;
  options: {
    timeout?: number;
    retry?: number;
    skip?: boolean;
    only?: boolean;
    stub?: boolean;
    tags?: string[];
    id?: string;
  };
  suite: string;
  skip?: boolean;
  only?: boolean;
  stub?: boolean;
  retry?: number;
  timeout?: number;
  tags?: string[];
  testId?: string;
  endpoint?: string | null;
  method?: string | null;
}

/** Suite hooks collection */
interface SuiteHooks {
  beforeAll: HookFn[];
  afterAll: HookFn[];
  beforeEach: HookFn[];
  afterEach: HookFn[];
}

/** Extended suite definition matching what DSL returns */
interface SuiteDefinition {
  name: string;
  tests: TestDefinition[];
  beforeAll: HookFn[];
  afterAll: HookFn[];
  beforeEach: HookFn[];
  afterEach: HookFn[];
}

/** Individual test result */
export interface TestRunResult {
  name: string;
  status: TestStatus;
  duration: number;
  error: TestError | null;
  retries: number;
  tags?: string[];
  testId?: string;
  endpoint?: string;
  method?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  statusCode?: number;
  responseTime?: number;
}

/** Suite execution result */
export interface SuiteResult {
  name: string;
  tests: TestRunResult[];
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
  error: TestError | null;
}

/** Summary statistics */
export interface SummaryStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
}

/** Full run results */
export interface RunResults {
  suites: SuiteResult[];
  summary: SummaryStats;
}

/** Runner configuration */
export interface RunnerConfig extends Partial<IudexConfig> {
  timeout?: number;
  retries?: number;
  bail?: boolean;
  parallel?: boolean;
}

/**
 * Test Runner
 * Orchestrates test execution with governance and security checks
 */
export class TestRunner {
  private config: RunnerConfig;
  private results: RunResults;
  private collector: ResultCollector;
  private governanceEngine: GovernanceEngine;
  private securityScanner: SecurityScanner;

  constructor(config: RunnerConfig = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      retries: config.retries || 0,
      bail: config.bail || false,
      http: config.http || {},
      parallel: config.parallel || false,
      governance: config.governance || {},
      security: config.security || {},
      ...config
    };

    this.results = {
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 0
      }
    };

    // Initialize collector for governance and security results
    this.collector = new ResultCollector();

    // Initialize governance engine and security scanner
    this.governanceEngine = new GovernanceEngine(this.config);
    this.securityScanner = new SecurityScanner(this.config);
  }

  /**
   * Run all test suites
   */
  async run(): Promise<RunResults> {
    const startTime = Date.now();
    this.collector.start();
    const suites = getTestSuites() as SuiteDefinition[];

    // Filter for .only tests if any exist
    const hasOnly = suites.some(suite =>
      suite.tests.some(test => test.only)
    );

    for (const suite of suites) {
      const suiteResult = await this.runSuite(suite, hasOnly);
      this.results.suites.push(suiteResult);

      // Bail early if configured and suite failed
      if (this.config.bail && suiteResult.failed > 0) {
        break;
      }
    }

    this.results.summary.duration = Date.now() - startTime;

    // Populate collector with test results
    this.collector.addResults(this.results);
    this.collector.end();

    return this.results;
  }

  /**
   * Run a single test suite
   */
  async runSuite(suite: SuiteDefinition, hasOnly: boolean = false): Promise<SuiteResult> {
    const suiteResult: SuiteResult = {
      name: suite.name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      todo: 0,
      duration: 0,
      error: null
    };

    const startTime = Date.now();

    try {
      // Create a test context with fixtures
      const context = this.createContext();

      // Support both new style (suite.beforeAll) and old style (suite.hooks.beforeAll)
      const hooks = (suite as unknown as { hooks?: SuiteHooks }).hooks;

      // Run beforeAll hooks
      await this.runHooks(suite.beforeAll || hooks?.beforeAll, context, 'beforeAll');

      // Filter tests based on only/skip
      let testsToRun = suite.tests;
      if (hasOnly) {
        testsToRun = testsToRun.filter(test => test.only);
      }

      // Build hooks object for runTest
      const suiteHooks: SuiteHooks = {
        beforeAll: suite.beforeAll || hooks?.beforeAll || [],
        afterAll: suite.afterAll || hooks?.afterAll || [],
        beforeEach: suite.beforeEach || hooks?.beforeEach || [],
        afterEach: suite.afterEach || hooks?.afterEach || []
      };

      // Run each test
      for (const test of testsToRun) {
        const testResult = await this.runTest(test, suiteHooks, context);
        suiteResult.tests.push(testResult);

        this.results.summary.total++;

        if (testResult.status === 'passed') {
          suiteResult.passed++;
          this.results.summary.passed++;
        } else if (testResult.status === 'failed') {
          suiteResult.failed++;
          this.results.summary.failed++;

          // Bail if configured
          if (this.config.bail) {
            break;
          }
        } else if (testResult.status === 'skipped') {
          suiteResult.skipped++;
          this.results.summary.skipped++;
        } else if (testResult.status === 'todo') {
          suiteResult.todo++;
          this.results.summary.todo++;
        }
      }

      // Run afterAll hooks
      await this.runHooks(suite.afterAll || hooks?.afterAll, context, 'afterAll');

    } catch (error) {
      const err = error as Error;
      suiteResult.error = {
        message: err.message,
        stack: err.stack
      };
    }

    suiteResult.duration = Date.now() - startTime;
    return suiteResult;
  }

  /**
   * Run a single test with retries and timeout
   */
  async runTest(test: TestDefinition, suiteHooks: SuiteHooks, context: TestContext): Promise<TestRunResult> {
    const testResult: TestRunResult = {
      name: test.name,
      status: 'passed',
      duration: 0,
      error: null,
      retries: 0,
      tags: test.tags,
      testId: test.testId,
      endpoint: test.endpoint || undefined,
      method: test.method || undefined
    };

    // Check if test is a stub (todo) - check both top-level and options.stub
    if (test.stub || test.options?.stub || test.fn === null) {
      testResult.status = 'todo';
      testResult.duration = 0;
      return testResult;
    }

    // Skip a test if marked
    if (test.skip) {
      testResult.status = 'skipped';
      return testResult;
    }

    const startTime = Date.now();
    const maxRetries = test.retry !== undefined ? test.retry : (this.config.retries || 0);
    const timeout = test.timeout || this.config.timeout || 30000;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Run beforeEach hooks
        await this.runHooks(suiteHooks.beforeEach, context, 'beforeEach');

        // Run the test with timeout
        await this.runWithTimeout(test.fn!, context, timeout);

        // Run afterEach hooks
        await this.runHooks(suiteHooks.afterEach, context, 'afterEach');

        // Run governance checks if explicitly enabled
        if (this.config.governance?.enabled === true) {
          await this.runGovernanceChecks(context, test, testResult);
        }

        // Run security checks if explicitly enabled
        if (this.config.security?.enabled === true) {
          await this.runSecurityChecks(context, test, testResult);
        }

        // Test passed
        testResult.status = 'passed';
        testResult.retries = attempt;
        break;

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Try to run afterEach even if test failed
        try {
          await this.runHooks(suiteHooks.afterEach, context, 'afterEach');
        } catch (hookError) {
          // Append hook error to test error
          const hErr = hookError as Error;
          lastError.message += `\nAfterEach hook error: ${hErr.message}`;
        }

        if (attempt > maxRetries) {
          testResult.status = 'failed';
          testResult.retries = attempt - 1;
          testResult.error = {
            message: lastError.message,
            stack: lastError.stack,
            timeout: lastError.name === 'TimeoutError'
          };
        }
      }
    }

    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  /**
   * Run a function with timeout
   */
  async runWithTimeout(
    fn: (context: TestContext) => void | Promise<void>,
    context: TestContext,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Test timeout after ${timeout}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeout);

      Promise.resolve(fn(context))
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Run lifecycle hooks
   */
  async runHooks(hooks: HookFn[] | undefined, context: TestContext, hookName: string): Promise<void> {
    if (!hooks || !Array.isArray(hooks)) return;

    for (const hook of hooks) {
      try {
        await hook(context);
      } catch (error) {
        const err = error as Error;
        err.message = `${hookName} hook failed: ${err.message}`;
        throw err;
      }
    }
  }

  /**
   * Create standard library object
   */
  createStdObject(): ReturnType<typeof createStdObject> {
    return createStdObject();
  }

  /**
   * Create test context with fixtures
   */
  createContext(): TestContext {
    return {
      request: new HttpClient(this.config.http),
      std: this.createStdObject()
    };
  }

  /**
   * Run governance checks after test completes
   */
  async runGovernanceChecks(context: TestContext, test: TestDefinition, testResult: TestRunResult): Promise<void> {
    try {
      const client = context.request;
      const request = client.getLastRequest();
      const response = client.getLastResponse();

      if (!request || !response) {
        // No HTTP request was made in this test
        return;
      }

      // Store request/response in test result for reporting (if not already stored)
      if (!testResult.requestBody) {
        testResult.requestBody = request.data;
        testResult.responseBody = response.body;
        testResult.statusCode = response.status;
        testResult.responseTime = response.responseTime;
      }

      // Build test context for checks
      const testContext = {
        suite: test.suite || 'Unknown Suite',
        test: test.name
      };

      // Run governance checks
      if (this.governanceEngine.isEnabled()) {
        // Adapt request to match expected interface
        const checkRequest = {
          ...request,
          method: request.method || 'GET'
        };
        const violations = await this.governanceEngine.check(
          checkRequest,
          response,
          test.endpoint || request.url,
          testContext
        );

        violations.forEach((v: GovernanceViolation) => this.collector.addGovernanceViolation(v));
      }
    } catch (error) {
      // Log error but don't fail the test
      const err = error as Error;
      console.warn('Governance checks failed:', err.message);
    }
  }

  /**
   * Run security checks after test completes
   */
  async runSecurityChecks(context: TestContext, test: TestDefinition, testResult: TestRunResult): Promise<void> {
    try {
      const client = context.request;
      const request = client.getLastRequest();
      const response = client.getLastResponse();

      if (!request || !response) {
        // No HTTP request was made in this test
        return;
      }

      // Store request/response in test result for reporting (if not already stored)
      if (!testResult.requestBody) {
        testResult.requestBody = request.data;
        testResult.responseBody = response.body;
        testResult.statusCode = response.status;
        testResult.responseTime = response.responseTime;
      }

      // Build test context for checks
      const testContext = {
        suite: test.suite || 'Unknown Suite',
        test: test.name
      };

      // Run security checks
      if (this.securityScanner.isEnabled()) {
        // Adapt request to match expected interface
        const checkRequest = {
          ...request,
          method: request.method || 'GET'
        };
        const findings = await this.securityScanner.scan(
          checkRequest,
          response,
          test.endpoint || request.url,
          testContext
        );

        findings.forEach((f: SecurityFinding) => this.collector.addSecurityFinding(f));
      }
    } catch (error) {
      // Log error but don't fail the test
      const err = error as Error;
      console.warn('Security checks failed:', err.message);
    }
  }

  /**
   * Get test results
   */
  getResults(): RunResults {
    return this.results;
  }

  /**
   * Get result collector (with governance and security results)
   */
  getCollector(): ResultCollector {
    return this.collector;
  }

  /**
   * Reset runner state
   */
  reset(): void {
    this.results = {
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 0
      }
    };
  }
}

/**
 * Convenience function to run tests
 */
export async function runTests(config: RunnerConfig = {}): Promise<RunResults> {
  const runner = new TestRunner(config);
  return await runner.run();
}

export default { TestRunner, runTests };
