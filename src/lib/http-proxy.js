/**
 * HTTP Proxy Module
 * Bridges stdio MCP communication to HTTP MCP servers.
 * 
 * @module http-proxy
 */

'use strict';

const { createInterface } = require('readline');
const { validateUrl, isHttps, isLocalhost } = require('./url-validator');
const { parseHeaders, maskSensitiveValue, headersMapToObject } = require('./header-parser');
const jsonrpc = require('./jsonrpc-error');

/**
 * HTTPProxyConfig - Configuration for the HTTP proxy
 * Immutable after creation from CLI arguments
 */
class HTTPProxyConfig {
  /**
   * @param {Object} options
   * @param {URL} options.url - Target HTTP endpoint (validated)
   * @param {Map<string, string>} options.headers - Custom headers with expanded env vars
   * @param {number} [options.timeout=60000] - Request timeout in ms
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options) {
    if (!options.url || !(options.url instanceof URL)) {
      throw new Error('HTTPProxyConfig requires a valid URL object');
    }
    
    /** @type {URL} */
    this.url = options.url;
    
    /** @type {Map<string, string>} */
    this.headers = options.headers || new Map();
    
    /** @type {number} */
    this.timeout = typeof options.timeout === 'number' && options.timeout > 0 
      ? options.timeout 
      : 60000;
    
    /** @type {boolean} */
    this.debug = Boolean(options.debug);
    
    // Freeze to ensure immutability
    Object.freeze(this);
  }

  /**
   * Create HTTPProxyConfig from CLI arguments
   * 
   * @param {Object} args - Parsed CLI arguments
   * @param {string} args.url - Target URL string
   * @param {string[]} [args.headers] - Header strings ["Name: Value", ...]
   * @param {number} [args.timeout] - Timeout in ms
   * @param {boolean} [args.debug] - Debug mode
   * @param {Object} [env=process.env] - Environment for variable expansion
   * @returns {{ config?: HTTPProxyConfig, errors: string[], warnings: string[] }}
   */
  static fromArgs(args, env = process.env) {
    const errors = [];
    const warnings = [];

    // Validate URL
    const urlResult = validateUrl(args.url);
    if (!urlResult.valid) {
      errors.push(urlResult.error);
      return { errors, warnings };
    }
    warnings.push(...urlResult.warnings);

    // Parse headers
    const headerResult = parseHeaders(args.headers || [], env);
    errors.push(...headerResult.errors);
    warnings.push(...headerResult.warnings);

    if (errors.length > 0) {
      return { errors, warnings };
    }

    const config = new HTTPProxyConfig({
      url: urlResult.url,
      headers: headerResult.headers,
      timeout: args.timeout,
      debug: args.debug
    });

    return { config, errors, warnings };
  }
}

/**
 * HTTPProxySession - Runtime state for an active proxy session
 */
class HTTPProxySession {
  /**
   * @param {HTTPProxyConfig} config - Proxy configuration
   */
  constructor(config) {
    if (!(config instanceof HTTPProxyConfig)) {
      throw new Error('HTTPProxySession requires an HTTPProxyConfig instance');
    }
    
    /** @type {HTTPProxyConfig} */
    this.config = config;
    
    /** @type {string|null} */
    this.sessionId = null;
    
    /** @type {boolean} */
    this.isActive = true;
    
    /** @type {number} */
    this.requestCount = 0;

    /** @type {AbortController|null} */
    this._abortController = null;
  }

  /**
   * Log debug messages if debug mode is enabled
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.config.debug) {
      console.error('[http-proxy]', ...args);
    }
  }

  /**
   * Log headers with sensitive values masked
   * @param {Object} headers - Headers object
   */
  logHeaders(headers) {
    if (!this.config.debug) return;
    
    const masked = {};
    for (const [name, value] of Object.entries(headers)) {
      masked[name] = maskSensitiveValue(name, value);
    }
    this.log('Headers:', masked);
  }

  /**
   * Build request headers for a fetch call
   * @returns {Object} Headers object
   */
  buildRequestHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headersMapToObject(this.config.headers)
    };

    // Include session ID if we have one
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    return headers;
  }

  /**
   * Send a JSON-RPC request to the HTTP server
   * 
   * @param {Object|Array} message - JSON-RPC message or batch
   * @returns {Promise<Object|Array>} JSON-RPC response or batch
   */
  async sendRequest(message) {
    const isBatch = jsonrpc.isBatchRequest(message);
    const requestId = isBatch ? null : message.id;

    this.log('Sending request:', isBatch ? `batch of ${message.length}` : message.method);
    
    // Create abort controller for timeout
    this._abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      this._abortController.abort();
    }, this.config.timeout);

    try {
      const headers = this.buildRequestHeaders();
      this.logHeaders(headers);

      const response = await fetch(this.config.url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: this._abortController.signal
      });

      clearTimeout(timeoutId);
      this.requestCount++;

      // Capture session ID from response
      const responseSessionId = response.headers.get('Mcp-Session-Id');
      if (responseSessionId && responseSessionId !== this.sessionId) {
        this.log('Session ID:', responseSessionId);
        this.sessionId = responseSessionId;
      }

      // Check for HTTP errors
      if (!response.ok) {
        const statusText = response.statusText || 'Unknown Error';
        let body;
        try {
          body = await response.text();
          // Try to parse as JSON for better error info
          try {
            body = JSON.parse(body);
          } catch (e) {
            // Keep as text
          }
        } catch (e) {
          body = undefined;
        }
        
        this.log('HTTP error:', response.status, statusText);
        return jsonrpc.fromHttpError(response.status, statusText, requestId, body);
      }

      // Parse response
      const contentType = response.headers.get('Content-Type') || '';
      
      // Handle SSE responses (deferred to v1.1 - return error for now)
      if (contentType.includes('text/event-stream')) {
        this.log('SSE response not supported in this version');
        return jsonrpc.internalError(
          requestId,
          'SSE responses not supported in this version. Please use a server that returns JSON.',
          { contentType }
        );
      }

      // Parse JSON response
      const data = await response.json();
      this.log('Response received');
      return data;

    } catch (err) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        this.log('Request timeout');
        return jsonrpc.fromNetworkError(
          { name: 'TimeoutError', message: `Request timeout after ${this.config.timeout}ms` },
          requestId
        );
      }

      // Handle network errors
      this.log('Network error:', err.message);
      return jsonrpc.fromNetworkError(err, requestId);
    } finally {
      this._abortController = null;
    }
  }

  /**
   * Process a single line of input (NDJSON)
   * 
   * @param {string} line - Input line
   * @returns {Promise<string|null>} Output line or null if no response needed
   */
  async processLine(line) {
    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    // Parse JSON
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch (err) {
      this.log('Parse error:', err.message);
      return JSON.stringify(jsonrpc.parseError(err.message));
    }

    // Validate request(s)
    const isBatch = jsonrpc.isBatchRequest(message);
    
    if (isBatch) {
      // Validate batch - must be non-empty array
      if (message.length === 0) {
        return JSON.stringify(jsonrpc.invalidRequest(null, 'Empty batch'));
      }
      
      // Validate each request in batch
      for (let i = 0; i < message.length; i++) {
        const validation = jsonrpc.isValidRequest(message[i]);
        if (!validation.valid) {
          // For batch, return error for invalid request
          const response = jsonrpc.invalidRequest(message[i]?.id || null, validation.error);
          // Continue processing - server may return batch response
          this.log(`Batch item ${i} invalid:`, validation.error);
        }
      }
    } else {
      // Validate single request
      const validation = jsonrpc.isValidRequest(message);
      if (!validation.valid) {
        return JSON.stringify(jsonrpc.invalidRequest(message.id || null, validation.error));
      }
    }

    // Send to HTTP server
    const response = await this.sendRequest(message);
    
    // Notifications (no id) don't get responses
    if (!isBatch && message.id === undefined) {
      return null;
    }

    return JSON.stringify(response);
  }

  /**
   * Start the stdio-HTTP bridge
   * Reads NDJSON from stdin, sends to HTTP, writes responses to stdout
   * 
   * @returns {Promise<void>} Resolves when stdin closes
   */
  async start() {
    // Warn about insecure HTTP
    if (!isHttps(this.config.url) && !isLocalhost(this.config.url.hostname)) {
      console.error(`[http-proxy] Warning: Using insecure HTTP for non-localhost URL. Consider using HTTPS.`);
    }

    this.log('Starting HTTP proxy');
    this.log('Target URL:', this.config.url.toString());
    this.log('Timeout:', this.config.timeout, 'ms');

    const rl = createInterface({
      input: process.stdin,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!this.isActive) {
        break;
      }

      const output = await this.processLine(line);
      if (output !== null) {
        process.stdout.write(output + '\n');
      }
    }

    this.log('Stdin closed, stopping proxy');
  }

  /**
   * Stop the proxy session
   * Aborts any pending requests and cleans up session
   */
  async stop() {
    this.log('Stopping proxy session');
    this.isActive = false;

    // Abort any pending request
    if (this._abortController) {
      this._abortController.abort();
    }

    // Send session cleanup if we have a session ID
    if (this.sessionId) {
      try {
        this.log('Sending session cleanup DELETE');
        await fetch(this.config.url.toString(), {
          method: 'DELETE',
          headers: {
            'Mcp-Session-Id': this.sessionId
          },
          signal: AbortSignal.timeout(5000) // Short timeout for cleanup
        });
      } catch (err) {
        this.log('Session cleanup failed:', err.message);
        // Ignore cleanup errors
      }
    }

    this.log(`Session ended. Processed ${this.requestCount} requests.`);
  }
}

/**
 * Create and start an HTTP proxy session
 * 
 * @param {Object} args - CLI arguments
 * @param {string} args.url - Target URL
 * @param {string[]} [args.headers] - Header strings
 * @param {number} [args.timeout] - Timeout in ms
 * @param {boolean} [args.debug] - Debug mode
 * @param {Object} [env=process.env] - Environment for variable expansion
 * @returns {Promise<void>}
 */
async function startHttpProxy(args, env = process.env) {
  // Create config
  const { config, errors, warnings } = HTTPProxyConfig.fromArgs(args, env);

  // Log warnings
  for (const warning of warnings) {
    console.error(`[http-proxy] Warning: ${warning}`);
  }

  // Exit on errors
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[http-proxy] Error: ${error}`);
    }
    process.exit(1);
  }

  // Create session
  const session = new HTTPProxySession(config);

  // Handle shutdown signals
  const shutdown = async (signal) => {
    session.log(`Received ${signal}`);
    await session.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start the proxy
  try {
    await session.start();
  } catch (err) {
    console.error(`[http-proxy] Fatal error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  HTTPProxyConfig,
  HTTPProxySession,
  startHttpProxy
};
