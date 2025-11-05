// Iudex - Test Runner
import { getTestSuites } from './dsl.js';
import { HttpClient } from './http-client.js';

export class TestRunner {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 30000,
            retries: config.retries || 0,
            bail: config.bail || false,
            http: config.http || {},
            parallel: config.parallel || false,
            ...config
        };
        this.results = {
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            }
        };
    }

    /**
     * Run all test suites
     */
    async run() {
        const startTime = Date.now();
        const suites = getTestSuites();

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
        return this.results;
    }

    /**
     * Run a single test suite
     */
    async runSuite(suite, hasOnly = false) {
        const suiteResult = {
            name: suite.name,
            tests: [],
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            error: null
        };

        const startTime = Date.now();

        try {
            // Create a test context with fixtures
            const context = this.createContext();

            // Run beforeAll hooks
            await this.runHooks(suite.hooks.beforeAll, context, 'beforeAll');

            // Filter tests based on only/skip
            let testsToRun = suite.tests;
            if (hasOnly) {
                testsToRun = testsToRun.filter(test => test.only);
            }

            // Run each test
            for (const test of testsToRun) {
                const testResult = await this.runTest(test, suite.hooks, context);
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
                }
            }

            // Run afterAll hooks
            await this.runHooks(suite.hooks.afterAll, context, 'afterAll');

        } catch (error) {
            suiteResult.error = {
                message: error.message,
                stack: error.stack
            };
        }

        suiteResult.duration = Date.now() - startTime;
        return suiteResult;
    }

    /**
     * Run a single test with retries and timeout
     */
    async runTest(test, suiteHooks, context) {
        const testResult = {
            name: test.name,
            status: 'passed',
            duration: 0,
            error: null,
            retries: 0,
            tags: test.tags,
            testId: test.testId || null,
            endpoint: test.endpoint || null,
            method: test.method || null
        };

        // Skip a test if marked
        if (test.skip) {
            testResult.status = 'skipped';
            return testResult;
        }

        const startTime = Date.now();
        const maxRetries = test.retry !== undefined ? test.retry : this.config.retries;
        const timeout = test.timeout || this.config.timeout;

        let lastError = null;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                // Run beforeEach hooks
                await this.runHooks(suiteHooks.beforeEach, context, 'beforeEach');

                // Run the test with timeout
                await this.runWithTimeout(test.fn, context, timeout);

                // Run afterEach hooks
                await this.runHooks(suiteHooks.afterEach, context, 'afterEach');

                // Test passed
                testResult.status = 'passed';
                testResult.retries = attempt;
                break;

            } catch (error) {
                lastError = error;
                attempt++;

                // Try to run afterEach even if test failed
                try {
                    await this.runHooks(suiteHooks.afterEach, context, 'afterEach');
                } catch (hookError) {
                    // Append hook error to test error
                    lastError.message += `\nAfterEach hook error: ${hookError.message}`;
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
    async runWithTimeout(fn, context, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const error = new Error(`Test timeout after ${timeout}ms`);
                error.name = 'TimeoutError';
                reject(error);
            }, timeout);

            Promise.resolve(fn(context))
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
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
    async runHooks(hooks, context, hookName) {
        if (!hooks || !Array.isArray(hooks)) return;

        for (const hook of hooks) {
            try {
                await hook(context);
            } catch (error) {
                error.message = `${hookName} hook failed: ${error.message}`;
                throw error;
            }
        }
    }

    /**
     * Create test context with fixtures
     */
    createContext() {
        return {
            request: new HttpClient(this.config.http)
        };
    }

    /**
     * Get test results
     */
    getResults() {
        return this.results;
    }

    /**
     * Reset runner state
     */
    reset() {
        this.results = {
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            }
        };
    }
}

/**
 * Convenience function to run tests
 */
export async function runTests(config = {}) {
    const runner = new TestRunner(config);
    return await runner.run();
}

export default { TestRunner, runTests };
