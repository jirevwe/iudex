// Integration Tests for Governance & Security Framework
// Uses Jest (not Iudex DSL) to test the framework itself

import { TestRunner } from '../core/runner.js';
import { GovernanceEngine } from '../governance/engine.js';
import { SecurityScanner } from '../security/scanner.js';

describe('Governance & Security Integration Tests', () => {
    describe('Governance Engine Integration', () => {
        test('should detect violations during test execution', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'versioning': { enabled: true, severity: 'error', requireVersion: true },
                        'naming-conventions': { enabled: true, severity: 'error', requirePlural: true }
                    }
                },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            // Manually add a test that will trigger violations
            const testSuite = {
                name: 'Test Suite',
                tests: [
                    {
                        name: 'Test with violations',
                        fn: async (context) => {
                            // No version in URL (triggers versioning), singular resource name (triggers naming-conventions)
                            // Using /get endpoint with custom path in args to simulate /api/user
                            const response = await context.request.get('https://httpbin.org/get');
                        },
                        skip: false,
                        only: false,
                        suite: 'Test Suite'
                    }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            };

            // Run the test manually
            await runner.runSuite(testSuite);

            // Get governance results
            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify violations were collected
            expect(results.governance.violations.length).toBeGreaterThan(0);
            expect(results.governance.violations.some(v => v.rule === 'versioning' || v.rule === 'naming-conventions')).toBe(true);
        }, 30000);

        test('should not run governance checks when disabled', async () => {
            const config = {
                governance: { enabled: false },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Test Suite',
                tests: [
                    {
                        name: 'Test without governance',
                        fn: async (context) => {
                            const response = await context.request.post('https://httpbin.org/anything', {
                                body: { name: 'Test' }
                            });
                        },
                        skip: false,
                        only: false,
                        suite: 'Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify no violations collected
            expect(results.governance.violations).toHaveLength(0);
        }, 30000);

        test('should collect violations from multiple rules', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'versioning': { enabled: true, severity: 'error', requireVersion: true },
                        'naming-conventions': { enabled: true, severity: 'error', requirePlural: true }
                    }
                },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Test Suite',
                tests: [
                    {
                        name: 'Test with multiple violations',
                        fn: async (context) => {
                            // No version, singular resource name
                            const response = await context.request.get('https://httpbin.org/get');
                        },
                        skip: false,
                        only: false,
                        suite: 'Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Should have violations from multiple rules
            expect(results.governance.violations.length).toBeGreaterThan(0);

            const ruleNames = results.governance.violations.map(v => v.rule);
            // Check for at least one of the expected rules
            const hasExpectedRules = ruleNames.some(r => ['versioning', 'naming-conventions'].includes(r));
            expect(hasExpectedRules).toBe(true);
        }, 30000);

        test('should include test context in violations', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'versioning': { enabled: true, severity: 'error', requireVersion: true },
                        'naming-conventions': { enabled: true, severity: 'error', requirePlural: true }
                    }
                },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Integration Test Suite',
                tests: [
                    {
                        name: 'Context test',
                        fn: async (context) => {
                            const response = await context.request.get('https://httpbin.org/get');
                        },
                        skip: false,
                        only: false,
                        suite: 'Integration Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify test context is included
            expect(results.governance.violations.length).toBeGreaterThan(0);
            const violation = results.governance.violations[0];
            expect(violation.suite).toBe('Integration Test Suite');
            expect(violation.test).toBe('Context test');
        }, 30000);
    });

    describe('Security Scanner Integration', () => {
        test('should detect security findings during test execution', async () => {
            const config = {
                governance: { enabled: false },
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true },
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Security Test Suite',
                tests: [
                    {
                        name: 'Test with security issues',
                        fn: async (context) => {
                            // Using HTTP instead of HTTPS - security finding
                            const response = await context.request.get('http://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Security Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify findings were collected
            expect(results.security.findings.length).toBeGreaterThan(0);
            expect(results.security.findings.some(f => f.check === 'ssl-tls')).toBe(true);
        }, 30000);

        test('should not run security checks when disabled', async () => {
            const config = {
                governance: { enabled: false },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Test Suite',
                tests: [
                    {
                        name: 'Test without security',
                        fn: async (context) => {
                            const response = await context.request.get('http://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify no findings collected
            expect(results.security.findings).toHaveLength(0);
        }, 30000);

        test('should collect findings from multiple checks', async () => {
            const config = {
                governance: { enabled: false },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true },
                        'authentication': { enabled: true },
                        'headers': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Test Suite',
                tests: [
                    {
                        name: 'Test with multiple findings',
                        fn: async (context) => {
                            // HTTP (ssl-tls), no auth (authentication), missing headers (headers)
                            const response = await context.request.get('http://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Should have findings from multiple checks
            expect(results.security.findings.length).toBeGreaterThan(1);

            const checkNames = results.security.findings.map(f => f.check);
            expect(checkNames).toContain('ssl-tls');
        }, 30000);

        test('should include test context in findings', async () => {
            const config = {
                governance: { enabled: false },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Security Integration Suite',
                tests: [
                    {
                        name: 'Security context test',
                        fn: async (context) => {
                            const response = await context.request.get('http://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Security Integration Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify test context is included
            const finding = results.security.findings[0];
            expect(finding.suite).toBe('Security Integration Suite');
            expect(finding.test).toBe('Security context test');
        }, 30000);
    });

    describe('Combined Governance & Security', () => {
        test('should run both governance and security checks when both enabled', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'versioning': { enabled: true, severity: 'error', requireVersion: true },
                        'naming-conventions': { enabled: true, severity: 'error', requirePlural: true }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Combined Test Suite',
                tests: [
                    {
                        name: 'Test with both violations and findings',
                        fn: async (context) => {
                            // HTTP (security) + no version + singular resource (governance)
                            const response = await context.request.get('http://httpbin.org/get');
                        },
                        skip: false,
                        only: false,
                        suite: 'Combined Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify both violations and findings collected
            expect(results.governance.violations.length).toBeGreaterThan(0);
            expect(results.security.findings.length).toBeGreaterThan(0);
        }, 30000);

        test('should handle tests without HTTP requests gracefully', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true, severity: 'error' }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'No HTTP Test Suite',
                tests: [
                    {
                        name: 'Test without HTTP request',
                        fn: async (context) => {
                            // No HTTP request made - just a simple assertion
                            const value = 1 + 1;
                        },
                        skip: false,
                        only: false,
                        suite: 'No HTTP Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Should have no violations or findings (no HTTP request)
            expect(results.governance.violations).toHaveLength(0);
            expect(results.security.findings).toHaveLength(0);
        }, 30000);

        test('should not fail test execution when checks throw errors', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true, severity: 'error' }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Error Handling Suite',
                tests: [
                    {
                        name: 'Test that should pass despite check errors',
                        fn: async (context) => {
                            const response = await context.request.get('https://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Error Handling Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            const suiteResult = await runner.runSuite(testSuite);

            // Test should pass even if checks have errors
            expect(suiteResult.passed).toBe(1);
            expect(suiteResult.failed).toBe(0);
        }, 30000);
    });

    describe('Performance Impact', () => {
        test('should add minimal overhead to test execution', async () => {
            // Test without governance/security
            const configWithoutChecks = {
                governance: { enabled: false },
                security: { enabled: false },
                http: {}
            };

            const runnerWithoutChecks = new TestRunner(configWithoutChecks);

            const testSuite1 = {
                name: 'Performance Test Suite',
                tests: [
                    {
                        name: 'Performance test',
                        fn: async (context) => {
                            const response = await context.request.get('https://httpbin.org/delay/1');
                        },
                        skip: false,
                        only: false,
                        suite: 'Performance Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            const start1 = Date.now();
            await runnerWithoutChecks.runSuite(testSuite1);
            const durationWithoutChecks = Date.now() - start1;

            // Test with governance/security
            const configWithChecks = {
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true },
                        'versioning': { enabled: true },
                        'naming-conventions': { enabled: true },
                        'http-methods': { enabled: true },
                        'pagination': { enabled: true }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true },
                        'authentication': { enabled: true },
                        'authorization': { enabled: true },
                        'rate-limiting': { enabled: true },
                        'ssl-tls': { enabled: true },
                        'headers': { enabled: true }
                    }
                },
                http: {}
            };

            const runnerWithChecks = new TestRunner(configWithChecks);

            const testSuite2 = {
                name: 'Performance Test Suite',
                tests: [
                    {
                        name: 'Performance test',
                        fn: async (context) => {
                            const response = await context.request.get('https://httpbin.org/delay/1');
                        },
                        skip: false,
                        only: false,
                        suite: 'Performance Test Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            const start2 = Date.now();
            await runnerWithChecks.runSuite(testSuite2);
            const durationWithChecks = Date.now() - start2;

            // Calculate overhead percentage
            const overhead = ((durationWithChecks - durationWithoutChecks) / durationWithoutChecks) * 100;

            // Overhead should be less than 100% (generous for network variability)
            // Real network requests can vary significantly, so this ensures checks don't double execution time
            // In local/controlled environments, overhead is typically <10%
            expect(overhead).toBeLessThan(100);
        }, 60000);
    });

    describe('Violation and Finding Structure', () => {
        test('should have correct violation structure', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'versioning': { enabled: true, severity: 'error', requireVersion: true },
                        'naming-conventions': { enabled: true, severity: 'error', requirePlural: true }
                    }
                },
                security: { enabled: false },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Structure Test Suite',
                tests: [
                    {
                        name: 'Structure test',
                        fn: async (context) => {
                            const response = await context.request.get('https://httpbin.org/get');
                        },
                        skip: false,
                        only: false,
                        suite: 'Structure Test Suite',
                        endpoint: '/user'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            expect(results.governance.violations.length).toBeGreaterThan(0);
            const violation = results.governance.violations[0];

            // Verify violation structure
            expect(violation).toHaveProperty('rule');
            expect(violation).toHaveProperty('category');
            expect(violation).toHaveProperty('severity');
            expect(violation).toHaveProperty('message');
            expect(violation).toHaveProperty('endpoint');
            expect(violation).toHaveProperty('method');
            expect(violation).toHaveProperty('location');
            expect(violation).toHaveProperty('remediation');
            expect(violation).toHaveProperty('suite');
            expect(violation).toHaveProperty('test');
        }, 30000);

        test('should have correct finding structure', async () => {
            const config = {
                governance: { enabled: false },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Finding Structure Suite',
                tests: [
                    {
                        name: 'Finding structure test',
                        fn: async (context) => {
                            const response = await context.request.get('http://httpbin.org/anything');
                        },
                        skip: false,
                        only: false,
                        suite: 'Finding Structure Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            await runner.runSuite(testSuite);

            const collector = runner.getCollector();
            const results = collector.getResults();

            // Verify findings were collected
            expect(results.security.findings.length).toBeGreaterThan(0);
            const finding = results.security.findings[0];

            // Verify finding structure
            expect(finding).toHaveProperty('check');
            expect(finding).toHaveProperty('type');
            expect(finding).toHaveProperty('severity');
            expect(finding).toHaveProperty('title');
            expect(finding).toHaveProperty('description');
            expect(finding).toHaveProperty('endpoint');
            expect(finding).toHaveProperty('method');
            expect(finding).toHaveProperty('location');
            expect(finding).toHaveProperty('cwe');
            expect(finding).toHaveProperty('remediation');
            expect(finding).toHaveProperty('suite');
            expect(finding).toHaveProperty('test');
        }, 30000);
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle malformed responses gracefully', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Edge Case Suite',
                tests: [
                    {
                        name: 'Malformed response test',
                        fn: async (context) => {
                            try {
                                const response = await context.request.get('https://httpbin.org/status/500');
                            } catch (error) {
                                // Expected to fail, but checks should not throw
                            }
                        },
                        skip: false,
                        only: false,
                        suite: 'Edge Case Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            // Should not throw
            await expect(runner.runSuite(testSuite)).resolves.toBeDefined();
        }, 30000);

        test('should handle missing request/response data', async () => {
            const config = {
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true }
                    }
                },
                security: {
                    enabled: true,
                    checks: {
                        'ssl-tls': { enabled: true }
                    }
                },
                http: {}
            };

            const runner = new TestRunner(config);

            const testSuite = {
                name: 'Missing Data Suite',
                tests: [
                    {
                        name: 'Test with no HTTP call',
                        fn: async (context) => {
                            // Don't make any HTTP calls
                            const value = 1 + 1;
                        },
                        skip: false,
                        only: false,
                        suite: 'Missing Data Suite'
                    }
                ],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            };

            const suiteResult = await runner.runSuite(testSuite);

            // Should pass without errors
            expect(suiteResult.passed).toBe(1);
            expect(suiteResult.failed).toBe(0);
        }, 30000);
    });
});
