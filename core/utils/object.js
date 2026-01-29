/**
 * Object and Array Utilities
 * Provides deep operations for objects and arrays
 */

import _ from 'lodash';

// Object operations
export const object = {
  /**
   * Pick specific keys from object
   * @param {Object} obj - Source object
   * @param {Array|string} keys - Keys to pick
   * @returns {Object} New object with picked keys
   */
  pick(obj, keys) {
    return _.pick(obj, keys);
  },

  /**
   * Omit specific keys from object
   * @param {Object} obj - Source object
   * @param {Array|string} keys - Keys to omit
   * @returns {Object} New object without omitted keys
   */
  omit(obj, keys) {
    return _.omit(obj, keys);
  },

  /**
   * Deep merge objects
   * @param {...Object} objects - Objects to merge
   * @returns {Object} Merged object
   */
  merge(...objects) {
    return _.merge({}, ...objects);
  },

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  clone(obj) {
    return _.cloneDeep(obj);
  },

  /**
   * Get nested property value
   * @param {Object} obj - Source object
   * @param {string|Array} path - Property path
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Property value
   */
  get(obj, path, defaultValue) {
    return _.get(obj, path, defaultValue);
  },

  /**
   * Set nested property value
   * @param {Object} obj - Target object
   * @param {string|Array} path - Property path
   * @param {*} value - Value to set
   * @returns {Object} Modified object
   */
  set(obj, path, value) {
    return _.set(obj, path, value);
  },

  /**
   * Check if nested property exists
   * @param {Object} obj - Source object
   * @param {string|Array} path - Property path
   * @returns {boolean} True if exists
   */
  has(obj, path) {
    return _.has(obj, path);
  },

  /**
   * Get all keys of object
   * @param {Object} obj - Source object
   * @returns {Array} Array of keys
   */
  keys(obj) {
    return _.keys(obj);
  },

  /**
   * Get all values of object
   * @param {Object} obj - Source object
   * @returns {Array} Array of values
   */
  values(obj) {
    return _.values(obj);
  },

  /**
   * Get all entries of object
   * @param {Object} obj - Source object
   * @returns {Array} Array of [key, value] pairs
   */
  entries(obj) {
    return _.entries(obj);
  },

  /**
   * Create object from entries
   * @param {Array} entries - Array of [key, value] pairs
   * @returns {Object} New object
   */
  fromEntries(entries) {
    return _.fromPairs(entries);
  },

  /**
   * Invert object keys and values
   * @param {Object} obj - Source object
   * @returns {Object} Inverted object
   */
  invert(obj) {
    return _.invert(obj);
  },

  /**
   * Map object values
   * @param {Object} obj - Source object
   * @param {Function} fn - Mapping function
   * @returns {Object} Mapped object
   */
  mapValues(obj, fn) {
    return _.mapValues(obj, fn);
  },

  /**
   * Map object keys
   * @param {Object} obj - Source object
   * @param {Function} fn - Mapping function
   * @returns {Object} Mapped object
   */
  mapKeys(obj, fn) {
    return _.mapKeys(obj, fn);
  },

  /**
   * Check if object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} True if empty
   */
  isEmpty(obj) {
    return _.isEmpty(obj);
  },

  /**
   * Check if two objects are equal (deep)
   * @param {*} obj1 - First object
   * @param {*} obj2 - Second object
   * @returns {boolean} True if equal
   */
  isEqual(obj1, obj2) {
    return _.isEqual(obj1, obj2);
  }
};

// Array operations
export const array = {
  /**
   * Flatten array to specified depth
   * @param {Array} arr - Array to flatten
   * @param {number} depth - Depth to flatten (default: 1)
   * @returns {Array} Flattened array
   */
  flatten(arr, depth = 1) {
    return _.flattenDepth(arr, depth);
  },

  /**
   * Flatten array deeply
   * @param {Array} arr - Array to flatten
   * @returns {Array} Deeply flattened array
   */
  flattenDeep(arr) {
    return _.flattenDeep(arr);
  },

  /**
   * Remove duplicate values
   * @param {Array} arr - Array to process
   * @returns {Array} Array with unique values
   */
  unique(arr) {
    return _.uniq(arr);
  },

  /**
   * Remove duplicate values by property
   * @param {Array} arr - Array to process
   * @param {string|Function} key - Property or function to determine uniqueness
   * @returns {Array} Array with unique values
   */
  uniqueBy(arr, key) {
    return _.uniqBy(arr, key);
  },

  /**
   * Split array into chunks
   * @param {Array} arr - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunk(arr, size) {
    return _.chunk(arr, size);
  },

  /**
   * Remove falsy values
   * @param {Array} arr - Array to process
   * @returns {Array} Compacted array
   */
  compact(arr) {
    return _.compact(arr);
  },

  /**
   * Group array elements by property
   * @param {Array} arr - Array to group
   * @param {string|Function} key - Property or function to group by
   * @returns {Object} Grouped object
   */
  groupBy(arr, key) {
    return _.groupBy(arr, key);
  },

  /**
   * Sort array by property
   * @param {Array} arr - Array to sort
   * @param {string|Array|Function} keys - Property/properties or function to sort by
   * @param {Array} orders - Sort orders ('asc' or 'desc')
   * @returns {Array} Sorted array
   */
  sortBy(arr, keys, orders) {
    return _.orderBy(arr, keys, orders);
  },

  /**
   * Get first element
   * @param {Array} arr - Array
   * @returns {*} First element
   */
  first(arr) {
    return _.first(arr);
  },

  /**
   * Get last element
   * @param {Array} arr - Array
   * @returns {*} Last element
   */
  last(arr) {
    return _.last(arr);
  },

  /**
   * Get nth element
   * @param {Array} arr - Array
   * @param {number} n - Index
   * @returns {*} Nth element
   */
  nth(arr, n) {
    return _.nth(arr, n);
  },

  /**
   * Take first n elements
   * @param {Array} arr - Array
   * @param {number} n - Number of elements
   * @returns {Array} First n elements
   */
  take(arr, n) {
    return _.take(arr, n);
  },

  /**
   * Take last n elements
   * @param {Array} arr - Array
   * @param {number} n - Number of elements
   * @returns {Array} Last n elements
   */
  takeLast(arr, n) {
    return _.takeRight(arr, n);
  },

  /**
   * Drop first n elements
   * @param {Array} arr - Array
   * @param {number} n - Number of elements to drop
   * @returns {Array} Remaining elements
   */
  drop(arr, n) {
    return _.drop(arr, n);
  },

  /**
   * Drop last n elements
   * @param {Array} arr - Array
   * @param {number} n - Number of elements to drop
   * @returns {Array} Remaining elements
   */
  dropLast(arr, n) {
    return _.dropRight(arr, n);
  },

  /**
   * Get intersection of arrays
   * @param {...Array} arrays - Arrays to intersect
   * @returns {Array} Intersection
   */
  intersection(...arrays) {
    return _.intersection(...arrays);
  },

  /**
   * Get union of arrays
   * @param {...Array} arrays - Arrays to union
   * @returns {Array} Union
   */
  union(...arrays) {
    return _.union(...arrays);
  },

  /**
   * Get difference between arrays
   * @param {Array} arr - Base array
   * @param {...Array} others - Arrays to subtract
   * @returns {Array} Difference
   */
  difference(arr, ...others) {
    return _.difference(arr, ...others);
  },

  /**
   * Zip arrays together
   * @param {...Array} arrays - Arrays to zip
   * @returns {Array} Zipped array
   */
  zip(...arrays) {
    return _.zip(...arrays);
  },

  /**
   * Find element by predicate
   * @param {Array} arr - Array to search
   * @param {Function|Object} predicate - Predicate function or object
   * @returns {*} Found element
   */
  find(arr, predicate) {
    return _.find(arr, predicate);
  },

  /**
   * Filter array by predicate
   * @param {Array} arr - Array to filter
   * @param {Function|Object} predicate - Predicate function or object
   * @returns {Array} Filtered array
   */
  filter(arr, predicate) {
    return _.filter(arr, predicate);
  },

  /**
   * Map array
   * @param {Array} arr - Array to map
   * @param {Function|string} fn - Mapping function or property name
   * @returns {Array} Mapped array
   */
  map(arr, fn) {
    return _.map(arr, fn);
  },

  /**
   * Sum array values
   * @param {Array} arr - Array to sum
   * @returns {number} Sum
   */
  sum(arr) {
    return _.sum(arr);
  },

  /**
   * Sum array values by property
   * @param {Array} arr - Array to sum
   * @param {string|Function} key - Property or function
   * @returns {number} Sum
   */
  sumBy(arr, key) {
    return _.sumBy(arr, key);
  },

  /**
   * Get mean (average) of array
   * @param {Array} arr - Array
   * @returns {number} Mean
   */
  mean(arr) {
    return _.mean(arr);
  },

  /**
   * Get minimum value
   * @param {Array} arr - Array
   * @returns {number} Minimum
   */
  min(arr) {
    return _.min(arr);
  },

  /**
   * Get maximum value
   * @param {Array} arr - Array
   * @returns {number} Maximum
   */
  max(arr) {
    return _.max(arr);
  },

  /**
   * Check if array includes value
   * @param {Array} arr - Array to check
   * @param {*} value - Value to find
   * @returns {boolean} True if includes
   */
  includes(arr, value) {
    return _.includes(arr, value);
  },

  /**
   * Reverse array
   * @param {Array} arr - Array to reverse
   * @returns {Array} Reversed array
   */
  reverse(arr) {
    return _.reverse([...arr]);
  }
};

// Export both as default
export default {
  object,
  array
};
