#!/usr/bin/env node

const { version } = require('./package.json');
console.error(`[mcp-cross] Version ${version} starting...`);

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { resolve, isAbsolute, sep } = require('path');
const { platform } = require('os');
const wslBridge = require('./src/lib/wsl-bridge');
const { startHttpProxy } = require('./src/lib/http-proxy');

/**
 * mcp-cross - Cross-platform MCP server bridge
 *
 * Usage: mcp-cross <server-command> [args...]
 *
 * This tool launches an MCP server and bridges stdio communication,
 * handling cross-platform path translation (especially WSL <-> Windows).
 */

class MCPBridge {
  constructor() {
    this.isWSL = this.detectWSL();
    this.isWindows = platform() === 'win32';
    this.debug = process.env.MCP_CROSS_DEBUG === 'true';
  }

  /**
   * Detect if running in WSL environment
   */
  detectWSL() {
    if (platform() !== 'linux') return false;

    try {
      const { execSync } = require('child_process');
      const release = execSync('uname -r', { encoding: 'utf8' });
      return release.toLowerCase().includes('microsoft') || release.toLowerCase().includes('wsl');
    } catch (err) {
      return false;
    }
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  log(...args) {
    if (this.debug) {
      console.error('[mcp-cross]', ...args);
    }
  }

  /**
   * Translate Windows path to WSL path
   * Example: C:\Users\name\file.exe -> /mnt/c/Users/name/file.exe
   */
  windowsToWSL(path) {
    if (!path) return path;

    // Check if it's a Windows path (contains : or backslashes)
    if (path.match(/^[a-zA-Z]:[\\\/]/) || path.includes('\\')) {
      try {
        const { execSync } = require('child_process');
        // Use wslpath if available
        const wslPath = execSync(`wslpath "${path}"`, { encoding: 'utf8' }).trim();
        this.log(`Translated Windows path: ${path} -> ${wslPath}`);
        return wslPath;
      } catch (err) {
        // Fallback: manual conversion
        const normalized = path.replace(/\\/g, '/');
        const match = normalized.match(/^([a-zA-Z]):(.*)/);
        if (match) {
          const [, drive, rest] = match;
          const wslPath = `/mnt/${drive.toLowerCase()}${rest}`;
          this.log(`Translated Windows path (manual): ${path} -> ${wslPath}`);
          return wslPath;
        }
      }
    }

    return path;
  }

  /**
   * Translate WSL path to Windows path
   * Example: /mnt/c/Users/name/file.exe -> C:\Users\name\file.exe
   */
  wslToWindows(path) {
    if (!path) return path;

    const match = path.match(/^\/mnt\/([a-z])(.*)/);
    if (match) {
      const [, drive, rest] = match;
      const winPath = `${drive.toUpperCase()}:${rest.replace(/\//g, '\\')}`;
      this.log(`Translated WSL path: ${path} -> ${winPath}`);
      return winPath;
    }

    return path;
  }

  /**
   * Resolve command path with cross-platform support
   */
  resolveCommand(command) {
    // If it's an absolute Windows path in WSL, translate it
    if (this.isWSL && (command.match(/^[a-zA-Z]:[\\\/]/) || command.includes('\\'))) {
      command = this.windowsToWSL(command);
    }

    // Check if command exists as-is
    if (existsSync(command)) {
      return command;
    }

    // Try to resolve relative to current directory
    const resolved = resolve(command);
    if (existsSync(resolved)) {
      return resolved;
    }

    // Return original command (might be in PATH)
    return command;
  }

  /**
   * Determine the shell to use for launching the server
   */
  getShell() {
    if (this.isWindows) {
      return { shell: 'cmd.exe', shellArgs: ['/c'] };
    }
    return { shell: '/bin/sh', shellArgs: ['-c'] };
  }

  /**
   * Launch the MCP server and bridge stdio
   */
  async launch(serverCommand, serverArgs) {
    this.log('Environment:', {
      isWSL: this.isWSL,
      isWindows: this.isWindows,
      platform: platform(),
      cwd: process.cwd()
    });

    // Resolve the server command
    const resolvedCommand = this.resolveCommand(serverCommand);
    this.log('Original command:', serverCommand);
    this.log('Resolved command:', resolvedCommand);
    this.log('Server args:', serverArgs);

    // Build the full command
    let command, args, spawnOptions;

    // Default: direct execution (no shell)
    command = resolvedCommand;
    args = serverArgs;
    spawnOptions = {
      stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
      env: { ...process.env },
      shell: false
    };

    // Special case: if command has spaces and doesn't exist as a file, use shell
    if (resolvedCommand.includes(' ') && !existsSync(resolvedCommand)) {
      const { shell, shellArgs } = this.getShell();
      const fullCommand = [resolvedCommand, ...serverArgs].join(' ');
      command = shell;
      args = [...shellArgs, fullCommand];
      this.log('Using shell for command with spaces:', fullCommand);
    } else {
      this.log('Direct execution:', command, args);
    }

    this.log('Final command:', command);
    this.log('Final args:', args);

    // Spawn the MCP server process
    const serverProcess = spawn(command, args, spawnOptions);

    // Handle process errors
    serverProcess.on('error', (err) => {
      console.error('Failed to start MCP server:', err.message);
      process.exit(1);
    });

    // Bridge stdin: parent process -> MCP server
    process.stdin.pipe(serverProcess.stdin);

    // Bridge stdout: MCP server -> parent process
    serverProcess.stdout.pipe(process.stdout);

    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      this.log('MCP server exited:', { code, signal });
      process.exit(code || 0);
    });

    // Handle parent process termination
    process.on('SIGINT', () => {
      this.log('Received SIGINT, terminating MCP server');
      serverProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      this.log('Received SIGTERM, terminating MCP server');
      serverProcess.kill('SIGTERM');
    });

    this.log('MCP bridge established');
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: mcp-cross [options] [--] <server-command> [args...]');
    console.error('       mcp-cross --http <url> [options]');
    console.error('');
    console.error('Modes:');
    console.error('  Process bridge    Bridge stdio to a child process (default)');
    console.error('  HTTP proxy        Bridge stdio to an HTTP MCP server (--http)');
    console.error('');
    console.error('Options:');
    console.error('  --wsl                Bridge to WSL environment (Windows only)');
    console.error('  --distro <name>      Target specific WSL distribution');
    console.error('  --shell <shell>      Shell to use in WSL (default: bash)');
    console.error('  --diagnose           Run diagnostics to check WSL environment');
    console.error('  --http <url>         HTTP proxy mode: target HTTP MCP endpoint URL');
    console.error('  --header <header>    Add custom header (format: "Name: Value")');
    console.error('                       Can be specified multiple times');
    console.error('                       Environment variables ($VAR) are expanded');
    console.error('  --timeout <ms>       HTTP request timeout (default: 60000)');
    console.error('  --debug              Enable debug logging');
    console.error('  --                   Delimiter separating options from server command');
    console.error('');
    console.error('Examples:');
    console.error('  # Direct process bridge');
    console.error('  mcp-cross node server.js');
    console.error('  mcp-cross --wsl node /home/user/server.js');
    console.error('');
    console.error('  # HTTP proxy mode');
    console.error('  mcp-cross --http https://api.example.com/mcp');
    console.error('  mcp-cross --http https://api.example.com/mcp --header "Authorization: Bearer $TOKEN"');
    console.error('');
    console.error('  # HTTP proxy via WSL (for WSL-stored tokens)');
    console.error('  mcp-cross --wsl --http https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GH_TOKEN"');
    console.error('');
    console.error('  # Via npx with delimiter');
    console.error('  npx mcp-cross -- node server.js');
    console.error('  npx mcp-cross --wsl -- node /home/user/server.js');
    console.error('');
    console.error('Environment variables:');
    console.error('  MCP_CROSS_DEBUG=true    Enable debug logging');
    process.exit(1);
  }

  // Parse arguments with support for HTTP proxy options
  let mcpCrossOptions = [];
  let serverCommand = null;
  let serverArgs = [];
  let httpUrl = null;
  let httpHeaders = [];
  let httpTimeout = 60000;
  let targetShell = null;

  const delimiterIndex = args.indexOf('--');

  // Parse all arguments before the delimiter (or all args if no delimiter)
  const optionArgs = delimiterIndex !== -1 ? args.slice(0, delimiterIndex) : args;
  const commandArgs = delimiterIndex !== -1 ? args.slice(delimiterIndex + 1) : [];

  let i = 0;
  while (i < optionArgs.length) {
    const arg = optionArgs[i];

    if (arg === '--http' && i + 1 < optionArgs.length) {
      httpUrl = optionArgs[i + 1];
      mcpCrossOptions.push(arg, httpUrl);
      i += 2;
    } else if (arg === '--header' && i + 1 < optionArgs.length) {
      httpHeaders.push(optionArgs[i + 1]);
      mcpCrossOptions.push(arg, optionArgs[i + 1]);
      i += 2;
    } else if (arg === '--timeout' && i + 1 < optionArgs.length) {
      httpTimeout = parseInt(optionArgs[i + 1], 10);
      if (isNaN(httpTimeout) || httpTimeout <= 0) {
        console.error('Error: --timeout must be a positive number');
        process.exit(1);
      }
      mcpCrossOptions.push(arg, optionArgs[i + 1]);
      i += 2;
    } else if (arg === '--distro' && i + 1 < optionArgs.length) {
      mcpCrossOptions.push(arg, optionArgs[i + 1]);
      i += 2;
    } else if (arg === '--shell' && i + 1 < optionArgs.length) {
      targetShell = optionArgs[i + 1];
      mcpCrossOptions.push(arg, targetShell);
      i += 2;
    } else if (arg === '--diagnose') {
      mcpCrossOptions.push(arg);
      i++;
    } else if (arg.startsWith('--')) {
      mcpCrossOptions.push(arg);
      i++;
    } else {
      // First non-option is the server command (if no delimiter was used)
      if (delimiterIndex === -1) {
        serverCommand = arg;
        serverArgs = optionArgs.slice(i + 1);
      }
      break;
    }
  }

  // If delimiter was used, command comes from after delimiter
  if (delimiterIndex !== -1) {
    if (commandArgs.length > 0) {
      serverCommand = commandArgs[0];
      serverArgs = commandArgs.slice(1);
    }
  }

  // Process debug flag first
  if (mcpCrossOptions.includes('--debug')) {
    process.env.MCP_CROSS_DEBUG = 'true';
  }

  // Handle diagnostics mode
  if (mcpCrossOptions.includes('--diagnose')) {
    if (mcpCrossOptions.includes('--wsl')) {
      try {
        const options = {};
        const distroIndex = mcpCrossOptions.indexOf('--distro');
        if (distroIndex !== -1) options.distro = mcpCrossOptions[distroIndex + 1];
        if (targetShell) options.shell = targetShell;
        
        await wslBridge.runDiagnostics(options);
      } catch (err) {
        console.error('Diagnostics Error:', err.message);
        process.exit(1);
      }
      return;
    } else {
      console.error('Diagnostics mode currently only supports --wsl');
      process.exit(1);
    }
  }

  // HTTP proxy mode
  if (httpUrl) {
    const httpArgs = {
      url: httpUrl,
      headers: httpHeaders,
      timeout: httpTimeout,
      debug: mcpCrossOptions.includes('--debug')
    };

    // If --wsl is specified, we need to run the HTTP proxy in WSL
    if (mcpCrossOptions.includes('--wsl')) {
      // Build the command to run mcp-cross in HTTP mode inside WSL
      const wslCommand = 'npx';
      const wslArgs = [
        '-y', 'mcp-cross@latest',
        '--http', httpUrl
      ];
      
      // Add headers
      for (const header of httpHeaders) {
        wslArgs.push('--header', header);
      }
      
      // Add timeout
      wslArgs.push('--timeout', String(httpTimeout));
      
      // Add debug if enabled
      if (mcpCrossOptions.includes('--debug')) {
        wslArgs.push('--debug');
      }

      try {
        await wslBridge.execute(wslCommand, wslArgs, mcpCrossOptions);
      } catch (err) {
        console.error('WSL HTTP Proxy Error:', err.message);
        process.exit(1);
      }
      return;
    }

    // Run HTTP proxy directly
    try {
      await startHttpProxy(httpArgs, process.env);
    } catch (err) {
      console.error('HTTP Proxy Error:', err.message);
      process.exit(1);
    }
    return;
  }

  // Process bridge mode requires a server command
  if (!serverCommand) {
    console.error('Error: No server command specified');
    console.error('Use --http <url> for HTTP proxy mode, or specify a server command');
    process.exit(1);
  }

  // Check for WSL bridge mode (process bridge)
  if (mcpCrossOptions.includes('--wsl')) {
    try {
      await wslBridge.execute(serverCommand, serverArgs, mcpCrossOptions);
    } catch (err) {
      console.error('WSL Bridge Error:', err.message);
      process.exit(1);
    }
    return;
  }

  const bridge = new MCPBridge();
  await bridge.launch(serverCommand, serverArgs);
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = MCPBridge;
