/**
 * Unit tests for header-parser.js
 * @module tests/header-parser.test
 */

'use strict';

const assert = require('assert');
const { 
  parseHeader, 
  parseHeaders, 
  expandEnvVars, 
  isValidHeaderName, 
  isValidHeaderValue,
  maskSensitiveValue,
  headersMapToObject 
} = require('../src/lib/header-parser');

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

console.log('\n=== Header Parser Tests ===\n');

// --- expandEnvVars tests ---

runTest('expandEnvVars: expands $VAR syntax', () => {
  const env = { TOKEN: 'secret123' };
  const result = expandEnvVars('Bearer $TOKEN', env);
  assert.strictEqual(result, 'Bearer secret123');
});

runTest('expandEnvVars: expands ${VAR} syntax', () => {
  const env = { TOKEN: 'secret123' };
  const result = expandEnvVars('Bearer ${TOKEN}', env);
  assert.strictEqual(result, 'Bearer secret123');
});

runTest('expandEnvVars: replaces missing vars with empty string', () => {
  const env = {};
  const result = expandEnvVars('Bearer $MISSING_TOKEN', env);
  assert.strictEqual(result, 'Bearer ');
});

runTest('expandEnvVars: expands multiple variables', () => {
  const env = { USER: 'alice', TOKEN: 'xyz' };
  const result = expandEnvVars('$USER:$TOKEN', env);
  assert.strictEqual(result, 'alice:xyz');
});

runTest('expandEnvVars: leaves non-variable text unchanged', () => {
  const env = {};
  const result = expandEnvVars('plain text', env);
  assert.strictEqual(result, 'plain text');
});

runTest('expandEnvVars: handles underscore in variable names', () => {
  const env = { MY_SECRET_KEY: 'value' };
  const result = expandEnvVars('$MY_SECRET_KEY', env);
  assert.strictEqual(result, 'value');
});

// --- isValidHeaderName tests ---

runTest('isValidHeaderName: accepts valid names', () => {
  assert.strictEqual(isValidHeaderName('Authorization'), true);
  assert.strictEqual(isValidHeaderName('X-Custom-Header'), true);
  assert.strictEqual(isValidHeaderName('Content-Type'), true);
  assert.strictEqual(isValidHeaderName('x-api-key'), true);
});

runTest('isValidHeaderName: rejects invalid names', () => {
  assert.strictEqual(isValidHeaderName(''), false);
  assert.strictEqual(isValidHeaderName(null), false);
  assert.strictEqual(isValidHeaderName(undefined), false);
  assert.strictEqual(isValidHeaderName('Header Name'), false); // space
  assert.strictEqual(isValidHeaderName('Header:Name'), false); // colon
  assert.strictEqual(isValidHeaderName('Header\nName'), false); // newline
});

// --- isValidHeaderValue tests ---

runTest('isValidHeaderValue: accepts valid values', () => {
  assert.strictEqual(isValidHeaderValue('Bearer token123'), true);
  assert.strictEqual(isValidHeaderValue(''), true);
  assert.strictEqual(isValidHeaderValue('value with spaces'), true);
});

runTest('isValidHeaderValue: rejects CRLF injection', () => {
  assert.strictEqual(isValidHeaderValue('value\r\nInjected: header'), false);
  assert.strictEqual(isValidHeaderValue('value\nInjected'), false);
  assert.strictEqual(isValidHeaderValue('value\rInjected'), false);
});

// --- parseHeader tests ---

runTest('parseHeader: parses valid header', () => {
  const result = parseHeader('Authorization: Bearer token', {});
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.header.name, 'Authorization');
  assert.strictEqual(result.header.value, 'Bearer token');
  assert.strictEqual(result.header.originalValue, 'Bearer token');
});

runTest('parseHeader: expands environment variables', () => {
  const env = { TOKEN: 'secret' };
  const result = parseHeader('Authorization: Bearer $TOKEN', env);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.header.value, 'Bearer secret');
  assert.strictEqual(result.header.originalValue, 'Bearer $TOKEN');
});

runTest('parseHeader: handles colons in value', () => {
  const result = parseHeader('Custom: value:with:colons', {});
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.header.name, 'Custom');
  assert.strictEqual(result.header.value, 'value:with:colons');
});

runTest('parseHeader: trims whitespace', () => {
  const result = parseHeader('  Authorization  :  Bearer token  ', {});
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.header.name, 'Authorization');
  assert.strictEqual(result.header.value, 'Bearer token');
});

runTest('parseHeader: returns error for missing colon', () => {
  const result = parseHeader('InvalidHeader', {});
  assert.strictEqual(result.success, false);
  assert.ok(result.error.includes('missing colon'));
});

runTest('parseHeader: expands when entire header comes from env var', () => {
  const env = { GH_HEADER: 'Authorization: Bearer env-secret' };
  const result = parseHeader('$GH_HEADER', env);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.header.name, 'Authorization');
  assert.strictEqual(result.header.value, 'Bearer env-secret');
  assert.strictEqual(result.header.originalValue, '$GH_HEADER');
});

runTest('parseHeader: returns error for invalid header name', () => {
  const result = parseHeader('Invalid Header: value', {});
  assert.strictEqual(result.success, false);
  assert.ok(result.error.includes('Invalid header name'));
});

runTest('parseHeader: returns error for CRLF in value', () => {
  const env = { BAD: 'value\r\nInjected: header' };
  const result = parseHeader('Header: $BAD', env);
  assert.strictEqual(result.success, false);
  assert.ok(result.error.includes('forbidden characters'));
});

runTest('parseHeader: returns error for empty input', () => {
  const result = parseHeader('', {});
  assert.strictEqual(result.success, false);
});

// --- parseHeaders tests ---

runTest('parseHeaders: parses multiple headers', () => {
  const env = { TOKEN: 'abc123' };
  const result = parseHeaders([
    'Authorization: Bearer $TOKEN',
    'X-Custom: value'
  ], env);
  
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.headers.get('Authorization'), 'Bearer abc123');
  assert.strictEqual(result.headers.get('X-Custom'), 'value');
});

runTest('parseHeaders: warns on empty expansion', () => {
  const env = {};
  // Use just the variable so result is empty string
  const result = parseHeaders(['X-Token: $MISSING'], env);
  
  assert.strictEqual(result.warnings.length, 1);
  assert.ok(result.warnings[0].includes('empty value'));
});

runTest('parseHeaders: collects errors and continues', () => {
  const result = parseHeaders([
    'Valid: header',
    'Invalid Header: value',
    'Another-Valid: header'
  ], {});
  
  assert.strictEqual(result.errors.length, 1);
  assert.strictEqual(result.headers.size, 2);
});

runTest('parseHeaders: later headers override earlier', () => {
  const result = parseHeaders([
    'X-Header: first',
    'X-Header: second'
  ], {});
  
  assert.strictEqual(result.headers.get('X-Header'), 'second');
});

// --- maskSensitiveValue tests ---

runTest('maskSensitiveValue: masks Authorization header', () => {
  const result = maskSensitiveValue('Authorization', 'Bearer ghp_1234567890abcdef');
  assert.ok(result.includes('***'));
  // Should not contain the full token (middle part should be masked)
  assert.ok(!result.includes('1234567890'));
});

runTest('maskSensitiveValue: masks X-API-Key header', () => {
  const result = maskSensitiveValue('X-API-Key', 'sk-1234567890');
  assert.ok(result.includes('***'));
});

runTest('maskSensitiveValue: does not mask non-sensitive headers', () => {
  const result = maskSensitiveValue('Content-Type', 'application/json');
  assert.strictEqual(result, 'application/json');
});

runTest('maskSensitiveValue: handles short values', () => {
  const result = maskSensitiveValue('Authorization', 'short');
  assert.strictEqual(result, '***');
});

// --- headersMapToObject tests ---

runTest('headersMapToObject: converts map to object', () => {
  const map = new Map([
    ['Content-Type', 'application/json'],
    ['Authorization', 'Bearer token']
  ]);
  const obj = headersMapToObject(map);
  assert.deepStrictEqual(obj, {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  });
});

// --- Summary ---

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
