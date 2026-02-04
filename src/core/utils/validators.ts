/**
 * Validation Utilities
 * Provides common format validators
 */

import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv.default();

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

/** Schema validation result */
export interface SchemaValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email
 */
export function isEmail(email: unknown): email is string {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL
 */
export function isURL(url: unknown): url is string {
  if (!url || typeof url !== 'string') return false;
  return URL_REGEX.test(url);
}

/**
 * Validate UUID format
 * @param uuid - UUID to validate
 * @returns True if valid UUID
 */
export function isUUID(uuid: unknown): uuid is string {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
}

/**
 * Validate IPv4 address
 * @param ip - IP address to validate
 * @returns True if valid IPv4
 */
export function isIPv4(ip: unknown): ip is string {
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
 * @param ip - IP address to validate
 * @returns True if valid IPv6
 */
export function isIPv6(ip: unknown): ip is string {
  if (!ip || typeof ip !== 'string') return false;
  return IPV6_REGEX.test(ip);
}

/**
 * Validate IP address (v4 or v6)
 * @param ip - IP address to validate
 * @returns True if valid IP
 */
export function isIP(ip: unknown): ip is string {
  return isIPv4(ip) || isIPv6(ip);
}

/**
 * Validate JSON string
 * @param str - String to validate
 * @returns True if valid JSON
 */
export function isJSON(str: unknown): str is string {
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
 * @param str - String to validate
 * @returns True if valid base64
 */
export function isBase64(str: unknown): str is string {
  if (!str || typeof str !== 'string') return false;
  return BASE64_REGEX.test(str);
}

/**
 * Validate ISO date format
 * @param str - String to validate
 * @returns True if valid ISO date
 */
export function isDate(str: unknown): str is string {
  if (!str || typeof str !== 'string') return false;
  if (!ISO_DATE_REGEX.test(str)) return false;

  const date = new Date(str);
  return !isNaN(date.getTime());
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export function isPhone(phone: unknown): phone is string {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces and check for reasonable length
  const cleaned = phone.replace(/\s/g, '');
  return PHONE_REGEX.test(phone) && cleaned.length >= 7 && cleaned.length <= 20;
}

/**
 * Validate hexadecimal string
 * @param str - String to validate
 * @returns True if valid hex
 */
export function isHex(str: unknown): str is string {
  if (!str || typeof str !== 'string') return false;
  return HEX_REGEX.test(str);
}

/**
 * Validate alphanumeric string
 * @param str - String to validate
 * @returns True if alphanumeric
 */
export function isAlphanumeric(str: unknown): str is string {
  if (!str || typeof str !== 'string') return false;
  return ALPHANUMERIC_REGEX.test(str);
}

/**
 * Validate using JSON Schema
 * @param data - Data to validate
 * @param schemaObj - JSON Schema object
 * @returns Validation result { valid: boolean, errors: Array }
 */
export function schema(data: unknown, schemaObj: object): SchemaValidationResult {
  const validate = ajv.compile(schemaObj);
  const valid = validate(data);

  return {
    valid,
    errors: (validate.errors || []) as ErrorObject[]
  };
}

/**
 * Validate string matches regex pattern
 * @param str - String to validate
 * @param pattern - Regex pattern
 * @returns True if matches
 */
export function matches(str: unknown, pattern: RegExp | string): str is string {
  if (!str || typeof str !== 'string') return false;

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regex.test(str);
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is a number
 * @param value - Value to check
 * @returns True if number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is an integer
 * @param value - Value to check
 * @returns True if integer
 */
export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

/**
 * Check if value is a boolean
 * @param value - Value to check
 * @returns True if boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a string
 * @param value - Value to check
 * @returns True if string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is an array
 * @param value - Value to check
 * @returns True if array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is an object
 * @param value - Value to check
 * @returns True if object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is null
 * @param value - Value to check
 * @returns True if null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 * @param value - Value to check
 * @returns True if undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if string length is within range
 * @param str - String to check
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns True if length is valid
 */
export function isLength(str: unknown, min: number, max = Infinity): str is string {
  if (typeof str !== 'string') return false;
  const length = str.length;
  return length >= min && length <= max;
}

/**
 * Check if number is within range
 * @param num - Number to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if in range
 */
export function isInRange(num: unknown, min: number, max: number): num is number {
  if (!isNumber(num)) return false;
  return num >= min && num <= max;
}
