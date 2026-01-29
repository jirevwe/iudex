/**
 * Date/Time Utilities
 * Provides formatting, parsing, arithmetic, and comparison
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isBetweenPlugin from 'dayjs/plugin/isBetween.js';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isBetweenPlugin);

/**
 * Get current timestamp in milliseconds
 * @returns {number} Current timestamp
 */
export function now() {
  return Date.now();
}

/**
 * Get current date/time as ISO 8601 string
 * @returns {string} ISO 8601 string
 */
export function nowISO() {
  return dayjs().toISOString();
}

/**
 * Get start of today (00:00:00)
 * @returns {Date} Start of today
 */
export function today() {
  return dayjs().startOf('day').toDate();
}

/**
 * Format date with pattern
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format pattern (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
export function format(date, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(date).format(format);
}

/**
 * Convert date to ISO 8601 string
 * @param {Date|string|number} date - Date to convert
 * @returns {string} ISO 8601 string
 */
export function toISO(date) {
  return dayjs(date).toISOString();
}

/**
 * Convert date to Unix timestamp (seconds)
 * @param {Date|string|number} date - Date to convert
 * @returns {number} Unix timestamp
 */
export function toUnix(date) {
  return dayjs(date).unix();
}

/**
 * Parse date string with format
 * @param {string} dateString - Date string to parse
 * @param {string} format - Format pattern
 * @returns {Date} Parsed date
 */
export function parse(dateString, format) {
  return dayjs(dateString, format).toDate();
}

/**
 * Parse Unix timestamp to Date
 * @param {number} timestamp - Unix timestamp (seconds)
 * @returns {Date} Date object
 */
export function fromUnix(timestamp) {
  return dayjs.unix(timestamp).toDate();
}

/**
 * Add time to date
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns {Date} New date
 */
export function add(date, amount, unit = 'days') {
  return dayjs(date).add(amount, unit).toDate();
}

/**
 * Subtract time from date
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns {Date} New date
 */
export function subtract(date, amount, unit = 'days') {
  return dayjs(date).subtract(amount, unit).toDate();
}

/**
 * Get difference between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @param {string} unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns {number} Difference
 */
export function diff(date1, date2, unit = 'days') {
  return dayjs(date1).diff(dayjs(date2), unit);
}

/**
 * Check if date1 is before date2
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if date1 is before date2
 */
export function isBefore(date1, date2) {
  return dayjs(date1).isBefore(dayjs(date2));
}

/**
 * Check if date1 is after date2
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if date1 is after date2
 */
export function isAfter(date1, date2) {
  return dayjs(date1).isAfter(dayjs(date2));
}

/**
 * Check if date1 is same as date2
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @param {string} unit - Unit for comparison (default: millisecond)
 * @returns {boolean} True if dates are same
 */
export function isSame(date1, date2, unit = 'millisecond') {
  return dayjs(date1).isSame(dayjs(date2), unit);
}

/**
 * Check if date is between start and end
 * @param {Date|string|number} date - Date to check
 * @param {Date|string|number} start - Start date
 * @param {Date|string|number} end - End date
 * @param {string} inclusivity - '[]', '[)', '(]', '()' (default: '[]')
 * @returns {boolean} True if date is between start and end
 */
export function isBetween(date, start, end, inclusivity = '[]') {
  return dayjs(date).isBetween(dayjs(start), dayjs(end), null, inclusivity);
}

/**
 * Get start of time unit
 * @param {Date|string|number} date - Date
 * @param {string} unit - Unit (year, month, day, hour, minute, second)
 * @returns {Date} Start of unit
 */
export function startOf(date, unit = 'day') {
  return dayjs(date).startOf(unit).toDate();
}

/**
 * Get end of time unit
 * @param {Date|string|number} date - Date
 * @param {string} unit - Unit (year, month, day, hour, minute, second)
 * @returns {Date} End of unit
 */
export function endOf(date, unit = 'day') {
  return dayjs(date).endOf(unit).toDate();
}

/**
 * Check if date is valid
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if valid
 */
export function isValid(date) {
  return dayjs(date).isValid();
}

/**
 * Get day of week (0-6, Sunday-Saturday)
 * @param {Date|string|number} date - Date
 * @returns {number} Day of week
 */
export function dayOfWeek(date) {
  return dayjs(date).day();
}

/**
 * Get day of month (1-31)
 * @param {Date|string|number} date - Date
 * @returns {number} Day of month
 */
export function dayOfMonth(date) {
  return dayjs(date).date();
}

/**
 * Get month (0-11)
 * @param {Date|string|number} date - Date
 * @returns {number} Month
 */
export function month(date) {
  return dayjs(date).month();
}

/**
 * Get year
 * @param {Date|string|number} date - Date
 * @returns {number} Year
 */
export function year(date) {
  return dayjs(date).year();
}
