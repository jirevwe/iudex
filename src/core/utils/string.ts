/**
 * String Manipulation Utilities
 * Provides case conversion, truncation, padding, and more
 */

import _ from 'lodash';

/**
 * Convert string to camelCase
 * @param str - String to convert
 * @returns camelCase string
 */
export function camelCase(str: string): string {
  return _.camelCase(str);
}

/**
 * Convert string to PascalCase
 * @param str - String to convert
 * @returns PascalCase string
 */
export function pascalCase(str: string): string {
  const camel = _.camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to snake_case
 * @param str - String to convert
 * @returns snake_case string
 */
export function snakeCase(str: string): string {
  return _.snakeCase(str);
}

/**
 * Convert string to kebab-case
 * @param str - String to convert
 * @returns kebab-case string
 */
export function kebabCase(str: string): string {
  return _.kebabCase(str);
}

/**
 * Convert string to CONSTANT_CASE
 * @param str - String to convert
 * @returns CONSTANT_CASE string
 */
export function constantCase(str: string): string {
  return _.snakeCase(str).toUpperCase();
}

/**
 * Capitalize first letter of string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return _.capitalize(str);
}

/**
 * Convert string to Title Case
 * @param str - String to convert
 * @returns Title Case string
 */
export function titleCase(str: string): string {
  return _.startCase(str);
}

/**
 * Convert string to lowercase
 * @param str - String to convert
 * @returns Lowercase string
 */
export function lowerCase(str: string): string {
  return _.lowerCase(str);
}

/**
 * Convert string to UPPERCASE
 * @param str - String to convert
 * @returns Uppercase string
 */
export function upperCase(str: string): string {
  return _.upperCase(str);
}

/**
 * Truncate string to specified length
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated string
 */
export function truncate(str: string, length = 30, suffix = '...'): string {
  if (!str || str.length <= length) {
    return str;
  }
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Pad string to specified length (left)
 * @param str - String to pad
 * @param length - Target length
 * @param char - Character to pad with (default: ' ')
 * @returns Padded string
 */
export function padLeft(str: string, length: number, char = ' '): string {
  return _.padStart(str, length, char);
}

/**
 * Pad string to specified length (right)
 * @param str - String to pad
 * @param length - Target length
 * @param char - Character to pad with (default: ' ')
 * @returns Padded string
 */
export function padRight(str: string, length: number, char = ' '): string {
  return _.padEnd(str, length, char);
}

/**
 * Reverse a string
 * @param str - String to reverse
 * @returns Reversed string
 */
export function reverse(str: string): string {
  if (!str) return str;
  return str.split('').reverse().join('');
}

/**
 * Repeat string n times
 * @param str - String to repeat
 * @param times - Number of times to repeat
 * @returns Repeated string
 */
export function repeat(str: string, times: number): string {
  return _.repeat(str, times);
}

/**
 * Trim whitespace from both ends
 * @param str - String to trim
 * @returns Trimmed string
 */
export function trim(str: string): string {
  return _.trim(str);
}

/**
 * Trim whitespace from left
 * @param str - String to trim
 * @returns Trimmed string
 */
export function trimLeft(str: string): string {
  return _.trimStart(str);
}

/**
 * Trim whitespace from right
 * @param str - String to trim
 * @returns Trimmed string
 */
export function trimRight(str: string): string {
  return _.trimEnd(str);
}

/**
 * Replace all occurrences of a substring
 * @param str - Source string
 * @param search - String to search for
 * @param replace - Replacement string
 * @returns String with replacements
 */
export function replaceAll(str: string, search: string, replace: string): string {
  if (!str) return str;
  return str.split(search).join(replace);
}

/**
 * Check if string contains substring
 * @param str - String to search in
 * @param search - Substring to search for
 * @returns True if contains
 */
export function contains(str: string, search: string): boolean {
  return _.includes(str, search);
}

/**
 * Check if string starts with prefix
 * @param str - String to check
 * @param prefix - Prefix to check for
 * @returns True if starts with prefix
 */
export function startsWith(str: string, prefix: string): boolean {
  return _.startsWith(str, prefix);
}

/**
 * Check if string ends with suffix
 * @param str - String to check
 * @param suffix - Suffix to check for
 * @returns True if ends with suffix
 */
export function endsWith(str: string, suffix: string): boolean {
  return _.endsWith(str, suffix);
}
