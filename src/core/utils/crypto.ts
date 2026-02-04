/**
 * Cryptography Utilities
 * Provides hashing, HMAC, UUID, and random byte generation
 * Uses Node.js built-in crypto module
 */

import { createHash, createHmac, randomBytes as nodeRandomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Internal helper to create hash
 * @param algorithm - Hash algorithm
 * @param str - String to hash
 * @returns Hash (hex)
 */
function createHashString(algorithm: string, str: string | null | undefined): string {
  if (str === null || str === undefined) {
    throw new Error('Cannot hash null or undefined');
  }
  return createHash(algorithm).update(String(str)).digest('hex');
}

/**
 * Internal helper to create HMAC
 * @param algorithm - HMAC algorithm
 * @param str - String to sign
 * @param key - Secret key
 * @returns HMAC signature (hex)
 */
function createHmacString(
  algorithm: string,
  str: string | null | undefined,
  key: string | null | undefined
): string {
  if (str === null || str === undefined) {
    throw new Error('Cannot sign null or undefined');
  }
  if (key === null || key === undefined) {
    throw new Error('HMAC key is required');
  }
  return createHmac(algorithm, String(key)).update(String(str)).digest('hex');
}

/**
 * Generate MD5 hash
 * @param str - String to hash
 * @returns MD5 hash (hex)
 */
export function md5(str: string): string {
  return createHashString('md5', str);
}

/**
 * Generate SHA-1 hash
 * @param str - String to hash
 * @returns SHA-1 hash (hex)
 */
export function sha1(str: string): string {
  return createHashString('sha1', str);
}

/**
 * Generate SHA-256 hash
 * @param str - String to hash
 * @returns SHA-256 hash (hex)
 */
export function sha256(str: string): string {
  return createHashString('sha256', str);
}

/**
 * Generate SHA-512 hash
 * @param str - String to hash
 * @returns SHA-512 hash (hex)
 */
export function sha512(str: string): string {
  return createHashString('sha512', str);
}

/**
 * Generate HMAC-SHA1
 * @param str - String to sign
 * @param key - Secret key
 * @returns HMAC signature (hex)
 */
export function hmacSHA1(str: string, key: string): string {
  return createHmacString('sha1', str, key);
}

/**
 * Generate HMAC-SHA256
 * @param str - String to sign
 * @param key - Secret key
 * @returns HMAC signature (hex)
 */
export function hmacSHA256(str: string, key: string): string {
  return createHmacString('sha256', str, key);
}

/**
 * Generate HMAC-SHA512
 * @param str - String to sign
 * @param key - Secret key
 * @returns HMAC signature (hex)
 */
export function hmacSHA512(str: string, key: string): string {
  return createHmacString('sha512', str, key);
}

/**
 * Generate UUID v4
 * @returns UUID v4
 */
export function uuid(): string {
  return uuidv4();
}

/**
 * Generate random bytes
 * @param size - Number of bytes to generate
 * @returns Random bytes (hex)
 */
export function randomBytes(size = 16): string {
  if (typeof size !== 'number' || size <= 0) {
    throw new Error('Size must be a positive number');
  }
  return nodeRandomBytes(size).toString('hex');
}
