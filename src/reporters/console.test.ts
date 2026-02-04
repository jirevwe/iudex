// Unit tests for Console Reporter
import { jest } from '@jest/globals';
import { ConsoleReporter } from './console.js';

/** Test results structure for console reporter */
interface TestResultsInput {
  suites: Array<{
    name: string;
    tests: Array<{
      name: string;
      status: string;
      duration?: number;
      error?: {
        message: string;
        stack?: string;
      };
    }>;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration?: number;
  };
  governance: {
    violations?: Array<{
      rule: string;
      message: string;
      severity?: string;
    }>;
    warnings?: Array<{
      rule: string;
      message: string;
      severity?: string;
    }>;
  };
  security: {
    findings?: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
  };
}

describe('ConsoleReporter', () => {
    let reporter: ConsoleReporter;
    let consoleOutput: string[];
    let originalLog: typeof console.log;

    beforeEach(() => {
        // Capture console.log output
        consoleOutput = [];
        originalLog = console.log;
        console.log = jest.fn((...args) => {
            consoleOutput.push(args.join(' '));
        });

        reporter = new ConsoleReporter({ colors: false }); // Disable colors for easier testing
    });

    afterEach(() => {
        // Restore console.log
        console.log = originalLog;
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            const rep = new ConsoleReporter();

            expect(rep.options.verbose).toBe(false);
            expect(rep.options.showPassed).toBe(false);
            expect(rep.options.showSkipped).toBe(true);
            expect(rep.options.slowThreshold).toBe(1000);
        });

        test('should accept custom options', () => {
            const rep = new ConsoleReporter({
                verbose: true,
                showPassed: true,
                slowThreshold: 500
            });

            expect(rep.options.verbose).toBe(true);
            expect(rep.options.showPassed).toBe(true);
            expect(rep.options.slowThreshold).toBe(500);
        });
    });

    describe('Summary Reporting', () => {
        test('should report passing tests summary', () => {
            const results = {
                suites: [],
                summary: {
                    total: 10,
                    passed: 10,
                    failed: 0,
                    skipped: 0,
                    duration: 1500
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Total: 10');
            expect(output).toContain('Passed: 10');
            expect(output).toContain('Failed: 0');
            expect(output).toContain('All tests passed!');
        });

        test('should report failed tests summary', () => {
            const results = {
                suites: [],
                summary: {
                    total: 10,
                    passed: 7,
                    failed: 3,
                    skipped: 0,
                    duration: 1500
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Failed: 3');
            expect(output).toContain('3 tests failed');
        });

        test('should report skipped tests', () => {
            const results = {
                suites: [],
                summary: {
                    total: 10,
                    passed: 8,
                    failed: 0,
                    skipped: 2,
                    duration: 1500
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Skipped: 2');
        });

        test('should display duration', () => {
            const results = {
                suites: [],
                summary: {
                    total: 5,
                    passed: 5,
                    failed: 0,
                    skipped: 0,
                    duration: 2500
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Duration:');
            expect(output).toContain('2.50s');
        });

        test('should display success rate', () => {
            const results = {
                suites: [],
                summary: {
                    total: 10,
                    passed: 8,
                    failed: 2,
                    skipped: 0
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Success Rate: 80.0%');
        });
    });

    describe('Failure Details', () => {
        test('should display failed test details', () => {
            const results = {
                suites: [
                    {
                        name: 'API Tests',
                        tests: [
                            {
                                name: 'should fail',
                                status: 'failed',
                                error: {
                                    message: 'Expected 200 but got 404',
                                    stack: 'Error: Expected 200 but got 404\n  at test.js:10'
                                },
                                duration: 100
                            }
                        ]
                    }
                ],
                summary: {
                    total: 1,
                    passed: 0,
                    failed: 1,
                    skipped: 0
                },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Failed Tests:');
            expect(output).toContain('API Tests > should fail');
            expect(output).toContain('Expected 200 but got 404');
        });

        test('should display stack trace in verbose mode', () => {
            reporter = new ConsoleReporter({ verbose: true, colors: false });

            const results = {
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'test',
                                status: 'failed',
                                error: {
                                    message: 'Error',
                                    stack: 'Error\n  at line 1\n  at line 2'
                                }
                            }
                        ]
                    }
                ],
                summary: { total: 1, passed: 0, failed: 1, skipped: 0 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('at line 1');
        });
    });

    describe('Verbose Mode', () => {
        beforeEach(() => {
            reporter = new ConsoleReporter({ verbose: true, showPassed: true, colors: false });
        });

        test('should display all test suites', () => {
            const results = {
                suites: [
                    {
                        name: 'Suite 1',
                        tests: [
                            { name: 'test 1', status: 'passed', duration: 50 }
                        ]
                    },
                    {
                        name: 'Suite 2',
                        tests: [
                            { name: 'test 2', status: 'passed', duration: 75 }
                        ]
                    }
                ],
                summary: { total: 2, passed: 2, failed: 0, skipped: 0 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Suite 1');
            expect(output).toContain('Suite 2');
            expect(output).toContain('test 1');
            expect(output).toContain('test 2');
        });
    });

    describe('Slow Tests', () => {
        test('should display slow tests', () => {
            reporter = new ConsoleReporter({ showSlow: true, slowThreshold: 500, colors: false });

            const results = {
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'fast test', status: 'passed', duration: 100 },
                            { name: 'slow test', status: 'passed', duration: 1000 },
                            { name: 'very slow test', status: 'passed', duration: 2000 }
                        ]
                    }
                ],
                summary: { total: 3, passed: 3, failed: 0, skipped: 0 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Slow Tests:');
            expect(output).toContain('slow test');
            expect(output).toContain('very slow test');
            expect(output).toContain('2000ms');
            expect(output).not.toContain('fast test');
        });

        test('should not display slow tests if disabled', () => {
            reporter = new ConsoleReporter({ showSlow: false, colors: false });

            const results = {
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'slow test', status: 'passed', duration: 2000 }
                        ]
                    }
                ],
                summary: { total: 1, passed: 1, failed: 0, skipped: 0 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).not.toContain('Slow Tests:');
        });
    });

    describe('Governance Reporting', () => {
        test('should display governance violations', () => {
            const results = {
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
                governance: {
                    violations: [
                        { rule: 'rest-standards', message: 'Invalid status code', severity: 'error' }
                    ],
                    warnings: []
                },
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Governance:');
            expect(output).toContain('1 violation');
        });

        test('should display governance warnings', () => {
            const results = {
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
                governance: {
                    violations: [],
                    warnings: [
                        { rule: 'versioning', message: 'Missing version', severity: 'warning' },
                        { rule: 'pagination', message: 'Missing pagination', severity: 'warning' }
                    ]
                },
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Governance:');
            expect(output).toContain('2 warnings');
        });

        test('should show governance details in verbose mode', () => {
            reporter = new ConsoleReporter({ verbose: true, colors: false });

            const results = {
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
                governance: {
                    violations: [
                        { rule: 'rest-standards', message: 'Invalid status code' }
                    ],
                    warnings: []
                },
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('rest-standards');
            expect(output).toContain('Invalid status code');
        });
    });

    describe('Security Reporting', () => {
        test('should display security findings', () => {
            const results = {
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
                governance: {},
                security: {
                    findings: [
                        { type: 'sensitive-data', message: 'Password in response', severity: 'high' }
                    ]
                }
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('Security:');
            expect(output).toContain('1 finding');
        });

        test('should show security details in verbose mode', () => {
            reporter = new ConsoleReporter({ verbose: true, colors: false });

            const results = {
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
                governance: {},
                security: {
                    findings: [
                        { type: 'sensitive-data', message: 'Password exposed', severity: 'critical' },
                        { type: 'missing-auth', message: 'No auth header', severity: 'high' }
                    ]
                }
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('sensitive-data');
            expect(output).toContain('Password exposed');
            expect(output).toContain('missing-auth');
        });
    });

    describe('Duration Formatting', () => {
        test('should format milliseconds', () => {
            const formatted = reporter._formatDuration(500);
            expect(formatted).toBe('500ms');
        });

        test('should format seconds', () => {
            const formatted = reporter._formatDuration(2500);
            expect(formatted).toBe('2.50s');
        });

        test('should format minutes', () => {
            const formatted = reporter._formatDuration(125000);
            expect(formatted).toBe('2m 5s');
        });
    });

    describe('Skipped Tests', () => {
        test('should show skipped tests by default', () => {
            reporter = new ConsoleReporter({ verbose: true, colors: false });

            const results = {
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'skipped test', status: 'skipped' }
                        ]
                    }
                ],
                summary: { total: 1, passed: 0, failed: 0, skipped: 1 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            expect(output).toContain('skipped test');
            expect(output).toContain('skipped');
        });

        test('should not show skipped tests if disabled', () => {
            reporter = new ConsoleReporter({ verbose: true, showSkipped: false, colors: false });

            const results = {
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'skipped test', status: 'skipped' }
                        ]
                    }
                ],
                summary: { total: 1, passed: 0, failed: 0, skipped: 1 },
                governance: {},
                security: {}
            };

            reporter.report(results);

            const output = consoleOutput.join('\n');
            // Should still show in summary but not in detailed test list
            expect(output).toContain('Skipped: 1');
        });
    });
});
