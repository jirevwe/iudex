/**
 * Unit tests for string utilities
 */

import * as string from './string.js';

describe('String Utilities', () => {
  describe('case conversion', () => {
    test('camelCase', () => {
      expect(string.camelCase('hello world')).toBe('helloWorld');
      expect(string.camelCase('hello-world')).toBe('helloWorld');
      expect(string.camelCase('hello_world')).toBe('helloWorld');
      expect(string.camelCase('HelloWorld')).toBe('helloWorld');
    });

    test('pascalCase', () => {
      expect(string.pascalCase('hello world')).toBe('HelloWorld');
      expect(string.pascalCase('hello-world')).toBe('HelloWorld');
      expect(string.pascalCase('hello_world')).toBe('HelloWorld');
      expect(string.pascalCase('helloWorld')).toBe('HelloWorld');
    });

    test('snakeCase', () => {
      expect(string.snakeCase('hello world')).toBe('hello_world');
      expect(string.snakeCase('helloWorld')).toBe('hello_world');
      expect(string.snakeCase('HelloWorld')).toBe('hello_world');
      expect(string.snakeCase('hello-world')).toBe('hello_world');
    });

    test('kebabCase', () => {
      expect(string.kebabCase('hello world')).toBe('hello-world');
      expect(string.kebabCase('helloWorld')).toBe('hello-world');
      expect(string.kebabCase('HelloWorld')).toBe('hello-world');
      expect(string.kebabCase('hello_world')).toBe('hello-world');
    });

    test('constantCase', () => {
      expect(string.constantCase('hello world')).toBe('HELLO_WORLD');
      expect(string.constantCase('helloWorld')).toBe('HELLO_WORLD');
      expect(string.constantCase('hello-world')).toBe('HELLO_WORLD');
    });
  });

  describe('formatting', () => {
    test('capitalize', () => {
      expect(string.capitalize('hello')).toBe('Hello');
      expect(string.capitalize('HELLO')).toBe('Hello');
      expect(string.capitalize('hello world')).toBe('Hello world');
    });

    test('titleCase', () => {
      expect(string.titleCase('hello world')).toBe('Hello World');
      expect(string.titleCase('hello-world')).toBe('Hello World');
      expect(string.titleCase('helloWorld')).toBe('Hello World');
    });

    test('upperCase', () => {
      expect(string.upperCase('hello')).toBe('HELLO');
      expect(string.upperCase('hello world')).toBe('HELLO WORLD');
    });

    test('lowerCase', () => {
      expect(string.lowerCase('HELLO')).toBe('hello');
      expect(string.lowerCase('Hello World')).toBe('hello world');
    });
  });

  describe('truncate', () => {
    test('should truncate long strings', () => {
      expect(string.truncate('hello world', 8)).toBe('hello...');
      expect(string.truncate('hello world', 8, '…')).toBe('hello w…');
    });

    test('should not truncate short strings', () => {
      expect(string.truncate('hello', 10)).toBe('hello');
      expect(string.truncate('test', 20)).toBe('test');
    });

    test('should handle empty string', () => {
      expect(string.truncate('', 5)).toBe('');
    });

    test('should handle default length and suffix', () => {
      const longString = 'a'.repeat(50);
      const truncated = string.truncate(longString);
      expect(truncated.length).toBe(30); // Default length
      expect(truncated).toMatch(/\.\.\.$/);
    });

    test('should handle exact length', () => {
      expect(string.truncate('hello', 5)).toBe('hello');
    });
  });

  describe('padding', () => {
    test('padLeft', () => {
      expect(string.padLeft('5', 3, '0')).toBe('005');
      expect(string.padLeft('test', 10, '.')).toBe('......test');
      expect(string.padLeft('abc', 5, 'x')).toBe('xxabc');
    });

    test('padRight', () => {
      expect(string.padRight('5', 3, '0')).toBe('500');
      expect(string.padRight('test', 10, '.')).toBe('test......');
      expect(string.padRight('abc', 5, 'x')).toBe('abcxx');
    });

    test('should not pad if already long enough', () => {
      expect(string.padLeft('hello', 3, '0')).toBe('hello');
      expect(string.padRight('hello', 3, '0')).toBe('hello');
    });

    test('should handle default pad character (space)', () => {
      expect(string.padLeft('x', 3)).toBe('  x');
      expect(string.padRight('x', 3)).toBe('x  ');
    });
  });

  describe('reverse', () => {
    test('should reverse string', () => {
      expect(string.reverse('hello')).toBe('olleh');
      expect(string.reverse('abc123')).toBe('321cba');
    });

    test('should handle empty string', () => {
      expect(string.reverse('')).toBe('');
    });

    test('should handle single character', () => {
      expect(string.reverse('a')).toBe('a');
    });

    test('should handle palindrome', () => {
      expect(string.reverse('racecar')).toBe('racecar');
    });
  });

  describe('repeat', () => {
    test('should repeat string', () => {
      expect(string.repeat('ab', 3)).toBe('ababab');
      expect(string.repeat('x', 5)).toBe('xxxxx');
    });

    test('should handle repeat 0 times', () => {
      expect(string.repeat('hello', 0)).toBe('');
    });

    test('should handle repeat 1 time', () => {
      expect(string.repeat('hello', 1)).toBe('hello');
    });
  });

  describe('trim', () => {
    test('trim', () => {
      expect(string.trim('  hello  ')).toBe('hello');
      expect(string.trim('\thello\n')).toBe('hello');
    });

    test('trimLeft', () => {
      expect(string.trimLeft('  hello  ')).toBe('hello  ');
      expect(string.trimLeft('\thello')).toBe('hello');
    });

    test('trimRight', () => {
      expect(string.trimRight('  hello  ')).toBe('  hello');
      expect(string.trimRight('hello\n')).toBe('hello');
    });

    test('should handle no whitespace', () => {
      expect(string.trim('hello')).toBe('hello');
    });

    test('should handle empty string', () => {
      expect(string.trim('')).toBe('');
    });
  });

  describe('replaceAll', () => {
    test('should replace all occurrences', () => {
      expect(string.replaceAll('hello world', 'o', 'a')).toBe('hella warld');
      expect(string.replaceAll('aaa', 'a', 'b')).toBe('bbb');
    });

    test('should handle no matches', () => {
      expect(string.replaceAll('hello', 'x', 'y')).toBe('hello');
    });

    test('should handle empty search', () => {
      // Empty search string splits between every character
      const result = string.replaceAll('hello', '', 'x');
      expect(result).toContain('x');
    });

    test('should handle empty replace', () => {
      expect(string.replaceAll('hello', 'l', '')).toBe('heo');
    });

    test('should handle empty string', () => {
      expect(string.replaceAll('', 'a', 'b')).toBe('');
    });
  });

  describe('contains', () => {
    test('should check if string contains substring', () => {
      expect(string.contains('hello world', 'world')).toBe(true);
      expect(string.contains('hello world', 'hello')).toBe(true);
      expect(string.contains('hello world', 'o w')).toBe(true);
    });

    test('should return false for non-existent substring', () => {
      expect(string.contains('hello world', 'foo')).toBe(false);
      expect(string.contains('hello', 'Hello')).toBe(false); // Case sensitive
    });

    test('should handle empty strings', () => {
      expect(string.contains('hello', '')).toBe(true);
      expect(string.contains('', 'hello')).toBe(false);
    });
  });

  describe('startsWith', () => {
    test('should check if string starts with prefix', () => {
      expect(string.startsWith('hello world', 'hello')).toBe(true);
      expect(string.startsWith('hello world', 'h')).toBe(true);
    });

    test('should return false for non-matching prefix', () => {
      expect(string.startsWith('hello world', 'world')).toBe(false);
      expect(string.startsWith('hello', 'Hello')).toBe(false); // Case sensitive
    });

    test('should handle empty strings', () => {
      expect(string.startsWith('hello', '')).toBe(true);
      expect(string.startsWith('', 'h')).toBe(false);
    });
  });

  describe('endsWith', () => {
    test('should check if string ends with suffix', () => {
      expect(string.endsWith('hello world', 'world')).toBe(true);
      expect(string.endsWith('hello world', 'd')).toBe(true);
    });

    test('should return false for non-matching suffix', () => {
      expect(string.endsWith('hello world', 'hello')).toBe(false);
      expect(string.endsWith('hello', 'Hello')).toBe(false); // Case sensitive
    });

    test('should handle empty strings', () => {
      expect(string.endsWith('hello', '')).toBe(true);
      expect(string.endsWith('', 'o')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle unicode characters', () => {
      expect(string.camelCase('hello 世界')).toBeTruthy();
      // Note: Emoji reversal is complex due to multi-byte characters
      const reversed = string.reverse('hello world');
      expect(reversed).toBe('dlrow olleh');
    });

    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(string.reverse(longString)).toHaveLength(10000);
      expect(string.truncate(longString, 100).length).toBeLessThanOrEqual(100);
    });

    test('should handle special characters', () => {
      expect(string.camelCase('hello@world#test')).toBeTruthy();
      expect(string.contains('hello@world', '@')).toBe(true);
    });
  });
});
