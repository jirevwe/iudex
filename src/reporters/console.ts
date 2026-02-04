/**
 * Iudex - Console Reporter
 * Formats and displays test results in the terminal
 */

import chalk from 'chalk';
import type { TestError, GovernanceViolation, SecurityFinding, SecuritySeverity } from '../types/index.js';

/** Console reporter options */
export interface ConsoleReporterOptions {
  verbose?: boolean;
  showPassed?: boolean;
  showSkipped?: boolean;
  showSlow?: boolean;
  slowThreshold?: number;
  colors?: boolean;
}

/** Test result for reporting */
interface TestResult {
  name: string;
  status: string;
  duration?: number;
  error?: TestError | null;
}

/** Suite result for reporting */
interface SuiteResult {
  name: string;
  tests: TestResult[];
}

/** Summary statistics */
interface Summary {
  total?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  todo?: number;
  duration?: number;
}

/** Governance results */
interface GovernanceResults {
  violations?: GovernanceViolation[];
  warnings?: GovernanceViolation[];
}

/** Security results */
interface SecurityResults {
  findings?: SecurityFinding[];
}

/** Full results object */
interface ReportResults {
  suites: SuiteResult[];
  summary: Summary;
  governance?: GovernanceResults;
  security?: SecurityResults;
}

/** Failed test info */
interface FailedTest {
  suite: string;
  test: string;
  error?: TestError | null;
  duration?: number;
}

/** Slow test info */
interface SlowTest {
  suite: string;
  test: string;
  duration: number;
}

/**
 * Console Reporter
 * Formats and displays test results in the terminal
 */
export class ConsoleReporter {
  private options: Required<ConsoleReporterOptions>;

  constructor(options: ConsoleReporterOptions = {}) {
    this.options = {
      verbose: options.verbose || false,
      showPassed: options.showPassed || false,
      showSkipped: options.showSkipped !== false,
      showSlow: options.showSlow !== false,
      slowThreshold: options.slowThreshold || 1000,
      colors: options.colors !== false
    };

    // Disable colors if requested
    if (!this.options.colors) {
      chalk.level = 0;
    }
  }

  /**
   * Report test results
   */
  report(results: ReportResults): void {
    console.log('');
    this.printHeader();
    console.log('');

    if (this.options.verbose) {
      this.printSuites(results.suites);
    }

    this.printFailures(results);
    this.printSummary(results.summary);

    if (this.options.showSlow) {
      this.printSlowTests(results);
    }

    this.printGovernance(results.governance);
    this.printSecurity(results.security);

    console.log('');
  }

  /**
   * Print header
   */
  private printHeader(): void {
    console.log(chalk.bold.cyan('🛡️  Iudex Test Results'));
  }

  /**
   * Print test suites (verbose mode)
   */
  private printSuites(suites: SuiteResult[]): void {
    for (const suite of suites) {
      console.log('');
      console.log(chalk.bold(suite.name));

      for (const test of suite.tests) {
        this.printTest(test);
      }
    }
  }

  /**
   * Print individual test
   */
  private printTest(test: TestResult): void {
    const indent = '  ';
    let line = indent;

    if (test.status === 'passed') {
      if (this.options.showPassed) {
        line += '✅ ' + chalk.gray(test.name);
        if (test.duration) {
          line += chalk.gray(` (${test.duration}ms)`);
        }
        console.log(line);
      }
    } else if (test.status === 'failed') {
      line += '❌ ' + test.name;
      if (test.duration) {
        line += chalk.gray(` (${test.duration}ms)`);
      }
      console.log(line);
    } else if (test.status === 'skipped') {
      if (this.options.showSkipped) {
        line += '⏭️  ' + chalk.gray(test.name) + chalk.yellow(' (skipped)');
        console.log(line);
      }
    } else if (test.status === 'todo') {
      line += '📝 ' + chalk.gray(test.name) + chalk.dim(' (todo)');
      console.log(line);
    }
  }

  /**
   * Print failures
   */
  private printFailures(results: ReportResults): void {
    const failures = this.getFailedTests(results.suites);

    if (failures.length === 0) return;

    console.log('');
    console.log(chalk.bold.red('Failed Tests:'));
    console.log('');

    failures.forEach((failure, index) => {
      console.log(chalk.red(`${index + 1}) ${failure.suite} > ${failure.test}`));

      if (failure.error) {
        if (failure.error.message) {
          console.log(chalk.red('   ' + failure.error.message));
        }

        if (this.options.verbose && failure.error.stack) {
          const stackLines = failure.error.stack.split('\n');
          stackLines.slice(0, 5).forEach(line => {
            console.log(chalk.gray('   ' + line));
          });
        }
      }

      console.log('');
    });
  }

  /**
   * Print summary
   */
  private printSummary(summary: Summary): void {
    console.log(chalk.bold('Summary:'));

    const total = summary.total || 0;
    const passed = summary.passed || 0;
    const failed = summary.failed || 0;
    const skipped = summary.skipped || 0;
    const todo = summary.todo || 0;

    // Build summary line
    let summaryLine = '  ';
    summaryLine += chalk.bold(`Total: ${total}`);
    summaryLine += ' | ';

    if (passed > 0) {
      summaryLine += chalk.green(`✅ Passed: ${passed}`);
    } else {
      summaryLine += chalk.gray(`Passed: ${passed}`);
    }

    summaryLine += ' | ';

    if (failed > 0) {
      summaryLine += chalk.red(`❌ Failed: ${failed}`);
    } else {
      summaryLine += chalk.gray(`Failed: ${failed}`);
    }

    if (skipped > 0) {
      summaryLine += ' | ' + chalk.yellow(`⏭️  Skipped: ${skipped}`);
    }

    if (todo > 0) {
      summaryLine += ' | ' + chalk.yellow(`📝 TODO: ${todo}`);
    }

    console.log(summaryLine);

    // Duration
    if (summary.duration) {
      const duration = this._formatDuration(summary.duration);
      console.log(chalk.gray(`  Duration: ${duration}`));
    }

    // Success rate
    if (total > 0) {
      const successRate = ((passed / total) * 100).toFixed(1);
      const color = successRate === '100.0' ? chalk.green :
                   parseFloat(successRate) >= 80.0 ? chalk.yellow :
                   chalk.red;
      console.log(color(`  Success Rate: ${successRate}%`));
    }

    console.log('');

    // Overall status
    if (failed === 0 && total > 0) {
      console.log(chalk.bold.green('✓ All tests passed!'));
    } else if (failed > 0) {
      console.log(chalk.bold.red(`✗ ${failed} test${failed !== 1 ? 's' : ''} failed`));
    }
  }

  /**
   * Print slow tests
   */
  private printSlowTests(results: ReportResults): void {
    const slowTests = this.getSlowTests(results.suites);

    if (slowTests.length === 0) return;

    console.log('');
    console.log(chalk.bold.yellow('Slow Tests:'));
    console.log(chalk.gray(`  (threshold: ${this.options.slowThreshold}ms)`));

    slowTests.forEach(test => {
      const duration = chalk.yellow(`${test.duration}ms`);
      console.log(`  ${duration} - ${test.suite} > ${test.test}`);
    });
  }

  /**
   * Print governance issues
   */
  private printGovernance(governance?: GovernanceResults): void {
    if (!governance) return;

    const violations = governance.violations || [];
    const warnings = governance.warnings || [];

    if (violations.length === 0 && warnings.length === 0) return;

    console.log('');
    console.log(chalk.bold.magenta('Governance:'));

    if (violations.length > 0) {
      console.log(chalk.red(`  ✗ ${violations.length} violation${violations.length !== 1 ? 's' : ''}`));
      if (this.options.verbose) {
        violations.forEach(v => {
          console.log(chalk.red(`    - ${v.rule}: ${v.message}`));
        });
      }
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`));
      if (this.options.verbose) {
        warnings.forEach(w => {
          console.log(chalk.yellow(`    - ${w.rule}: ${w.message}`));
        });
      }
    }
  }

  /**
   * Print security findings
   */
  private printSecurity(security?: SecurityResults): void {
    if (!security) return;

    const findings = security.findings || [];
    if (findings.length === 0) return;

    console.log('');
    console.log(chalk.bold.red('Security:'));
    console.log(chalk.red(`  ⚠ ${findings.length} finding${findings.length !== 1 ? 's' : ''}`));

    if (this.options.verbose) {
      findings.forEach(f => {
        const severity = this.formatSeverity(f.severity);
        // Support both new (check/title) and old (type/message) field names
        const checkName = f.check || (f as { type?: string }).type || 'unknown';
        const title = f.title || (f as { message?: string }).message || 'Security finding';
        console.log(`    ${severity} ${checkName}: ${title}`);
      });
    }
  }

  /**
   * Get failed tests from suites
   */
  private getFailedTests(suites: SuiteResult[]): FailedTest[] {
    const failed: FailedTest[] = [];
    for (const suite of suites) {
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
   * Get slow tests from suites
   */
  private getSlowTests(suites: SuiteResult[]): SlowTest[] {
    const slow: SlowTest[] = [];
    for (const suite of suites) {
      for (const test of suite.tests) {
        if (test.duration && test.duration >= this.options.slowThreshold) {
          slow.push({
            suite: suite.name,
            test: test.name,
            duration: test.duration
          });
        }
      }
    }
    return slow.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Format duration
   * Public for testing backwards compatibility
   */
  _formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format severity
   */
  private formatSeverity(severity: SecuritySeverity): string {
    const severityMap: Record<SecuritySeverity, string> = {
      critical: chalk.red('🔴'),
      high: chalk.red('⚠️'),
      medium: chalk.yellow('⚠️'),
      low: chalk.gray('ℹ️'),
      info: chalk.gray('ℹ️')
    };
    return severityMap[severity] || chalk.gray('ℹ️');
  }
}

export default { ConsoleReporter };
