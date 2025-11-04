// Iudex - Console Reporter
// Formats and displays test results in the terminal

import chalk from 'chalk';

export class ConsoleReporter {
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose || false,
            showPassed: options.showPassed || false,
            showSkipped: options.showSkipped !== false,
            showSlow: options.showSlow !== false,
            slowThreshold: options.slowThreshold || 1000, // ms
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
    report(results) {
        console.log(''); // Empty line
        this._printHeader();
        console.log(''); // Empty line

        if (this.options.verbose) {
            this._printSuites(results.suites);
        }

        this._printFailures(results);
        this._printSummary(results.summary);

        if (this.options.showSlow) {
            this._printSlowTests(results);
        }

        this._printGovernance(results.governance);
        this._printSecurity(results.security);

        console.log(''); // Empty line
    }

    /**
     * Print header
     */
    _printHeader() {
        console.log(chalk.bold.cyan('🛡️  Iudex Test Results'));
    }

    /**
     * Print test suites (verbose mode)
     */
    _printSuites(suites) {
        for (const suite of suites) {
            console.log(''); // Empty line
            console.log(chalk.bold(suite.name));

            for (const test of suite.tests) {
                this._printTest(test, suite.name);
            }
        }
    }

    /**
     * Print individual test
     */
    _printTest(test, suiteName) {
        const indent = '  ';
        let line = indent;

        if (test.status === 'passed') {
            if (this.options.showPassed) {
                line += chalk.green('✓') + ' ' + chalk.gray(test.name);
                if (test.duration) {
                    line += chalk.gray(` (${test.duration}ms)`);
                }
                console.log(line);
            }
        } else if (test.status === 'failed') {
            line += chalk.red('✗') + ' ' + test.name;
            if (test.duration) {
                line += chalk.gray(` (${test.duration}ms)`);
            }
            console.log(line);
        } else if (test.status === 'skipped') {
            if (this.options.showSkipped) {
                line += chalk.yellow('○') + ' ' + chalk.gray(test.name) + chalk.yellow(' (skipped)');
                console.log(line);
            }
        }
    }

    /**
     * Print failures
     */
    _printFailures(results) {
        const failures = this._getFailedTests(results.suites);

        if (failures.length === 0) return;

        console.log(''); // Empty line
        console.log(chalk.bold.red('Failed Tests:'));
        console.log(''); // Empty line

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

            console.log(''); // Empty line
        });
    }

    /**
     * Print summary
     */
    _printSummary(summary) {
        console.log(chalk.bold('Summary:'));

        const total = summary.total || 0;
        const passed = summary.passed || 0;
        const failed = summary.failed || 0;
        const skipped = summary.skipped || 0;

        // Build summary line
        let summaryLine = '  ';
        summaryLine += chalk.bold(`Total: ${total}`);
        summaryLine += ' | ';

        if (passed > 0) {
            summaryLine += chalk.green(`✓ Passed: ${passed}`);
        } else {
            summaryLine += chalk.gray(`Passed: ${passed}`);
        }

        summaryLine += ' | ';

        if (failed > 0) {
            summaryLine += chalk.red(`✗ Failed: ${failed}`);
        } else {
            summaryLine += chalk.gray(`Failed: ${failed}`);
        }

        if (skipped > 0) {
            summaryLine += ' | ' + chalk.yellow(`○ Skipped: ${skipped}`);
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
                         successRate >= '80.0' ? chalk.yellow :
                         chalk.red;
            console.log(color(`  Success Rate: ${successRate}%`));
        }

        console.log(''); // Empty line

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
    _printSlowTests(results) {
        const slowTests = this._getSlowTests(results.suites);

        if (slowTests.length === 0) return;

        console.log(''); // Empty line
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
    _printGovernance(governance) {
        if (!governance) return;

        const violations = governance.violations || [];
        const warnings = governance.warnings || [];

        if (violations.length === 0 && warnings.length === 0) return;

        console.log(''); // Empty line
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
    _printSecurity(security) {
        if (!security) return;

        const findings = security.findings || [];
        if (findings.length === 0) return;

        console.log(''); // Empty line
        console.log(chalk.bold.red('Security:'));
        console.log(chalk.red(`  ⚠ ${findings.length} finding${findings.length !== 1 ? 's' : ''}`));

        if (this.options.verbose) {
            findings.forEach(f => {
                const severity = this._formatSeverity(f.severity);
                console.log(`    ${severity} ${f.type}: ${f.message}`);
            });
        }
    }

    /**
     * Get failed tests from suites
     */
    _getFailedTests(suites) {
        const failed = [];
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
    _getSlowTests(suites) {
        const slow = [];
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
     */
    _formatDuration(ms) {
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
    _formatSeverity(severity) {
        const severityMap = {
            critical: chalk.red('🔴'),
            high: chalk.red('⚠️'),
            medium: chalk.yellow('⚠️'),
            low: chalk.gray('ℹ️')
        };
        return severityMap[severity] || chalk.gray('ℹ️');
    }
}

export default { ConsoleReporter };
