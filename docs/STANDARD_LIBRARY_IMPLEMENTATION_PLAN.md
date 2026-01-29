# Iudex Standard Library Enhancement - Implementation Plan

## Executive Summary

Add Postman-like standard library helpers to Iudex, providing a `std` object with utilities for encoding, crypto, string manipulation, random data generation, and more. This makes Iudex more powerful and familiar for users migrating from Postman.

**Goal**: Reduce external dependencies in tests, make test writing more productive, and provide Postman-compatible APIs.

---

## 1. Overview

### What We're Building

A comprehensive standard library accessible via `context.std` in test functions, providing utilities for:

1. **Encoding/Decoding** - Base64, URL, JSON
2. **Cryptography** - Hashing (MD5, SHA1, SHA256, SHA512), HMAC, UUID generation
3. **String Manipulation** - Case conversion (camelCase, snake_case, kebab-case), truncate, padding
4. **Date/Time** - Formatting, parsing, arithmetic, comparison
5. **Random Data** - Realistic test data (emails, names, numbers, UUIDs)
6. **Object/Array Utilities** - Deep operations (pick, omit, merge, flatten)
7. **Validators** - Common format validation (email, URL, UUID, JSON)

### Current State

- **DSL Location**: `/Users/rtukpe/Documents/dev/gotech/iudex/core/dsl.js`
- **Test Context**: Currently only provides `{ request: HttpClient }`
- **Existing Dependencies**: lodash (4.17.21), axios (1.6.0), ajv (8.12.0)
- **No Utilities Directory**: Need to create `core/utils/`

### Architecture

```
Test Context (runner.js)
  ├── request: HttpClient (existing)
  └── std: StandardLibrary (NEW)
      ├── encode/decode
      ├── crypto
      ├── string
      ├── datetime
      ├── random
      ├── object/array
      └── validate
```

---

## 2. File Structure

### Core Framework Changes

```
iudex/
├── core/
│   ├── utils/                    # NEW: Standard library directory
│   │   ├── index.js             # Main entry: createStdObject() factory
│   │   ├── encoding.js          # Base64, URL, JSON encoding/decoding
│   │   ├── crypto.js            # Hashing, HMAC, UUID, random bytes
│   │   ├── string.js            # Case conversion, manipulation
│   │   ├── datetime.js          # Date/time operations
│   │   ├── random.js            # Random test data generation
│   │   ├── object.js            # Object/array utilities
│   │   └── validators.js        # Common validators
│   ├── runner.js                # MODIFY: Inject std into context
│   └── dsl.js                   # No changes needed
├── package.json                  # MODIFY: Add dependencies
└── index.js                      # MODIFY: Export std utilities
```

### Examples Repository

```
iudex-examples/
└── standard-library-demos/       # NEW: Comprehensive examples
    ├── package.json
    ├── iudex.config.js
    ├── README.md
    ├── encoding.test.js          # Base64, URL, JSON examples
    ├── crypto.test.js            # Hashing, HMAC, UUID examples
    ├── string.test.js            # Case conversion examples
    ├── datetime.test.js          # Date/time operations
    ├── random.test.js            # Random data generation
    ├── object-array.test.js      # Object/array utilities
    ├── validators.test.js        # Validation examples
    └── comprehensive.test.js     # Real-world combined examples
```

---

## 3. Implementation Details

### Phase 1: Core Utilities (High Priority)

#### 3.1 Encoding Utilities (`core/utils/encoding.js`)

**API:**
```javascript
std.encode.base64(string)          // "hello" -> "aGVsbG8="
std.decode.base64(string)          // "aGVsbG8=" -> "hello"
std.encode.url(string)             // "hello world" -> "hello%20world"
std.decode.url(string)             // "hello%20world" -> "hello world"
std.encode.json(object)            // {a:1} -> '{"a":1}'
std.decode.json(string)            // '{"a":1}' -> {a:1}
```

**Implementation:**
- Use native Node.js `Buffer` for base64 (no dependencies)
- Use native `encodeURIComponent`/`decodeURIComponent`
- Wrap JSON.stringify/parse with error handling
- Return helpful error messages

#### 3.2 Crypto Utilities (`core/utils/crypto.js`)

**API:**
```javascript
// Hash functions
std.crypto.md5(string)             // MD5 hash (hex)
std.crypto.sha1(string)            // SHA-1 hash (hex)
std.crypto.sha256(string)          // SHA-256 hash (hex)
std.crypto.sha512(string)          // SHA-512 hash (hex)

// HMAC functions
std.crypto.hmacSHA256(string, key) // HMAC-SHA256
std.crypto.hmacSHA512(string, key) // HMAC-SHA512

// UUID and random
std.crypto.uuid()                  // UUID v4
std.crypto.randomBytes(size)       // Random bytes (hex)
```

**Dependencies:** Node.js native `crypto` module (no external dependencies), `uuid`

**Implementation:**
- Use Node.js crypto for hash/HMAC (native, not crypto-js which is deprecated)
- Use uuid package for UUID generation
- All functions return hex strings for consistency

#### 3.3 String Utilities (`core/utils/string.js`)

**API:**
```javascript
// Case conversion (use lodash)
std.string.camelCase(str)          // "hello world" -> "helloWorld"
std.string.pascalCase(str)         // "hello world" -> "HelloWorld"
std.string.snakeCase(str)          // "hello world" -> "hello_world"
std.string.kebabCase(str)          // "hello world" -> "hello-case"
std.string.constantCase(str)       // "hello world" -> "HELLO_WORLD"

// Manipulation
std.string.truncate(str, len, suffix)  // Truncate with "..."
std.string.pad(str, length, char)      // Pad left/right
std.string.reverse(str)                // Reverse string
std.string.capitalize(str)             // "hello" -> "Hello"
std.string.titleCase(str)              // "hello world" -> "Hello World"
```

**Dependencies:** lodash (already installed)

#### 3.4 Random Data Utilities (`core/utils/random.js`)

**API:**
```javascript
// Random primitives
std.random.uuid()                  // UUID v4
std.random.int(min, max)           // Random integer
std.random.float(min, max, decimals) // Random float
std.random.boolean()               // Random true/false
std.random.alphanumeric(length)    // "aB3xY9..."
std.random.hex(length)             // "a3f2b1..."

// Random identifiers
std.random.email()                 // "user123@example.com"
std.random.username()              // "user_1234"
std.random.password(length)        // Secure password
std.random.ipv4()                  // "192.168.1.100"

// Random data (using faker)
std.random.firstName()             // "John"
std.random.lastName()              // "Doe"
std.random.fullName()              // "John Doe"
std.random.phoneNumber()           // "+1-555-123-4567"
std.random.url()                   // "https://example.com/path"

// Array utilities
std.random.arrayElement(array)     // Pick random element
std.random.shuffle(array)          // Shuffle array
```

**Dependencies:** `@faker-js/faker` (realistic data), native crypto for numbers

### Phase 2: Advanced Utilities (Medium Priority)

#### 3.5 Date/Time Utilities (`core/utils/datetime.js`)

**API:**
```javascript
// Current time
std.datetime.now()                 // Timestamp (ms)
std.datetime.nowISO()              // ISO 8601 string
std.datetime.today()               // Start of today

// Formatting
std.datetime.format(date, format)  // Format with pattern
std.datetime.toISO(date)           // Convert to ISO
std.datetime.toUnix(date)          // Unix timestamp (seconds)

// Parsing
std.datetime.parse(string, format) // Parse with format
std.datetime.fromUnix(timestamp)   // From Unix timestamp

// Arithmetic
std.datetime.add(date, amount, unit)      // Add days/hours
std.datetime.subtract(date, amount, unit) // Subtract
std.datetime.diff(date1, date2, unit)     // Difference

// Comparison
std.datetime.isBefore(date1, date2)
std.datetime.isAfter(date1, date2)
std.datetime.isBetween(date, start, end)
```

**Dependencies:** `dayjs` (lightweight, modern alternative to moment.js)

#### 3.6 Object/Array Utilities (`core/utils/object.js`)

**API:**
```javascript
// Object operations (lodash wrappers)
std.object.pick(obj, keys)         // Pick specific keys
std.object.omit(obj, keys)         // Omit keys
std.object.merge(obj1, obj2)       // Deep merge
std.object.clone(obj)              // Deep clone
std.object.get(obj, path, default) // Nested get
std.object.set(obj, path, value)   // Nested set
std.object.has(obj, path)          // Check nested path

// Array operations
std.array.flatten(array, depth)    // Flatten nested
std.array.unique(array)            // Remove duplicates
std.array.chunk(array, size)       // Split into chunks
std.array.compact(array)           // Remove falsy values
std.array.groupBy(array, key)      // Group by property
std.array.sortBy(array, key)       // Sort by property
```

**Dependencies:** lodash (already installed)

#### 3.7 Validators (`core/utils/validators.js`)

**API:**
```javascript
// Type validators
std.validate.isEmail(string)       // Email format
std.validate.isURL(string)         // URL format
std.validate.isUUID(string)        // UUID format
std.validate.isIP(string)          // IP address
std.validate.isJSON(string)        // Valid JSON
std.validate.isBase64(string)      // Valid base64

// Format validators
std.validate.isDate(string)        // ISO date format
std.validate.isPhone(string)       // Phone number
std.validate.isHex(string)         // Hexadecimal
std.validate.isAlphanumeric(string)

// Schema validation
std.validate.schema(data, schema)  // JSON Schema (AJV)
std.validate.matches(str, regex)   // Regex match
```

**Dependencies:** ajv (already installed), custom regex patterns

---

## 4. Critical File Changes

### 4.1 Create Main Entry Point (`core/utils/index.js`)

```javascript
import * as encoding from './encoding.js';
import * as crypto from './crypto.js';
import * as string from './string.js';
import * as datetime from './datetime.js';
import * as random from './random.js';
import * as object from './object.js';
import * as validators from './validators.js';
import _ from 'lodash';

/**
 * Create std object with all standard library utilities
 * @returns {Object} std object
 */
export function createStdObject() {
  return {
    encode: encoding.encode,
    decode: encoding.decode,
    crypto: crypto,
    string: string,
    datetime: datetime,
    random: random,
    object: object,
    array: object.array,  // Convenience alias
    validate: validators,
    _: _  // Direct lodash access
  };
}

// Export individual modules
export { encoding, crypto, string, datetime, random, object, validators };
```

### 4.2 Modify Test Runner (`core/runner.js`)

**Location:** Around line 263-267

```javascript
// BEFORE:
createContext() {
    return {
        request: new HttpClient(this.config.http)
    };
}

// AFTER:
import { createStdObject } from './utils/index.js';

createContext() {
    return {
        request: new HttpClient(this.config.http),
        std: createStdObject()  // NEW: Add standard library
    };
}
```

### 4.3 Update Package Dependencies (`package.json`)

Add these dependencies:

```json
{
  "dependencies": {
    "uuid": "^9.0.1",            // UUID generation
    "dayjs": "^1.11.10",         // Date/time utilities
    "@faker-js/faker": "^8.3.1"  // Random realistic data
  }
}
```

**Note:** Do NOT use crypto-js as it is deprecated. Use Node.js native crypto module instead.

### 4.4 Update Main Export (`index.js`)

```javascript
// Add to exports
export { createStdObject } from './core/utils/index.js';
export * as stdUtils from './core/utils/index.js';
```

---

## 5. Example Tests Structure

### 5.1 Example Directory Setup

**Location:** `/Users/rtukpe/Documents/dev/gotech/iudex-examples/standard-library-demos/`

**package.json:**
```json
{
  "name": "iudex-standard-library-demos",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node ../../iudex/cli/index.js run *.test.js",
    "test:encoding": "node ../../iudex/cli/index.js run encoding.test.js",
    "test:crypto": "node ../../iudex/cli/index.js run crypto.test.js",
    "test:string": "node ../../iudex/cli/index.js run string.test.js",
    "test:random": "node ../../iudex/cli/index.js run random.test.js"
  },
  "dependencies": {
    "iudex": "file:../../iudex"
  }
}
```

### 5.2 Sample Test: Encoding (`encoding.test.js`)

```javascript
import { describe, test, expect } from 'iudex';

describe('Standard Library - Encoding', { prefix: 'stdlib.encoding' }, () => {
  test('should encode and decode base64', async ({ std }) => {
    const original = 'Hello, Iudex!';
    const encoded = std.encode.base64(original);
    expect(encoded).toBe('SGVsbG8sIEl1ZGV4IQ==');

    const decoded = std.decode.base64(encoded);
    expect(decoded).toBe(original);
  }, { id: 'base64_roundtrip' });

  test('should handle URL encoding for query params', async ({ std }) => {
    const param = 'hello world & special=chars';
    const encoded = std.encode.url(param);
    expect(encoded).toContain('%20');

    const decoded = std.decode.url(encoded);
    expect(decoded).toBe(param);
  }, { id: 'url_encoding' });

  test('should safely parse JSON with error handling', async ({ std, request }) => {
    const obj = { status: 'ok', data: [1, 2, 3] };
    const json = std.encode.json(obj);
    const parsed = std.decode.json(json);

    expect(parsed).toHaveProperty('status');
    expect(parsed.data).toHaveLength(3);
  }, { id: 'json_roundtrip' });
});
```

### 5.3 Sample Test: Crypto (`crypto.test.js`)

```javascript
import { describe, test, expect } from 'iudex';

describe('Standard Library - Crypto', { prefix: 'stdlib.crypto' }, () => {
  test('should generate SHA256 hash', async ({ std }) => {
    const hash = std.crypto.sha256('hello');
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars

    // Hash should be deterministic
    const hash2 = std.crypto.sha256('hello');
    expect(hash).toBe(hash2);
  }, { id: 'sha256_hash' });

  test('should generate HMAC signature', async ({ std }) => {
    const message = 'sensitive data';
    const secret = 'my-secret-key';
    const hmac = std.crypto.hmacSHA256(message, secret);

    expect(hmac).toMatch(/^[a-f0-9]{64}$/);
  }, { id: 'hmac_signature' });

  test('should generate unique UUIDs', async ({ std }) => {
    const uuid1 = std.crypto.uuid();
    const uuid2 = std.crypto.uuid();

    expect(uuid1).toMatch(/^[a-f0-9-]{36}$/);
    expect(uuid1).not.toBe(uuid2); // Must be unique
  }, { id: 'uuid_generation' });

  test('should use UUID in API request', async ({ std, request }) => {
    const requestId = std.crypto.uuid();

    const response = await request.get('https://httpbin.org/get', {
      headers: { 'X-Request-ID': requestId }
    });

    expect(response).toHaveStatus(200);
  }, { id: 'uuid_in_request' });
});
```

### 5.4 Sample Test: Random Data (`random.test.js`)

```javascript
import { describe, test, expect } from 'iudex';

describe('Standard Library - Random Data', { prefix: 'stdlib.random' }, () => {
  test('should generate random integers', async ({ std }) => {
    const num = std.random.int(1, 100);
    expect(num).toBeGreaterThanOrEqual(1);
    expect(num).toBeLessThanOrEqual(100);
  }, { id: 'random_int' });

  test('should generate random email addresses', async ({ std }) => {
    const email = std.random.email();
    expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  }, { id: 'random_email' });

  test('should create test user with random data', async ({ std, request }) => {
    const user = {
      id: std.random.int(1, 10000),
      email: std.random.email(),
      firstName: std.random.firstName(),
      lastName: std.random.lastName(),
      password: std.crypto.sha256(std.random.password(16))
    };

    // Use in API request
    const response = await request.post('https://httpbin.org/post', user);
    expect(response).toHaveStatus(200);
  }, { id: 'random_user_creation' });
});
```

### 5.5 Comprehensive Example (`comprehensive.test.js`)

```javascript
import { describe, test, expect } from 'iudex';

describe('Real-world API Testing with std', { prefix: 'stdlib.realworld' }, () => {
  test('should authenticate and make signed request', async ({ std, request }) => {
    // Generate test credentials
    const username = std.random.username();
    const password = std.random.password(16);

    // Create authentication header
    const credentials = `${username}:${password}`;
    const encoded = std.encode.base64(credentials);
    const authHeader = `Basic ${encoded}`;

    // Make authenticated request
    const response = await request.get('https://httpbin.org/basic-auth/user/pass', {
      headers: { 'Authorization': authHeader }
    });

    expect(response).toHaveStatus(401); // Will fail, but demonstrates usage
  }, { id: 'auth_flow' });

  test('should generate and verify webhook signature', async ({ std, request }) => {
    const payload = {
      event: 'user.created',
      timestamp: std.datetime.nowISO(),
      data: {
        id: std.random.int(1, 1000),
        email: std.random.email()
      }
    };

    // Create webhook signature
    const secret = 'webhook-secret-key';
    const payloadString = std.encode.json(payload);
    const signature = std.crypto.hmacSHA256(payloadString, secret);

    // Send webhook
    const response = await request.post('https://httpbin.org/post', payload, {
      headers: {
        'X-Webhook-Signature': signature,
        'X-Timestamp': payload.timestamp
      }
    });

    expect(response).toHaveStatus(200);
  }, { id: 'webhook_signature' });
});
```

---

## 6. Testing Strategy

### 6.1 Unit Tests for Utilities

Create tests for each utility module in `core/utils/*.test.js`:

**Test Coverage Requirements:**
- Each function should have 3-5 test cases
- Cover happy path, edge cases, and error handling
- Test with null, undefined, empty strings, invalid inputs
- Verify error messages are helpful
- Target: >90% code coverage

### 6.2 Integration Tests

Test utilities work correctly in actual test context:

**Location:** `integration-tests/standard-library.test.js`

```javascript
import { describe, test, expect } from 'iudex';

describe('Standard Library Integration', () => {
  test('std object is available in context', async ({ std }) => {
    expect(std).toBeDefined();
    expect(std.encode).toBeDefined();
    expect(std.crypto).toBeDefined();
    expect(std.string).toBeDefined();
  });

  test('utilities work with actual API calls', async ({ std, request }) => {
    const id = std.random.uuid();
    const response = await request.get(`https://httpbin.org/uuid`);
    expect(response).toHaveStatus(200);
  });
});
```

---

## 7. Documentation

### 7.1 Create Standard Library Reference

**File:** `docs/STANDARD_LIBRARY.md`

**Structure:**
```markdown
# Iudex Standard Library Reference

Complete API reference for all `std` utilities available in test context.

## Quick Reference
- [Encoding](#encoding) - Base64, URL, JSON
- [Crypto](#crypto) - Hashing, HMAC, UUID
- [String](#string) - Case conversion, manipulation
- [DateTime](#datetime) - Formatting, parsing, arithmetic
- [Random](#random) - Data generation
- [Object/Array](#objectarray) - Deep operations
- [Validators](#validators) - Common validations

## Usage

```javascript
test('example', async ({ std, request }) => {
  const encoded = std.encode.base64('hello');
  const hash = std.crypto.sha256('data');
  const email = std.random.email();
});
```

[Detailed API documentation for each utility...]
```

### 7.2 Update Main README

Add section about standard library to main README.md

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)

**Day 1-2: Setup & Core Encoding**
- Create `core/utils/` directory structure
- Install dependencies (uuid, dayjs, faker)
- Implement `encoding.js` (base64, URL, JSON)
- Write unit tests for encoding
- Create `core/utils/index.js` with `createStdObject()`

**Day 3-4: Crypto & String**
- Implement `crypto.js` (hashing, HMAC, UUID) using Node.js native crypto
- Implement `string.js` (case conversion, manipulation)
- Write unit tests for crypto and string
- Test integration with runner.js

**Day 5: Runner Integration**
- Modify `core/runner.js` to inject `std` into context
- Update `index.js` to export std utilities
- Run existing tests to ensure no breaking changes
- Write integration tests

### Phase 2: Extended Utilities (Week 2)

**Day 1-2: Random & DateTime**
- Implement `random.js` (primitives, identifiers, realistic data)
- Implement `datetime.js` (formatting, parsing, arithmetic)
- Write unit tests for random and datetime

**Day 3-4: Object & Validators**
- Implement `object.js` (object/array operations)
- Implement `validators.js` (format validation)
- Write unit tests for object and validators

**Day 5: Examples**
- Create `standard-library-demos/` directory in examples repo
- Create 7 example test files (encoding, crypto, string, etc.)
- Create comprehensive real-world example
- Add README to examples directory

### Phase 3: Documentation & Polish (Week 3)

**Day 1-2: Documentation**
- Write `docs/STANDARD_LIBRARY.md` with complete API reference
- Add JSDoc comments to all utility functions
- Update main README.md with standard library section
- Create migration guide for Postman users

**Day 3-4: Testing & Refinement**
- Achieve >90% unit test coverage
- Run all integration tests
- Performance testing (std object creation overhead)
- Fix any bugs or edge cases discovered

**Day 5: Release**
- Update CHANGELOG.md
- Create release notes
- Tag version
- Update documentation site (if applicable)

---

## 9. Verification Plan

### 9.1 Unit Tests

Run all utility tests:
```bash
npm test core/utils/*.test.js
```

**Success Criteria:**
- All tests pass
- >90% code coverage
- No linting errors

### 9.2 Integration Tests

Run integration tests:
```bash
npm test integration-tests/standard-library.test.js
```

**Success Criteria:**
- `std` object available in context
- All utilities work with real API calls
- No performance degradation

### 9.3 Example Tests

Run all example tests:
```bash
cd iudex-examples/standard-library-demos
npm test
```

**Success Criteria:**
- All 8 example test files pass
- Examples demonstrate real-world usage
- Code is clean and well-documented

### 9.4 Backwards Compatibility

Run existing test suites:
```bash
npm test
```

**Success Criteria:**
- All existing tests pass unchanged
- No breaking changes to DSL
- No performance regressions

---

## 10. Success Criteria

- ✅ `std` object available in all test contexts
- ✅ 7 utility modules implemented (encoding, crypto, string, datetime, random, object, validators)
- ✅ >90% unit test coverage
- ✅ 8 comprehensive example tests in examples repo
- ✅ Complete API documentation in docs/STANDARD_LIBRARY.md
- ✅ Zero breaking changes to existing tests
- ✅ Performance overhead <5ms per test for std object creation
- ✅ Postman-compatible APIs for easy migration

---

## 11. Dependencies Summary

### New Dependencies to Add

```json
{
  "uuid": "^9.0.1",            // UUID generation
  "dayjs": "^1.11.10",         // Date/time (lightweight)
  "@faker-js/faker": "^8.3.1"  // Realistic random data
}
```

### Existing Dependencies to Leverage

```json
{
  "lodash": "^4.17.21",       // String/array/object utilities
  "ajv": "^8.12.0",           // JSON schema validation
  "axios": "^1.6.0"           // Already available for HTTP
}
```

**Important:** Use Node.js native `crypto` module, NOT crypto-js (which is deprecated)

**Total New Dependencies:** 3
**Total Bundle Size Increase:** ~400KB (acceptable for dev tool)

---

## 12. Risk Mitigation

### Potential Issues & Solutions

1. **Performance Impact**
   - Risk: Creating std object on every test adds overhead
   - Solution: Lazy load utilities, cache std object per suite
   - Mitigation: Benchmark and optimize if >5ms overhead

2. **Dependency Size**
   - Risk: Adding 3 new dependencies increases bundle size
   - Solution: These are dev dependencies, not runtime
   - Mitigation: Use tree-shaking, only import what's needed

3. **Breaking Changes**
   - Risk: Modifying runner context could break existing tests
   - Solution: Only add, never modify existing properties
   - Mitigation: Comprehensive integration testing

4. **Postman Compatibility**
   - Risk: API differences from Postman could confuse users
   - Solution: Match Postman naming exactly where possible
   - Mitigation: Document differences in migration guide

---

## Critical Files Reference

### Files to Create

1. `core/utils/index.js` - Main entry: createStdObject() factory
2. `core/utils/encoding.js` - Encoding utilities
3. `core/utils/crypto.js` - Crypto utilities (Node.js native crypto)
4. `core/utils/string.js` - String utilities
5. `core/utils/datetime.js` - DateTime utilities
6. `core/utils/random.js` - Random data
7. `core/utils/object.js` - Object/array utilities
8. `core/utils/validators.js` - Validators
9. `iudex-examples/standard-library-demos/*` - All example files

### Files to Modify

1. `core/runner.js` - Inject std into context (line ~263-267)
2. `package.json` - Add 3 new dependencies
3. `index.js` - Export std utilities
4. `README.md` - Add standard library section

---

**End of Implementation Plan**
