/**
 * Unit tests for validator utilities
 */

import * as validators from './validators.js';

describe('Validator Utilities', () => {
  describe('isEmail', () => {
    test('should validate correct emails', () => {
      expect(validators.isEmail('test@example.com')).toBe(true);
      expect(validators.isEmail('user+tag@domain.co.uk')).toBe(true);
      expect(validators.isEmail('first.last@example.com')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validators.isEmail('invalid')).toBe(false);
      expect(validators.isEmail('test@')).toBe(false);
      expect(validators.isEmail('@example.com')).toBe(false);
      expect(validators.isEmail('test @example.com')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isEmail(null)).toBe(false);
      expect(validators.isEmail(undefined)).toBe(false);
      expect(validators.isEmail('')).toBe(false);
    });
  });

  describe('isURL', () => {
    test('should validate correct URLs', () => {
      expect(validators.isURL('https://example.com')).toBe(true);
      expect(validators.isURL('http://localhost:3000')).toBe(true);
      expect(validators.isURL('https://sub.domain.com/path')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(validators.isURL('ftp://example.com')).toBe(false);
      expect(validators.isURL('not-a-url')).toBe(false);
      expect(validators.isURL('example.com')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isURL(null)).toBe(false);
      expect(validators.isURL(undefined)).toBe(false);
    });
  });

  describe('isUUID', () => {
    test('should validate correct UUIDs', () => {
      expect(validators.isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validators.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('should reject invalid UUIDs', () => {
      expect(validators.isUUID('not-a-uuid')).toBe(false);
      expect(validators.isUUID('123e4567-e89b-12d3')).toBe(false);
      expect(validators.isUUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isUUID(null)).toBe(false);
      expect(validators.isUUID(undefined)).toBe(false);
    });
  });

  describe('IP validation', () => {
    test('isIPv4 should validate correct IPv4', () => {
      expect(validators.isIPv4('192.168.1.1')).toBe(true);
      expect(validators.isIPv4('255.255.255.255')).toBe(true);
      expect(validators.isIPv4('0.0.0.0')).toBe(true);
    });

    test('isIPv4 should reject invalid IPv4', () => {
      expect(validators.isIPv4('256.1.1.1')).toBe(false);
      expect(validators.isIPv4('192.168.1')).toBe(false);
      expect(validators.isIPv4('not-an-ip')).toBe(false);
    });

    test('isIPv6 should validate IPv6 format', () => {
      expect(validators.isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    test('isIP should validate both IPv4 and IPv6', () => {
      expect(validators.isIP('192.168.1.1')).toBe(true);
      expect(validators.isIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(validators.isIP('not-an-ip')).toBe(false);
    });
  });

  describe('isJSON', () => {
    test('should validate correct JSON strings', () => {
      expect(validators.isJSON('{"key":"value"}')).toBe(true);
      expect(validators.isJSON('[1,2,3]')).toBe(true);
      expect(validators.isJSON('null')).toBe(true);
      expect(validators.isJSON('true')).toBe(true);
      expect(validators.isJSON('123')).toBe(true);
    });

    test('should reject invalid JSON', () => {
      expect(validators.isJSON('not json')).toBe(false);
      expect(validators.isJSON('{key: value}')).toBe(false);
      expect(validators.isJSON("{'key': 'value'}")).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isJSON(null)).toBe(false);
      expect(validators.isJSON(undefined)).toBe(false);
      expect(validators.isJSON('')).toBe(false);
    });
  });

  describe('isBase64', () => {
    test('should validate base64 strings', () => {
      expect(validators.isBase64('SGVsbG8=')).toBe(true);
      expect(validators.isBase64('aGVsbG8=')).toBe(true);
      expect(validators.isBase64('YWJjMTIz')).toBe(true);
    });

    test('should reject invalid base64', () => {
      expect(validators.isBase64('not-base64!@#')).toBe(false);
      expect(validators.isBase64('hello world')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isBase64(null)).toBe(false);
      expect(validators.isBase64(undefined)).toBe(false);
    });
  });

  describe('isDate', () => {
    test('should validate ISO date formats', () => {
      expect(validators.isDate('2024-01-15')).toBe(true);
      expect(validators.isDate('2024-01-15T10:30:00Z')).toBe(true);
      expect(validators.isDate('2024-01-15T10:30:00.123Z')).toBe(true);
    });

    test('should reject invalid dates', () => {
      expect(validators.isDate('invalid-date')).toBe(false);
      expect(validators.isDate('2024-13-45')).toBe(false);
      expect(validators.isDate('32/01/2024')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isDate(null)).toBe(false);
      expect(validators.isDate(undefined)).toBe(false);
    });
  });

  describe('isPhone', () => {
    test('should validate phone number formats', () => {
      expect(validators.isPhone('+1-555-123-4567')).toBe(true);
      expect(validators.isPhone('555-123-4567')).toBe(true);
      expect(validators.isPhone('(555) 123-4567')).toBe(true);
      expect(validators.isPhone('5551234567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validators.isPhone('abc')).toBe(false);
      expect(validators.isPhone('123')).toBe(false); // Too short
      expect(validators.isPhone('x'.repeat(30))).toBe(false); // Too long
    });

    test('should handle null/undefined', () => {
      expect(validators.isPhone(null)).toBe(false);
      expect(validators.isPhone(undefined)).toBe(false);
    });
  });

  describe('isHex', () => {
    test('should validate hex strings', () => {
      expect(validators.isHex('deadbeef')).toBe(true);
      expect(validators.isHex('123ABC')).toBe(true);
      expect(validators.isHex('0123456789abcdef')).toBe(true);
    });

    test('should reject invalid hex', () => {
      expect(validators.isHex('not-hex')).toBe(false);
      expect(validators.isHex('xyz')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isHex(null)).toBe(false);
      expect(validators.isHex(undefined)).toBe(false);
    });
  });

  describe('isAlphanumeric', () => {
    test('should validate alphanumeric strings', () => {
      expect(validators.isAlphanumeric('abc123')).toBe(true);
      expect(validators.isAlphanumeric('ABC')).toBe(true);
      expect(validators.isAlphanumeric('123')).toBe(true);
    });

    test('should reject non-alphanumeric', () => {
      expect(validators.isAlphanumeric('abc-123')).toBe(false);
      expect(validators.isAlphanumeric('abc 123')).toBe(false);
      expect(validators.isAlphanumeric('abc@123')).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.isAlphanumeric(null)).toBe(false);
      expect(validators.isAlphanumeric(undefined)).toBe(false);
    });
  });

  describe('type checking', () => {
    test('isNumber', () => {
      expect(validators.isNumber(42)).toBe(true);
      expect(validators.isNumber(3.14)).toBe(true);
      expect(validators.isNumber(0)).toBe(true);
      expect(validators.isNumber('42')).toBe(false);
      expect(validators.isNumber(NaN)).toBe(false);
    });

    test('isInteger', () => {
      expect(validators.isInteger(42)).toBe(true);
      expect(validators.isInteger(0)).toBe(true);
      expect(validators.isInteger(-5)).toBe(true);
      expect(validators.isInteger(3.14)).toBe(false);
    });

    test('isBoolean', () => {
      expect(validators.isBoolean(true)).toBe(true);
      expect(validators.isBoolean(false)).toBe(true);
      expect(validators.isBoolean(1)).toBe(false);
      expect(validators.isBoolean('true')).toBe(false);
    });

    test('isString', () => {
      expect(validators.isString('hello')).toBe(true);
      expect(validators.isString('')).toBe(true);
      expect(validators.isString(123)).toBe(false);
    });

    test('isArray', () => {
      expect(validators.isArray([1, 2, 3])).toBe(true);
      expect(validators.isArray([])).toBe(true);
      expect(validators.isArray('array')).toBe(false);
    });

    test('isObject', () => {
      expect(validators.isObject({ a: 1 })).toBe(true);
      expect(validators.isObject({})).toBe(true);
      expect(validators.isObject([1, 2])).toBe(false);
      expect(validators.isObject(null)).toBe(false);
    });

    test('isNull', () => {
      expect(validators.isNull(null)).toBe(true);
      expect(validators.isNull(undefined)).toBe(false);
      expect(validators.isNull(0)).toBe(false);
    });

    test('isUndefined', () => {
      expect(validators.isUndefined(undefined)).toBe(true);
      expect(validators.isUndefined(null)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('should detect empty values', () => {
      expect(validators.isEmpty(null)).toBe(true);
      expect(validators.isEmpty(undefined)).toBe(true);
      expect(validators.isEmpty('')).toBe(true);
      expect(validators.isEmpty('   ')).toBe(true);
      expect(validators.isEmpty([])).toBe(true);
      expect(validators.isEmpty({})).toBe(true);
    });

    test('should detect non-empty values', () => {
      expect(validators.isEmpty('hello')).toBe(false);
      expect(validators.isEmpty([1])).toBe(false);
      expect(validators.isEmpty({ a: 1 })).toBe(false);
      expect(validators.isEmpty(0)).toBe(false);
      expect(validators.isEmpty(false)).toBe(false);
    });
  });

  describe('isLength', () => {
    test('should check string length', () => {
      expect(validators.isLength('hello', 5)).toBe(true);
      expect(validators.isLength('hello', 3, 10)).toBe(true);
      expect(validators.isLength('hello', 10)).toBe(false);
    });

    test('should handle min and max', () => {
      expect(validators.isLength('test', 1, 10)).toBe(true);
      expect(validators.isLength('test', 5, 10)).toBe(false);
    });

    test('should handle non-strings', () => {
      expect(validators.isLength(123, 3)).toBe(false);
      expect(validators.isLength(null, 5)).toBe(false);
    });
  });

  describe('isInRange', () => {
    test('should check number range', () => {
      expect(validators.isInRange(5, 1, 10)).toBe(true);
      expect(validators.isInRange(1, 1, 10)).toBe(true);
      expect(validators.isInRange(10, 1, 10)).toBe(true);
      expect(validators.isInRange(0, 1, 10)).toBe(false);
      expect(validators.isInRange(11, 1, 10)).toBe(false);
    });

    test('should handle non-numbers', () => {
      expect(validators.isInRange('5', 1, 10)).toBe(false);
      expect(validators.isInRange(null, 1, 10)).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match regex pattern', () => {
      expect(validators.matches('test@example.com', /^[\w.]+@[\w.]+$/)).toBe(true);
      expect(validators.matches('hello123', /^[a-z]+\d+$/)).toBe(true);
    });

    test('should handle string patterns', () => {
      expect(validators.matches('test123', '^[a-z]+\\d+$')).toBe(true);
    });

    test('should reject non-matching strings', () => {
      expect(validators.matches('abc', /^\d+$/)).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(validators.matches(null, /test/)).toBe(false);
      expect(validators.matches(undefined, /test/)).toBe(false);
    });
  });

  describe('schema', () => {
    test('should validate against JSON Schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      };

      const validData = { name: 'John', age: 30 };
      const result = validators.schema(validData, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect schema violations', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number', minimum: 0 }
        },
        required: ['name', 'age']
      };

      const invalidData = { name: 'John' }; // Missing age
      const result = validators.schema(invalidData, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate type constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number' }
        }
      };

      const invalidData = { age: 'not a number' };
      const result = validators.schema(invalidData, schema);
      expect(result.valid).toBe(false);
    });

    test('should validate nested schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        }
      };

      const validData = { user: { name: 'John' } };
      const result = validators.schema(validData, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle empty strings', () => {
      expect(validators.isEmail('')).toBe(false);
      expect(validators.isURL('')).toBe(false);
      expect(validators.isJSON('')).toBe(false);
    });

    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(validators.isAlphanumeric(longString)).toBe(true);
      expect(validators.isLength(longString, 10000)).toBe(true);
    });

    test('should handle special characters', () => {
      expect(validators.isEmail('test+tag@example.com')).toBe(true);
      expect(validators.isURL('https://example.com/path?query=value')).toBe(true);
    });

    test('should handle unicode characters', () => {
      expect(validators.isString('Hello 世界')).toBe(true);
      expect(validators.isEmpty('世界')).toBe(false);
    });
  });
});
