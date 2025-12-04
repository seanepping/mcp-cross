/**
 * WSL Bridge Module
 * Handles bridging between Windows host and WSL environment.
 */

const child_process = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Standard Windows environment variables to exclude from WSLENV
const WINDOWS_ENV_BLACKLIST = new Set([
  'ALLUSERSPROFILE', 'APPDATA', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)',
  'COMMONPROGRAMW6432', 'COMPUTERNAME', 'COMSPEC', 'DRIVERDATA', 'HOMEDRIVE',
  'HOMEPATH', 'LOCALAPPDATA', 'LOGONSERVER', 'NUMBER_OF_PROCESSORS', 'OS',
  'PATH', 'PATHEXT', 'PROCESSOR_ARCHITECTURE', 'PROCESSOR_IDENTIFIER',
  'PROCESSOR_LEVEL', 'PROCESSOR_REVISION', 'PROGRAMDATA', 'PROGRAMFILES',
  'PROGRAMFILES(X86)', 'PROGRAMW6432', 'PSMODULEPATH', 'PUBLIC', 'SYSTEMDRIVE',
  'SYSTEMROOT', 'TEMP', 'TMP', 'USERDOMAIN', 'USERDOMAIN_ROAMINGPROFILE',
  'USERNAME', 'USERPROFILE', 'WINDIR', 'WSLENV', 'WT_PROFILE_ID', 'WT_SESSION',
  'ORIGINAL_XDG_CURRENT_DESKTOP'
]);

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

    // Build the shell command string with proper escaping is handled below
    
    // Use a helper runner script inside WSL to perform PATH sanitization.
    // Putting the logic into a separate script avoids complex nested quoting
    // when passing commands through `wsl.exe` -> login shell -> zsh/bash.
    // The runner removes Windows drive mount entries (like /mnt/c/) from PATH
    // and then execs the requested command so that the environment is clean.
    const runnerWindowsPath = path.join(__dirname, '..', 'scripts', 'wsl-runner.sh');
    const runnerWSLPath = this.translateWindowsPathToWSL(runnerWindowsPath);

    // Build the command to invoke the runner using bash (avoids executable bit issues)
    // We pass the target command and its args to the runner which will exec "$@" after
    // sanitizing PATH.
    const debugPrefix = process.env.MCP_CROSS_DEBUG ? 'set -x; echo "DEBUG: PATH=" >&2; printenv PATH >&2; which npx >&2; ' : '';
    const shellCommand = this.buildShellCommand(runnerWSLPath, [finalCommand, ...translatedArgs]);
    const fullCommand = `${debugPrefix}${shellCommand}`;
    
    // Debug logging
    if (process.env.MCP_CROSS_DEBUG) {
      console.error('!!! MCP-CROSS DEBUG MODE ACTIVE !!!');
      console.error('[WSL Bridge] Full command:', fullCommand);
    }

    // Use specified shell or default to bash
    const shell = options.shell || 'bash';
    wslArgs.push(shell, '-l', '-c', fullCommand);

    return {
      command: 'wsl.exe',
      args: wslArgs
    };
  }

  /**
   * Run diagnostics to help debug environment issues
   * @param {Object} options - Options including distro and shell
   */
  async runDiagnostics(options = {}) {
    console.error('=== MCP-CROSS DIAGNOSTICS ===');
    console.error('Platform:', os.platform());
    console.error('Is Windows:', this.isWindows);
    
    if (!this.isWindows) {
      console.error('Not running on Windows, skipping WSL diagnostics.');
      return;
    }

    const shell = options.shell || 'bash';
    console.error('Target Shell:', shell);
    console.error('Target Distro:', options.distro || 'Default');

    const diagScript = [
      'echo "--- WSL Environment ---"',
      'echo "User: $(whoami)"',
      'echo "Shell: $SHELL"',
      'echo "PWD: $PWD"',
      'echo "PATH: $PATH"',
      'echo "--- Node/NPM ---"',
      'which node || echo "node not found"',
      'node -v || echo "node version check failed"',
      'which npm || echo "npm not found"',
      'which npx || echo "npx not found"',
      'echo "--- Configuration Files ---"',
      'ls -la ~ | grep -E "\\.(bash|zsh|profile)" || echo "No profile files found"',
      'echo "--- OS Release ---"',
      'cat /etc/os-release | grep PRETTY_NAME'
    ].join('; ');

    const wslArgs = [];
    if (options.distro) wslArgs.push('-d', options.distro);
    
    // Use login shell to see the actual environment
    wslArgs.push(shell, '-l', '-c', diagScript);

    console.error('Running diagnostic command in WSL...');
    const child = child_process.spawn('wsl.exe', wslArgs, {
      stdio: 'inherit'
    });

    return new Promise((resolve) => {
      child.on('close', resolve);
    });
  }

  /**
   * Build a shell command string with proper escaping
   * @param {string} command - The command to run
   * @param {string[]} args - Arguments for the command
   * @returns {string} Shell command string
   */
  buildShellCommand(command, args) {
    // Escape single quotes in arguments for shell
    const escapeForShell = (str) => {
      // Replace ' with '\'' (end quote, escaped quote, start quote)
      return "'" + str.replace(/'/g, "'\\''") + "'";
    };

    const parts = [escapeForShell(command)];
    for (const arg of args) {
      parts.push(escapeForShell(arg));
    }
    
    return parts.join(' ');
  }

  /**
   * Execute a command in WSL
   * @param {string} command - Command to execute
   * @param {string[]} args - Arguments to pass to the command
   * @param {string[]} mcpCrossOptions - Options passed to mcp-cross
   */
  async execute(command, args, mcpCrossOptions = [], extraEnv = {}) {
    let spawnCommand, spawnArgs;
    const envForSpawn = { ...process.env, ...extraEnv };

    if (this.isWindows) {
      // Parse options
      const options = {};
      const distroIndex = mcpCrossOptions.indexOf('--distro');
      if (distroIndex !== -1 && distroIndex + 1 < mcpCrossOptions.length) {
        options.distro = mcpCrossOptions[distroIndex + 1];
      }
      const shellIndex = mcpCrossOptions.indexOf('--shell');
      if (shellIndex !== -1 && shellIndex + 1 < mcpCrossOptions.length) {
        options.shell = mcpCrossOptions[shellIndex + 1];
      }

      const wslCommand = this.getWSLCommand(command, args, options);
      spawnCommand = wslCommand.command;
      spawnArgs = wslCommand.args;

      // Prepare WSLENV to bridge environment variables
      // We want to pass user-defined variables that are not standard Windows system variables
      const varsToPass = Object.keys(envForSpawn).filter(key => {
        const upperKey = key.toUpperCase();
        // Exclude standard Windows variables
        if (WINDOWS_ENV_BLACKLIST.has(upperKey)) return false;
        // Exclude npm internal variables to avoid bloating WSLENV
        if (upperKey.startsWith('NPM_')) return false;
        return true;
      });

      // Construct WSLENV string
      // Format: VAR1:VAR2/p:VAR3
      // We append to existing WSLENV if present
      const existingWslEnv = envForSpawn.WSLENV ? envForSpawn.WSLENV.split(':') : [];
      const newWslEnvParts = [...existingWslEnv];

      for (const key of varsToPass) {
        // Check if already present (case-insensitive check for safety, though WSLENV is case-sensitive for flags)
        // We'll just check exact match or match with flags
        const isPresent = newWslEnvParts.some(part => 
          part === key || part.startsWith(key + '/')
        );
        
        if (!isPresent) {
          newWslEnvParts.push(key);
        }
      }

      envForSpawn.WSLENV = newWslEnvParts.join(':');

    } else {
      // Not on Windows (e.g. already in WSL), execute directly
      spawnCommand = command;
      spawnArgs = args;
    }
    
    // Debug: show exact spawn command when debug mode is enabled
    if (process.env.MCP_CROSS_DEBUG) {
      console.error('[WSLBridge] Spawning:', spawnCommand, spawnArgs.join(' '));
    }

    // Spawn the process
    const child = child_process.spawn(spawnCommand, spawnArgs, {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: envForSpawn // Pass environment variables (FR-010)
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
