/**
 * Unit tests for encoding utilities
 */

import { encode, decode } from './encoding.js';

describe('Encoding Utilities', () => {
  describe('base64', () => {
    test('should encode string to base64', () => {
      expect(encode.base64('hello')).toBe('aGVsbG8=');
      expect(encode.base64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    test('should encode empty string', () => {
      expect(encode.base64('')).toBe('');
    });

    test('should encode special characters', () => {
      const encoded = encode.base64('hello@#$%^&*()');
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
    });

    test('should decode base64 to string', () => {
      expect(decode.base64('aGVsbG8=')).toBe('hello');
      expect(decode.base64('SGVsbG8sIFdvcmxkIQ==')).toBe('Hello, World!');
    });

    test('should handle roundtrip encoding/decoding', () => {
      const original = 'Test string with special chars: @#$%';
      const encoded = encode.base64(original);
      const decoded = decode.base64(encoded);
      expect(decoded).toBe(original);
    });

    test('should throw error for null/undefined on encode', () => {
      expect(() => encode.base64(null)).toThrow('Cannot encode null or undefined');
      expect(() => encode.base64(undefined)).toThrow('Cannot encode null or undefined');
    });

    test('should throw error for null/undefined on decode', () => {
      expect(() => decode.base64(null)).toThrow('Cannot decode null or undefined');
      expect(() => decode.base64(undefined)).toThrow('Cannot decode null or undefined');
    });

    test('should handle unicode characters', () => {
      const unicode = 'Hello 世界 🌍';
      const encoded = encode.base64(unicode);
      const decoded = decode.base64(encoded);
      expect(decoded).toBe(unicode);
    });
  });

  describe('url', () => {
    test('should encode URL string', () => {
      expect(encode.url('hello world')).toBe('hello%20world');
      expect(encode.url('hello@example.com')).toBe('hello%40example.com');
    });

    test('should encode special URL characters', () => {
      expect(encode.url('a&b=c')).toBe('a%26b%3Dc');
      expect(encode.url('hello/world')).toBe('hello%2Fworld');
    });

    test('should encode empty string', () => {
      expect(encode.url('')).toBe('');
    });

    test('should decode URL string', () => {
      expect(decode.url('hello%20world')).toBe('hello world');
      expect(decode.url('hello%40example.com')).toBe('hello@example.com');
    });

    test('should handle roundtrip URL encoding/decoding', () => {
      const original = 'hello world & special=chars';
      const encoded = encode.url(original);
      const decoded = decode.url(encoded);
      expect(decoded).toBe(original);
    });

    test('should handle null/undefined gracefully', () => {
      expect(encode.url(null)).toBe('');
      expect(encode.url(undefined)).toBe('');
      expect(decode.url(null)).toBe('');
      expect(decode.url(undefined)).toBe('');
    });

    test('should throw on invalid URL encoded string', () => {
      expect(() => decode.url('%E0%A4%A')).toThrow('Invalid URL encoded string');
    });
  });

  describe('json', () => {
    test('should encode object to JSON', () => {
      expect(encode.json({ a: 1 })).toBe('{"a":1}');
      expect(encode.json({ name: 'test', value: 123 })).toBe('{"name":"test","value":123}');
    });

    test('should encode array to JSON', () => {
      expect(encode.json([1, 2, 3])).toBe('[1,2,3]');
      expect(encode.json(['a', 'b', 'c'])).toBe('["a","b","c"]');
    });

    test('should encode with pretty formatting', () => {
      const obj = { a: 1, b: 2 };
      const pretty = encode.json(obj, true);
      expect(pretty).toContain('\n');
      expect(pretty).toContain('  ');
    });

    test('should encode nested objects', () => {
      const nested = { user: { name: 'John', age: 30 } };
      const encoded = encode.json(nested);
      expect(encoded).toBe('{"user":{"name":"John","age":30}}');
    });

    test('should decode JSON string to object', () => {
      expect(decode.json('{"a":1}')).toEqual({ a: 1 });
      expect(decode.json('{"name":"test"}')).toEqual({ name: 'test' });
    });

    test('should decode JSON array', () => {
      expect(decode.json('[1,2,3]')).toEqual([1, 2, 3]);
      expect(decode.json('["a","b"]')).toEqual(['a', 'b']);
    });

    test('should handle roundtrip JSON encoding/decoding', () => {
      const original = { user: { name: 'John', items: [1, 2, 3] } };
      const encoded = encode.json(original);
      const decoded = decode.json(encoded);
      expect(decoded).toEqual(original);
    });

    test('should throw error for circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;
      expect(() => encode.json(circular)).toThrow('Failed to encode JSON');
    });

    test('should throw error for invalid JSON on decode', () => {
      expect(() => decode.json('{invalid}')).toThrow('Invalid JSON string');
      expect(() => decode.json('not json')).toThrow('Invalid JSON string');
    });

    test('should throw error for null/undefined/empty on decode', () => {
      expect(() => decode.json(null)).toThrow('Cannot decode empty or null');
      expect(() => decode.json(undefined)).toThrow('Cannot decode empty or null');
      expect(() => decode.json('')).toThrow('Cannot decode empty or null');
    });

    test('should encode primitive values', () => {
      expect(encode.json(null)).toBe('null');
      expect(encode.json(true)).toBe('true');
      expect(encode.json(123)).toBe('123');
      expect(encode.json('string')).toBe('"string"');
    });
  });
});
