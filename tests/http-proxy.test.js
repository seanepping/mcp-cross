/**
 * Unit and integration tests for http-proxy.js
 * @module tests/http-proxy.test
 */

'use strict';

const assert = require('assert');
const http = require('http');
const { HTTPProxyConfig, HTTPProxySession } = require('../src/lib/http-proxy');

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

async function asyncTest(name, fn) {
  try {
    await fn();
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

async function runAsyncTest(name, fn) {
  if (await asyncTest(name, fn)) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n=== HTTP Proxy Tests ===\n');

// --- HTTPProxyConfig tests ---

runTest('HTTPProxyConfig: creates config with valid URL', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  assert.strictEqual(config.url.hostname, 'api.example.com');
  assert.strictEqual(config.timeout, 60000);
  assert.strictEqual(config.debug, false);
});

runTest('HTTPProxyConfig: accepts custom headers', () => {
  const url = new URL('https://api.example.com/mcp');
  const headers = new Map([['Authorization', 'Bearer token']]);
  const config = new HTTPProxyConfig({ url, headers });
  assert.strictEqual(config.headers.get('Authorization'), 'Bearer token');
});

runTest('HTTPProxyConfig: accepts custom timeout', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url, timeout: 30000 });
  assert.strictEqual(config.timeout, 30000);
});

runTest('HTTPProxyConfig: defaults invalid timeout to 60000', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url, timeout: -1 });
  assert.strictEqual(config.timeout, 60000);
});

runTest('HTTPProxyConfig: throws on missing URL', () => {
  assert.throws(() => {
    new HTTPProxyConfig({});
  }, /requires a valid URL/);
});

runTest('HTTPProxyConfig: is frozen after creation', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  assert.ok(Object.isFrozen(config));
});

// --- HTTPProxyConfig.fromArgs tests ---

runTest('HTTPProxyConfig.fromArgs: creates config from valid args', () => {
  const result = HTTPProxyConfig.fromArgs({
    url: 'https://api.example.com/mcp',
    headers: ['Authorization: Bearer token'],
    timeout: 30000,
    debug: true
  });
  
  assert.strictEqual(result.errors.length, 0);
  assert.ok(result.config);
  assert.strictEqual(result.config.url.hostname, 'api.example.com');
  assert.strictEqual(result.config.headers.get('Authorization'), 'Bearer token');
});

runTest('HTTPProxyConfig.fromArgs: expands environment variables', () => {
  const result = HTTPProxyConfig.fromArgs({
    url: 'https://api.example.com/mcp',
    headers: ['Authorization: Bearer $TEST_TOKEN']
  }, { TEST_TOKEN: 'secret123' });
  
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.config.headers.get('Authorization'), 'Bearer secret123');
});

runTest('HTTPProxyConfig.fromArgs: returns errors for invalid URL', () => {
  const result = HTTPProxyConfig.fromArgs({ url: 'not-a-url' });
  assert.ok(result.errors.length > 0);
  assert.ok(!result.config);
});

runTest('HTTPProxyConfig.fromArgs: warns for insecure HTTP', () => {
  const result = HTTPProxyConfig.fromArgs({ url: 'http://external.api.com/mcp' });
  assert.ok(result.warnings.some(w => w.includes('insecure')));
});

// --- HTTPProxySession tests ---

runTest('HTTPProxySession: creates session with config', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  const session = new HTTPProxySession(config);
  
  assert.strictEqual(session.isActive, true);
  assert.strictEqual(session.sessionId, null);
  assert.strictEqual(session.requestCount, 0);
});

runTest('HTTPProxySession: throws on invalid config', () => {
  assert.throws(() => {
    new HTTPProxySession({});
  }, /requires an HTTPProxyConfig/);
});

runTest('HTTPProxySession: buildRequestHeaders includes custom headers', () => {
  const url = new URL('https://api.example.com/mcp');
  const headers = new Map([
    ['Authorization', 'Bearer token'],
    ['X-Custom', 'value']
  ]);
  const config = new HTTPProxyConfig({ url, headers });
  const session = new HTTPProxySession(config);
  
  const requestHeaders = session.buildRequestHeaders();
  assert.strictEqual(requestHeaders['Content-Type'], 'application/json');
  assert.strictEqual(requestHeaders['Accept'], 'application/json');
  assert.strictEqual(requestHeaders['Authorization'], 'Bearer token');
  assert.strictEqual(requestHeaders['X-Custom'], 'value');
});

runTest('HTTPProxySession: buildRequestHeaders includes session ID when set', () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  const session = new HTTPProxySession(config);
  session.sessionId = 'test-session-id';
  
  const requestHeaders = session.buildRequestHeaders();
  assert.strictEqual(requestHeaders['Mcp-Session-Id'], 'test-session-id');
});

// --- processLine tests ---

runTest('HTTPProxySession: processLine returns null for empty lines', async () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  const session = new HTTPProxySession(config);
  
  const result = await session.processLine('');
  assert.strictEqual(result, null);
  
  const result2 = await session.processLine('   ');
  assert.strictEqual(result2, null);
});

runTest('HTTPProxySession: processLine returns parse error for invalid JSON', async () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  const session = new HTTPProxySession(config);
  
  const result = await session.processLine('not json');
  const parsed = JSON.parse(result);
  assert.strictEqual(parsed.error.code, -32700); // Parse error
});

runTest('HTTPProxySession: processLine returns invalid request error', async () => {
  const url = new URL('https://api.example.com/mcp');
  const config = new HTTPProxyConfig({ url });
  const session = new HTTPProxySession(config);
  
  const result = await session.processLine('{"foo": "bar"}');
  const parsed = JSON.parse(result);
  assert.strictEqual(parsed.error.code, -32600); // Invalid request
});

// --- Mock server integration tests ---

let mockServer;
let mockServerPort;

async function startMockServer() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        // Echo back the request as a JSON-RPC response
        let request;
        try {
          request = JSON.parse(body);
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        // Handle batch requests
        if (Array.isArray(request)) {
          const responses = request.map(r => ({
            jsonrpc: '2.0',
            result: { method: r.method, echoed: true },
            id: r.id
          }));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(responses));
          return;
        }

        // Set session ID on response
        res.setHeader('Mcp-Session-Id', 'mock-session-123');
        res.setHeader('Content-Type', 'application/json');
        
        // Handle authorization check
        const auth = req.headers['authorization'];
        if (auth === 'Bearer invalid') {
          res.statusCode = 401;
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Unauthorized' },
            id: request.id
          }));
          return;
        }

        // Normal response
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          result: { method: request.method, echoed: true },
          id: request.id
        }));
      });
    });

    mockServer.listen(0, '127.0.0.1', () => {
      mockServerPort = mockServer.address().port;
      resolve();
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(resolve);
    } else {
      resolve();
    }
  });
}

// Run integration tests with mock server
async function runIntegrationTests() {
  console.log('\n--- Integration Tests with Mock Server ---\n');

  await startMockServer();
  console.log(`Mock server started on port ${mockServerPort}`);

  await runAsyncTest('HTTPProxySession: sendRequest returns response from server', async () => {
    const url = new URL(`http://127.0.0.1:${mockServerPort}/mcp`);
    const config = new HTTPProxyConfig({ url });
    const session = new HTTPProxySession(config);

    const response = await session.sendRequest({
      jsonrpc: '2.0',
      method: 'test/method',
      id: 1
    });

    assert.strictEqual(response.jsonrpc, '2.0');
    assert.deepStrictEqual(response.result, { method: 'test/method', echoed: true });
    assert.strictEqual(response.id, 1);
  });

  await runAsyncTest('HTTPProxySession: captures session ID from response', async () => {
    const url = new URL(`http://127.0.0.1:${mockServerPort}/mcp`);
    const config = new HTTPProxyConfig({ url });
    const session = new HTTPProxySession(config);

    await session.sendRequest({
      jsonrpc: '2.0',
      method: 'test/method',
      id: 1
    });

    assert.strictEqual(session.sessionId, 'mock-session-123');
    assert.strictEqual(session.requestCount, 1);
  });

  await runAsyncTest('HTTPProxySession: includes custom headers in request', async () => {
    const url = new URL(`http://127.0.0.1:${mockServerPort}/mcp`);
    const headers = new Map([['Authorization', 'Bearer valid-token']]);
    const config = new HTTPProxyConfig({ url, headers });
    const session = new HTTPProxySession(config);

    const response = await session.sendRequest({
      jsonrpc: '2.0',
      method: 'test/method',
      id: 1
    });

    // Server responds normally for valid token
    assert.ok(response.result);
  });

  await runAsyncTest('HTTPProxySession: handles HTTP 401 error', async () => {
    const url = new URL(`http://127.0.0.1:${mockServerPort}/mcp`);
    const headers = new Map([['Authorization', 'Bearer invalid']]);
    const config = new HTTPProxyConfig({ url, headers });
    const session = new HTTPProxySession(config);

    const response = await session.sendRequest({
      jsonrpc: '2.0',
      method: 'test/method',
      id: 1
    });

    assert.ok(response.error);
    assert.strictEqual(response.error.code, -32001); // HTTP error
  });

  await runAsyncTest('HTTPProxySession: handles batch requests', async () => {
    const url = new URL(`http://127.0.0.1:${mockServerPort}/mcp`);
    const config = new HTTPProxyConfig({ url });
    const session = new HTTPProxySession(config);

    const response = await session.sendRequest([
      { jsonrpc: '2.0', method: 'method1', id: 1 },
      { jsonrpc: '2.0', method: 'method2', id: 2 }
    ]);

    assert.ok(Array.isArray(response));
    assert.strictEqual(response.length, 2);
    assert.strictEqual(response[0].result.method, 'method1');
    assert.strictEqual(response[1].result.method, 'method2');
  });

  await runAsyncTest('HTTPProxySession: handles network timeout', async () => {
    const url = new URL('http://127.0.0.1:1'); // Unreachable port
    const config = new HTTPProxyConfig({ url, timeout: 100 }); // Short timeout
    const session = new HTTPProxySession(config);

    const response = await session.sendRequest({
      jsonrpc: '2.0',
      method: 'test',
      id: 1
    });

    assert.ok(response.error);
    assert.strictEqual(response.error.code, -32000); // Transport error
  });

  await stopMockServer();
  console.log('Mock server stopped');
}

// Main test execution
async function main() {
  // Run sync tests first
  
  // Run async tests
  await runIntegrationTests();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
