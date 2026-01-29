/**
 * Random Data Generation Utilities
 * Provides random primitives, identifiers, and realistic test data
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes as nodeRandomBytes } from 'crypto';

/**
 * Generate random UUID v4
 * @returns {string} UUID v4
 */
export function uuid() {
  return uuidv4();
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function int(min = 0, max = 100) {
  return faker.number.int({ min, max });
}

/**
 * Generate random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} decimals - Number of decimal places
 * @returns {number} Random float
 */
export function float(min = 0, max = 1, decimals = 2) {
  const value = faker.number.float({ min, max, multipleOf: Math.pow(10, -decimals) });
  return parseFloat(value.toFixed(decimals));
}

/**
 * Generate random boolean
 * @returns {boolean} Random true/false
 */
export function boolean() {
  return faker.datatype.boolean();
}

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of string
 * @returns {string} Random alphanumeric string
 */
export function alphanumeric(length = 10) {
  return faker.string.alphanumeric(length);
}

/**
 * Generate random hexadecimal string
 * @param {number} length - Length of string
 * @returns {string} Random hex string
 */
export function hex(length = 16) {
  const bytes = Math.ceil(length / 2);
  const hexString = nodeRandomBytes(bytes).toString('hex');
  return hexString.substring(0, length);
}

/**
 * Generate random email address
 * @returns {string} Random email
 */
export function email() {
  return faker.internet.email();
}

/**
 * Generate random username
 * @returns {string} Random username
 */
export function username() {
  return faker.internet.userName();
}

/**
 * Generate random password
 * @param {number} length - Length of password
 * @returns {string} Random password
 */
export function password(length = 16) {
  return faker.internet.password({ length });
}

/**
 * Generate random IPv4 address
 * @returns {string} Random IPv4 address
 */
export function ipv4() {
  return faker.internet.ipv4();
}

/**
 * Generate random IPv6 address
 * @returns {string} Random IPv6 address
 */
export function ipv6() {
  return faker.internet.ipv6();
}

/**
 * Generate random MAC address
 * @returns {string} Random MAC address
 */
export function mac() {
  return faker.internet.mac();
}

/**
 * Generate random URL
 * @returns {string} Random URL
 */
export function url() {
  return faker.internet.url();
}

/**
 * Generate random domain name
 * @returns {string} Random domain
 */
export function domain() {
  return faker.internet.domainName();
}

/**
 * Generate random first name
 * @returns {string} Random first name
 */
export function firstName() {
  return faker.person.firstName();
}

/**
 * Generate random last name
 * @returns {string} Random last name
 */
export function lastName() {
  return faker.person.lastName();
}

/**
 * Generate random full name
 * @returns {string} Random full name
 */
export function fullName() {
  return faker.person.fullName();
}

/**
 * Generate random phone number
 * @returns {string} Random phone number
 */
export function phoneNumber() {
  return faker.phone.number();
}

/**
 * Generate random street address
 * @returns {string} Random address
 */
export function address() {
  return faker.location.streetAddress();
}

/**
 * Generate random city name
 * @returns {string} Random city
 */
export function city() {
  return faker.location.city();
}

/**
 * Generate random country name
 * @returns {string} Random country
 */
export function country() {
  return faker.location.country();
}

/**
 * Generate random zip code
 * @returns {string} Random zip code
 */
export function zipCode() {
  return faker.location.zipCode();
}

/**
 * Generate random latitude
 * @returns {number} Random latitude
 */
export function latitude() {
  return faker.location.latitude();
}

/**
 * Generate random longitude
 * @returns {number} Random longitude
 */
export function longitude() {
  return faker.location.longitude();
}

/**
 * Generate random company name
 * @returns {string} Random company name
 */
export function companyName() {
  return faker.company.name();
}

/**
 * Generate random job title
 * @returns {string} Random job title
 */
export function jobTitle() {
  return faker.person.jobTitle();
}

/**
 * Generate random words
 * @param {number} count - Number of words
 * @returns {string} Random words
 */
export function words(count = 3) {
  return faker.lorem.words(count);
}

/**
 * Generate random sentence
 * @returns {string} Random sentence
 */
export function sentence() {
  return faker.lorem.sentence();
}

/**
 * Generate random paragraph
 * @returns {string} Random paragraph
 */
export function paragraph() {
  return faker.lorem.paragraph();
}

/**
 * Pick random element from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
export function arrayElement(array) {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error('Array must be non-empty');
  }
  return faker.helpers.arrayElement(array);
}

/**
 * Pick multiple random elements from array
 * @param {Array} array - Array to pick from
 * @param {number} count - Number of elements to pick
 * @returns {Array} Random elements
 */
export function arrayElements(array, count) {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error('Array must be non-empty');
  }
  return faker.helpers.arrayElements(array, count);
}

/**
 * Shuffle array
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffle(array) {
  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }
  return faker.helpers.shuffle([...array]);
}

/**
 * Generate random credit card number
 * @returns {string} Random credit card number
 */
export function creditCard() {
  return faker.finance.creditCardNumber();
}

/**
 * Generate random currency code
 * @returns {string} Random currency code
 */
export function currencyCode() {
  return faker.finance.currencyCode();
}

/**
 * Generate random amount
 * @param {number} min - Minimum amount
 * @param {number} max - Maximum amount
 * @param {number} decimals - Decimal places
 * @returns {string} Random amount
 */
export function amount(min = 0, max = 1000, decimals = 2) {
  return faker.finance.amount({ min, max, dec: decimals });
}
