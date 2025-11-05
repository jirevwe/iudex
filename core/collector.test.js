// Unit tests for Result Collector
import { ResultCollector } from './collector.js';

describe('ResultCollector', () => {
    let collector;

    beforeEach(() => {
        collector = new ResultCollector();
    });

    describe('Initialization', () => {
        test('should initialize with empty results', () => {
            const results = collector.getResults();

            expect(results.suites).toEqual([]);
            expect(results.summary.total).toBe(0);
            expect(results.summary.passed).toBe(0);
            expect(results.summary.failed).toBe(0);
            expect(results.summary.skipped).toBe(0);
            expect(results.metadata.framework).toBe('Iudex');
        });

        test('should have metadata', () => {
            const results = collector.getResults();

            expect(results.metadata).toBeDefined();
            expect(results.metadata.framework).toBe('Iudex');
            expect(results.metadata.version).toBe('1.0.0');
        });

        test('should get metadata via getMetadata()', () => {
            const metadata = collector.getMetadata();

            expect(metadata.framework).toBe('Iudex');
            expect(metadata.version).toBe('1.0.0');
            expect(metadata.environment).toBeDefined();
        });

        test('should set custom metadata', () => {
            const customMetadata = {
                projectName: 'My API',
                environment: 'staging',
                buildNumber: '123'
            };

            const result = collector.setMetadata(customMetadata);

            expect(result).toBe(collector); // Returns collector for chaining

            const metadata = collector.getMetadata();
            expect(metadata.framework).toBe('Iudex'); // Original fields preserved
            expect(metadata.version).toBe('1.0.0');
            expect(metadata.projectName).toBe('My API');
            expect(metadata.environment).toBe('staging');
            expect(metadata.buildNumber).toBe('123');
        });

        test('should merge metadata without overwriting defaults', () => {
            collector.setMetadata({ customField: 'value1' });
            collector.setMetadata({ anotherField: 'value2' });

            const metadata = collector.getMetadata();
            expect(metadata.framework).toBe('Iudex');
            expect(metadata.customField).toBe('value1');
            expect(metadata.anotherField).toBe('value2');
        });
    });

    describe('Adding Results', () => {
        test('should add runner results', () => {
            const runnerResults = {
                suites: [
                    {
                        name: 'Test Suite',
                        tests: [
                            { name: 'test 1', status: 'passed', duration: 100 }
                        ],
                        passed: 1,
                        failed: 0,
                        skipped: 0
                    }
                ],
                summary: {
                    total: 1,
                    passed: 1,
                    failed: 0,
                    skipped: 0,
                    duration: 100
                }
            };

            collector.addResults(runnerResults);

            expect(collector.getResults().suites).toEqual(runnerResults.suites);
            expect(collector.getSummary().total).toBe(1);
            expect(collector.getSummary().passed).toBe(1);
        });

        test('should return collector instance for chaining', () => {
            const result = collector.addResults({ suites: [], summary: {} });
            expect(result).toBe(collector);
        });
    });

    describe('Timing', () => {
        test('should track start time', () => {
            const before = Date.now();
            collector.start();
            const after = Date.now();

            const startTime = collector.getSummary().startTime;
            expect(startTime).toBeGreaterThanOrEqual(before);
            expect(startTime).toBeLessThanOrEqual(after);
        });

        test('should track end time and calculate duration', () => {
            collector.start();

            // Wait a bit
            const delay = () => new Promise(resolve => setTimeout(resolve, 10));
            return delay().then(() => {
                collector.end();

                const summary = collector.getSummary();
                expect(summary.endTime).toBeGreaterThan(summary.startTime);
                expect(summary.duration).toBeGreaterThan(0);
            });
        });

        test('should return collector instance for chaining', () => {
            expect(collector.start()).toBe(collector);
            expect(collector.end()).toBe(collector);
        });
    });

    describe('getAllResults() - Flattened Test Results', () => {
        test('should return empty array when no tests', () => {
            const results = collector.getAllResults();
            expect(results).toEqual([]);
        });

        test('should flatten all tests from multiple suites', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite 1',
                        tests: [
                            { name: 'test 1', status: 'passed', duration: 100 },
                            { name: 'test 2', status: 'failed', duration: 50 }
                        ]
                    },
                    {
                        name: 'Suite 2',
                        tests: [
                            { name: 'test 3', status: 'passed', duration: 75 }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();

            expect(results).toHaveLength(3);
            expect(results[0].suite).toBe('Suite 1');
            expect(results[0].name).toBe('test 1');
            expect(results[1].suite).toBe('Suite 1');
            expect(results[1].name).toBe('test 2');
            expect(results[2].suite).toBe('Suite 2');
            expect(results[2].name).toBe('test 3');
        });

        test('should include all test fields including testId and endpoint', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'API Suite',
                        tests: [
                            {
                                name: 'GET user endpoint',
                                status: 'passed',
                                duration: 150,
                                testId: 'api.users.get',
                                endpoint: '/api/users/123',
                                method: 'GET',
                                responseTime: 145,
                                statusCode: 200,
                                tags: ['smoke', 'api']
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();

            expect(results).toHaveLength(1);
            const test = results[0];
            expect(test.suite).toBe('API Suite');
            expect(test.test).toBe('GET user endpoint');
            expect(test.name).toBe('GET user endpoint');
            expect(test.testId).toBe('api.users.get');
            expect(test.endpoint).toBe('/api/users/123');
            expect(test.method).toBe('GET');
            expect(test.responseTime).toBe(145);
            expect(test.statusCode).toBe(200);
            expect(test.duration).toBe(150);
            expect(test.status).toBe('passed');
            expect(test.tags).toEqual(['smoke', 'api']);
        });

        test('should handle httpMethod as fallback for method', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'test',
                                status: 'passed',
                                httpMethod: 'POST'
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();
            expect(results[0].method).toBe('POST');
        });

        test('should include error details with message, type, and stack', () => {
            const error = new Error('Test assertion failed');
            error.name = 'AssertionError';

            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'failing test',
                                status: 'failed',
                                error: error
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();
            const test = results[0];

            expect(test.error).toBe('Test assertion failed');
            expect(test.errorType).toBe('AssertionError');
            expect(test.stack).toContain('Test assertion failed');
        });

        test('should handle error as string', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'test',
                                status: 'failed',
                                error: 'Simple error message'
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();
            expect(results[0].error).toBe('Simple error message');
            expect(results[0].errorType).toBeNull();
            expect(results[0].stack).toBeNull();
        });

        test('should include description, file, and other optional fields', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'comprehensive test',
                                description: 'Tests user authentication',
                                file: '/path/to/test.js',
                                status: 'passed',
                                duration: 100,
                                assertionsPassed: 5,
                                assertionsFailed: 2,
                                requestBody: { username: 'test' },
                                responseBody: { success: true }
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();
            const test = results[0];

            expect(test.description).toBe('Tests user authentication');
            expect(test.file).toBe('/path/to/test.js');
            expect(test.assertionsPassed).toBe(5);
            expect(test.assertionsFailed).toBe(2);
            expect(test.requestBody).toEqual({ username: 'test' });
            expect(test.responseBody).toEqual({ success: true });
        });

        test('should return null for missing optional fields', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            {
                                name: 'minimal test',
                                status: 'passed'
                            }
                        ]
                    }
                ],
                summary: {}
            });

            const results = collector.getAllResults();
            const test = results[0];

            expect(test.description).toBeNull();
            expect(test.testId).toBeNull();
            expect(test.file).toBeNull();
            expect(test.endpoint).toBeNull();
            expect(test.method).toBeNull();
            expect(test.responseTime).toBeNull();
            expect(test.statusCode).toBeNull();
            expect(test.error).toBeNull();
            expect(test.errorType).toBeNull();
            expect(test.stack).toBeNull();
            expect(test.assertionsPassed).toBeNull();
            expect(test.assertionsFailed).toBeNull();
            expect(test.requestBody).toBeNull();
            expect(test.responseBody).toBeNull();
            expect(test.duration).toBe(0); // Default to 0 instead of null
            expect(test.tags).toEqual([]); // Default to empty array
        });

        test('should access via testResults getter (backwards compatibility)', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'test 1', status: 'passed' },
                            { name: 'test 2', status: 'passed' }
                        ]
                    }
                ],
                summary: {}
            });

            const resultsViaGetter = collector.testResults;
            const resultsViaMethod = collector.getAllResults();

            expect(resultsViaGetter).toEqual(resultsViaMethod);
            expect(resultsViaGetter).toHaveLength(2);
        });
    });

    describe('Filtering Tests', () => {
        beforeEach(() => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite 1',
                        tests: [
                            { name: 'test 1', status: 'passed', duration: 100 },
                            { name: 'test 2', status: 'failed', duration: 50, error: { message: 'Failed' } },
                            { name: 'test 3', status: 'skipped' }
                        ]
                    },
                    {
                        name: 'Suite 2',
                        tests: [
                            { name: 'test 4', status: 'passed', duration: 200 },
                            { name: 'test 5', status: 'failed', duration: 75, error: { message: 'Error' } }
                        ]
                    }
                ],
                summary: { total: 5, passed: 2, failed: 2, skipped: 1 }
            });
        });

        test('should get failed tests', () => {
            const failed = collector.getFailedTests();

            expect(failed).toHaveLength(2);
            expect(failed[0].suite).toBe('Suite 1');
            expect(failed[0].test).toBe('test 2');
            expect(failed[0].error.message).toBe('Failed');
            expect(failed[1].suite).toBe('Suite 2');
            expect(failed[1].test).toBe('test 5');
        });

        test('should get passed tests', () => {
            const passed = collector.getPassedTests();

            expect(passed).toHaveLength(2);
            expect(passed[0].test).toBe('test 1');
            expect(passed[1].test).toBe('test 4');
        });

        test('should get skipped tests', () => {
            const skipped = collector.getSkippedTests();

            expect(skipped).toHaveLength(1);
            expect(skipped[0].test).toBe('test 3');
        });
    });

    describe('Test Tags', () => {
        test('should filter tests by tag', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite 1',
                        tests: [
                            { name: 'test 1', status: 'passed', tags: ['smoke', 'api'] },
                            { name: 'test 2', status: 'passed', tags: ['integration'] },
                            { name: 'test 3', status: 'failed', tags: ['smoke', 'ui'] }
                        ]
                    }
                ],
                summary: {}
            });

            const smokeTests = collector.getTestsByTag('smoke');
            expect(smokeTests).toHaveLength(2);
            expect(smokeTests[0].test).toBe('test 1');
            expect(smokeTests[1].test).toBe('test 3');

            const integrationTests = collector.getTestsByTag('integration');
            expect(integrationTests).toHaveLength(1);
        });

        test('should return empty array for non-existent tag', () => {
            collector.addResults({
                suites: [{ name: 'Suite', tests: [{ name: 'test', status: 'passed', tags: [] }] }],
                summary: {}
            });

            const tests = collector.getTestsByTag('nonexistent');
            expect(tests).toEqual([]);
        });
    });

    describe('Performance Analysis', () => {
        test('should get slowest tests', () => {
            collector.addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'fast test', status: 'passed', duration: 10 },
                            { name: 'slow test', status: 'passed', duration: 500 },
                            { name: 'medium test', status: 'passed', duration: 100 },
                            { name: 'very slow test', status: 'passed', duration: 1000 }
                        ]
                    }
                ],
                summary: {}
            });

            const slowest = collector.getSlowestTests(2);

            expect(slowest).toHaveLength(2);
            expect(slowest[0].test).toBe('very slow test');
            expect(slowest[0].duration).toBe(1000);
            expect(slowest[1].test).toBe('slow test');
            expect(slowest[1].duration).toBe(500);
        });

        test('should handle default limit of 10', () => {
            const tests = Array.from({ length: 15 }, (_, i) => ({
                name: `test ${i}`,
                status: 'passed',
                duration: i * 10
            }));

            collector.addResults({
                suites: [{ name: 'Suite', tests }],
                summary: {}
            });

            const slowest = collector.getSlowestTests();
            expect(slowest).toHaveLength(10);
        });
    });

    describe('Statistics', () => {
        test('should check if all tests passed', () => {
            collector.addResults({
                suites: [],
                summary: { total: 5, passed: 5, failed: 0, skipped: 0 }
            });

            expect(collector.hasAllPassed()).toBe(true);
        });

        test('should return false if no tests ran', () => {
            collector.addResults({
                suites: [],
                summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
            });

            expect(collector.hasAllPassed()).toBe(false);
        });

        test('should return false if any test failed', () => {
            collector.addResults({
                suites: [],
                summary: { total: 5, passed: 4, failed: 1, skipped: 0 }
            });

            expect(collector.hasAllPassed()).toBe(false);
        });

        test('should check if there are failures', () => {
            collector.addResults({
                suites: [],
                summary: { total: 5, passed: 4, failed: 1, skipped: 0 }
            });

            expect(collector.hasFailures()).toBe(true);
        });

        test('should calculate success rate', () => {
            collector.addResults({
                suites: [],
                summary: { total: 10, passed: 8, failed: 2, skipped: 0 }
            });

            expect(collector.getSuccessRate()).toBe(80);
        });

        test('should return 0 success rate if no tests', () => {
            expect(collector.getSuccessRate()).toBe(0);
        });
    });

    describe('Governance and Security', () => {
        test('should add governance violations', () => {
            const violation = {
                rule: 'rest-standards',
                severity: 'error',
                message: 'Invalid status code'
            };

            collector.addGovernanceViolation(violation);

            const results = collector.getResults();
            expect(results.governance.violations).toHaveLength(1);
            expect(results.governance.violations[0]).toEqual(violation);
        });

        test('should add governance warnings', () => {
            const warning = {
                rule: 'versioning',
                severity: 'warning',
                message: 'Missing API version'
            };

            collector.addGovernanceViolation(warning);

            const results = collector.getResults();
            expect(results.governance.warnings).toHaveLength(1);
            expect(results.governance.warnings[0]).toEqual(warning);
        });

        test('should add security findings', () => {
            const finding = {
                type: 'sensitive-data',
                severity: 'high',
                message: 'Password in response'
            };

            collector.addSecurityFinding(finding);

            const results = collector.getResults();
            expect(results.security.findings).toHaveLength(1);
            expect(results.security.findings[0]).toEqual(finding);
        });

        test('should return collector for chaining', () => {
            expect(collector.addGovernanceViolation({})).toBe(collector);
            expect(collector.addSecurityFinding({})).toBe(collector);
        });
    });

    describe('Export Formats', () => {
        beforeEach(() => {
            collector.addResults({
                suites: [
                    {
                        name: 'API Tests',
                        tests: [
                            { name: 'should pass', status: 'passed', duration: 100 },
                            {
                                name: 'should fail',
                                status: 'failed',
                                duration: 50,
                                error: {
                                    message: 'Test failed',
                                    stack: 'Error: Test failed\n  at test.js:10'
                                }
                            }
                        ],
                        passed: 1,
                        failed: 1,
                        skipped: 0,
                        duration: 150
                    }
                ],
                summary: { total: 2, passed: 1, failed: 1, skipped: 0 }
            });
        });

        test('should export to JSON', () => {
            const json = collector.toJSON();
            const parsed = JSON.parse(json);

            expect(parsed.suites).toHaveLength(1);
            expect(parsed.summary.total).toBe(2);
            expect(parsed.metadata.framework).toBe('Iudex');
        });

        test('should export to JUnit XML', () => {
            const xml = collector.toJUnit();

            expect(xml).toContain('<?xml version="1.0"');
            expect(xml).toContain('<testsuites>');
            expect(xml).toContain('<testsuite name="API Tests"');
            expect(xml).toContain('tests="2"');
            expect(xml).toContain('failures="1"');
            expect(xml).toContain('<testcase name="should pass"');
            expect(xml).toContain('<testcase name="should fail"');
            expect(xml).toContain('<failure message="Test failed"');
        });

        test('should escape XML special characters', () => {
            collector.reset().addResults({
                suites: [
                    {
                        name: 'Suite with <special> & "characters"',
                        tests: [
                            {
                                name: 'test with <tags>',
                                status: 'failed',
                                duration: 50,
                                error: {
                                    message: 'Error with & and < characters',
                                    stack: 'Stack with "quotes"'
                                }
                            }
                        ],
                        passed: 0,
                        failed: 1,
                        skipped: 0,
                        duration: 50
                    }
                ],
                summary: { total: 1, passed: 0, failed: 1, skipped: 0 }
            });

            const xml = collector.toJUnit();

            expect(xml).toContain('&lt;special&gt;');
            expect(xml).toContain('&amp;');
            expect(xml).toContain('&quot;');
            expect(xml).not.toContain('<special>');
        });

        test('should handle skipped tests in JUnit', () => {
            collector.reset().addResults({
                suites: [
                    {
                        name: 'Suite',
                        tests: [
                            { name: 'skipped test', status: 'skipped', duration: 0 }
                        ],
                        passed: 0,
                        failed: 0,
                        skipped: 1,
                        duration: 0
                    }
                ],
                summary: { total: 1, passed: 0, failed: 0, skipped: 1 }
            });

            const xml = collector.toJUnit();
            expect(xml).toContain('<skipped/>');
        });
    });

    describe('Reset', () => {
        test('should reset all data', () => {
            collector.addResults({
                suites: [{ name: 'Suite', tests: [] }],
                summary: { total: 5, passed: 5, failed: 0, skipped: 0 }
            });
            collector.addGovernanceViolation({ rule: 'test', severity: 'error' });
            collector.addSecurityFinding({ type: 'test' });

            collector.reset();

            const results = collector.getResults();
            expect(results.suites).toEqual([]);
            expect(results.summary.total).toBe(0);
            expect(results.governance.violations).toEqual([]);
            expect(results.security.findings).toEqual([]);
        });

        test('should return collector instance for chaining', () => {
            expect(collector.reset()).toBe(collector);
        });
    });
});
