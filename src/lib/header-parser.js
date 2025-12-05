/**
 * Header Parser Module
 * Parses HTTP headers with environment variable expansion.
 * 
 * @module header-parser
 */

'use strict';

/**
 * Valid HTTP header name pattern (RFC 7230)
 * Header names consist of tokens: visible US-ASCII chars except delimiters
 */
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

/**
 * Environment variable pattern: $VAR or ${VAR}
 */
const ENV_VAR_PATTERN = /\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g;

/**
 * @typedef {Object} ParsedHeader
 * @property {string} name - Header name (e.g., "Authorization")
 * @property {string} value - Header value after environment variable expansion
 * @property {string} originalValue - Original value before expansion (for debugging)
 */

/**
 * @typedef {Object} ParseResult
 * @property {boolean} success - Whether parsing succeeded
 * @property {ParsedHeader} [header] - Parsed header (if success)
 * @property {string} [error] - Error message (if failed)
 */

/**
 * Expand environment variables in a string
 * Supports both $VAR and ${VAR} syntax
 * 
 * @param {string} value - String containing environment variables
 * @param {Object} [env=process.env] - Environment object to use for expansion
 * @returns {string} String with environment variables expanded
 */
function expandEnvVars(value, env = process.env) {
  return value.replace(ENV_VAR_PATTERN, (match, varName) => {
    const envValue = env[varName];
    return envValue !== undefined ? envValue : '';
  });
}

/**
 * Validate header name according to HTTP spec
 * 
 * @param {string} name - Header name to validate
 * @returns {boolean} True if valid
 */
function isValidHeaderName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return HEADER_NAME_PATTERN.test(name);
}

/**
 * Validate header value (no CRLF injection)
 * 
 * @param {string} value - Header value to validate
 * @returns {boolean} True if valid
 */
function isValidHeaderValue(value) {
  if (typeof value !== 'string') {
    return false;
  }
  // Reject CRLF characters that could enable header injection
  return !value.includes('\r') && !value.includes('\n');
}

/**
 * Parse a single header string in "Name: Value" format
 * 
 * @param {string} headerString - Header string (e.g., "Authorization: Bearer $TOKEN")
 * @param {Object} [env=process.env] - Environment object for variable expansion
 * @returns {ParseResult} Parse result with header or error
 */
function parseHeader(headerString, env = process.env) {
  if (!headerString || typeof headerString !== 'string') {
    return { success: false, error: 'Header string must be a non-empty string' };
  }

  const trimmedInput = headerString.trim();
  if (trimmedInput.length === 0) {
    return { success: false, error: 'Header string must be a non-empty string' };
  }

  let workingHeaderString = trimmedInput;
  let colonIndex = workingHeaderString.indexOf(':');
  let expandedEntireHeader = false;

  if (colonIndex === -1) {
    workingHeaderString = expandEnvVars(workingHeaderString, env).trim();
    colonIndex = workingHeaderString.indexOf(':');
    expandedEntireHeader = true;
  }

  if (colonIndex === -1) {
    return { success: false, error: `Invalid header format: missing colon separator in "${headerString}"` };
  }

  const name = workingHeaderString.substring(0, colonIndex).trim();
  const rawValuePortion = workingHeaderString.substring(colonIndex + 1).trim();

  // Validate header name
  if (!isValidHeaderName(name)) {
    return { success: false, error: `Invalid header name: "${name}"` };
  }

  // Preserve the user-provided representation for debugging/warnings
  const originalValue = expandedEntireHeader ? trimmedInput : rawValuePortion;

  // Expand environment variables in the value portion (safe even if already expanded)
  const value = expandEnvVars(rawValuePortion, env);

  // Validate expanded value (no CRLF injection)
  if (!isValidHeaderValue(value)) {
    return { success: false, error: `Invalid header value: contains forbidden characters (CRLF)` };
  }

  return {
    success: true,
    header: {
      name,
      value,
      originalValue
    }
  };
}

/**
 * Parse multiple header strings
 * 
 * @param {string[]} headerStrings - Array of header strings
 * @param {Object} [env=process.env] - Environment object for variable expansion
 * @returns {{ headers: Map<string, string>, errors: string[], warnings: string[] }} Result with headers map and any errors/warnings
 */
function parseHeaders(headerStrings, env = process.env) {
  const headers = new Map();
  const errors = [];
  const warnings = [];

  if (!Array.isArray(headerStrings)) {
    return { headers, errors: ['headerStrings must be an array'], warnings };
  }

  for (const headerString of headerStrings) {
    const result = parseHeader(headerString, env);

    if (!result.success) {
      errors.push(result.error);
      continue;
    }

    const { name, value, originalValue } = result.header;

    // Warn if value is empty after expansion AND original contained env vars (likely missing env var)
    // Use a non-global regex for the test to avoid lastIndex issues
    const hasEnvVar = /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(originalValue);
    if (value === '' && originalValue !== '' && hasEnvVar) {
      warnings.push(`Header "${name}" has empty value after environment variable expansion (original: "${originalValue}")`);
    }

    // Later headers override earlier ones (same as HTTP behavior)
    headers.set(name, value);
  }

  return { headers, errors, warnings };
}

/**
 * Mask sensitive header values for debug logging
 * 
 * @param {string} name - Header name
 * @param {string} value - Header value
 * @returns {string} Masked value if sensitive, original otherwise
 */
function maskSensitiveValue(name, value) {
  const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key', 'x-auth-token', 'cookie', 'set-cookie'];
  
  if (sensitiveHeaders.includes(name.toLowerCase())) {
    if (value.length <= 12) {
      return '***';
    }
    // Show first 4 and last 4 characters for long values
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }
  
  return value;
}

/**
 * Convert headers Map to plain object for use with fetch
 * 
 * @param {Map<string, string>} headersMap - Headers map
 * @returns {Object} Plain object with header key-value pairs
 */
function headersMapToObject(headersMap) {
  const obj = {};
  for (const [name, value] of headersMap) {
    obj[name] = value;
  }
  return obj;
}

module.exports = {
  parseHeader,
  parseHeaders,
  expandEnvVars,
  isValidHeaderName,
  isValidHeaderValue,
  maskSensitiveValue,
  headersMapToObject,
  // Export patterns for testing
  HEADER_NAME_PATTERN,
  ENV_VAR_PATTERN
};
