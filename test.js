#!/usr/bin/env node

/**
 * Simple test suite for mcp-cross
 */

const MCPBridge = require('./index.js');
const wslBridge = require('./src/lib/wsl-bridge.js');

function testWSLBridge() {
  console.log('Testing WSL Bridge module...');

  // Test 1: Path Translation
  const pathTests = [
    ['C:\\Users\\test\\file.txt', '/mnt/c/Users/test/file.txt'],
    ['D:\\Projects\\code', '/mnt/d/Projects/code'],
    ['c:\\lower\\case', '/mnt/c/lower/case'],
    ['E:\\With Spaces\\File.txt', '/mnt/e/With Spaces/File.txt']
  ];

  console.log('  Testing translateWindowsPathToWSL:');
  pathTests.forEach(([input, expected]) => {
    const result = wslBridge.translateWindowsPathToWSL(input);
    const status = result === expected ? '✓' : '✗';
    console.log(`    ${status} ${input} -> ${result}`);
    if (result !== expected) console.error(`      Expected: ${expected}, Got: ${result}`);
  });

  // Test 2: Command Construction
  console.log('  Testing getWSLCommand:');
  
  const cmd1 = wslBridge.getWSLCommand('node', ['server.js'], {});
  const status1 = cmd1.command === 'wsl.exe' && cmd1.args.join(' ') === 'node server.js' ? '✓' : '✗';
  console.log(`    ${status1} Basic command: ${JSON.stringify(cmd1)}`);

  const cmd2 = wslBridge.getWSLCommand('node', ['server.js'], { distro: 'Ubuntu' });
  const status2 = cmd2.command === 'wsl.exe' && cmd2.args.join(' ') === '-d Ubuntu node server.js' ? '✓' : '✗';
  console.log(`    ${status2} With distro: ${JSON.stringify(cmd2)}`);

  const cmd3 = wslBridge.getWSLCommand('C:\\Tools\\tool.exe', [], {});
  const status3 = cmd3.command === 'wsl.exe' && cmd3.args[0] === '/mnt/c/Tools/tool.exe' ? '✓' : '✗';
  console.log(`    ${status3} Command translation: ${JSON.stringify(cmd3)}`);

  console.log('');
}

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
testWSLBridge();
testPathTranslation();
printUsageExamples();

console.log('Tests completed. For full integration testing, configure mcp-cross');
console.log('in your AI coding tool and test with an actual MCP server.');
