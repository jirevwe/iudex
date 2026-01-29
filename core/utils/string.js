/**
 * String Manipulation Utilities
 * Provides case conversion, truncation, padding, and more
 */

import _ from 'lodash';

/**
 * Convert string to camelCase
 * @param {string} str - String to convert
 * @returns {string} camelCase string
 */
export function camelCase(str) {
  return _.camelCase(str);
}

/**
 * Convert string to PascalCase
 * @param {string} str - String to convert
 * @returns {string} PascalCase string
 */
export function pascalCase(str) {
  const camel = _.camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to snake_case
 * @param {string} str - String to convert
 * @returns {string} snake_case string
 */
export function snakeCase(str) {
  return _.snakeCase(str);
}

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} kebab-case string
 */
export function kebabCase(str) {
  return _.kebabCase(str);
}

/**
 * Convert string to CONSTANT_CASE
 * @param {string} str - String to convert
 * @returns {string} CONSTANT_CASE string
 */
export function constantCase(str) {
  return _.snakeCase(str).toUpperCase();
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  return _.capitalize(str);
}

/**
 * Convert string to Title Case
 * @param {string} str - String to convert
 * @returns {string} Title Case string
 */
export function titleCase(str) {
  return _.startCase(str);
}

/**
 * Convert string to lowercase
 * @param {string} str - String to convert
 * @returns {string} Lowercase string
 */
export function lowerCase(str) {
  return _.lowerCase(str);
}

/**
 * Convert string to UPPERCASE
 * @param {string} str - String to convert
 * @returns {string} Uppercase string
 */
export function upperCase(str) {
  return _.upperCase(str);
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to append (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, length = 30, suffix = '...') {
  if (!str || str.length <= length) {
    return str;
  }
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Pad string to specified length (left)
 * @param {string} str - String to pad
 * @param {number} length - Target length
 * @param {string} char - Character to pad with (default: ' ')
 * @returns {string} Padded string
 */
export function padLeft(str, length, char = ' ') {
  return _.padStart(str, length, char);
}

/**
 * Pad string to specified length (right)
 * @param {string} str - String to pad
 * @param {number} length - Target length
 * @param {string} char - Character to pad with (default: ' ')
 * @returns {string} Padded string
 */
export function padRight(str, length, char = ' ') {
  return _.padEnd(str, length, char);
}

/**
 * Reverse a string
 * @param {string} str - String to reverse
 * @returns {string} Reversed string
 */
export function reverse(str) {
  if (!str) return str;
  return str.split('').reverse().join('');
}

/**
 * Repeat string n times
 * @param {string} str - String to repeat
 * @param {number} times - Number of times to repeat
 * @returns {string} Repeated string
 */
export function repeat(str, times) {
  return _.repeat(str, times);
}

/**
 * Trim whitespace from both ends
 * @param {string} str - String to trim
 * @returns {string} Trimmed string
 */
export function trim(str) {
  return _.trim(str);
}

/**
 * Trim whitespace from left
 * @param {string} str - String to trim
 * @returns {string} Trimmed string
 */
export function trimLeft(str) {
  return _.trimStart(str);
}

/**
 * Trim whitespace from right
 * @param {string} str - String to trim
 * @returns {string} Trimmed string
 */
export function trimRight(str) {
  return _.trimEnd(str);
}

/**
 * Replace all occurrences of a substring
 * @param {string} str - Source string
 * @param {string} search - String to search for
 * @param {string} replace - Replacement string
 * @returns {string} String with replacements
 */
export function replaceAll(str, search, replace) {
  if (!str) return str;
  return str.split(search).join(replace);
}

/**
 * Check if string contains substring
 * @param {string} str - String to search in
 * @param {string} search - Substring to search for
 * @returns {boolean} True if contains
 */
export function contains(str, search) {
  return _.includes(str, search);
}

/**
 * Check if string starts with prefix
 * @param {string} str - String to check
 * @param {string} prefix - Prefix to check for
 * @returns {boolean} True if starts with prefix
 */
export function startsWith(str, prefix) {
  return _.startsWith(str, prefix);
}

/**
 * Check if string ends with suffix
 * @param {string} str - String to check
 * @param {string} suffix - Suffix to check for
 * @returns {boolean} True if ends with suffix
 */
export function endsWith(str, suffix) {
  return _.endsWith(str, suffix);
}
