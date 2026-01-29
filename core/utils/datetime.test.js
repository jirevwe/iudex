/**
 * Unit tests for datetime utilities
 */

import * as datetime from './datetime.js';

describe('DateTime Utilities', () => {
  describe('current time', () => {
    test('now() should return timestamp', () => {
      const now = datetime.now();
      expect(typeof now).toBe('number');
      expect(now).toBeGreaterThan(0);
      expect(now).toBeLessThan(Date.now() + 1000); // Within 1 second
    });

    test('nowISO() should return ISO string', () => {
      const iso = datetime.nowISO();
      expect(typeof iso).toBe('string');
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('today() should return start of today', () => {
      const today = datetime.today();
      expect(today).toBeInstanceOf(Date);
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
    });
  });

  describe('format', () => {
    const testDate = new Date('2024-01-15T10:30:45Z');

    test('should format with default pattern', () => {
      const formatted = datetime.format(testDate);
      expect(formatted).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });

    test('should format with YYYY-MM-DD', () => {
      expect(datetime.format(testDate, 'YYYY-MM-DD')).toBe('2024-01-15');
    });

    test('should format with DD/MM/YYYY', () => {
      expect(datetime.format(testDate, 'DD/MM/YYYY')).toBe('15/01/2024');
    });

    test('should format with time patterns', () => {
      const formatted = datetime.format(testDate, 'HH:mm:ss');
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    test('should handle string date input', () => {
      const formatted = datetime.format('2024-01-15', 'YYYY-MM-DD');
      expect(formatted).toBe('2024-01-15');
    });

    test('should handle timestamp input', () => {
      const timestamp = testDate.getTime();
      const formatted = datetime.format(timestamp, 'YYYY-MM-DD');
      expect(formatted).toBe('2024-01-15');
    });
  });

  describe('toISO and toUnix', () => {
    test('toISO should convert to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const iso = datetime.toISO(date);
      expect(iso).toMatch(/2024-01-15T10:30:00/);
    });

    test('toUnix should convert to Unix timestamp (seconds)', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const unix = datetime.toUnix(date);
      expect(typeof unix).toBe('number');
      expect(unix).toBeGreaterThan(0);
      expect(unix).toBeLessThan(Date.now() / 1000 + 100000); // Reasonable range
    });

    test('fromUnix should parse Unix timestamp', () => {
      const unix = 1705276800; // 2024-01-15 00:00:00 UTC
      const date = datetime.fromUnix(unix);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });

    test('toUnix and fromUnix should roundtrip', () => {
      const original = new Date('2024-01-15T12:00:00Z');
      const unix = datetime.toUnix(original);
      const restored = datetime.fromUnix(unix);
      expect(Math.abs(original.getTime() - restored.getTime())).toBeLessThan(1000);
    });
  });

  describe('parse', () => {
    test('should parse date with format', () => {
      const date = datetime.parse('15/01/2024', 'DD/MM/YYYY');
      expect(date).toBeInstanceOf(Date);
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(0); // January (0-indexed)
      expect(date.getFullYear()).toBe(2024);
    });

    test('should parse with different formats', () => {
      const date1 = datetime.parse('2024-01-15', 'YYYY-MM-DD');
      expect(date1.getFullYear()).toBe(2024);

      const date2 = datetime.parse('01/15/2024', 'MM/DD/YYYY');
      expect(date2.getMonth()).toBe(0);
    });
  });

  describe('arithmetic', () => {
    const baseDate = new Date('2024-01-15T00:00:00Z');

    test('add should add time', () => {
      const tomorrow = datetime.add(baseDate, 1, 'day');
      expect(tomorrow.getDate()).toBe(16);

      const nextWeek = datetime.add(baseDate, 7, 'days');
      expect(nextWeek.getDate()).toBe(22);

      const nextMonth = datetime.add(baseDate, 1, 'month');
      expect(nextMonth.getMonth()).toBe(1); // February
    });

    test('subtract should subtract time', () => {
      const yesterday = datetime.subtract(baseDate, 1, 'day');
      expect(yesterday.getDate()).toBe(14);

      const lastWeek = datetime.subtract(baseDate, 7, 'days');
      expect(lastWeek.getDate()).toBe(8);

      const lastMonth = datetime.subtract(baseDate, 1, 'month');
      expect(lastMonth.getMonth()).toBe(11); // December
    });

    test('should handle different units', () => {
      const plusHour = datetime.add(baseDate, 1, 'hour');
      expect(plusHour.getTime()).toBeGreaterThan(baseDate.getTime());

      const plusMinutes = datetime.add(baseDate, 30, 'minutes');
      expect(plusMinutes.getTime()).toBeGreaterThan(baseDate.getTime());
    });

    test('diff should calculate difference', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-15');

      expect(datetime.diff(date2, date1, 'days')).toBe(14);
      expect(datetime.diff(date2, date1, 'weeks')).toBe(2);
    });

    test('diff should handle different units', () => {
      const date1 = new Date('2024-01-01T00:00:00');
      const date2 = new Date('2024-01-01T02:30:00');

      expect(datetime.diff(date2, date1, 'hours')).toBe(2);
      expect(datetime.diff(date2, date1, 'minutes')).toBe(150);
    });
  });

  describe('comparison', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-15');

    test('isBefore', () => {
      expect(datetime.isBefore(date1, date2)).toBe(true);
      expect(datetime.isBefore(date2, date1)).toBe(false);
      expect(datetime.isBefore(date1, date1)).toBe(false);
    });

    test('isAfter', () => {
      expect(datetime.isAfter(date2, date1)).toBe(true);
      expect(datetime.isAfter(date1, date2)).toBe(false);
      expect(datetime.isAfter(date1, date1)).toBe(false);
    });

    test('isSame', () => {
      expect(datetime.isSame(date1, date1)).toBe(true);
      expect(datetime.isSame(date1, date2)).toBe(false);
    });

    test('isSame with unit', () => {
      const d1 = new Date('2024-01-15T10:00:00');
      const d2 = new Date('2024-01-15T14:00:00');
      expect(datetime.isSame(d1, d2, 'day')).toBe(true);
      expect(datetime.isSame(d1, d2, 'hour')).toBe(false);
    });

    test('isBetween', () => {
      const start = new Date('2024-01-01');
      const middle = new Date('2024-01-15');
      const end = new Date('2024-01-31');

      expect(datetime.isBetween(middle, start, end)).toBe(true);
      expect(datetime.isBetween(start, middle, end)).toBe(false);
    });

    test('isBetween with inclusivity', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      expect(datetime.isBetween(start, start, end, '[]')).toBe(true); // Inclusive
      expect(datetime.isBetween(start, start, end, '()')).toBe(false); // Exclusive
    });
  });

  describe('start and end of units', () => {
    const testDate = new Date('2024-01-15T14:30:45');

    test('startOf', () => {
      const startOfDay = datetime.startOf(testDate, 'day');
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);

      const startOfMonth = datetime.startOf(testDate, 'month');
      expect(startOfMonth.getDate()).toBe(1);
    });

    test('endOf', () => {
      const endOfDay = datetime.endOf(testDate, 'day');
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);

      const endOfMonth = datetime.endOf(testDate, 'month');
      expect(endOfMonth.getDate()).toBe(31); // January has 31 days
    });

    test('should handle different units', () => {
      const startOfYear = datetime.startOf(testDate, 'year');
      expect(startOfYear.getMonth()).toBe(0);
      expect(startOfYear.getDate()).toBe(1);

      const startOfHour = datetime.startOf(testDate, 'hour');
      expect(startOfHour.getMinutes()).toBe(0);
    });
  });

  describe('isValid', () => {
    test('should validate valid dates', () => {
      expect(datetime.isValid(new Date())).toBe(true);
      expect(datetime.isValid('2024-01-15')).toBe(true);
      expect(datetime.isValid(Date.now())).toBe(true);
    });

    test('should invalidate invalid dates', () => {
      expect(datetime.isValid('invalid')).toBe(false);
      expect(datetime.isValid('not-a-date')).toBe(false);
    });
  });

  describe('date components', () => {
    const testDate = new Date('2024-01-15T14:30:45');

    test('year', () => {
      expect(datetime.year(testDate)).toBe(2024);
    });

    test('month', () => {
      expect(datetime.month(testDate)).toBe(0); // January (0-indexed)
    });

    test('dayOfMonth', () => {
      expect(datetime.dayOfMonth(testDate)).toBe(15);
    });

    test('dayOfWeek', () => {
      const day = datetime.dayOfWeek(testDate);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    });
  });

  describe('edge cases', () => {
    test('should handle leap years', () => {
      const feb29 = new Date('2024-02-29');
      const nextDay = datetime.add(feb29, 1, 'day');
      expect(nextDay.getMonth()).toBe(2); // March
      expect(nextDay.getDate()).toBe(1);
    });

    test('should handle month boundaries', () => {
      const jan31 = new Date('2024-01-31');
      const nextMonth = datetime.add(jan31, 1, 'month');
      expect(nextMonth.getMonth()).toBe(1); // February
    });

    test('should handle year boundaries', () => {
      const dec31 = new Date('2023-12-31T23:59:59');
      const nextDay = datetime.add(dec31, 1, 'day');
      expect(nextDay.getFullYear()).toBe(2024);
      expect(nextDay.getMonth()).toBe(0); // January
    });

    test('should handle DST transitions', () => {
      // This is timezone-dependent, but should not throw
      const date = new Date('2024-03-10T02:00:00');
      expect(() => datetime.add(date, 1, 'hour')).not.toThrow();
    });
  });
});
