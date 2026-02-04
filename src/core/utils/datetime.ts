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

/** Input type for date functions */
export type DateInput = Date | string | number;

/** Time unit for date arithmetic */
export type TimeUnit = 'year' | 'years' | 'month' | 'months' | 'day' | 'days' |
  'hour' | 'hours' | 'minute' | 'minutes' | 'second' | 'seconds' |
  'millisecond' | 'milliseconds' | 'week' | 'weeks';

/** Inclusivity for isBetween */
export type Inclusivity = '[]' | '[)' | '(]' | '()';

/**
 * Get current timestamp in milliseconds
 * @returns Current timestamp
 */
export function now(): number {
  return Date.now();
}

/**
 * Get current date/time as ISO 8601 string
 * @returns ISO 8601 string
 */
export function nowISO(): string {
  return dayjs().toISOString();
}

/**
 * Get start of today (00:00:00)
 * @returns Start of today
 */
export function today(): Date {
  return dayjs().startOf('day').toDate();
}

/**
 * Format date with pattern
 * @param date - Date to format
 * @param formatStr - Format pattern (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted date string
 */
export function format(date: DateInput, formatStr = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(formatStr);
}

/**
 * Convert date to ISO 8601 string
 * @param date - Date to convert
 * @returns ISO 8601 string
 */
export function toISO(date: DateInput): string {
  return dayjs(date).toISOString();
}

/**
 * Convert date to Unix timestamp (seconds)
 * @param date - Date to convert
 * @returns Unix timestamp
 */
export function toUnix(date: DateInput): number {
  return dayjs(date).unix();
}

/**
 * Parse date string with format
 * @param dateString - Date string to parse
 * @param formatStr - Format pattern
 * @returns Parsed date
 */
export function parse(dateString: string, formatStr?: string): Date {
  return dayjs(dateString, formatStr).toDate();
}

/**
 * Parse Unix timestamp to Date
 * @param timestamp - Unix timestamp (seconds)
 * @returns Date object
 */
export function fromUnix(timestamp: number): Date {
  return dayjs.unix(timestamp).toDate();
}

/**
 * Add time to date
 * @param date - Base date
 * @param amount - Amount to add
 * @param unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns New date
 */
export function add(date: DateInput, amount: number, unit: TimeUnit = 'days'): Date {
  return dayjs(date).add(amount, unit).toDate();
}

/**
 * Subtract time from date
 * @param date - Base date
 * @param amount - Amount to subtract
 * @param unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns New date
 */
export function subtract(date: DateInput, amount: number, unit: TimeUnit = 'days'): Date {
  return dayjs(date).subtract(amount, unit).toDate();
}

/**
 * Get difference between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit (years, months, days, hours, minutes, seconds)
 * @returns Difference
 */
export function diff(date1: DateInput, date2: DateInput, unit: TimeUnit = 'days'): number {
  return dayjs(date1).diff(dayjs(date2), unit);
}

/**
 * Check if date1 is before date2
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if date1 is before date2
 */
export function isBefore(date1: DateInput, date2: DateInput): boolean {
  return dayjs(date1).isBefore(dayjs(date2));
}

/**
 * Check if date1 is after date2
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if date1 is after date2
 */
export function isAfter(date1: DateInput, date2: DateInput): boolean {
  return dayjs(date1).isAfter(dayjs(date2));
}

/**
 * Check if date1 is same as date2
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit for comparison (default: millisecond)
 * @returns True if dates are same
 */
export function isSame(date1: DateInput, date2: DateInput, unit: TimeUnit = 'millisecond'): boolean {
  return dayjs(date1).isSame(dayjs(date2), unit);
}

/**
 * Check if date is between start and end
 * @param date - Date to check
 * @param start - Start date
 * @param end - End date
 * @param inclusivity - '[]', '[)', '(]', '()' (default: '[]')
 * @returns True if date is between start and end
 */
export function isBetween(
  date: DateInput,
  start: DateInput,
  end: DateInput,
  inclusivity: Inclusivity = '[]'
): boolean {
  return dayjs(date).isBetween(dayjs(start), dayjs(end), null, inclusivity);
}

/**
 * Get start of time unit
 * @param date - Date
 * @param unit - Unit (year, month, day, hour, minute, second)
 * @returns Start of unit
 */
export function startOf(date: DateInput, unit: TimeUnit = 'day'): Date {
  return dayjs(date).startOf(unit).toDate();
}

/**
 * Get end of time unit
 * @param date - Date
 * @param unit - Unit (year, month, day, hour, minute, second)
 * @returns End of unit
 */
export function endOf(date: DateInput, unit: TimeUnit = 'day'): Date {
  return dayjs(date).endOf(unit).toDate();
}

/**
 * Check if date is valid
 * @param date - Date to check
 * @returns True if valid
 */
export function isValid(date: DateInput): boolean {
  return dayjs(date).isValid();
}

/**
 * Get day of week (0-6, Sunday-Saturday)
 * @param date - Date
 * @returns Day of week
 */
export function dayOfWeek(date: DateInput): number {
  return dayjs(date).day();
}

/**
 * Get day of month (1-31)
 * @param date - Date
 * @returns Day of month
 */
export function dayOfMonth(date: DateInput): number {
  return dayjs(date).date();
}

/**
 * Get month (0-11)
 * @param date - Date
 * @returns Month
 */
export function month(date: DateInput): number {
  return dayjs(date).month();
}

/**
 * Get year
 * @param date - Date
 * @returns Year
 */
export function year(date: DateInput): number {
  return dayjs(date).year();
}
