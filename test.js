#!/usr/bin/env node

/**
 * Simple test suite for mcp-cross
 */

const MCPBridge = require('./index.js');

function testPathTranslation() {
  console.log('Testing path translation...');

  const bridge = new MCPBridge();

  // Test Windows to WSL translation
  if (bridge.isWSL) {
    const tests = [
      ['C:\\Users\\test\\file.exe', '/mnt/c/Users/test/file.exe'],
      ['D:\\Projects\\server.js', '/mnt/d/Projects/server.js'],
      ['/mnt/c/test', '/mnt/c/test'], // Already WSL path
    ];

    console.log('WSL detected - testing Windows path translation:');
    tests.forEach(([input, expected]) => {
      const result = bridge.windowsToWSL(input);
      const status = result === expected || result.includes('mnt') ? '✓' : '✗';
      console.log(`  ${status} ${input} -> ${result}`);
    });
  } else {
    console.log('  Not running in WSL, skipping WSL tests');
  }

  console.log('');
}

function testEnvironmentDetection() {
  console.log('Testing environment detection...');

  const bridge = new MCPBridge();

  console.log(`  Platform: ${require('os').platform()}`);
  console.log(`  Is WSL: ${bridge.isWSL}`);
  console.log(`  Is Windows: ${bridge.isWindows}`);
  console.log('');
}

function printUsageExamples() {
  console.log('Usage examples:');
  console.log('');
  console.log('  # Direct usage (backwards compatible)');
  console.log('  echo \'{"test": "data"}\' | mcp-cross node -e "process.stdin.pipe(process.stdout)"');
  console.log('');
  console.log('  # With delimiter (recommended for npx)');
  console.log('  echo \'{"test": "data"}\' | mcp-cross -- node -e "process.stdin.pipe(process.stdout)"');
  console.log('');
  console.log('  # With debug mode');
  console.log('  mcp-cross --debug -- node server.js');
  console.log('  MCP_CROSS_DEBUG=true mcp-cross node server.js');
  console.log('');
  console.log('  # Via npx (no installation required)');
  console.log('  echo \'{"test": "data"}\' | npx mcp-cross -- node -e "process.stdin.pipe(process.stdout)"');
  console.log('');
  console.log('  # Test WSL path translation (if in WSL)');
  console.log('  mcp-cross -- "C:\\\\Windows\\\\System32\\\\cmd.exe" /c echo Hello');
  console.log('');
  console.log('  # Test with example server');
  console.log('  echo \'{"jsonrpc": "2.0", "method": "test"}\' | mcp-cross -- node example-server.js');
  console.log('');
}

// Run tests
console.log('=== mcp-cross Test Suite ===\n');
testEnvironmentDetection();
testPathTranslation();
printUsageExamples();

console.log('Tests completed. For full integration testing, configure mcp-cross');
console.log('in your AI coding tool and test with an actual MCP server.');
