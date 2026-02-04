/**
 * Iudex - Test Definition DSL
 * Provides describe, test, expect, and lifecycle hooks
 */

import type {
  TestOptions,
  SuiteOptions,
  TestFn,
  HookFn,
  TestDefinition,
  SuiteDefinition
} from '../types/index.js';

/** Internal test suites storage */
const testSuites: SuiteDefinition[] = [];

/** Current suite being built */
interface CurrentSuiteState {
  tests: InternalTestDefinition[];
  hooks: {
    beforeAll: HookFn[];
    afterAll: HookFn[];
    beforeEach: HookFn[];
    afterEach: HookFn[];
  };
  prefix: string | null;
}

/** Internal test definition with additional fields */
interface InternalTestDefinition extends TestDefinition {
  testId: string;
  endpoint: string | null;
  method: string | null;
  // Top-level properties for backwards compatibility
  timeout: number;
  retry: number;
  skip: boolean;
  only: boolean;
  stub: boolean;
  tags: string[];
}

const currentSuite: CurrentSuiteState = {
  tests: [],
  hooks: {
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: []
  },
  prefix: null
};

/**
 * Slugify a string (convert to lowercase, replace spaces/special chars with hyphens)
 * @param text - Text to slugify
 * @param maxLength - Maximum length (default 512)
 * @returns Slugified text
 */
function slugify(text: string, maxLength = 512): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with "-"
    .replace(/[^\w\-.]+/g, '')      // Remove all non-word chars except "-" and "."
    .replace(/--+/g, '-')           // Replace multiple hyphens ("-") with a single one
    .replace(/^-+/, '')             // Trim - from the start of the string
    .replace(/-+$/, '')             // Trim - from the end of the string
    .substring(0, maxLength);       // Enforce max length
}

/** Extended suite options with prefix */
interface ExtendedSuiteOptions extends SuiteOptions {
  prefix?: string;
}

/** Extended test options with additional fields */
interface ExtendedTestOptions extends TestOptions {
  endpoint?: string;
  method?: string;
}

/**
 * Define a test suite
 * @param name - Suite name
 * @param optionsOrFn - Options object or function
 * @param fn - Suite function (if options provided)
 */
export function describe(
  name: string,
  optionsOrFn: ExtendedSuiteOptions | (() => void),
  fn?: () => void
): void {
  let options: ExtendedSuiteOptions = {};
  let suiteFn: (() => void) | undefined = fn;

  // Handle both describe(name, fn) and describe(name, options, fn)
  if (typeof optionsOrFn === 'function') {
    suiteFn = optionsOrFn;
  } else {
    options = optionsOrFn || {};
    suiteFn = fn;
  }

  if (!suiteFn) {
    throw new Error('Suite function is required');
  }

  const suite: CurrentSuiteState = {
    tests: [],
    hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] },
    prefix: options.prefix || null
  };

  const previousSuite = { ...currentSuite };
  Object.assign(currentSuite, suite);
  suiteFn();

  // Extract hooks for both new and backwards-compat API
  const hooks = {
    beforeAll: [...currentSuite.hooks.beforeAll],
    afterAll: [...currentSuite.hooks.afterAll],
    beforeEach: [...currentSuite.hooks.beforeEach],
    afterEach: [...currentSuite.hooks.afterEach]
  };

  testSuites.push({
    name,
    tests: [...currentSuite.tests] as TestDefinition[],
    // Direct properties (TypeScript style)
    beforeAll: hooks.beforeAll,
    afterAll: hooks.afterAll,
    beforeEach: hooks.beforeEach,
    afterEach: hooks.afterEach,
    // Nested hooks property (backwards compat)
    hooks,
    options
  } as SuiteDefinition & { hooks: typeof hooks });
  Object.assign(currentSuite, previousSuite);
}

/**
 * Define a test
 * @param name - Test name (max 512 chars)
 * @param fn - Test function
 * @param options - Test options (timeout, retry, skip, only, tags, id)
 */
export function test(
  name: string,
  fn: TestFn | null,
  options: ExtendedTestOptions = {}
): void {
  // Enforce test name length limit
  if (name.length > 512) {
    throw new Error(`Test name exceeds 512 characters: "${name.substring(0, 50)}..."`);
  }

  // Build test slug from suite prefix + test id (or auto-generate from name)
  let testSlug: string;
  if (options.id) {
    // Explicit ID provided
    const slugifiedId = slugify(options.id, 512);
    if (currentSuite.prefix) {
      testSlug = `${currentSuite.prefix}.${slugifiedId}`;
    } else {
      testSlug = slugifiedId;
    }
  } else {
    // Auto-generate slug from test name
    const slugifiedName = slugify(name, 512);
    if (currentSuite.prefix) {
      testSlug = `${currentSuite.prefix}.${slugifiedName}`;
    } else {
      testSlug = slugifiedName;
    }
  }

  // Enforce final slug length
  if (testSlug.length > 512) {
    testSlug = testSlug.substring(0, 512);
  }

  // Determine if this is a stub test (null fn or explicit stub option)
  const isStub = fn === null || options.stub === true;

  // Extract option values for top-level properties (backwards compat)
  const timeout = options.timeout || 30000;
  const retry = options.retry || 0;
  const skip = options.skip || false;
  const only = options.only || false;
  const tags = options.tags || [];

  currentSuite.tests.push({
    name,
    id: testSlug,
    fn: fn,  // Keep fn as null for stubs - runner checks this
    options: {
      timeout,
      retry,
      skip,
      only,
      stub: isStub,
      tags
    },
    // Top-level properties for backwards compatibility
    timeout,
    retry,
    skip,
    only,
    stub: isStub,
    tags,
    suite: '',
    testId: testSlug,
    endpoint: options.endpoint || null,
    method: options.method || null
  });
}

/** Skip a test */
test.skip = (name: string, fn: TestFn, options: ExtendedTestOptions = {}): void => {
  test(name, fn, { ...options, skip: true });
};

/** Run only this test */
test.only = (name: string, fn: TestFn, options: ExtendedTestOptions = {}): void => {
  test(name, fn, { ...options, only: true });
};

/** Define a stub test (unimplemented) */
test.stub = (name: string, options: ExtendedTestOptions = {}): void => {
  test(name, null, { ...options, stub: true });
};

/**
 * Register a beforeAll hook
 * @param fn - Hook function
 */
export function beforeAll(fn: HookFn): void {
  currentSuite.hooks.beforeAll.push(fn);
}

/**
 * Register an afterAll hook
 * @param fn - Hook function
 */
export function afterAll(fn: HookFn): void {
  currentSuite.hooks.afterAll.push(fn);
}

/**
 * Register a beforeEach hook
 * @param fn - Hook function
 */
export function beforeEach(fn: HookFn): void {
  currentSuite.hooks.beforeEach.push(fn);
}

/**
 * Register an afterEach hook
 * @param fn - Hook function
 */
export function afterEach(fn: HookFn): void {
  currentSuite.hooks.afterEach.push(fn);
}

/** Response-like object for assertions */
interface ResponseLike {
  status?: number;
  statusCode?: number;
  responseTime?: number;
  duration?: number;
  headers?: Record<string, string>;
  body?: unknown;
  data?: unknown;
}

/**
 * Expect assertion class
 */
export class Expect {
  private value: unknown;
  private isNot = false;

  constructor(value: unknown) {
    this.value = value;
  }

  /** Negate the assertion */
  get not(): Expect {
    const e = new Expect(this.value);
    e.isNot = true;
    return e;
  }

  /** Assert response has specific status code */
  toHaveStatus(expected: number): this {
    const response = this.value as ResponseLike;
    const actual = response.status || response.statusCode;
    if (this.isNot ? actual === expected : actual !== expected) {
      throw new Error(`Expected status ${this.isNot ? 'not ' : ''}${expected}, got ${actual}`);
    }
    return this;
  }

  /** Assert response time is within threshold */
  toRespondWithin(ms: number): this {
    const response = this.value as ResponseLike;
    const actual = response.responseTime || response.duration;
    if (this.isNot ? (actual ?? 0) <= ms : (actual ?? 0) > ms) {
      throw new Error(`Response time ${actual}ms exceeds ${ms}ms`);
    }
    return this;
  }

  /** Assert response has specific header */
  toHaveHeader(name: string, _value: string | null = null): this {
    const response = this.value as ResponseLike;
    const headers = response.headers || {};
    const hasHeader = Object.keys(headers).some(h => h.toLowerCase() === name.toLowerCase());
    if (this.isNot ? hasHeader : !hasHeader) {
      throw new Error(`Expected header ${name} ${this.isNot ? 'not ' : ''}to exist`);
    }
    return this;
  }

  /** Assert response has common security headers */
  toHaveSecurityHeaders(): this {
    ['x-content-type-options', 'x-frame-options', 'strict-transport-security']
      .forEach(h => this.toHaveHeader(h));
    return this;
  }

  /** Assert object has property at path with optional value */
  toHaveProperty(path: string, value?: unknown): this {
    const response = this.value as ResponseLike;
    const body = (response.body || response.data || this.value) as Record<string, unknown>;
    const parts = path.split('.');
    let current: unknown = body;

    for (const part of parts) {
      if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
        throw new Error(`Property '${path}' not found`);
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (value !== undefined && current !== value) {
      throw new Error(`Expected '${path}' to be ${String(value)}, got ${String(current)}`);
    }
    return this;
  }

  /** Assert value is an array */
  toBeArray(): this {
    if (!Array.isArray(this.value)) {
      throw new Error('Expected array');
    }
    return this;
  }

  /** Assert array/string has specific length */
  toHaveLength(expected: number): this {
    const arr = this.value as { length: number };
    if (arr.length !== expected) {
      throw new Error(`Expected length ${expected}, got ${arr.length}`);
    }
    return this;
  }

  /** Assert value equals expected */
  toBe(expected: unknown): this {
    if (this.isNot ? this.value === expected : this.value !== expected) {
      throw new Error(`Expected ${this.isNot ? 'not ' : ''}${String(expected)}, got ${String(this.value)}`);
    }
    return this;
  }

  /** Assert value is defined */
  toBeDefined(): this {
    if (this.value === undefined) {
      throw new Error('Expected value to be defined');
    }
    return this;
  }

  /** Assert value is greater than expected */
  toBeGreaterThan(expected: number): this {
    if ((this.value as number) <= expected) {
      throw new Error(`Expected ${this.value} to be greater than ${expected}`);
    }
    return this;
  }

  /** Assert value is greater than or equal to expected */
  toBeGreaterThanOrEqual(expected: number): this {
    if ((this.value as number) < expected) {
      throw new Error(`Expected ${this.value} to be greater than or equal to ${expected}`);
    }
    return this;
  }

  /** Assert value is less than or equal to expected */
  toBeLessThanOrEqual(expected: number): this {
    if ((this.value as number) > expected) {
      throw new Error(`Expected ${this.value} to be less than or equal to ${expected}`);
    }
    return this;
  }

  /** Assert value contains item */
  toContain(value: unknown): this {
    let contains = false;
    if (typeof this.value === 'string') {
      contains = this.value.includes(value as string);
    } else if (Array.isArray(this.value)) {
      contains = this.value.includes(value);
    }
    if (!contains) {
      throw new Error(`Expected ${JSON.stringify(this.value)} to contain ${JSON.stringify(value)}`);
    }
    return this;
  }

  /** Assert value matches regex */
  toMatch(regex: RegExp): this {
    if (!regex.test(this.value as string)) {
      throw new Error(`Expected ${this.value} to match ${regex}`);
    }
    return this;
  }
}

/**
 * Create an expect assertion
 * @param value - Value to assert on
 * @returns Expect instance
 */
export function expect(value: unknown): Expect {
  return new Expect(value);
}

/**
 * Get all registered test suites
 * @returns Array of test suites
 */
export function getTestSuites(): SuiteDefinition[] {
  return testSuites;
}

/**
 * Clear all registered test suites (for testing)
 */
export function clearTestSuites(): void {
  testSuites.length = 0;
}

export default { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach };
