# Iudex Standard Library Reference

Complete API reference for the Iudex standard library utilities available in test contexts via the `std` object.

## Overview

The Iudex standard library provides Postman-like utilities for API testing, making it easy to:
- Encode and decode data (Base64, URL, JSON)
- Generate cryptographic hashes and signatures
- Manipulate strings and convert cases
- Work with dates and times
- Generate realistic random test data
- Perform deep object and array operations
- Validate data formats

## Quick Start

All utilities are available in test context via the `std` object:

```javascript
import { describe, test, expect } from 'iudex';

describe('Example Test', () => {
  test('using standard library', async ({ std, request }) => {
    // Generate test data
    const email = std.random.email();
    const userId = std.crypto.uuid();
    const timestamp = std.datetime.nowISO();

    // Make API request
    const response = await request.post('https://api.example.com/users', {
      id: userId,
      email: email,
      createdAt: timestamp
    });

    expect(response).toHaveStatus(200);
  });
});
```

---

## Encoding & Decoding

### Base64

**`std.encode.base64(string)`**
Encode a string to Base64.

```javascript
const encoded = std.encode.base64('hello');
// Returns: 'aGVsbG8='
```

**`std.decode.base64(string)`**
Decode a Base64 string.

```javascript
const decoded = std.decode.base64('aGVsbG8=');
// Returns: 'hello'
```

### URL Encoding

**`std.encode.url(string)`**
URL encode a string (percent encoding).

```javascript
const encoded = std.encode.url('hello world');
// Returns: 'hello%20world'
```

**`std.decode.url(string)`**
URL decode a string.

```javascript
const decoded = std.decode.url('hello%20world');
// Returns: 'hello world'
```

### JSON

**`std.encode.json(object, pretty?)`**
Convert object to JSON string.

```javascript
const json = std.encode.json({ name: 'John' });
// Returns: '{"name":"John"}'

const pretty = std.encode.json({ name: 'John' }, true);
// Returns formatted JSON with indentation
```

**`std.decode.json(string)`**
Parse JSON string to object.

```javascript
const obj = std.decode.json('{"name":"John"}');
// Returns: { name: 'John' }
```

---

## Cryptography

### Hash Functions

**`std.crypto.md5(string)`**
Generate MD5 hash (32 hex characters).

```javascript
const hash = std.crypto.md5('hello');
// Returns: '5d41402abc4b2a76b9719d911017c592'
```

**`std.crypto.sha1(string)`**
Generate SHA-1 hash (40 hex characters).

```javascript
const hash = std.crypto.sha1('hello');
```

**`std.crypto.sha256(string)`**
Generate SHA-256 hash (64 hex characters).

```javascript
const hash = std.crypto.sha256('hello');
```

**`std.crypto.sha512(string)`**
Generate SHA-512 hash (128 hex characters).

```javascript
const hash = std.crypto.sha512('hello');
```

### HMAC Signatures

**`std.crypto.hmacSHA1(string, key)`**
Generate HMAC-SHA1 signature.

```javascript
const signature = std.crypto.hmacSHA1('message', 'secret-key');
```

**`std.crypto.hmacSHA256(string, key)`**
Generate HMAC-SHA256 signature.

```javascript
const signature = std.crypto.hmacSHA256('message', 'secret-key');
```

**`std.crypto.hmacSHA512(string, key)`**
Generate HMAC-SHA512 signature.

```javascript
const signature = std.crypto.hmacSHA512('message', 'secret-key');
```

### UUID & Random

**`std.crypto.uuid()`**
Generate UUID v4.

```javascript
const id = std.crypto.uuid();
// Returns: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

**`std.crypto.randomBytes(size)`**
Generate random bytes (hex string).

```javascript
const bytes = std.crypto.randomBytes(16);
// Returns: 32 hex characters (16 bytes)
```

---

## String Manipulation

### Case Conversion

**`std.string.camelCase(string)`**
Convert to camelCase.

```javascript
std.string.camelCase('hello world') // 'helloWorld'
```

**`std.string.pascalCase(string)`**
Convert to PascalCase.

```javascript
std.string.pascalCase('hello world') // 'HelloWorld'
```

**`std.string.snakeCase(string)`**
Convert to snake_case.

```javascript
std.string.snakeCase('hello world') // 'hello_world'
```

**`std.string.kebabCase(string)`**
Convert to kebab-case.

```javascript
std.string.kebabCase('hello world') // 'hello-world'
```

**`std.string.constantCase(string)`**
Convert to CONSTANT_CASE.

```javascript
std.string.constantCase('hello world') // 'HELLO_WORLD'
```

### Formatting

**`std.string.capitalize(string)`**
Capitalize first letter.

```javascript
std.string.capitalize('hello') // 'Hello'
```

**`std.string.titleCase(string)`**
Convert to Title Case.

```javascript
std.string.titleCase('hello world') // 'Hello World'
```

**`std.string.upperCase(string)`** / **`std.string.lowerCase(string)`**
Convert to uppercase/lowercase.

```javascript
std.string.upperCase('hello') // 'HELLO'
std.string.lowerCase('HELLO') // 'hello'
```

### Manipulation

**`std.string.truncate(string, length, suffix?)`**
Truncate string to specified length.

```javascript
std.string.truncate('hello world', 8) // 'hello...'
std.string.truncate('hello world', 8, '…') // 'hello …'
```

**`std.string.padLeft(string, length, char?)`**
Pad string on the left.

```javascript
std.string.padLeft('5', 3, '0') // '005'
```

**`std.string.padRight(string, length, char?)`**
Pad string on the right.

```javascript
std.string.padRight('test', 10, '.') // 'test......'
```

**`std.string.reverse(string)`**
Reverse a string.

```javascript
std.string.reverse('hello') // 'olleh'
```

**`std.string.repeat(string, times)`**
Repeat string n times.

```javascript
std.string.repeat('ab', 3) // 'ababab'
```

**`std.string.trim(string)`** / **`std.string.trimLeft(string)`** / **`std.string.trimRight(string)`**
Trim whitespace.

```javascript
std.string.trim('  hello  ') // 'hello'
```

**`std.string.replaceAll(string, search, replace)`**
Replace all occurrences.

```javascript
std.string.replaceAll('hello world', 'o', 'a') // 'hella warld'
```

### Checking

**`std.string.contains(string, substring)`**
Check if string contains substring.

**`std.string.startsWith(string, prefix)`**
Check if string starts with prefix.

**`std.string.endsWith(string, suffix)`**
Check if string ends with suffix.

---

## Date & Time

### Current Time

**`std.datetime.now()`**
Get current timestamp in milliseconds.

```javascript
const ts = std.datetime.now(); // 1706194800000
```

**`std.datetime.nowISO()`**
Get current time as ISO 8601 string.

```javascript
const iso = std.datetime.nowISO(); // '2024-01-25T10:30:00.000Z'
```

**`std.datetime.today()`**
Get start of today (00:00:00).

```javascript
const today = std.datetime.today();
```

### Formatting

**`std.datetime.format(date, format?)`**
Format date with pattern (default: 'YYYY-MM-DD HH:mm:ss').

```javascript
std.datetime.format(new Date(), 'YYYY-MM-DD') // '2024-01-25'
std.datetime.format(new Date(), 'DD/MM/YYYY') // '25/01/2024'
```

**`std.datetime.toISO(date)`**
Convert date to ISO 8601 string.

**`std.datetime.toUnix(date)`**
Convert date to Unix timestamp (seconds).

### Parsing

**`std.datetime.parse(string, format)`**
Parse date string with format.

```javascript
const date = std.datetime.parse('25/01/2024', 'DD/MM/YYYY');
```

**`std.datetime.fromUnix(timestamp)`**
Parse Unix timestamp to Date.

```javascript
const date = std.datetime.fromUnix(1706194800);
```

### Arithmetic

**`std.datetime.add(date, amount, unit)`**
Add time to date.

```javascript
const tomorrow = std.datetime.add(new Date(), 1, 'day');
const nextWeek = std.datetime.add(new Date(), 7, 'days');
```

Units: `'years'`, `'months'`, `'days'`, `'hours'`, `'minutes'`, `'seconds'`

**`std.datetime.subtract(date, amount, unit)`**
Subtract time from date.

```javascript
const yesterday = std.datetime.subtract(new Date(), 1, 'day');
```

**`std.datetime.diff(date1, date2, unit?)`**
Get difference between dates (default unit: days).

```javascript
const days = std.datetime.diff(date2, date1, 'days');
```

### Comparison

**`std.datetime.isBefore(date1, date2)`**
Check if date1 is before date2.

**`std.datetime.isAfter(date1, date2)`**
Check if date1 is after date2.

**`std.datetime.isSame(date1, date2, unit?)`**
Check if dates are same (default: millisecond).

**`std.datetime.isBetween(date, start, end, inclusivity?)`**
Check if date is between start and end.

```javascript
const isBetween = std.datetime.isBetween(
  new Date('2024-01-15'),
  new Date('2024-01-01'),
  new Date('2024-01-31')
); // true
```

### Utilities

**`std.datetime.startOf(date, unit)`** / **`std.datetime.endOf(date, unit)`**
Get start/end of time unit.

```javascript
const startOfDay = std.datetime.startOf(new Date(), 'day');
const endOfMonth = std.datetime.endOf(new Date(), 'month');
```

**`std.datetime.isValid(date)`**
Check if date is valid.

**`std.datetime.year(date)`** / **`std.datetime.month(date)`** / **`std.datetime.dayOfMonth(date)`**
Extract date components.

---

## Random Data Generation

### Primitives

**`std.random.int(min?, max?)`**
Generate random integer (default: 0-100).

```javascript
const num = std.random.int(1, 10);
```

**`std.random.float(min?, max?, decimals?)`**
Generate random float (default: 0-1, 2 decimals).

```javascript
const num = std.random.float(0, 100, 2);
```

**`std.random.boolean()`**
Generate random boolean.

**`std.random.alphanumeric(length?)`**
Generate random alphanumeric string (default: 10).

```javascript
const str = std.random.alphanumeric(8); // 'aB3xY9kL'
```

**`std.random.hex(length?)`**
Generate random hex string (default: 16).

```javascript
const hex = std.random.hex(8); // 'a3f2b1c4'
```

### Identifiers

**`std.random.uuid()`**
Generate UUID v4.

**`std.random.email()`**
Generate random email address.

```javascript
const email = std.random.email(); // 'john.doe@example.com'
```

**`std.random.username()`**
Generate random username.

**`std.random.password(length?)`**
Generate random password (default: 16).

**`std.random.ipv4()`** / **`std.random.ipv6()`**
Generate random IP address.

**`std.random.mac()`**
Generate random MAC address.

**`std.random.url()`** / **`std.random.domain()`**
Generate random URL or domain name.

### Personal Data

**`std.random.firstName()`** / **`std.random.lastName()`** / **`std.random.fullName()`**
Generate random names.

**`std.random.phoneNumber()`**
Generate random phone number.

**`std.random.address()`**
Generate random street address.

**`std.random.city()`** / **`std.random.country()`** / **`std.random.zipCode()`**
Generate random location data.

**`std.random.latitude()`** / **`std.random.longitude()`**
Generate random coordinates.

### Business Data

**`std.random.companyName()`**
Generate random company name.

**`std.random.jobTitle()`**
Generate random job title.

**`std.random.creditCard()`**
Generate random credit card number.

**`std.random.currencyCode()`**
Generate random currency code (e.g., 'USD').

**`std.random.amount(min?, max?, decimals?)`**
Generate random amount.

### Text

**`std.random.words(count?)`**
Generate random words (default: 3).

**`std.random.sentence()`**
Generate random sentence.

**`std.random.paragraph()`**
Generate random paragraph.

### Array Operations

**`std.random.arrayElement(array)`**
Pick random element from array.

**`std.random.arrayElements(array, count)`**
Pick multiple random elements.

**`std.random.shuffle(array)`**
Shuffle array (returns new array).

---

## Object & Array Utilities

### Object Operations

**`std.object.pick(object, keys)`**
Pick specific keys from object.

```javascript
const user = { id: 1, name: 'John', password: 'secret' };
const public = std.object.pick(user, ['id', 'name']);
// Returns: { id: 1, name: 'John' }
```

**`std.object.omit(object, keys)`**
Omit specific keys from object.

```javascript
const sanitized = std.object.omit(user, ['password']);
```

**`std.object.merge(...objects)`**
Deep merge objects.

```javascript
const merged = std.object.merge(defaults, userPrefs);
```

**`std.object.clone(object)`**
Deep clone object.

```javascript
const copy = std.object.clone(original);
```

**`std.object.get(object, path, default?)`**
Get nested property value.

```javascript
const name = std.object.get(user, 'profile.name', 'Unknown');
```

**`std.object.set(object, path, value)`**
Set nested property value.

```javascript
std.object.set(user, 'profile.age', 30);
```

**`std.object.has(object, path)`**
Check if nested property exists.

**`std.object.keys(object)`** / **`std.object.values(object)`** / **`std.object.entries(object)`**
Get keys, values, or entries.

**`std.object.isEmpty(object)`**
Check if object is empty.

**`std.object.isEqual(obj1, obj2)`**
Deep equality check.

### Array Operations

**`std.array.flatten(array, depth?)`**
Flatten array to specified depth (default: 1).

```javascript
std.array.flatten([1, [2, [3, 4]]], 1) // [1, 2, [3, 4]]
```

**`std.array.flattenDeep(array)`**
Flatten array deeply.

**`std.array.unique(array)`**
Remove duplicate values.

```javascript
std.array.unique([1, 2, 2, 3]) // [1, 2, 3]
```

**`std.array.uniqueBy(array, key)`**
Remove duplicates by property.

```javascript
std.array.uniqueBy(users, 'id')
```

**`std.array.chunk(array, size)`**
Split array into chunks.

```javascript
std.array.chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
```

**`std.array.compact(array)`**
Remove falsy values.

```javascript
std.array.compact([0, 1, false, 2, '', 3]) // [1, 2, 3]
```

**`std.array.groupBy(array, key)`**
Group array elements by property.

```javascript
const grouped = std.array.groupBy(users, 'role');
```

**`std.array.sortBy(array, keys, orders?)`**
Sort array by property.

```javascript
const sorted = std.array.sortBy(users, 'age');
const desc = std.array.sortBy(users, 'age', ['desc']);
```

**`std.array.first(array)`** / **`std.array.last(array)`** / **`std.array.nth(array, n)`**
Get elements by position.

**`std.array.take(array, n)`** / **`std.array.takeLast(array, n)`**
Take first/last n elements.

**`std.array.intersection(...arrays)`** / **`std.array.union(...arrays)`** / **`std.array.difference(array, ...others)`**
Set operations.

**`std.array.sum(array)`** / **`std.array.mean(array)`** / **`std.array.min(array)`** / **`std.array.max(array)`**
Array statistics.

```javascript
std.array.sum([1, 2, 3, 4]) // 10
std.array.mean([1, 2, 3, 4]) // 2.5
```

---

## Validators

### Format Validation

**`std.validate.isEmail(string)`**
Validate email format.

**`std.validate.isURL(string)`**
Validate URL format.

**`std.validate.isUUID(string)`**
Validate UUID format.

**`std.validate.isIP(string)`** / **`std.validate.isIPv4(string)`** / **`std.validate.isIPv6(string)`**
Validate IP addresses.

**`std.validate.isJSON(string)`**
Validate JSON string.

**`std.validate.isBase64(string)`**
Validate Base64 string.

**`std.validate.isDate(string)`**
Validate ISO date format.

**`std.validate.isPhone(string)`**
Validate phone number format.

**`std.validate.isHex(string)`**
Validate hexadecimal string.

**`std.validate.isAlphanumeric(string)`**
Validate alphanumeric string.

### Type Checking

**`std.validate.isNumber(value)`** / **`std.validate.isInteger(value)`**
Check if value is number/integer.

**`std.validate.isBoolean(value)`** / **`std.validate.isString(value)`**
Check if value is boolean/string.

**`std.validate.isArray(value)`** / **`std.validate.isObject(value)`**
Check if value is array/object.

**`std.validate.isNull(value)`** / **`std.validate.isUndefined(value)`**
Check if value is null/undefined.

**`std.validate.isEmpty(value)`**
Check if value is empty (null, undefined, '', [], {}).

### Range Validation

**`std.validate.isLength(string, min, max?)`**
Check if string length is within range.

**`std.validate.isInRange(number, min, max)`**
Check if number is within range.

### Advanced

**`std.validate.matches(string, regex)`**
Validate string matches regex pattern.

```javascript
std.validate.matches('test@example.com', /^[\w.]+@[\w.]+$/)
```

**`std.validate.schema(data, schema)`**
Validate using JSON Schema.

```javascript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 }
  },
  required: ['name', 'age']
};

const result = std.validate.schema(data, schema);
// Returns: { valid: boolean, errors: Array }
```

---

## Advanced Usage

### Direct Lodash Access

For advanced operations, lodash is available:

```javascript
const result = std._.debounce(fn, 1000);
```

---

## Real-World Examples

### Authentication Flow

```javascript
test('authenticate with Basic Auth', async ({ std, request }) => {
  const username = 'testuser';
  const password = std.random.password(16);
  const credentials = std.encode.base64(`${username}:${password}`);

  const response = await request.get('/api/data', {
    headers: { 'Authorization': `Basic ${credentials}` }
  });

  expect(response).toHaveStatus(200);
});
```

### Webhook Signature

```javascript
test('verify webhook signature', async ({ std, request }) => {
  const payload = {
    event: 'user.created',
    timestamp: std.datetime.nowISO(),
    data: { id: std.crypto.uuid() }
  };

  const secret = 'webhook-secret';
  const payloadString = std.encode.json(payload);
  const signature = std.crypto.hmacSHA256(payloadString, secret);

  const response = await request.post('/webhook', payload, {
    headers: { 'X-Signature': signature }
  });

  expect(response).toHaveStatus(200);
});
```

### Data Transformation

```javascript
test('transform and validate user data', async ({ std, request }) => {
  const user = {
    firstName: std.random.firstName(),
    lastName: std.random.lastName(),
    email: std.random.email(),
    createdAt: std.datetime.nowISO()
  };

  // Validate before sending
  expect(std.validate.isEmail(user.email)).toBe(true);
  expect(std.validate.isDate(user.createdAt)).toBe(true);

  // Transform for API
  const apiPayload = std.object.pick(user, ['firstName', 'lastName', 'email']);

  const response = await request.post('/users', apiPayload);
  expect(response).toHaveStatus(201);
});
```

---

## Migration from Postman

If you're migrating from Postman, most utilities work the same way:

| Postman | Iudex |
|---------|-------|
| `pm.encode.base64()` | `std.encode.base64()` |
| `pm.crypto.sha256()` | `std.crypto.sha256()` |
| `pm.random.uuid()` | `std.crypto.uuid()` or `std.random.uuid()` |
| `pm.response.json()` | `response.body` |

---

## See Also

- [Examples Directory](../../iudex-examples/standard-library-demos/)
- [Main README](../README.md)
- [API Testing Guide](./API_TESTING.md)
