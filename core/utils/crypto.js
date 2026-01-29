/**
 * Cryptography Utilities
 * Provides hashing, HMAC, UUID, and random byte generation
 * Uses Node.js built-in crypto module
 */

import { createHash, createHmac, randomBytes as nodeRandomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Internal helper to create hash
 * @param {string} algorithm - Hash algorithm
 * @param {string} str - String to hash
 * @returns {string} Hash (hex)
 */
function createHashString(algorithm, str) {
  if (str === null || str === undefined) {
    throw new Error('Cannot hash null or undefined');
  }
  return createHash(algorithm).update(String(str)).digest('hex');
}

/**
 * Internal helper to create HMAC
 * @param {string} algorithm - HMAC algorithm
 * @param {string} str - String to sign
 * @param {string} key - Secret key
 * @returns {string} HMAC signature (hex)
 */
function createHmacString(algorithm, str, key) {
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
 * @param {string} str - String to hash
 * @returns {string} MD5 hash (hex)
 */
export function md5(str) {
  return createHashString('md5', str);
}

/**
 * Generate SHA-1 hash
 * @param {string} str - String to hash
 * @returns {string} SHA-1 hash (hex)
 */
export function sha1(str) {
  return createHashString('sha1', str);
}

/**
 * Generate SHA-256 hash
 * @param {string} str - String to hash
 * @returns {string} SHA-256 hash (hex)
 */
export function sha256(str) {
  return createHashString('sha256', str);
}

/**
 * Generate SHA-512 hash
 * @param {string} str - String to hash
 * @returns {string} SHA-512 hash (hex)
 */
export function sha512(str) {
  return createHashString('sha512', str);
}

/**
 * Generate HMAC-SHA1
 * @param {string} str - String to sign
 * @param {string} key - Secret key
 * @returns {string} HMAC signature (hex)
 */
export function hmacSHA1(str, key) {
  return createHmacString('sha1', str, key);
}

/**
 * Generate HMAC-SHA256
 * @param {string} str - String to sign
 * @param {string} key - Secret key
 * @returns {string} HMAC signature (hex)
 */
export function hmacSHA256(str, key) {
  return createHmacString('sha256', str, key);
}

/**
 * Generate HMAC-SHA512
 * @param {string} str - String to sign
 * @param {string} key - Secret key
 * @returns {string} HMAC signature (hex)
 */
export function hmacSHA512(str, key) {
  return createHmacString('sha512', str, key);
}

/**
 * Generate UUID v4
 * @returns {string} UUID v4
 */
export function uuid() {
  return uuidv4();
}

/**
 * Generate random bytes
 * @param {number} size - Number of bytes to generate
 * @returns {string} Random bytes (hex)
 */
export function randomBytes(size = 16) {
  if (typeof size !== 'number' || size <= 0) {
    throw new Error('Size must be a positive number');
  }
  return nodeRandomBytes(size).toString('hex');
}
