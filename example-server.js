#!/usr/bin/env node

/**
 * Example MCP server for testing mcp-cross
 * This is a minimal JSON-RPC server that echoes requests
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.error('[example-server] Starting MCP server...');
console.error('[example-server] Environment:', {
  cwd: process.cwd(),
  args: process.argv.slice(2),
  env: Object.keys(process.env).filter(k => k.startsWith('MCP_')).reduce((acc, k) => {
    acc[k] = process.env[k];
    return acc;
  }, {})
});

let requestId = 0;

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    console.error('[example-server] Received:', request);

    // Echo back a JSON-RPC response
    const response = {
      jsonrpc: '2.0',
      id: request.id || requestId++,
      result: {
        echo: request,
        message: 'Hello from example MCP server!',
        timestamp: new Date().toISOString()
      }
    };

    console.log(JSON.stringify(response));
    console.error('[example-server] Sent:', response);
  } catch (err) {
    console.error('[example-server] Error parsing request:', err.message);
  }
});

rl.on('close', () => {
  console.error('[example-server] Closing...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[example-server] Received SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[example-server] Received SIGTERM');
  process.exit(0);
});
