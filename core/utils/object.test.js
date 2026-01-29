/**
 * Unit tests for object and array utilities
 */

import { object, array } from './object.js';

describe('Object Utilities', () => {
  describe('pick', () => {
    test('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(object.pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    test('should handle single key as string', () => {
      const obj = { a: 1, b: 2 };
      expect(object.pick(obj, 'a')).toEqual({ a: 1 });
    });

    test('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      expect(object.pick(obj, ['a', 'x'])).toEqual({ a: 1 });
    });

    test('should return empty object for no keys', () => {
      const obj = { a: 1, b: 2 };
      expect(object.pick(obj, [])).toEqual({});
    });
  });

  describe('omit', () => {
    test('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(object.omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });

    test('should handle multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      expect(object.omit(obj, ['b', 'd'])).toEqual({ a: 1, c: 3 });
    });

    test('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      expect(object.omit(obj, ['x'])).toEqual({ a: 1, b: 2 });
    });
  });

  describe('merge', () => {
    test('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      expect(object.merge(obj1, obj2)).toEqual({ a: 1, b: 3, c: 4 });
    });

    test('should deep merge nested objects', () => {
      const obj1 = { a: { x: 1, y: 2 } };
      const obj2 = { a: { y: 3, z: 4 } };
      expect(object.merge(obj1, obj2)).toEqual({ a: { x: 1, y: 3, z: 4 } });
    });

    test('should not mutate original objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      object.merge(obj1, obj2);
      expect(obj1).toEqual({ a: 1 });
      expect(obj2).toEqual({ b: 2 });
    });

    test('should handle multiple objects', () => {
      const merged = object.merge({ a: 1 }, { b: 2 }, { c: 3 });
      expect(merged).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('clone', () => {
    test('should deep clone object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = object.clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    test('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const cloned = object.clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    test('should handle complex nested structures', () => {
      const obj = {
        a: 1,
        b: [1, 2, { c: 3 }],
        d: { e: { f: 4 } }
      };
      const cloned = object.clone(obj);
      cloned.d.e.f = 999;
      expect(obj.d.e.f).toBe(4); // Original unchanged
    });
  });

  describe('get', () => {
    const obj = {
      user: {
        profile: {
          name: 'John',
          age: 30
        }
      }
    };

    test('should get nested property', () => {
      expect(object.get(obj, 'user.profile.name')).toBe('John');
      expect(object.get(obj, 'user.profile.age')).toBe(30);
    });

    test('should handle array path', () => {
      expect(object.get(obj, ['user', 'profile', 'name'])).toBe('John');
    });

    test('should return default for missing path', () => {
      expect(object.get(obj, 'user.profile.missing', 'default')).toBe('default');
    });

    test('should return undefined for missing path without default', () => {
      expect(object.get(obj, 'user.missing')).toBeUndefined();
    });
  });

  describe('set', () => {
    test('should set nested property', () => {
      const obj = { a: { b: 1 } };
      object.set(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('should create missing paths', () => {
      const obj = {};
      object.set(obj, 'a.b.c', 123);
      expect(obj.a.b.c).toBe(123);
    });

    test('should handle array paths', () => {
      const obj = {};
      object.set(obj, ['x', 'y'], 'value');
      expect(obj.x.y).toBe('value');
    });
  });

  describe('has', () => {
    const obj = {
      user: {
        profile: {
          name: 'John'
        }
      }
    };

    test('should check if path exists', () => {
      expect(object.has(obj, 'user.profile.name')).toBe(true);
      expect(object.has(obj, 'user.profile')).toBe(true);
    });

    test('should return false for missing path', () => {
      expect(object.has(obj, 'user.missing')).toBe(false);
      expect(object.has(obj, 'user.profile.age')).toBe(false);
    });

    test('should handle array paths', () => {
      expect(object.has(obj, ['user', 'profile', 'name'])).toBe(true);
    });
  });

  describe('keys, values, entries', () => {
    const obj = { a: 1, b: 2, c: 3 };

    test('keys should return array of keys', () => {
      expect(object.keys(obj)).toEqual(['a', 'b', 'c']);
    });

    test('values should return array of values', () => {
      expect(object.values(obj)).toEqual([1, 2, 3]);
    });

    test('entries should return array of [key, value] pairs', () => {
      expect(object.entries(obj)).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    });

    test('fromEntries should create object from entries', () => {
      const entries = [['a', 1], ['b', 2]];
      expect(object.fromEntries(entries)).toEqual({ a: 1, b: 2 });
    });
  });

  describe('isEmpty', () => {
    test('should detect empty objects', () => {
      expect(object.isEmpty({})).toBe(true);
      expect(object.isEmpty([])).toBe(true);
      expect(object.isEmpty('')).toBe(true);
    });

    test('should detect non-empty objects', () => {
      expect(object.isEmpty({ a: 1 })).toBe(false);
      expect(object.isEmpty([1])).toBe(false);
      expect(object.isEmpty('text')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(object.isEmpty(null)).toBe(true);
      expect(object.isEmpty(undefined)).toBe(true);
    });
  });

  describe('isEqual', () => {
    test('should compare simple objects', () => {
      expect(object.isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(object.isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    test('should deep compare nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      expect(object.isEqual(obj1, obj2)).toBe(true);
    });

    test('should compare arrays', () => {
      expect(object.isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(object.isEqual([1, 2], [1, 3])).toBe(false);
    });
  });
});

describe('Array Utilities', () => {
  describe('flatten', () => {
    test('should flatten array by depth', () => {
      expect(array.flatten([1, [2, 3]], 1)).toEqual([1, 2, 3]);
      expect(array.flatten([1, [2, [3, 4]]], 1)).toEqual([1, 2, [3, 4]]);
    });

    test('should handle default depth', () => {
      expect(array.flatten([1, [2, 3]])).toEqual([1, 2, 3]);
    });

    test('flattenDeep should flatten completely', () => {
      expect(array.flattenDeep([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
    });
  });

  describe('unique', () => {
    test('should remove duplicates', () => {
      expect(array.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(array.unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    test('should handle empty array', () => {
      expect(array.unique([])).toEqual([]);
    });

    test('uniqueBy should remove duplicates by property', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 1 }];
      expect(array.uniqueBy(arr, 'id')).toHaveLength(2);
    });
  });

  describe('chunk', () => {
    test('should split array into chunks', () => {
      expect(array.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(array.chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    test('should handle chunk size larger than array', () => {
      expect(array.chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('compact', () => {
    test('should remove falsy values', () => {
      const arr = [0, 1, false, 2, '', 3, null, undefined, 4, NaN];
      expect(array.compact(arr)).toEqual([1, 2, 3, 4]);
    });

    test('should keep truthy values', () => {
      expect(array.compact([true, 'text', 1, {}])).toHaveLength(4);
    });
  });

  describe('groupBy', () => {
    test('should group by property', () => {
      const arr = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 }
      ];
      const grouped = array.groupBy(arr, 'type');
      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });

    test('should handle function grouping', () => {
      const arr = [1.1, 1.9, 2.1, 2.9];
      const grouped = array.groupBy(arr, Math.floor);
      expect(grouped[1]).toHaveLength(2);
      expect(grouped[2]).toHaveLength(2);
    });
  });

  describe('sortBy', () => {
    test('should sort by property', () => {
      const arr = [{ age: 30 }, { age: 20 }, { age: 25 }];
      const sorted = array.sortBy(arr, 'age');
      expect(sorted[0].age).toBe(20);
      expect(sorted[2].age).toBe(30);
    });

    test('should handle descending order', () => {
      const arr = [{ age: 20 }, { age: 30 }, { age: 25 }];
      const sorted = array.sortBy(arr, 'age', ['desc']);
      expect(sorted[0].age).toBe(30);
      expect(sorted[2].age).toBe(20);
    });
  });

  describe('access methods', () => {
    const arr = [1, 2, 3, 4, 5];

    test('first should return first element', () => {
      expect(array.first(arr)).toBe(1);
    });

    test('last should return last element', () => {
      expect(array.last(arr)).toBe(5);
    });

    test('nth should return element at index', () => {
      expect(array.nth(arr, 2)).toBe(3);
      expect(array.nth(arr, -1)).toBe(5); // Negative index
    });

    test('take should return first n elements', () => {
      expect(array.take(arr, 3)).toEqual([1, 2, 3]);
    });

    test('takeLast should return last n elements', () => {
      expect(array.takeLast(arr, 2)).toEqual([4, 5]);
    });

    test('drop should remove first n elements', () => {
      expect(array.drop(arr, 2)).toEqual([3, 4, 5]);
    });

    test('dropLast should remove last n elements', () => {
      expect(array.dropLast(arr, 2)).toEqual([1, 2, 3]);
    });
  });

  describe('set operations', () => {
    test('intersection should find common elements', () => {
      expect(array.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    });

    test('union should combine unique elements', () => {
      expect(array.union([1, 2], [2, 3])).toEqual([1, 2, 3]);
    });

    test('difference should find unique elements', () => {
      expect(array.difference([1, 2, 3], [2])).toEqual([1, 3]);
    });

    test('zip should combine arrays', () => {
      expect(array.zip([1, 2], ['a', 'b'])).toEqual([[1, 'a'], [2, 'b']]);
    });
  });

  describe('statistics', () => {
    const numbers = [1, 2, 3, 4, 5];

    test('sum should calculate total', () => {
      expect(array.sum(numbers)).toBe(15);
    });

    test('sumBy should sum by property', () => {
      const arr = [{ val: 1 }, { val: 2 }, { val: 3 }];
      expect(array.sumBy(arr, 'val')).toBe(6);
    });

    test('mean should calculate average', () => {
      expect(array.mean(numbers)).toBe(3);
    });

    test('min should find minimum', () => {
      expect(array.min(numbers)).toBe(1);
    });

    test('max should find maximum', () => {
      expect(array.max(numbers)).toBe(5);
    });
  });

  describe('search', () => {
    const arr = [1, 2, 3, 4, 5];

    test('includes should check for value', () => {
      expect(array.includes(arr, 3)).toBe(true);
      expect(array.includes(arr, 10)).toBe(false);
    });

    test('find should find element', () => {
      expect(array.find(arr, x => x > 3)).toBe(4);
    });

    test('filter should filter elements', () => {
      expect(array.filter(arr, x => x > 3)).toEqual([4, 5]);
    });
  });

  describe('reverse', () => {
    test('should reverse array', () => {
      expect(array.reverse([1, 2, 3])).toEqual([3, 2, 1]);
    });

    test('should not mutate original', () => {
      const original = [1, 2, 3];
      array.reverse(original);
      expect(original).toEqual([1, 2, 3]);
    });
  });
});
