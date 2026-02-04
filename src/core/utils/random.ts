/**
 * Random Data Generation Utilities
 * Provides random primitives, identifiers, and realistic test data
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes as nodeRandomBytes } from 'crypto';

/**
 * Generate random UUID v4
 * @returns UUID v4
 */
export function uuid(): string {
  return uuidv4();
}

/**
 * Generate random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
export function int(min = 0, max = 100): number {
  return faker.number.int({ min, max });
}

/**
 * Generate random float between min and max
 * @param min - Minimum value
 * @param max - Maximum value
 * @param decimals - Number of decimal places
 * @returns Random float
 */
export function float(min = 0, max = 1, decimals = 2): number {
  const value = faker.number.float({ min, max, multipleOf: Math.pow(10, -decimals) });
  return parseFloat(value.toFixed(decimals));
}

/**
 * Generate random boolean
 * @returns Random true/false
 */
export function boolean(): boolean {
  return faker.datatype.boolean();
}

/**
 * Generate random alphanumeric string
 * @param length - Length of string
 * @returns Random alphanumeric string
 */
export function alphanumeric(length = 10): string {
  return faker.string.alphanumeric(length);
}

/**
 * Generate random hexadecimal string
 * @param length - Length of string
 * @returns Random hex string
 */
export function hex(length = 16): string {
  const bytes = Math.ceil(length / 2);
  const hexString = nodeRandomBytes(bytes).toString('hex');
  return hexString.substring(0, length);
}

/**
 * Generate random email address
 * @returns Random email
 */
export function email(): string {
  return faker.internet.email();
}

/**
 * Generate random username
 * @returns Random username
 */
export function username(): string {
  return faker.internet.userName();
}

/**
 * Generate random password
 * @param length - Length of password
 * @returns Random password
 */
export function password(length = 16): string {
  return faker.internet.password({ length });
}

/**
 * Generate random IPv4 address
 * @returns Random IPv4 address
 */
export function ipv4(): string {
  return faker.internet.ipv4();
}

/**
 * Generate random IPv6 address
 * @returns Random IPv6 address
 */
export function ipv6(): string {
  return faker.internet.ipv6();
}

/**
 * Generate random MAC address
 * @returns Random MAC address
 */
export function mac(): string {
  return faker.internet.mac();
}

/**
 * Generate random URL
 * @returns Random URL
 */
export function url(): string {
  return faker.internet.url();
}

/**
 * Generate random domain name
 * @returns Random domain
 */
export function domain(): string {
  return faker.internet.domainName();
}

/**
 * Generate random first name
 * @returns Random first name
 */
export function firstName(): string {
  return faker.person.firstName();
}

/**
 * Generate random last name
 * @returns Random last name
 */
export function lastName(): string {
  return faker.person.lastName();
}

/**
 * Generate random full name
 * @returns Random full name
 */
export function fullName(): string {
  return faker.person.fullName();
}

/**
 * Generate random phone number
 * @returns Random phone number
 */
export function phoneNumber(): string {
  return faker.phone.number();
}

/**
 * Generate random street address
 * @returns Random address
 */
export function address(): string {
  return faker.location.streetAddress();
}

/**
 * Generate random city name
 * @returns Random city
 */
export function city(): string {
  return faker.location.city();
}

/**
 * Generate random country name
 * @returns Random country
 */
export function country(): string {
  return faker.location.country();
}

/**
 * Generate random zip code
 * @returns Random zip code
 */
export function zipCode(): string {
  return faker.location.zipCode();
}

/**
 * Generate random latitude
 * @returns Random latitude
 */
export function latitude(): number {
  return faker.location.latitude();
}

/**
 * Generate random longitude
 * @returns Random longitude
 */
export function longitude(): number {
  return faker.location.longitude();
}

/**
 * Generate random company name
 * @returns Random company name
 */
export function companyName(): string {
  return faker.company.name();
}

/**
 * Generate random job title
 * @returns Random job title
 */
export function jobTitle(): string {
  return faker.person.jobTitle();
}

/**
 * Generate random words
 * @param count - Number of words
 * @returns Random words
 */
export function words(count = 3): string {
  return faker.lorem.words(count);
}

/**
 * Generate random sentence
 * @returns Random sentence
 */
export function sentence(): string {
  return faker.lorem.sentence();
}

/**
 * Generate random paragraph
 * @returns Random paragraph
 */
export function paragraph(): string {
  return faker.lorem.paragraph();
}

/**
 * Pick random element from array
 * @param array - Array to pick from
 * @returns Random element
 */
export function arrayElement<T>(array: T[]): T {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error('Array must be non-empty');
  }
  return faker.helpers.arrayElement(array);
}

/**
 * Pick multiple random elements from array
 * @param array - Array to pick from
 * @param count - Number of elements to pick
 * @returns Random elements
 */
export function arrayElements<T>(array: T[], count?: number): T[] {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error('Array must be non-empty');
  }
  return faker.helpers.arrayElements(array, count);
}

/**
 * Shuffle array
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }
  return faker.helpers.shuffle([...array]);
}

/**
 * Generate random credit card number
 * @returns Random credit card number
 */
export function creditCard(): string {
  return faker.finance.creditCardNumber();
}

/**
 * Generate random currency code
 * @returns Random currency code
 */
export function currencyCode(): string {
  return faker.finance.currencyCode();
}

/**
 * Generate random amount
 * @param min - Minimum amount
 * @param max - Maximum amount
 * @param decimals - Decimal places
 * @returns Random amount
 */
export function amount(min = 0, max = 1000, decimals = 2): string {
  return faker.finance.amount({ min, max, dec: decimals });
}
