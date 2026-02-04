// Unit tests for Test Runner
import { jest } from '@jest/globals';
import type { HookFn } from '../types/index.js';

/** Test function type */
type TestFn = jest.Mock<() => void | Promise<void>>;

/** Test suite hooks structure */
interface SuiteHooks {
  beforeAll: HookFn[];
  afterAll: HookFn[];
  beforeEach: HookFn[];
  afterEach: HookFn[];
}

/** Test definition for mocking */
interface MockTestDefinition {
  name: string;
  fn: TestFn | null;
  timeout: number | undefined;
  retry: number;
  skip: boolean;
  only: boolean;
  tags: string[];
}

/** Mock test suite structure */
interface MockTestSuite {
  name: string;
  tests: MockTestDefinition[];
  hooks: SuiteHooks;
}

// Mock the DSL module
const mockTestSuites: MockTestSuite[] = [];
jest.unstable_mockModule('./dsl.js', () => ({
    getTestSuites: jest.fn(() => mockTestSuites)
}));

// Mock the HTTP client
jest.unstable_mockModule('./http-client.js', () => ({
    HttpClient: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }))
}));

const { TestRunner, runTests } = await import('./runner.js');
const { getTestSuites } = await import('./dsl.js');

describe('TestRunner', () => {
    beforeEach(() => {
        mockTestSuites.length = 0;
        jest.clearAllMocks();
    });

    describe('Basic Test Execution', () => {
        test('should run a passing test', async () => {
            const testFn = jest.fn().mockResolvedValue();
            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'passing test',
                    fn: testFn,
                    timeout: 30000,
                    retry: 0,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(testFn).toHaveBeenCalledTimes(1);
            expect(results.summary.total).toBe(1);
            expect(results.summary.passed).toBe(1);
            expect(results.summary.failed).toBe(0);
            expect(results.summary.skipped).toBe(0);
            expect(results.suites[0].tests[0].status).toBe('passed');
        });

        test('should run a failing test', async () => {
            const error = new Error('Test failed');
            const testFn = jest.fn().mockRejectedValue(error);
            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'failing test',
                    fn: testFn,
                    timeout: 30000,
                    retry: 0,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(results.summary.total).toBe(1);
            expect(results.summary.passed).toBe(0);
            expect(results.summary.failed).toBe(1);
            expect(results.suites[0].tests[0].status).toBe('failed');
            expect(results.suites[0].tests[0].error.message).toBe('Test failed');
        });

        test('should run multiple tests', async () => {
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockResolvedValue();
            const test3 = jest.fn().mockRejectedValue(new Error('fail'));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [
                    { name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 3', fn: test3, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(results.summary.total).toBe(3);
            expect(results.summary.passed).toBe(2);
            expect(results.summary.failed).toBe(1);
        });
    });

    describe('Test Hooks', () => {
        test('should run beforeAll and afterAll hooks', async () => {
            const beforeAll = jest.fn().mockResolvedValue();
            const afterAll = jest.fn().mockResolvedValue();
            const testFn = jest.fn().mockResolvedValue();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: testFn, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: {
                    beforeAll: [beforeAll],
                    afterAll: [afterAll],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(beforeAll).toHaveBeenCalledTimes(1);
            expect(afterAll).toHaveBeenCalledTimes(1);

            // Verify order: beforeAll -> test -> afterAll
            const beforeAllOrder = beforeAll.mock.invocationCallOrder[0];
            const testOrder = testFn.mock.invocationCallOrder[0];
            const afterAllOrder = afterAll.mock.invocationCallOrder[0];

            expect(beforeAllOrder).toBeLessThan(testOrder);
            expect(testOrder).toBeLessThan(afterAllOrder);
        });

        test('should run beforeEach and afterEach hooks for each test', async () => {
            const beforeEach = jest.fn().mockResolvedValue();
            const afterEach = jest.fn().mockResolvedValue();
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockResolvedValue();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [
                    { name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [beforeEach],
                    afterEach: [afterEach]
                }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(beforeEach).toHaveBeenCalledTimes(2);
            expect(afterEach).toHaveBeenCalledTimes(2);
        });

        test('should run afterEach even if test fails', async () => {
            const afterEach = jest.fn().mockResolvedValue();
            const testFn = jest.fn().mockRejectedValue(new Error('fail'));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: testFn, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: [afterEach]
                }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(afterEach).toHaveBeenCalledTimes(1);
        });

        test('should pass context to hooks', async () => {
            let capturedContext = null;
            const beforeAll = jest.fn((ctx) => {
                capturedContext = ctx;
            });

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: jest.fn(), timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: {
                    beforeAll: [beforeAll],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(capturedContext).toBeDefined();
            expect(capturedContext.request).toBeDefined();
        });
    });

    describe('Test Timeout', () => {
        test('should timeout long-running tests', async () => {
            const testFn = jest.fn(() => new Promise(resolve => {
                setTimeout(resolve, 500);
            }));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'slow test',
                    fn: testFn,
                    timeout: 100, // 100ms timeout
                    retry: 0,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(results.summary.failed).toBe(1);
            expect(results.suites[0].tests[0].status).toBe('failed');
            expect(results.suites[0].tests[0].error.timeout).toBe(true);
            expect(results.suites[0].tests[0].error.message).toContain('timeout');
        });

        test('should use default timeout if not specified', async () => {
            const testFn = jest.fn(() => new Promise(resolve => {
                setTimeout(resolve, 200);
            }));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'test',
                    fn: testFn,
                    timeout: undefined,
                    retry: 0,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner({ timeout: 100 });
            const results = await runner.run();

            expect(results.summary.failed).toBe(1);
            expect(results.suites[0].tests[0].error.timeout).toBe(true);
        });
    });

    describe('Test Retry', () => {
        test('should retry failing tests', async () => {
            let attempts = 0;
            const testFn = jest.fn(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.reject(new Error('fail'));
                }
                return Promise.resolve();
            });

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'flaky test',
                    fn: testFn,
                    timeout: 30000,
                    retry: 2,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(testFn).toHaveBeenCalledTimes(3);
            expect(results.summary.passed).toBe(1);
            expect(results.suites[0].tests[0].status).toBe('passed');
            expect(results.suites[0].tests[0].retries).toBe(2);
        });

        test('should fail after max retries', async () => {
            const testFn = jest.fn().mockRejectedValue(new Error('always fails'));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'always fails',
                    fn: testFn,
                    timeout: 30000,
                    retry: 2,
                    skip: false,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(testFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
            expect(results.summary.failed).toBe(1);
            expect(results.suites[0].tests[0].retries).toBe(2);
        });
    });

    describe('Skip and Only', () => {
        test('should skip tests marked with skip', async () => {
            const testFn = jest.fn();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{
                    name: 'skipped test',
                    fn: testFn,
                    timeout: 30000,
                    retry: 0,
                    skip: true,
                    only: false,
                    tags: []
                }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(testFn).not.toHaveBeenCalled();
            expect(results.summary.skipped).toBe(1);
            expect(results.suites[0].tests[0].status).toBe('skipped');
        });

        test('should only run tests marked with only', async () => {
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockResolvedValue();
            const test3 = jest.fn().mockResolvedValue();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [
                    { name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: true, tags: [] },
                    { name: 'test 3', fn: test3, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(test1).not.toHaveBeenCalled();
            expect(test2).toHaveBeenCalledTimes(1);
            expect(test3).not.toHaveBeenCalled();
            expect(results.summary.total).toBe(1);
        });
    });

    describe('Bail on Failure', () => {
        test('should stop after first failure when bail is enabled', async () => {
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockRejectedValue(new Error('fail'));
            const test3 = jest.fn().mockResolvedValue();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [
                    { name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 3', fn: test3, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner({ bail: true });
            const results = await runner.run();

            expect(test1).toHaveBeenCalled();
            expect(test2).toHaveBeenCalled();
            expect(test3).not.toHaveBeenCalled();
            expect(results.summary.total).toBe(2);
        });

        test('should run all tests when bail is disabled', async () => {
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockRejectedValue(new Error('fail'));
            const test3 = jest.fn().mockResolvedValue();

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [
                    { name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: false, tags: [] },
                    { name: 'test 3', fn: test3, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }
                ],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner({ bail: false });
            const results = await runner.run();

            expect(test1).toHaveBeenCalled();
            expect(test2).toHaveBeenCalled();
            expect(test3).toHaveBeenCalled();
            expect(results.summary.total).toBe(3);
        });
    });

    describe('Context and Fixtures', () => {
        test('should pass request fixture to tests', async () => {
            let capturedContext = null;
            const testFn = jest.fn((ctx) => {
                capturedContext = ctx;
                return Promise.resolve();
            });

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: testFn, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(capturedContext).toBeDefined();
            expect(capturedContext.request).toBeDefined();
            expect(capturedContext.request.get).toBeDefined();
            expect(capturedContext.request.post).toBeDefined();
        });

        test('should pass http config to HttpClient', async () => {
            const httpConfig = {
                baseURL: 'http://api.example.com',
                headers: { 'Authorization': 'Bearer token' }
            };

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: jest.fn(), timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: {
                    beforeAll: [],
                    afterAll: [],
                    beforeEach: [],
                    afterEach: []
                }
            });

            const runner = new TestRunner({ http: httpConfig });
            await runner.run();

            // Verify HttpClient was instantiated with config
            const { HttpClient } = await import('./http-client.js');
            expect(HttpClient).toHaveBeenCalledWith(httpConfig);
        });
    });

    describe('Result Aggregation', () => {
        test('should aggregate results across multiple suites', async () => {
            const test1 = jest.fn().mockResolvedValue();
            const test2 = jest.fn().mockRejectedValue(new Error('fail'));

            mockTestSuites.push(
                {
                    name: 'Suite 1',
                    tests: [{ name: 'test 1', fn: test1, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                    hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
                },
                {
                    name: 'Suite 2',
                    tests: [{ name: 'test 2', fn: test2, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                    hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
                }
            );

            const runner = new TestRunner();
            const results = await runner.run();

            expect(results.suites).toHaveLength(2);
            expect(results.summary.total).toBe(2);
            expect(results.summary.passed).toBe(1);
            expect(results.summary.failed).toBe(1);
        });

        test('should track duration for tests and suites', async () => {
            const testFn = jest.fn(() => new Promise(resolve => {
                setTimeout(resolve, 50);
            }));

            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: testFn, timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            });

            const runner = new TestRunner();
            const results = await runner.run();

            expect(results.suites[0].duration).toBeGreaterThan(0);
            expect(results.suites[0].tests[0].duration).toBeGreaterThan(0);
            expect(results.summary.duration).toBeGreaterThan(0);
        });
    });

    describe('Runner Utilities', () => {
        test('should reset runner state', async () => {
            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: jest.fn(), timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            });

            const runner = new TestRunner();
            await runner.run();

            expect(runner.getResults().summary.total).toBe(1);

            runner.reset();

            expect(runner.getResults().summary.total).toBe(0);
            expect(runner.getResults().suites).toHaveLength(0);
        });

        test('runTests convenience function should work', async () => {
            mockTestSuites.push({
                name: 'Test Suite',
                tests: [{ name: 'test', fn: jest.fn(), timeout: 30000, retry: 0, skip: false, only: false, tags: [] }],
                hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] }
            });

            const results = await runTests();

            expect(results.summary.total).toBe(1);
        });
    });
});
