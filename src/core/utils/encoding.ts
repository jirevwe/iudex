/**
 * Encoding and Decoding Utilities
 * Provides base64, URL, and JSON encoding/decoding
 */

/**
 * Encode a string to base64
 * @param str - String to encode
 * @returns Base64 encoded string
 */
function base64Encode(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    throw new Error('Cannot encode null or undefined to base64');
  }
  return Buffer.from(String(str), 'utf-8').toString('base64');
}

/**
 * Decode a base64 string
 * @param str - Base64 string to decode
 * @returns Decoded string
 */
function base64Decode(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    throw new Error('Cannot decode null or undefined from base64');
  }
  try {
    return Buffer.from(String(str), 'base64').toString('utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid base64 string: ${message}`);
  }
}

/**
 * URL encode a string
 * @param str - String to URL encode
 * @returns URL encoded string
 */
function urlEncode(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    return '';
  }
  return encodeURIComponent(String(str));
}

/**
 * URL decode a string
 * @param str - String to URL decode
 * @returns URL decoded string
 */
function urlDecode(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    return '';
  }
  try {
    return decodeURIComponent(String(str));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid URL encoded string: ${message}`);
  }
}

/**
 * Encode an object to JSON string
 * @param obj - Object to encode
 * @param pretty - Pretty print with indentation
 * @returns JSON string
 */
function jsonEncode(obj: unknown, pretty = false): string {
  try {
    return JSON.stringify(obj, null, pretty ? 2 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to encode JSON: ${message}`);
  }
}

/**
 * Decode a JSON string to object
 * @param str - JSON string to decode
 * @returns Parsed object
 */
function jsonDecode<T = unknown>(str: string | null | undefined): T {
  if (str === null || str === undefined || str === '') {
    throw new Error('Cannot decode empty or null JSON string');
  }
  try {
    return JSON.parse(String(str)) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON string: ${message}`);
  }
}

/** Encoding functions */
export const encode = {
  base64: base64Encode,
  url: urlEncode,
  json: jsonEncode
} as const;

/** Decoding functions */
export const decode = {
  base64: base64Decode,
  url: urlDecode,
  json: jsonDecode
} as const;

export type EncodeModule = typeof encode;
export type DecodeModule = typeof decode;
