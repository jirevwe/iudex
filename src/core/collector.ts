/**
 * Iudex - Result Collector
 * Aggregates and organizes test results for reporting
 */

import type {
  TestStatus,
  GovernanceViolation,
  SecurityFinding
} from '../types/index.js';

/** Suite result from runner */
interface SuiteResult {
  name: string;
  tests: TestResultFromRunner[];
  failed?: number;
  skipped?: number;
  duration?: number;
}

/** Test result from runner */
interface TestResultFromRunner {
  name: string;
  description?: string;
  testId?: string;
  file?: string;
  endpoint?: string;
  method?: string;
  httpMethod?: string;
  status: TestStatus;
  duration?: number;
  responseTime?: number;
  statusCode?: number;
  error?: {
    message?: string;
    name?: string;
    stack?: string;
    timeout?: boolean;
  } | string | null;
  assertionsPassed?: number;
  assertionsFailed?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  tags?: string[];
}

/** Runner results structure */
interface RunnerResults {
  suites?: SuiteResult[];
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    duration: number;
  };
}

/** Summary statistics */
interface Summary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
  startTime: number | null;
  endTime: number | null;
}

/** Governance results */
interface GovernanceResults {
  violations: GovernanceViolation[];
  warnings: GovernanceViolation[];
}

/** Security results */
interface SecurityResults {
  findings: SecurityFinding[];
}

/** Metadata */
interface Metadata {
  framework: string;
  version: string;
  environment: string;
  [key: string]: unknown;
}

/** Collected results structure */
interface CollectedResults {
  suites: SuiteResult[];
  summary: Summary;
  governance: GovernanceResults;
  security: SecurityResults;
  metadata: Metadata;
}

/** Flattened test result */
interface FlattenedTestResult {
  suite: string;
  test: string;
  name: string;
  description: string | null;
  testId: string | null;
  file: string | null;
  endpoint: string | null;
  method: string | null;
  status: TestStatus;
  duration: number;
  responseTime: number | null;
  statusCode: number | null;
  error: string | null;
  errorType: string | null;
  stack: string | null;
  assertionsPassed: number | null;
  assertionsFailed: number | null;
  requestBody: unknown | null;
  responseBody: unknown | null;
  tags: string[];
}

/** Simple test reference */
interface SimpleTestRef {
  suite: string;
  test: string;
  status?: TestStatus;
  duration?: number;
  error?: unknown;
}

/** JUnit testcase */
interface JUnitTestCase {
  name: string;
  classname: string;
  time: string;
  failure: {
    message: string;
    type: string;
    content: string;
  } | null;
  skipped: boolean;
}

/** JUnit testsuite */
interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  skipped: number;
  time: string;
  testcases: JUnitTestCase[];
}

/**
 * Result Collector class
 * Aggregates test results, governance violations, and security findings
 */
export class ResultCollector {
  private results: CollectedResults;

  constructor() {
    this.results = this.createEmptyResults();
  }

  private createEmptyResults(): CollectedResults {
    return {
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 0,
        startTime: null,
        endTime: null
      },
      governance: {
        violations: [],
        warnings: []
      },
      security: {
        findings: []
      },
      metadata: {
        framework: 'Iudex',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  /**
   * Add test results from runner
   */
  addResults(runnerResults: RunnerResults): this {
    this.results.suites = runnerResults.suites || [];
    this.results.summary = {
      ...runnerResults.summary,
      startTime: this.results.summary.startTime,
      endTime: Date.now()
    } as Summary;
    return this;
  }

  /**
   * Add governance violation
   */
  addGovernanceViolation(violation: GovernanceViolation): this {
    if (violation.severity === 'error') {
      this.results.governance.violations.push(violation);
    } else {
      this.results.governance.warnings.push(violation);
    }
    return this;
  }

  /**
   * Add security finding
   */
  addSecurityFinding(finding: SecurityFinding): this {
    this.results.security.findings.push(finding);
    return this;
  }

  /**
   * Start timing
   */
  start(): this {
    this.results.summary.startTime = Date.now();
    return this;
  }

  /**
   * End timing
   */
  end(): this {
    this.results.summary.endTime = Date.now();
    if (this.results.summary.startTime) {
      this.results.summary.duration =
        this.results.summary.endTime - this.results.summary.startTime;
    }
    return this;
  }

  /**
   * Get all results
   */
  getResults(): CollectedResults {
    return this.results;
  }

  /**
   * Get summary statistics
   */
  getSummary(): Summary {
    return this.results.summary;
  }

  /**
   * Get metadata
   */
  getMetadata(): Metadata {
    return this.results.metadata;
  }

  /**
   * Set metadata (allows customization)
   */
  setMetadata(metadata: Partial<Metadata>): this {
    this.results.metadata = { ...this.results.metadata, ...metadata };
    return this;
  }

  /**
   * Get all test results as a flattened array
   */
  getAllResults(): FlattenedTestResult[] {
    const allResults: FlattenedTestResult[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        const error = test.error;
        let errorMessage: string | null = null;
        let errorType: string | null = null;
        let errorStack: string | null = null;

        if (error) {
          if (typeof error === 'string') {
            errorMessage = error;
          } else {
            errorMessage = error.message || null;
            errorType = error.name || null;
            errorStack = error.stack || null;
          }
        }

        allResults.push({
          suite: suite.name,
          test: test.name,
          name: test.name,
          description: test.description || null,
          testId: test.testId || null,
          file: test.file || null,
          endpoint: test.endpoint || null,
          method: test.method || test.httpMethod || null,
          status: test.status,
          duration: test.duration || 0,
          responseTime: test.responseTime || null,
          statusCode: test.statusCode || null,
          error: errorMessage,
          errorType,
          stack: errorStack,
          assertionsPassed: test.assertionsPassed || null,
          assertionsFailed: test.assertionsFailed || null,
          requestBody: test.requestBody || null,
          responseBody: test.responseBody || null,
          tags: test.tags || []
        });
      }
    }
    return allResults;
  }

  /**
   * Get all test results including access to raw test objects
   * This is an alias for backwards compatibility
   */
  get testResults(): FlattenedTestResult[] {
    return this.getAllResults();
  }

  /**
   * Get failed tests
   */
  getFailedTests(): SimpleTestRef[] {
    const failed: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        if (test.status === 'failed') {
          failed.push({
            suite: suite.name,
            test: test.name,
            error: test.error,
            duration: test.duration
          });
        }
      }
    }
    return failed;
  }

  /**
   * Get passed tests
   */
  getPassedTests(): SimpleTestRef[] {
    const passed: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        if (test.status === 'passed') {
          passed.push({
            suite: suite.name,
            test: test.name,
            duration: test.duration
          });
        }
      }
    }
    return passed;
  }

  /**
   * Get skipped tests
   */
  getSkippedTests(): SimpleTestRef[] {
    const skipped: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        if (test.status === 'skipped') {
          skipped.push({
            suite: suite.name,
            test: test.name
          });
        }
      }
    }
    return skipped;
  }

  /**
   * Get todo tests
   */
  getUnimplementedTests(): SimpleTestRef[] {
    const todo: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        if (test.status === 'todo') {
          todo.push({
            suite: suite.name,
            test: test.name
          });
        }
      }
    }
    return todo;
  }

  /**
   * Get tests by tag
   */
  getTestsByTag(tag: string): SimpleTestRef[] {
    const tests: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        if (test.tags && test.tags.includes(tag)) {
          tests.push({
            suite: suite.name,
            test: test.name,
            status: test.status,
            duration: test.duration
          });
        }
      }
    }
    return tests;
  }

  /**
   * Get slowest tests
   */
  getSlowestTests(limit = 10): SimpleTestRef[] {
    const allTests: SimpleTestRef[] = [];
    for (const suite of this.results.suites) {
      for (const test of suite.tests) {
        allTests.push({
          suite: suite.name,
          test: test.name,
          duration: test.duration || 0,
          status: test.status
        });
      }
    }
    return allTests
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  /**
   * Check if all tests passed
   */
  hasAllPassed(): boolean {
    return this.results.summary.failed === 0 &&
      this.results.summary.total > 0;
  }

  /**
   * Check if any tests failed
   */
  hasFailures(): boolean {
    return this.results.summary.failed > 0;
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.results.summary.total === 0) return 0;
    return (this.results.summary.passed / this.results.summary.total) * 100;
  }

  /**
   * Format results for JSON export
   */
  toJSON(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Format results for JUnit XML
   */
  toJUnit(): string {
    const testsuites: JUnitTestSuite[] = [];

    for (const suite of this.results.suites) {
      const testsuite: JUnitTestSuite = {
        name: suite.name,
        tests: suite.tests.length,
        failures: suite.failed || 0,
        skipped: suite.skipped || 0,
        time: ((suite.duration || 0) / 1000).toFixed(3),
        testcases: suite.tests.map(test => {
          const error = test.error;
          let errorMessage = 'Test failed';
          let errorStack = '';

          if (error) {
            if (typeof error === 'string') {
              errorMessage = error;
            } else {
              errorMessage = error.message || 'Test failed';
              errorStack = error.stack || '';
            }
          }

          return {
            name: test.name,
            classname: suite.name,
            time: ((test.duration || 0) / 1000).toFixed(3),
            failure: test.status === 'failed' ? {
              message: errorMessage,
              type: (typeof error === 'object' && error?.timeout) ? 'Timeout' : 'AssertionError',
              content: errorStack
            } : null,
            skipped: test.status === 'skipped'
          };
        })
      };
      testsuites.push(testsuite);
    }

    return this.buildJUnitXML(testsuites);
  }

  /**
   * Build JUnit XML string
   */
  private buildJUnitXML(testsuites: JUnitTestSuite[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';

    for (const suite of testsuites) {
      xml += `  <testsuite name="${this.escapeXML(suite.name)}" `;
      xml += `tests="${suite.tests}" `;
      xml += `failures="${suite.failures}" `;
      xml += `skipped="${suite.skipped}" `;
      xml += `time="${suite.time}">\n`;

      for (const testcase of suite.testcases) {
        xml += `    <testcase name="${this.escapeXML(testcase.name)}" `;
        xml += `classname="${this.escapeXML(testcase.classname)}" `;
        xml += `time="${testcase.time}">\n`;

        if (testcase.failure) {
          xml += `      <failure message="${this.escapeXML(testcase.failure.message)}" `;
          xml += `type="${testcase.failure.type}">\n`;
          xml += `        ${this.escapeXML(testcase.failure.content)}\n`;
          xml += `      </failure>\n`;
        }

        if (testcase.skipped) {
          xml += `      <skipped/>\n`;
        }

        xml += `    </testcase>\n`;
      }

      xml += `  </testsuite>\n`;
    }

    xml += '</testsuites>\n';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: unknown): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Reset collector
   */
  reset(): this {
    this.results = this.createEmptyResults();
    return this;
  }
}

export default { ResultCollector };
