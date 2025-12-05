/**
 * JSON-RPC Error Module
 * Formats JSON-RPC 2.0 error responses for the MCP HTTP proxy.
 * 
 * @module jsonrpc-error
 */

'use strict';

/**
 * Standard JSON-RPC 2.0 error codes
 * @see https://www.jsonrpc.org/specification#error_object
 */
const ErrorCodes = {
  /** Invalid JSON was received by the server */
  PARSE_ERROR: -32700,
  /** The JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,
  /** The method does not exist / is not available */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameter(s) */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
  
  // Server error range: -32000 to -32099 (reserved for implementation-defined)
  /** HTTP transport error (network, timeout, etc.) */
  TRANSPORT_ERROR: -32000,
  /** HTTP status error (4xx, 5xx) */
  HTTP_ERROR: -32001,
  /** Configuration/validation error */
  CONFIG_ERROR: -32002,
  /** Session error */
  SESSION_ERROR: -32003
};

/**
 * Default messages for standard error codes
 */
const ErrorMessages = {
  [ErrorCodes.PARSE_ERROR]: 'Parse error',
  [ErrorCodes.INVALID_REQUEST]: 'Invalid Request',
  [ErrorCodes.METHOD_NOT_FOUND]: 'Method not found',
  [ErrorCodes.INVALID_PARAMS]: 'Invalid params',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal error',
  [ErrorCodes.TRANSPORT_ERROR]: 'Transport error',
  [ErrorCodes.HTTP_ERROR]: 'HTTP error',
  [ErrorCodes.CONFIG_ERROR]: 'Configuration error',
  [ErrorCodes.SESSION_ERROR]: 'Session error'
};

/**
 * @typedef {Object} JSONRPCError
 * @property {number} code - Error code
 * @property {string} message - Human-readable message
 * @property {*} [data] - Additional error data
 */

/**
 * @typedef {Object} JSONRPCErrorResponse
 * @property {string} jsonrpc - Always "2.0"
 * @property {JSONRPCError} error - Error object
 * @property {string|number|null} id - Request ID (null if unknown)
 */

/**
 * Create a JSON-RPC error object
 * 
 * @param {number} code - Error code
 * @param {string} [message] - Error message (defaults to standard message for code)
 * @param {*} [data] - Additional error data
 * @returns {JSONRPCError} Error object
 */
function createError(code, message, data) {
  const error = {
    code,
    message: message || ErrorMessages[code] || 'Unknown error'
  };
  
  if (data !== undefined) {
    error.data = data;
  }
  
  return error;
}

/**
 * Create a full JSON-RPC error response
 * 
 * @param {number} code - Error code
 * @param {string} [message] - Error message
 * @param {string|number|null} [id=null] - Request ID
 * @param {*} [data] - Additional error data
 * @returns {JSONRPCErrorResponse} Full JSON-RPC error response
 */
function createErrorResponse(code, message, id = null, data) {
  return {
    jsonrpc: '2.0',
    error: createError(code, message, data),
    id
  };
}

/**
 * Create a parse error response (for malformed JSON)
 * 
 * @param {string} [details] - Additional details about the parse error
 * @returns {JSONRPCErrorResponse} Parse error response
 */
function parseError(details) {
  return createErrorResponse(
    ErrorCodes.PARSE_ERROR,
    'Parse error: Invalid JSON',
    null,
    details ? { details } : undefined
  );
}

/**
 * Create an invalid request error response
 * 
 * @param {string|number|null} id - Request ID
 * @param {string} [details] - Additional details
 * @returns {JSONRPCErrorResponse} Invalid request error response
 */
function invalidRequest(id, details) {
  return createErrorResponse(
    ErrorCodes.INVALID_REQUEST,
    'Invalid Request',
    id,
    details ? { details } : undefined
  );
}

/**
 * Create an internal error response (for unexpected errors)
 * 
 * @param {string|number|null} id - Request ID
 * @param {string} [message] - Error message
 * @param {*} [data] - Additional error data
 * @returns {JSONRPCErrorResponse} Internal error response
 */
function internalError(id, message, data) {
  return createErrorResponse(
    ErrorCodes.INTERNAL_ERROR,
    message || 'Internal error',
    id,
    data
  );
}

/**
 * Convert an HTTP error to a JSON-RPC error response
 * 
 * @param {number} statusCode - HTTP status code
 * @param {string} statusText - HTTP status text
 * @param {string|number|null} id - Request ID
 * @param {*} [body] - Response body (if any)
 * @returns {JSONRPCErrorResponse} HTTP error response
 */
function fromHttpError(statusCode, statusText, id, body) {
  const message = `HTTP ${statusCode}: ${statusText}`;
  const data = { statusCode, statusText };
  
  if (body !== undefined) {
    data.body = body;
  }
  
  return createErrorResponse(ErrorCodes.HTTP_ERROR, message, id, data);
}

/**
 * Convert a network/transport error to a JSON-RPC error response
 * 
 * @param {Error} error - JavaScript Error object
 * @param {string|number|null} id - Request ID
 * @returns {JSONRPCErrorResponse} Transport error response
 */
function fromNetworkError(error, id) {
  let message = 'Network error';
  const data = { originalError: error.message };
  
  // Provide specific messages for common network errors
  if (error.code === 'ENOTFOUND' || error.cause?.code === 'ENOTFOUND') {
    message = 'DNS resolution failed';
    data.errorCode = 'ENOTFOUND';
  } else if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
    message = 'Connection refused';
    data.errorCode = 'ECONNREFUSED';
  } else if (error.code === 'ETIMEDOUT' || error.cause?.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
    message = 'Request timeout';
    data.errorCode = 'ETIMEDOUT';
  } else if (error.code === 'ECONNRESET' || error.cause?.code === 'ECONNRESET') {
    message = 'Connection reset';
    data.errorCode = 'ECONNRESET';
  } else if (error.code === 'CERT_HAS_EXPIRED' || error.message?.includes('certificate')) {
    message = 'SSL/TLS certificate error';
    data.errorCode = 'CERT_ERROR';
  }
  
  return createErrorResponse(ErrorCodes.TRANSPORT_ERROR, message, id, data);
}

/**
 * Convert a configuration error to a JSON-RPC error response
 * 
 * @param {string} message - Error message
 * @param {*} [data] - Additional error data
 * @returns {JSONRPCErrorResponse} Configuration error response
 */
function configError(message, data) {
  return createErrorResponse(ErrorCodes.CONFIG_ERROR, message, null, data);
}

/**
 * Format a JSON-RPC error response as a JSON string
 * 
 * @param {JSONRPCErrorResponse} errorResponse - Error response object
 * @returns {string} JSON string
 */
function formatAsJson(errorResponse) {
  return JSON.stringify(errorResponse);
}

/**
 * Check if an object is a valid JSON-RPC request
 * 
 * @param {*} obj - Object to check
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
function isValidRequest(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return { valid: false, error: 'Request must be an object' };
  }
  
  if (obj.jsonrpc !== '2.0') {
    return { valid: false, error: 'Invalid or missing jsonrpc version (must be "2.0")' };
  }
  
  if (typeof obj.method !== 'string') {
    return { valid: false, error: 'Invalid or missing method (must be a string)' };
  }
  
  // params is optional but must be object or array if present
  if (obj.params !== undefined && 
      typeof obj.params !== 'object') {
    return { valid: false, error: 'params must be an object or array if present' };
  }
  
  // id can be string, number, or null (for notifications, id is absent)
  if (obj.id !== undefined && 
      obj.id !== null && 
      typeof obj.id !== 'string' && 
      typeof obj.id !== 'number') {
    return { valid: false, error: 'id must be a string, number, or null' };
  }
  
  return { valid: true };
}

/**
 * Check if an object is a JSON-RPC batch request (array of requests)
 * 
 * @param {*} obj - Object to check
 * @returns {boolean} True if batch request
 */
function isBatchRequest(obj) {
  return Array.isArray(obj);
}

module.exports = {
  ErrorCodes,
  ErrorMessages,
  createError,
  createErrorResponse,
  parseError,
  invalidRequest,
  internalError,
  fromHttpError,
  fromNetworkError,
  configError,
  formatAsJson,
  isValidRequest,
  isBatchRequest
};
