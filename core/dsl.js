// Iudex - Test Definition DSL
const testSuites = [];
const currentSuite = {tests: [], hooks: {}, prefix: null};

/**
 * Slugify a string (convert to lowercase, replace spaces/special chars with hyphens)
 * @param {string} text - Text to slugify
 * @param {number} maxLength - Maximum length (default 512)
 * @returns {string} Slugified text
 */
function slugify(text, maxLength = 512) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with "-"
        .replace(/[^\w\-\.]+/g, '')     // Remove all non-word chars except "-" and "."
        .replace(/\-\-+/g, '-')         // Replace multiple hyphens ("-") with a single one
        .replace(/^-+/, '')             // Trim - from the start of the string
        .replace(/-+$/, '')             // Trim - from the end of the string
        .substring(0, maxLength);       // Enforce max length
}

/**
 * Define a test suite
 * @param {string} name - Suite name
 * @param {Object|Function} optionsOrFn - Options object or function
 * @param {Function} fn - Suite function (if options provided)
 */
export function describe(name, optionsOrFn, fn) {
    let options = {};
    let suiteFn = fn;

    // Handle both describe(name, fn) and describe(name, options, fn)
    if (typeof optionsOrFn === 'function') {
        suiteFn = optionsOrFn;
    } else {
        options = optionsOrFn || {};
        suiteFn = fn;
    }

    const suite = {
        name,
        tests: [],
        hooks: {beforeAll: [], afterAll: [], beforeEach: [], afterEach: []},
        prefix: options.prefix || null  // Optional prefix for test IDs
    };

    const previousSuite = Object.assign({}, currentSuite);
    Object.assign(currentSuite, suite);
    suiteFn();
    testSuites.push({...currentSuite});
    Object.assign(currentSuite, previousSuite);
}

/**
 * Define a test
 * @param {string} name - Test name (max 512 chars)
 * @param {Function} fn - Test function
 * @param {Object} options - Test options (timeout, retry, skip, only, tags, id)
 */
export function test(name, fn, options = {}) {
    // Enforce test name length limit
    if (name.length > 512) {
        throw new Error(`Test name exceeds 512 characters: "${name.substring(0, 50)}..."`);
    }

    // Build test slug from suite prefix + test id (or auto-generate from name)
    let testSlug;
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

    currentSuite.tests.push({
        name,
        fn,
        timeout: options.timeout || 30000,
        retry: options.retry || 0,
        skip: options.skip || false,
        only: options.only || false,
        tags: options.tags || [],
        testId: testSlug,  // Always has a slug (auto-generated or explicit)
        endpoint: options.endpoint || null,
        method: options.method || null
    });
}

export function beforeAll(fn) {
    currentSuite.hooks.beforeAll.push(fn);
}

export function afterAll(fn) {
    currentSuite.hooks.afterAll.push(fn);
}

export function beforeEach(fn) {
    currentSuite.hooks.beforeEach.push(fn);
}

export function afterEach(fn) {
    currentSuite.hooks.afterEach.push(fn);
}

test.skip = (name, fn, options = {}) => test(name, fn, {...options, skip: true});
test.only = (name, fn, options = {}) => test(name, fn, {...options, only: true});

export class Expect {
    constructor(value) {
        this.value = value;
        this.isNot = false;
    }

    get not() {
        const e = new Expect(this.value);
        e.isNot = true;
        return e;
    }

    toHaveStatus(expected) {
        const actual = this.value.status || this.value.statusCode;
        if (this.isNot ? actual === expected : actual !== expected) {
            throw new Error(`Expected status ${this.isNot ? 'not ' : ''}${expected}, got ${actual}`);
        }
        return this;
    }

    toRespondWithin(ms) {
        const actual = this.value.responseTime || this.value.duration;
        if (this.isNot ? actual <= ms : actual > ms) {
            throw new Error(`Response time ${actual}ms exceeds ${ms}ms`);
        }
        return this;
    }

    toHaveHeader(name, value = null) {
        const headers = this.value.headers || {};
        const hasHeader = Object.keys(headers).some(h => h.toLowerCase() === name.toLowerCase());
        if (this.isNot ? hasHeader : !hasHeader) {
            throw new Error(`Expected header ${name} ${this.isNot ? 'not ' : ''}to exist`);
        }
        return this;
    }

    toHaveSecurityHeaders() {
        ['x-content-type-options', 'x-frame-options', 'strict-transport-security']
            .forEach(h => this.toHaveHeader(h));
        return this;
    }

    toHaveProperty(path, value) {
        const body = this.value.body || this.value;
        const parts = path.split('.');
        let current = body;
        for (const part of parts) {
            if (!current || !current.hasOwnProperty(part)) {
                throw new Error(`Property '${path}' not found`);
            }
            current = current[part];
        }
        if (value !== undefined && current !== value) {
            throw new Error(`Expected '${path}' to be ${value}, got ${current}`);
        }
        return this;
    }

    toBeArray() {
        if (!Array.isArray(this.value)) throw new Error('Expected array');
        return this;
    }

    toHaveLength(expected) {
        if (this.value.length !== expected) {
            throw new Error(`Expected length ${expected}, got ${this.value.length}`);
        }
        return this;
    }

    toBe(expected) {
        if (this.isNot ? this.value === expected : this.value !== expected) {
            throw new Error(`Expected ${this.isNot ? 'not ' : ''}${expected}, got ${this.value}`);
        }
        return this;
    }

    toBeDefined() {
        if (this.value === undefined) throw new Error('Expected value to be defined');
        return this;
    }

    toBeGreaterThanOrEqual(expected) {
        if (this.value < expected) {
            throw new Error(`Expected ${this.value} to be greater than or equal to ${expected}`);
        }
        return this;
    }

    toContain(value) {
        let contains = false;
        if (typeof this.value === 'string') {
            contains = this.value.includes(value);
        } else if (Array.isArray(this.value)) {
            contains = this.value.includes(value);
        }
        if (!contains) {
            throw new Error(`Expected ${JSON.stringify(this.value)} to contain ${JSON.stringify(value)}`);
        }
        return this;
    }

    toMatch(regex) {
        if (!regex.test(this.value)) {
            throw new Error(`Expected ${this.value} to match ${regex}`);
        }
        return this;
    }
}

export function expect(value) {
    return new Expect(value);
}

export function getTestSuites() {
    return testSuites;
}

export default {describe, test, expect, beforeAll, afterAll, beforeEach, afterEach};
