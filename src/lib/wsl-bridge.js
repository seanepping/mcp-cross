/**
 * WSL Bridge Module
 * Handles bridging between Windows host and WSL environment.
 */

const child_process = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

class WSLBridge {
  constructor() {
    this.isWindows = os.platform() === 'win32';
  }

  /**
   * Detect if running on Windows
   * @returns {boolean}
   */
  detectWindows() {
    return this.isWindows;
  }

  /**
   * Translate Windows path to WSL path
   * @param {string} winPath - Windows path (absolute)
   * @returns {string} WSL path
   */
  translateWindowsPathToWSL(winPath) {
    // Handle drive letters (C:\ -> /mnt/c/)
    const driveMatch = winPath.match(/^([a-zA-Z]):/);
    if (driveMatch) {
      const drive = driveMatch[1].toLowerCase();
      const rest = winPath.slice(2).replace(/\\/g, '/');
      return `/mnt/${drive}${rest}`;
    }
    return winPath;
  }

  /**
   * Resolve and translate arguments that look like paths
   * @param {string[]} args - Original arguments
   * @returns {string[]} Translated arguments
   */
  translateArgs(args) {
    return args.map(arg => {
      // Heuristic 1: Absolute Windows path
      if (/^[a-zA-Z]:[\\\/]/.test(arg)) {
        return this.translateWindowsPathToWSL(arg);
      }

      // Heuristic 2: Home directory expansion (~)
      // Handles ~\ or ~/ or just ~
      if (arg === '~' || arg.startsWith('~\\') || arg.startsWith('~/')) {
        const home = os.homedir();
        // If arg is just ~, use home. If ~\foo, join home + foo
        const expanded = arg === '~' ? home : path.join(home, arg.slice(2));
        return this.translateWindowsPathToWSL(expanded);
      }

      // Heuristic 3: Relative path that exists locally
      try {
        const resolved = path.resolve(process.cwd(), arg);
        if (fs.existsSync(resolved)) {
          // It exists locally, so we assume it's a file path intended for the tool
          return this.translateWindowsPathToWSL(resolved);
        }
      } catch (e) {
        // Ignore errors (e.g. invalid path chars)
      }

      return arg;
    });
  }

  /**
   * Construct the WSL command
   * @param {string} command - The command to run in WSL
   * @param {string[]} args - Arguments for the command
   * @param {Object} options - Options including distro
   * @returns {Object} { command, args }
   */
  getWSLCommand(command, args, options = {}) {
    const wslArgs = [];

    // Handle distro selection
    if (options.distro) {
      wslArgs.push('-d', options.distro);
    }

    // Translate command if it's a path
    let finalCommand = command;
    if (/^[a-zA-Z]:[\\\/]/.test(command) || fs.existsSync(path.resolve(command))) {
       // If command is a path, translate it too
       // But usually command is 'node' or 'python', so we check if it looks like a path
       const translated = this.translateArgs([command])[0];
       finalCommand = translated;
    }

    // Translate arguments
    const translatedArgs = this.translateArgs(args);

    // Add the command and its arguments
    wslArgs.push(finalCommand, ...translatedArgs);

    return {
      command: 'wsl.exe',
      args: wslArgs
    };
  }

  /**
   * Execute a command in WSL
   * @param {string} command - Command to execute
   * @param {string[]} args - Arguments to pass to the command
   * @param {string[]} mcpCrossOptions - Options passed to mcp-cross
   */
  async execute(command, args, mcpCrossOptions = []) {
    let spawnCommand, spawnArgs;

    if (this.isWindows) {
      // Parse options
      const options = {};
      const distroIndex = mcpCrossOptions.indexOf('--distro');
      if (distroIndex !== -1 && distroIndex + 1 < mcpCrossOptions.length) {
        options.distro = mcpCrossOptions[distroIndex + 1];
      }

      const wslCommand = this.getWSLCommand(command, args, options);
      spawnCommand = wslCommand.command;
      spawnArgs = wslCommand.args;
    } else {
      // Not on Windows (e.g. already in WSL), execute directly
      spawnCommand = command;
      spawnArgs = args;
    }
    
    // Spawn the process
    const child = child_process.spawn(spawnCommand, spawnArgs, {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env // Pass environment variables (FR-010)
    });

    // Handle process errors
    child.on('error', (err) => {
      if (this.isWindows && err.code === 'ENOENT' && spawnCommand === 'wsl.exe') {
        console.error('Error: wsl.exe not found. Please ensure WSL is installed.');
      } else {
        console.error(`Failed to start process '${spawnCommand}':`, err.message);
      }
      process.exit(1);
    });

    // Bridge stdio (FR-007)
    process.stdin.pipe(child.stdin);
    child.stdout.pipe(process.stdout);

    // Handle process exit
    child.on('exit', (code, signal) => {
      process.exit(code || 0);
    });

    // Signal propagation (FR-008, T013)
    const killChild = (signal) => {
      if (child.pid) {
        child.kill(signal);
      }
    };

    process.on('SIGINT', () => killChild('SIGINT'));
    process.on('SIGTERM', () => killChild('SIGTERM'));

    // Keep the event loop alive until child exits
    return new Promise((resolve) => {
      child.on('close', resolve);
    });
  }
}

module.exports = new WSLBridge();
