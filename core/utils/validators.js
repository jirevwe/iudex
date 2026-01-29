/**
 * Validation Utilities
 * Provides common format validators
 */

import Ajv from 'ajv';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv();

// Regular expressions for common validations
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i;
const HEX_REGEX = /^[0-9a-f]+$/i;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]+$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isURL(url) {
  if (!url || typeof url !== 'string') return false;
  return URL_REGEX.test(url);
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export function isUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
}

/**
 * Validate IPv4 address
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IPv4
 */
export function isIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  if (!IPV4_REGEX.test(ip)) return false;

  // Check each octet is 0-255
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate IPv6 address
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IPv6
 */
export function isIPv6(ip) {
  if (!ip || typeof ip !== 'string') return false;
  return IPV6_REGEX.test(ip);
}

/**
 * Validate IP address (v4 or v6)
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP
 */
export function isIP(ip) {
  return isIPv4(ip) || isIPv6(ip);
}

/**
 * Validate JSON string
 * @param {string} str - String to validate
 * @returns {boolean} True if valid JSON
 */
export function isJSON(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate base64 string
 * @param {string} str - String to validate
 * @returns {boolean} True if valid base64
 */
export function isBase64(str) {
  if (!str || typeof str !== 'string') return false;
  return BASE64_REGEX.test(str);
}

/**
 * Validate ISO date format
 * @param {string} str - String to validate
 * @returns {boolean} True if valid ISO date
 */
export function isDate(str) {
  if (!str || typeof str !== 'string') return false;
  if (!ISO_DATE_REGEX.test(str)) return false;

  const date = new Date(str);
  return !isNaN(date.getTime());
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export function isPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces and check for reasonable length
  const cleaned = phone.replace(/\s/g, '');
  return PHONE_REGEX.test(phone) && cleaned.length >= 7 && cleaned.length <= 20;
}

/**
 * Validate hexadecimal string
 * @param {string} str - String to validate
 * @returns {boolean} True if valid hex
 */
export function isHex(str) {
  if (!str || typeof str !== 'string') return false;
  return HEX_REGEX.test(str);
}

/**
 * Validate alphanumeric string
 * @param {string} str - String to validate
 * @returns {boolean} True if alphanumeric
 */
export function isAlphanumeric(str) {
  if (!str || typeof str !== 'string') return false;
  return ALPHANUMERIC_REGEX.test(str);
}

/**
 * Validate using JSON Schema
 * @param {*} data - Data to validate
 * @param {Object} schema - JSON Schema object
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function schema(data, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || []
  };
}

/**
 * Validate string matches regex pattern
 * @param {string} str - String to validate
 * @param {RegExp|string} pattern - Regex pattern
 * @returns {boolean} True if matches
 */
export function matches(str, pattern) {
  if (!str || typeof str !== 'string') return false;

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regex.test(str);
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is a number
 * @param {*} value - Value to check
 * @returns {boolean} True if number
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is an integer
 * @param {*} value - Value to check
 * @returns {boolean} True if integer
 */
export function isInteger(value) {
  return Number.isInteger(value);
}

/**
 * Check if value is a boolean
 * @param {*} value - Value to check
 * @returns {boolean} True if boolean
 */
export function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Check if value is a string
 * @param {*} value - Value to check
 * @returns {boolean} True if string
 */
export function isString(value) {
  return typeof value === 'string';
}

/**
 * Check if value is an array
 * @param {*} value - Value to check
 * @returns {boolean} True if array
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * Check if value is an object
 * @param {*} value - Value to check
 * @returns {boolean} True if object
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is null
 * @param {*} value - Value to check
 * @returns {boolean} True if null
 */
export function isNull(value) {
  return value === null;
}

/**
 * Check if value is undefined
 * @param {*} value - Value to check
 * @returns {boolean} True if undefined
 */
export function isUndefined(value) {
  return value === undefined;
}

/**
 * Check if string length is within range
 * @param {string} str - String to check
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} True if length is valid
 */
export function isLength(str, min, max = Infinity) {
  if (typeof str !== 'string') return false;
  const length = str.length;
  return length >= min && length <= max;
}

/**
 * Check if number is within range
 * @param {number} num - Number to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if in range
 */
export function isInRange(num, min, max) {
  if (!isNumber(num)) return false;
  return num >= min && num <= max;
}
