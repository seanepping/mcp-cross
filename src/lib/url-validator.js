/**
 * URL Validator Module
 * Validates HTTP/HTTPS URLs for MCP HTTP proxy.
 * 
 * @module url-validator
 */

'use strict';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the URL is valid
 * @property {URL} [url] - Parsed URL object (if valid)
 * @property {string} [error] - Error message (if invalid)
 * @property {string[]} [warnings] - Warnings (e.g., insecure HTTP)
 */

/**
 * Check if a hostname is localhost
 * 
 * @param {string} hostname - Hostname to check
 * @returns {boolean} True if localhost
 */
function isLocalhost(hostname) {
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '::1',
    '[::1]'
  ];
  return localhostPatterns.includes(hostname.toLowerCase());
}

/**
 * Validate a URL for use with the HTTP proxy
 * 
 * @param {string} urlString - URL string to validate
 * @returns {ValidationResult} Validation result
 */
function validateUrl(urlString) {
  const warnings = [];

  // Check for empty or non-string input
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  // Trim whitespace
  const trimmed = urlString.trim();
  if (trimmed !== urlString) {
    warnings.push('URL contained leading/trailing whitespace');
  }

  // Try to parse the URL
  let url;
  try {
    url = new URL(trimmed);
  } catch (err) {
    return { valid: false, error: `Invalid URL format: ${err.message}` };
  }

  // Validate protocol (must be http or https)
  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { 
      valid: false, 
      error: `Invalid protocol "${protocol}". Only http: and https: are supported.` 
    };
  }

  // Warn about insecure HTTP for non-localhost
  if (protocol === 'http:' && !isLocalhost(url.hostname)) {
    warnings.push(`Using insecure HTTP for non-localhost URL "${url.hostname}". Consider using HTTPS for security.`);
  }

  // Validate hostname is present
  if (!url.hostname) {
    return { valid: false, error: 'URL must have a hostname' };
  }

  // Validate port is a number if present
  if (url.port && !/^\d+$/.test(url.port)) {
    return { valid: false, error: `Invalid port: ${url.port}` };
  }

  // Check for user info (username:password) - warn as it may be logged
  if (url.username || url.password) {
    warnings.push('URL contains credentials. These may be logged. Consider using headers for authentication.');
  }

  return { valid: true, url, warnings };
}

/**
 * Check if URL uses HTTPS
 * 
 * @param {URL|string} url - URL to check
 * @returns {boolean} True if HTTPS
 */
function isHttps(url) {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return urlObj.protocol.toLowerCase() === 'https:';
}

/**
 * Get the base URL (origin) from a URL
 * 
 * @param {URL|string} url - URL to process
 * @returns {string} Base URL (protocol + host)
 */
function getBaseUrl(url) {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return urlObj.origin;
}

/**
 * Normalize a URL for consistent comparison
 * - Removes default ports (80 for http, 443 for https)
 * - Lowercases protocol and hostname
 * - Preserves path, query, and fragment
 * 
 * @param {string} urlString - URL to normalize
 * @returns {string} Normalized URL string
 */
function normalizeUrl(urlString) {
  const url = new URL(urlString);
  
  // Remove default ports
  if ((url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }
  
  return url.toString();
}

module.exports = {
  validateUrl,
  isLocalhost,
  isHttps,
  getBaseUrl,
  normalizeUrl
};
