/**
 * Iudex Standard Library
 * Main entry point for all standard utilities
 */

import * as encoding from './encoding.js';
import * as crypto from './crypto.js';
import * as string from './string.js';
import * as datetime from './datetime.js';
import * as random from './random.js';
import { object, array } from './object.js';
import * as validators from './validators.js';
import _ from 'lodash';

/**
 * Create standard library object with all utilities
 * Available in test context as `std`
 *
 * @returns {Object} Standard library object
 *
 * @example
 * test('example', async ({ std, request }) => {
 *   const encoded = std.encode.base64('hello');
 *   const hash = std.crypto.sha256('data');
 *   const email = std.random.email();
 * });
 */
export function createStdObject() {
  return {
    // Encoding/Decoding
    encode: encoding.encode,
    decode: encoding.decode,

    // Cryptography
    crypto: {
      md5: crypto.md5,
      sha1: crypto.sha1,
      sha256: crypto.sha256,
      sha512: crypto.sha512,
      hmacSHA1: crypto.hmacSHA1,
      hmacSHA256: crypto.hmacSHA256,
      hmacSHA512: crypto.hmacSHA512,
      uuid: crypto.uuid,
      randomBytes: crypto.randomBytes
    },

    // String manipulation
    string: {
      camelCase: string.camelCase,
      pascalCase: string.pascalCase,
      snakeCase: string.snakeCase,
      kebabCase: string.kebabCase,
      constantCase: string.constantCase,
      capitalize: string.capitalize,
      titleCase: string.titleCase,
      lowerCase: string.lowerCase,
      upperCase: string.upperCase,
      truncate: string.truncate,
      padLeft: string.padLeft,
      padRight: string.padRight,
      reverse: string.reverse,
      repeat: string.repeat,
      trim: string.trim,
      trimLeft: string.trimLeft,
      trimRight: string.trimRight,
      replaceAll: string.replaceAll,
      contains: string.contains,
      startsWith: string.startsWith,
      endsWith: string.endsWith
    },

    // Date/Time
    datetime: {
      now: datetime.now,
      nowISO: datetime.nowISO,
      today: datetime.today,
      format: datetime.format,
      toISO: datetime.toISO,
      toUnix: datetime.toUnix,
      parse: datetime.parse,
      fromUnix: datetime.fromUnix,
      add: datetime.add,
      subtract: datetime.subtract,
      diff: datetime.diff,
      isBefore: datetime.isBefore,
      isAfter: datetime.isAfter,
      isSame: datetime.isSame,
      isBetween: datetime.isBetween,
      startOf: datetime.startOf,
      endOf: datetime.endOf,
      isValid: datetime.isValid,
      dayOfWeek: datetime.dayOfWeek,
      dayOfMonth: datetime.dayOfMonth,
      month: datetime.month,
      year: datetime.year
    },

    // Random data generation
    random: {
      uuid: random.uuid,
      int: random.int,
      float: random.float,
      boolean: random.boolean,
      alphanumeric: random.alphanumeric,
      hex: random.hex,
      email: random.email,
      username: random.username,
      password: random.password,
      ipv4: random.ipv4,
      ipv6: random.ipv6,
      mac: random.mac,
      url: random.url,
      domain: random.domain,
      firstName: random.firstName,
      lastName: random.lastName,
      fullName: random.fullName,
      phoneNumber: random.phoneNumber,
      address: random.address,
      city: random.city,
      country: random.country,
      zipCode: random.zipCode,
      latitude: random.latitude,
      longitude: random.longitude,
      companyName: random.companyName,
      jobTitle: random.jobTitle,
      words: random.words,
      sentence: random.sentence,
      paragraph: random.paragraph,
      arrayElement: random.arrayElement,
      arrayElements: random.arrayElements,
      shuffle: random.shuffle,
      creditCard: random.creditCard,
      currencyCode: random.currencyCode,
      amount: random.amount
    },

    // Object utilities
    object: {
      pick: object.pick,
      omit: object.omit,
      merge: object.merge,
      clone: object.clone,
      get: object.get,
      set: object.set,
      has: object.has,
      keys: object.keys,
      values: object.values,
      entries: object.entries,
      fromEntries: object.fromEntries,
      invert: object.invert,
      mapValues: object.mapValues,
      mapKeys: object.mapKeys,
      isEmpty: object.isEmpty,
      isEqual: object.isEqual
    },

    // Array utilities
    array: {
      flatten: array.flatten,
      flattenDeep: array.flattenDeep,
      unique: array.unique,
      uniqueBy: array.uniqueBy,
      chunk: array.chunk,
      compact: array.compact,
      groupBy: array.groupBy,
      sortBy: array.sortBy,
      first: array.first,
      last: array.last,
      nth: array.nth,
      take: array.take,
      takeLast: array.takeLast,
      drop: array.drop,
      dropLast: array.dropLast,
      intersection: array.intersection,
      union: array.union,
      difference: array.difference,
      zip: array.zip,
      find: array.find,
      filter: array.filter,
      map: array.map,
      sum: array.sum,
      sumBy: array.sumBy,
      mean: array.mean,
      min: array.min,
      max: array.max,
      includes: array.includes,
      reverse: array.reverse
    },

    // Validators
    validate: {
      isEmail: validators.isEmail,
      isURL: validators.isURL,
      isUUID: validators.isUUID,
      isIPv4: validators.isIPv4,
      isIPv6: validators.isIPv6,
      isIP: validators.isIP,
      isJSON: validators.isJSON,
      isBase64: validators.isBase64,
      isDate: validators.isDate,
      isPhone: validators.isPhone,
      isHex: validators.isHex,
      isAlphanumeric: validators.isAlphanumeric,
      schema: validators.schema,
      matches: validators.matches,
      isEmpty: validators.isEmpty,
      isNumber: validators.isNumber,
      isInteger: validators.isInteger,
      isBoolean: validators.isBoolean,
      isString: validators.isString,
      isArray: validators.isArray,
      isObject: validators.isObject,
      isNull: validators.isNull,
      isUndefined: validators.isUndefined,
      isLength: validators.isLength,
      isInRange: validators.isInRange
    },

    // Direct lodash access for advanced users
    _: _
  };
}

// Export individual modules for testing
export {
  encoding,
  crypto,
  string,
  datetime,
  random,
  object,
  array,
  validators
};
