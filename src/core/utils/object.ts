/**
 * Object and Array Utilities
 * Provides deep operations for objects and arrays
 */

import _ from 'lodash';

/** Generic object type */
export type AnyObject = Record<string, unknown>;

/** Generic predicate function */
export type Predicate<T> = ((value: T, index: number, array: T[]) => boolean) | Partial<T>;

/** Generic iteratee function */
export type Iteratee<T, R> = ((value: T) => R) | keyof T | string;

/** Object operations */
export const object = {
  /**
   * Pick specific keys from object
   * @param obj - Source object
   * @param keys - Keys to pick
   * @returns New object with picked keys
   */
  pick<T extends AnyObject, K extends keyof T>(obj: T, keys: K | K[]): Pick<T, K> {
    return _.pick(obj, keys) as Pick<T, K>;
  },

  /**
   * Omit specific keys from object
   * @param obj - Source object
   * @param keys - Keys to omit
   * @returns New object without omitted keys
   */
  omit<T extends AnyObject, K extends keyof T>(obj: T, keys: K | K[]): Omit<T, K> {
    return _.omit(obj, keys) as Omit<T, K>;
  },

  /**
   * Deep merge objects
   * @param objects - Objects to merge
   * @returns Merged object
   */
  merge<T extends AnyObject>(...objects: Partial<T>[]): T {
    return _.merge({}, ...objects) as T;
  },

  /**
   * Deep clone object
   * @param obj - Object to clone
   * @returns Cloned object
   */
  clone<T>(obj: T): T {
    return _.cloneDeep(obj);
  },

  /**
   * Get nested property value
   * @param obj - Source object
   * @param path - Property path
   * @param defaultValue - Default value if not found
   * @returns Property value
   */
  get<T = unknown>(obj: AnyObject, path: string | string[], defaultValue?: T): T {
    return _.get(obj, path, defaultValue) as T;
  },

  /**
   * Set nested property value
   * @param obj - Target object
   * @param path - Property path
   * @param value - Value to set
   * @returns Modified object
   */
  set<T extends AnyObject>(obj: T, path: string | string[], value: unknown): T {
    return _.set(obj, path, value);
  },

  /**
   * Check if nested property exists
   * @param obj - Source object
   * @param path - Property path
   * @returns True if exists
   */
  has(obj: AnyObject, path: string | string[]): boolean {
    return _.has(obj, path);
  },

  /**
   * Get all keys of object
   * @param obj - Source object
   * @returns Array of keys
   */
  keys<T extends AnyObject>(obj: T): Array<keyof T> {
    return _.keys(obj) as Array<keyof T>;
  },

  /**
   * Get all values of object
   * @param obj - Source object
   * @returns Array of values
   */
  values<T extends AnyObject>(obj: T): unknown[] {
    return _.values(obj);
  },

  /**
   * Get all entries of object
   * @param obj - Source object
   * @returns Array of [key, value] pairs
   */
  entries<T extends AnyObject>(obj: T): Array<[keyof T, T[keyof T]]> {
    return _.entries(obj) as Array<[keyof T, T[keyof T]]>;
  },

  /**
   * Create object from entries
   * @param entries - Array of [key, value] pairs
   * @returns New object
   */
  fromEntries<K extends string | number | symbol, V>(entries: Array<[K, V]>): Record<K, V> {
    return _.fromPairs(entries) as Record<K, V>;
  },

  /**
   * Invert object keys and values
   * @param obj - Source object
   * @returns Inverted object
   */
  invert<T extends Record<string, string | number>>(obj: T): Record<string, string> {
    return _.invert(obj);
  },

  /**
   * Map object values
   * @param obj - Source object
   * @param fn - Mapping function
   * @returns Mapped object
   */
  mapValues<T extends AnyObject, R>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => R
  ): Record<keyof T, R> {
    return _.mapValues(obj, fn) as Record<keyof T, R>;
  },

  /**
   * Map object keys
   * @param obj - Source object
   * @param fn - Mapping function
   * @returns Mapped object
   */
  mapKeys<T extends AnyObject>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => string
  ): Record<string, T[keyof T]> {
    return _.mapKeys(obj, fn);
  },

  /**
   * Check if object is empty
   * @param obj - Object to check
   * @returns True if empty
   */
  isEmpty(obj: unknown): boolean {
    return _.isEmpty(obj);
  },

  /**
   * Check if two objects are equal (deep)
   * @param obj1 - First object
   * @param obj2 - Second object
   * @returns True if equal
   */
  isEqual(obj1: unknown, obj2: unknown): boolean {
    return _.isEqual(obj1, obj2);
  }
} as const;

/** Array operations */
export const array = {
  /**
   * Flatten array to specified depth
   * @param arr - Array to flatten
   * @param depth - Depth to flatten (default: 1)
   * @returns Flattened array
   */
  flatten<T>(arr: T[], depth = 1): unknown[] {
    return _.flattenDepth(arr, depth);
  },

  /**
   * Flatten array deeply
   * @param arr - Array to flatten
   * @returns Deeply flattened array
   */
  flattenDeep<T>(arr: T[]): unknown[] {
    return _.flattenDeep(arr);
  },

  /**
   * Remove duplicate values
   * @param arr - Array to process
   * @returns Array with unique values
   */
  unique<T>(arr: T[]): T[] {
    return _.uniq(arr);
  },

  /**
   * Remove duplicate values by property
   * @param arr - Array to process
   * @param key - Property or function to determine uniqueness
   * @returns Array with unique values
   */
  uniqueBy<T>(arr: T[], key: Iteratee<T, unknown>): T[] {
    return _.uniqBy(arr, key as _.ValueIteratee<T>);
  },

  /**
   * Split array into chunks
   * @param arr - Array to chunk
   * @param size - Chunk size
   * @returns Array of chunks
   */
  chunk<T>(arr: T[], size: number): T[][] {
    return _.chunk(arr, size);
  },

  /**
   * Remove falsy values
   * @param arr - Array to process
   * @returns Compacted array
   */
  compact<T>(arr: Array<T | null | undefined | false | 0 | ''>): T[] {
    return _.compact(arr) as T[];
  },

  /**
   * Group array elements by property
   * @param arr - Array to group
   * @param key - Property or function to group by
   * @returns Grouped object
   */
  groupBy<T>(arr: T[], key: Iteratee<T, string | number>): Record<string, T[]> {
    return _.groupBy(arr, key as _.ValueIteratee<T>);
  },

  /**
   * Sort array by property
   * @param arr - Array to sort
   * @param keys - Property/properties or function to sort by
   * @param orders - Sort orders ('asc' or 'desc')
   * @returns Sorted array
   */
  sortBy<T>(
    arr: T[],
    keys: Iteratee<T, unknown> | Array<Iteratee<T, unknown>>,
    orders?: Array<'asc' | 'desc'>
  ): T[] {
    return _.orderBy(arr, keys as _.Many<_.ListIteratee<T>>, orders);
  },

  /**
   * Get first element
   * @param arr - Array
   * @returns First element
   */
  first<T>(arr: T[]): T | undefined {
    return _.first(arr);
  },

  /**
   * Get last element
   * @param arr - Array
   * @returns Last element
   */
  last<T>(arr: T[]): T | undefined {
    return _.last(arr);
  },

  /**
   * Get nth element
   * @param arr - Array
   * @param n - Index
   * @returns Nth element
   */
  nth<T>(arr: T[], n: number): T | undefined {
    return _.nth(arr, n);
  },

  /**
   * Take first n elements
   * @param arr - Array
   * @param n - Number of elements
   * @returns First n elements
   */
  take<T>(arr: T[], n: number): T[] {
    return _.take(arr, n);
  },

  /**
   * Take last n elements
   * @param arr - Array
   * @param n - Number of elements
   * @returns Last n elements
   */
  takeLast<T>(arr: T[], n: number): T[] {
    return _.takeRight(arr, n);
  },

  /**
   * Drop first n elements
   * @param arr - Array
   * @param n - Number of elements to drop
   * @returns Remaining elements
   */
  drop<T>(arr: T[], n: number): T[] {
    return _.drop(arr, n);
  },

  /**
   * Drop last n elements
   * @param arr - Array
   * @param n - Number of elements to drop
   * @returns Remaining elements
   */
  dropLast<T>(arr: T[], n: number): T[] {
    return _.dropRight(arr, n);
  },

  /**
   * Get intersection of arrays
   * @param arrays - Arrays to intersect
   * @returns Intersection
   */
  intersection<T>(...arrays: T[][]): T[] {
    return _.intersection(...arrays);
  },

  /**
   * Get union of arrays
   * @param arrays - Arrays to union
   * @returns Union
   */
  union<T>(...arrays: T[][]): T[] {
    return _.union(...arrays);
  },

  /**
   * Get difference between arrays
   * @param arr - Base array
   * @param others - Arrays to subtract
   * @returns Difference
   */
  difference<T>(arr: T[], ...others: T[][]): T[] {
    return _.difference(arr, ...others);
  },

  /**
   * Zip arrays together
   * @param arrays - Arrays to zip
   * @returns Zipped array
   */
  zip<T>(...arrays: T[][]): Array<Array<T | undefined>> {
    return _.zip(...arrays) as Array<Array<T | undefined>>;
  },

  /**
   * Find element by predicate
   * @param arr - Array to search
   * @param predicate - Predicate function or object
   * @returns Found element
   */
  find<T>(arr: T[], predicate: Predicate<T>): T | undefined {
    return _.find(arr, predicate as _.ListIterateeCustom<T, boolean>);
  },

  /**
   * Filter array by predicate
   * @param arr - Array to filter
   * @param predicate - Predicate function or object
   * @returns Filtered array
   */
  filter<T>(arr: T[], predicate: Predicate<T>): T[] {
    return _.filter(arr, predicate as _.ListIterateeCustom<T, boolean>);
  },

  /**
   * Map array
   * @param arr - Array to map
   * @param fn - Mapping function or property name
   * @returns Mapped array
   */
  map<T, R>(arr: T[], fn: ((value: T, index: number, collection: T[]) => R) | string): R[] {
    return _.map(arr, fn as (value: T) => R) as unknown as R[];
  },

  /**
   * Sum array values
   * @param arr - Array to sum
   * @returns Sum
   */
  sum(arr: number[]): number {
    return _.sum(arr);
  },

  /**
   * Sum array values by property
   * @param arr - Array to sum
   * @param key - Property or function
   * @returns Sum
   */
  sumBy<T>(arr: T[], key: ((value: T) => number) | keyof T): number {
    return _.sumBy(arr, key as string | ((value: T) => number));
  },

  /**
   * Get mean (average) of array
   * @param arr - Array
   * @returns Mean
   */
  mean(arr: number[]): number {
    return _.mean(arr);
  },

  /**
   * Get minimum value
   * @param arr - Array
   * @returns Minimum
   */
  min(arr: number[]): number | undefined {
    return _.min(arr);
  },

  /**
   * Get maximum value
   * @param arr - Array
   * @returns Maximum
   */
  max(arr: number[]): number | undefined {
    return _.max(arr);
  },

  /**
   * Check if array includes value
   * @param arr - Array to check
   * @param value - Value to find
   * @returns True if includes
   */
  includes<T>(arr: T[], value: T): boolean {
    return _.includes(arr, value);
  },

  /**
   * Reverse array
   * @param arr - Array to reverse
   * @returns Reversed array
   */
  reverse<T>(arr: T[]): T[] {
    return _.reverse([...arr]);
  }
} as const;

export type ObjectModule = typeof object;
export type ArrayModule = typeof array;

export default {
  object,
  array
};
