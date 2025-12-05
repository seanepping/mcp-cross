/**
 * Unit tests for url-validator.js
 * @module tests/url-validator.test
 */

'use strict';

const assert = require('assert');
const { 
  validateUrl, 
  isLocalhost, 
  isHttps, 
  getBaseUrl, 
  normalizeUrl 
} = require('../src/lib/url-validator');

/**
 * Test runner
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  if (test(name, fn)) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n=== URL Validator Tests ===\n');

// --- validateUrl tests ---

runTest('validateUrl: accepts valid HTTPS URL', () => {
  const result = validateUrl('https://api.example.com/mcp');
  assert.strictEqual(result.valid, true);
  assert.ok(result.url instanceof URL);
  assert.strictEqual(result.url.hostname, 'api.example.com');
});

runTest('validateUrl: accepts valid HTTP localhost URL', () => {
  const result = validateUrl('http://localhost:3000/mcp');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.warnings.length, 0); // No warning for localhost HTTP
});

runTest('validateUrl: warns for non-localhost HTTP', () => {
  const result = validateUrl('http://api.example.com/mcp');
  assert.strictEqual(result.valid, true);
  assert.ok(result.warnings.some(w => w.includes('insecure')));
});

runTest('validateUrl: rejects invalid protocol', () => {
  const result = validateUrl('ftp://example.com/mcp');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Invalid protocol'));
});

runTest('validateUrl: rejects empty input', () => {
  const result = validateUrl('');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('non-empty'));
});

runTest('validateUrl: rejects null input', () => {
  const result = validateUrl(null);
  assert.strictEqual(result.valid, false);
});

runTest('validateUrl: rejects malformed URL', () => {
  const result = validateUrl('not a url');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Invalid URL'));
});

runTest('validateUrl: handles URL with port', () => {
  const result = validateUrl('https://example.com:8080/mcp');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.url.port, '8080');
});

runTest('validateUrl: handles URL with path and query', () => {
  const result = validateUrl('https://example.com/mcp?foo=bar');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.url.pathname, '/mcp');
  assert.strictEqual(result.url.search, '?foo=bar');
});

runTest('validateUrl: warns about whitespace', () => {
  const result = validateUrl('  https://example.com/mcp  ');
  assert.strictEqual(result.valid, true);
  assert.ok(result.warnings.some(w => w.includes('whitespace')));
});

runTest('validateUrl: warns about credentials in URL', () => {
  const result = validateUrl('https://user:pass@example.com/mcp');
  assert.strictEqual(result.valid, true);
  assert.ok(result.warnings.some(w => w.includes('credentials')));
});

// --- isLocalhost tests ---

runTest('isLocalhost: identifies localhost', () => {
  assert.strictEqual(isLocalhost('localhost'), true);
  assert.strictEqual(isLocalhost('LOCALHOST'), true);
});

runTest('isLocalhost: identifies 127.0.0.1', () => {
  assert.strictEqual(isLocalhost('127.0.0.1'), true);
});

runTest('isLocalhost: identifies IPv6 localhost', () => {
  assert.strictEqual(isLocalhost('::1'), true);
  assert.strictEqual(isLocalhost('[::1]'), true);
});

runTest('isLocalhost: rejects non-localhost', () => {
  assert.strictEqual(isLocalhost('example.com'), false);
  assert.strictEqual(isLocalhost('192.168.1.1'), false);
});

// --- isHttps tests ---

runTest('isHttps: returns true for HTTPS', () => {
  assert.strictEqual(isHttps('https://example.com'), true);
  assert.strictEqual(isHttps(new URL('https://example.com')), true);
});

runTest('isHttps: returns false for HTTP', () => {
  assert.strictEqual(isHttps('http://example.com'), false);
  assert.strictEqual(isHttps(new URL('http://example.com')), false);
});

// --- getBaseUrl tests ---

runTest('getBaseUrl: extracts origin', () => {
  assert.strictEqual(getBaseUrl('https://example.com/path'), 'https://example.com');
  assert.strictEqual(getBaseUrl('http://localhost:3000/mcp?foo=bar'), 'http://localhost:3000');
});

// --- normalizeUrl tests ---

runTest('normalizeUrl: removes default port 443 for HTTPS', () => {
  const result = normalizeUrl('https://example.com:443/path');
  assert.ok(!result.includes(':443'));
});

runTest('normalizeUrl: removes default port 80 for HTTP', () => {
  const result = normalizeUrl('http://example.com:80/path');
  assert.ok(!result.includes(':80'));
});

runTest('normalizeUrl: preserves non-default ports', () => {
  const result = normalizeUrl('https://example.com:8080/path');
  assert.ok(result.includes(':8080'));
});

// --- Summary ---

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
