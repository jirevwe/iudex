/**
 * Encoding and Decoding Utilities
 * Provides base64, URL, and JSON encoding/decoding
 */

/**
 * Encode a string to base64
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
function base64Encode(str) {
  if (str === null || str === undefined) {
    throw new Error('Cannot encode null or undefined to base64');
  }
  return Buffer.from(String(str), 'utf-8').toString('base64');
}

/**
 * Decode a base64 string
 * @param {string} str - Base64 string to decode
 * @returns {string} Decoded string
 */
function base64Decode(str) {
  if (str === null || str === undefined) {
    throw new Error('Cannot decode null or undefined from base64');
  }
  try {
    return Buffer.from(String(str), 'base64').toString('utf-8');
  } catch (error) {
    throw new Error(`Invalid base64 string: ${error.message}`);
  }
}

/**
 * URL encode a string
 * @param {string} str - String to URL encode
 * @returns {string} URL encoded string
 */
function urlEncode(str) {
  if (str === null || str === undefined) {
    return '';
  }
  return encodeURIComponent(String(str));
}

/**
 * URL decode a string
 * @param {string} str - String to URL decode
 * @returns {string} URL decoded string
 */
function urlDecode(str) {
  if (str === null || str === undefined) {
    return '';
  }
  try {
    return decodeURIComponent(String(str));
  } catch (error) {
    throw new Error(`Invalid URL encoded string: ${error.message}`);
  }
}

/**
 * Encode an object to JSON string
 * @param {*} obj - Object to encode
 * @param {boolean} pretty - Pretty print with indentation
 * @returns {string} JSON string
 */
function jsonEncode(obj, pretty = false) {
  try {
    return JSON.stringify(obj, null, pretty ? 2 : 0);
  } catch (error) {
    throw new Error(`Failed to encode JSON: ${error.message}`);
  }
}

/**
 * Decode a JSON string to object
 * @param {string} str - JSON string to decode
 * @returns {*} Parsed object
 */
function jsonDecode(str) {
  if (str === null || str === undefined || str === '') {
    throw new Error('Cannot decode empty or null JSON string');
  }
  try {
    return JSON.parse(String(str));
  } catch (error) {
    throw new Error(`Invalid JSON string: ${error.message}`);
  }
}

// Export encoding functions
export const encode = {
  base64: base64Encode,
  url: urlEncode,
  json: jsonEncode
};

// Export decoding functions
export const decode = {
  base64: base64Decode,
  url: urlDecode,
  json: jsonDecode
};
