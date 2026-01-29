/**
 * Unit tests for crypto utilities
 */

import * as crypto from './crypto.js';

describe('Crypto Utilities', () => {
  describe('md5', () => {
    test('should generate MD5 hash', () => {
      const hash = crypto.md5('hello');
      expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    test('should generate consistent hashes', () => {
      const hash1 = crypto.md5('test');
      const hash2 = crypto.md5('test');
      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different inputs', () => {
      const hash1 = crypto.md5('hello');
      const hash2 = crypto.md5('world');
      expect(hash1).not.toBe(hash2);
    });

    test('should generate 32 character hex string', () => {
      const hash = crypto.md5('test');
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.md5(null)).toThrow('Cannot hash null or undefined');
      expect(() => crypto.md5(undefined)).toThrow('Cannot hash null or undefined');
    });

    test('should handle empty string', () => {
      const hash = crypto.md5('');
      expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    test('should handle unicode characters', () => {
      const hash = crypto.md5('Hello 世界');
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('sha1', () => {
    test('should generate SHA-1 hash', () => {
      const hash = crypto.sha1('hello');
      expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    });

    test('should generate 40 character hex string', () => {
      const hash = crypto.sha1('test');
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });

    test('should be deterministic', () => {
      const hash1 = crypto.sha1('data');
      const hash2 = crypto.sha1('data');
      expect(hash1).toBe(hash2);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.sha1(null)).toThrow('Cannot hash null or undefined');
      expect(() => crypto.sha1(undefined)).toThrow('Cannot hash null or undefined');
    });
  });

  describe('sha256', () => {
    test('should generate SHA-256 hash', () => {
      const hash = crypto.sha256('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    test('should generate 64 character hex string', () => {
      const hash = crypto.sha256('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should be deterministic', () => {
      const hash1 = crypto.sha256('data');
      const hash2 = crypto.sha256('data');
      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different inputs', () => {
      const hash1 = crypto.sha256('hello');
      const hash2 = crypto.sha256('world');
      expect(hash1).not.toBe(hash2);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.sha256(null)).toThrow('Cannot hash null or undefined');
      expect(() => crypto.sha256(undefined)).toThrow('Cannot hash null or undefined');
    });

    test('should handle empty string', () => {
      const hash = crypto.sha256('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('sha512', () => {
    test('should generate SHA-512 hash', () => {
      const hash = crypto.sha512('hello');
      expect(hash).toMatch(/^[a-f0-9]{128}$/);
    });

    test('should generate 128 character hex string', () => {
      const hash = crypto.sha512('test');
      expect(hash).toMatch(/^[a-f0-9]{128}$/);
      expect(hash.length).toBe(128);
    });

    test('should be deterministic', () => {
      const hash1 = crypto.sha512('data');
      const hash2 = crypto.sha512('data');
      expect(hash1).toBe(hash2);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.sha512(null)).toThrow('Cannot hash null or undefined');
      expect(() => crypto.sha512(undefined)).toThrow('Cannot hash null or undefined');
    });
  });

  describe('hmacSHA1', () => {
    test('should generate HMAC-SHA1 signature', () => {
      const hmac = crypto.hmacSHA1('message', 'secret');
      expect(hmac).toMatch(/^[a-f0-9]{40}$/);
    });

    test('should be deterministic with same key', () => {
      const hmac1 = crypto.hmacSHA1('message', 'secret');
      const hmac2 = crypto.hmacSHA1('message', 'secret');
      expect(hmac1).toBe(hmac2);
    });

    test('should generate different signatures for different keys', () => {
      const hmac1 = crypto.hmacSHA1('message', 'secret1');
      const hmac2 = crypto.hmacSHA1('message', 'secret2');
      expect(hmac1).not.toBe(hmac2);
    });

    test('should generate different signatures for different messages', () => {
      const hmac1 = crypto.hmacSHA1('message1', 'secret');
      const hmac2 = crypto.hmacSHA1('message2', 'secret');
      expect(hmac1).not.toBe(hmac2);
    });

    test('should throw error for null/undefined message', () => {
      expect(() => crypto.hmacSHA1(null, 'key')).toThrow('Cannot sign null or undefined');
      expect(() => crypto.hmacSHA1(undefined, 'key')).toThrow('Cannot sign null or undefined');
    });

    test('should throw error for null/undefined key', () => {
      expect(() => crypto.hmacSHA1('message', null)).toThrow('HMAC key is required');
      expect(() => crypto.hmacSHA1('message', undefined)).toThrow('HMAC key is required');
    });
  });

  describe('hmacSHA256', () => {
    test('should generate HMAC-SHA256 signature', () => {
      const hmac = crypto.hmacSHA256('message', 'secret');
      expect(hmac).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should be deterministic', () => {
      const hmac1 = crypto.hmacSHA256('message', 'secret');
      const hmac2 = crypto.hmacSHA256('message', 'secret');
      expect(hmac1).toBe(hmac2);
    });

    test('should generate different signatures for different keys', () => {
      const hmac1 = crypto.hmacSHA256('message', 'secret1');
      const hmac2 = crypto.hmacSHA256('message', 'secret2');
      expect(hmac1).not.toBe(hmac2);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.hmacSHA256(null, 'key')).toThrow('Cannot sign null or undefined');
      expect(() => crypto.hmacSHA256('message', null)).toThrow('HMAC key is required');
    });

    test('should handle empty string message', () => {
      const hmac = crypto.hmacSHA256('', 'secret');
      expect(hmac).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('hmacSHA512', () => {
    test('should generate HMAC-SHA512 signature', () => {
      const hmac = crypto.hmacSHA512('message', 'secret');
      expect(hmac).toMatch(/^[a-f0-9]{128}$/);
    });

    test('should be deterministic', () => {
      const hmac1 = crypto.hmacSHA512('message', 'secret');
      const hmac2 = crypto.hmacSHA512('message', 'secret');
      expect(hmac1).toBe(hmac2);
    });

    test('should throw error for null/undefined', () => {
      expect(() => crypto.hmacSHA512(null, 'key')).toThrow('Cannot sign null or undefined');
      expect(() => crypto.hmacSHA512('message', null)).toThrow('HMAC key is required');
    });
  });

  describe('uuid', () => {
    test('should generate valid UUID v4', () => {
      const uuid = crypto.uuid();
      expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    });

    test('should generate unique UUIDs', () => {
      const uuid1 = crypto.uuid();
      const uuid2 = crypto.uuid();
      expect(uuid1).not.toBe(uuid2);
    });

    test('should generate correct length', () => {
      const uuid = crypto.uuid();
      expect(uuid.length).toBe(36);
    });

    test('should generate multiple unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(crypto.uuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('randomBytes', () => {
    test('should generate random bytes as hex string', () => {
      const bytes = crypto.randomBytes(16);
      expect(bytes).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should generate correct length (2 hex chars per byte)', () => {
      expect(crypto.randomBytes(8).length).toBe(16);
      expect(crypto.randomBytes(16).length).toBe(32);
      expect(crypto.randomBytes(32).length).toBe(64);
    });

    test('should generate unique random bytes', () => {
      const bytes1 = crypto.randomBytes(16);
      const bytes2 = crypto.randomBytes(16);
      expect(bytes1).not.toBe(bytes2);
    });

    test('should throw error for invalid size', () => {
      expect(() => crypto.randomBytes(0)).toThrow('Size must be a positive number');
      expect(() => crypto.randomBytes(-1)).toThrow('Size must be a positive number');
      expect(() => crypto.randomBytes('invalid')).toThrow('Size must be a positive number');
    });

    test('should handle default size', () => {
      const bytes = crypto.randomBytes();
      expect(bytes).toMatch(/^[a-f0-9]{32}$/); // 16 bytes default
    });

    test('should handle large sizes', () => {
      const bytes = crypto.randomBytes(256);
      expect(bytes.length).toBe(512);
      expect(bytes).toMatch(/^[a-f0-9]+$/);
    });
  });
});
