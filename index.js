#!/usr/bin/env node

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { resolve, isAbsolute, sep } = require('path');
const { platform } = require('os');

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
    console.error('Usage: mcp-cross <server-command> [args...]');
    console.error('');
    console.error('Examples:');
    console.error('  mcp-cross node server.js');
    console.error('  mcp-cross python mcp_server.py');
    console.error('  mcp-cross "C:\\Program Files\\mcp-server\\server.exe"');
    console.error('');
    console.error('Environment variables:');
    console.error('  MCP_CROSS_DEBUG=true    Enable debug logging');
    process.exit(1);
  }

  const serverCommand = args[0];
  const serverArgs = args.slice(1);

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
