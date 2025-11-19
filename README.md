# mcp-cross

Cross-platform MCP server bridge for seamless stdio communication across different environments, mainly for accessing linux mcp servers from windows in WSL2.

## Overview

`mcp-cross` is a Node.js CLI tool that acts as a bridge between AI coding tools and MCP (Model Context Protocol) servers. It handles the complexity of launching MCP servers across different operating systems and environments, with special support for WSL (Windows Subsystem for Linux) scenarios.

## Release status

> ⚠️ `mcp-cross` is currently shipped as a **pre-release (beta)** while we finish hardening Windows↔WSL workflows.

- Install globally with the beta dist-tag: `npm install -g mcp-cross@beta`
- Run ad-hoc from npm: `npx mcp-cross@beta -- node server.js`
- Pin a specific beta (e.g., `npm install -g mcp-cross@1.0.0-beta.0`) for deterministic test environments.

Expect rapid iteration: features and flags may change between beta drops until we promote a stable `latest` release.

### Key Features

- **Cross-platform path translation**: Automatically translates Windows paths to WSL paths and vice versa
- **Stdio bridging**: Seamlessly pipes stdin/stdout between the host and MCP server
- **Environment forwarding**: Passes environment variables and arguments to the MCP server
- **WSL support**: Handles running Windows executables from WSL environments
- **Universal compatibility**: Works with Claude Code CLI, VSCode extensions, and desktop apps

## Installation

### Global Installation

```bash
npm install -g mcp-cross
```

### Local Installation

```bash
npm install mcp-cross
```

### Using via npx (No Installation Required)

You can use `mcp-cross` without installing it by using npx:

```bash
npx mcp-cross -- node server.js
```

Or install directly from the repository:

```bash
cd mcp-cross
npm install -g .
```

## Usage

### Direct Usage (Installed Globally)

```bash
mcp-cross [options] <server-command> [args...]
```

### Via npx

```bash
npx mcp-cross [options] -- <server-command> [args...]
```

**Note:** When using npx, the `--` delimiter is recommended to separate mcp-cross options from the server command.

### Options

- `--debug` - Enable debug logging
- `--` - Delimiter separating mcp-cross options from server command (recommended with npx)

### Examples

#### Direct Usage

```bash
# Launch a Node.js MCP server
mcp-cross node server.js

# Launch a Python MCP server
mcp-cross python mcp_server.py --port 3000

# Launch a Windows executable from WSL
mcp-cross "C:\Program Files\mcp-server\server.exe"

# Detailed WSL bridge example with env + config
MCP_CROSS_DEBUG=true mcp-cross "C:\Tools\MyServer\server.exe" --config beta

# Launch with environment variables
MCP_PORT=3000 mcp-cross node server.js

# Enable debug mode
mcp-cross --debug node server.js
```

#### Using npx

```bash
# Launch via npx (no installation required)
npx mcp-cross -- node server.js

# With debug mode
npx mcp-cross --debug -- python mcp_server.py

# With server arguments
npx mcp-cross -- node server.js --port 3000 --config production

# Windows executable from WSL
npx mcp-cross -- "C:\Program Files\mcp-server\server.exe"

# Windows executable from WSL with explicit beta tag
npx mcp-cross@beta -- "C:\Tools\MyServer\server.exe" --port 5005
```

### Debug Mode

Enable debug logging to troubleshoot path translation and process launching:

```bash
MCP_CROSS_DEBUG=true mcp-cross node server.js
```

## Configuration Examples

### Claude Code CLI

Edit your Claude Code configuration file (`~/.config/claude/config.json` on Linux/Mac or `%APPDATA%\Claude\config.json` on Windows):

#### Option 1: Using globally installed mcp-cross

```json
{
  "mcpServers": {
    "my-server": {
      "command": "mcp-cross",
      "args": ["node", "/path/to/your/server.js"]
    }
  }
}
```

#### Option 2: Using npx (no installation required)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "node", "/path/to/your/server.js"]
    },
    "python-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "python", "/path/to/server.py"]
    }
  }
}
```

### VSCode with Claude Code Extension (WSL Scenario)

When running VSCode in a WSL tunnel but the MCP server is on Windows:

#### VSCode: Using globally installed mcp-cross

```json
{
  "mcpServers": {
    "windows-server": {
      "command": "mcp-cross",
      "args": ["C:\\Program Files\\MyServer\\server.exe"]
    },
    "wsl-server": {
      "command": "mcp-cross",
      "args": ["node", "/mnt/c/projects/mcp-server/index.js"]
    },
    "node-server-with-args": {
      "command": "mcp-cross",
      "args": ["node", "/home/user/mcp-servers/my-server.js", "--config", "production"]
    }
  }
}
```

#### VSCode: Using npx (no installation required)

```json
{
  "mcpServers": {
    "windows-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "C:\\Program Files\\MyServer\\server.exe"]
    },
    "wsl-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "node", "/mnt/c/projects/mcp-server/index.js"]
    },
    "node-server-with-args": {
      "command": "npx",
      "args": ["mcp-cross", "--", "node", "/home/user/mcp-servers/my-server.js", "--config", "production"]
    }
  }
}
```

### Claude Code Desktop

In your Claude Desktop configuration:

#### Claude Desktop: Using globally installed mcp-cross

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-cross",
      "args": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Desktop"]
    },
    "custom-server": {
      "command": "mcp-cross",
      "args": ["python", "/path/to/custom_server.py"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Claude Desktop: Using npx (no installation required)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["mcp-cross", "--", "npx", "-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Desktop"]
    },
    "custom-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "python", "/path/to/custom_server.py"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cline (VSCode Extension)

In VSCode settings or `.vscode/settings.json`:

#### Cline: Using globally installed mcp-cross

```json
{
  "cline.mcpServers": {
    "my-server": {
      "command": "mcp-cross",
      "args": ["node", "path/to/server.js"]
    }
  }
}
```

#### Cline: Using npx (no installation required)

```json
{
  "cline.mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["mcp-cross", "--", "node", "path/to/server.js"]
    }
  }
}
```

## Windows to WSL Bridge

`mcp-cross` supports launching MCP servers located in WSL directly from Windows. This is useful when your development environment and tools are in WSL, but you are using a Windows-based client (like Claude Desktop or VS Code on Windows).

### Bridge Usage

Use the `--wsl` flag to indicate the target server is in WSL.

```bash
# Launch a Node.js server in the default WSL distro
mcp-cross --wsl node /home/user/server.js

# Launch in a specific distro
mcp-cross --wsl --distro Ubuntu-20.04 node /home/user/server.js
```

### Automatic Path Translation

When using `--wsl`, `mcp-cross` automatically translates Windows file paths in arguments to their WSL equivalents.

```bash
# Windows path C:\data.txt becomes /mnt/c/data.txt in WSL
mcp-cross --wsl cat C:\data.txt
```

### Configuration Example (Claude Desktop on Windows)

```json
{
  "mcpServers": {
    "wsl-server": {
      "command": "npx",
      "args": [
        "mcp-cross",
        "--wsl",
        "node",
        "/home/user/server.js"
      ]
    }
  }
}
```

## How It Works

1. **Command Resolution**: `mcp-cross` receives the MCP server command and arguments
2. **Path Translation**:
   - **WSL -> Windows**: If running in WSL, Windows paths are translated to WSL paths using `wslpath`
   - **Windows -> WSL**: If running on Windows with `--wsl`, Windows paths are translated to `/mnt/c/...` format
3. **Process Spawning**: The MCP server is spawned as a child process (or `wsl.exe` child process)
4. **Stdio Bridging**: Seamlessly pipes stdin/stdout/stderr
5. **Signal Handling**: Propagates SIGINT/SIGTERM to the child process

## WSL-Specific Scenarios

### Scenario 1: VSCode in WSL Tunnel + Claude Code in WSL + MCP Server on Windows

This is the primary use case. When:

- VSCode is running via Remote-WSL
- Claude Code extension runs in WSL
- Your MCP server executable is on Windows (e.g., `C:\Program Files\...`)

#### Scenario 1: Configuration using globally installed mcp-cross

```json
{
  "mcpServers": {
    "windows-mcp": {
      "command": "mcp-cross",
      "args": ["C:\\Tools\\mcp-server.exe"]
    }
  }
}
```

#### Scenario 1: Configuration using npx

```json
{
  "mcpServers": {
    "windows-mcp": {
      "command": "npx",
      "args": ["mcp-cross", "--", "C:\\Tools\\mcp-server.exe"]
    }
  }
}
```

`mcp-cross` will:

1. Detect WSL environment
2. Translate `C:\Tools\mcp-server.exe` to `/mnt/c/Tools/mcp-server.exe`
3. Launch the Windows executable from WSL
4. Bridge all stdio communication

### Scenario 2: Mixed Path Scenarios

If your MCP server needs to access files on both Windows and WSL:

#### Scenario 2: Using globally installed mcp-cross

```json
{
  "mcpServers": {
    "hybrid-server": {
      "command": "mcp-cross",
      "args": [
        "node",
        "/mnt/c/servers/bridge.js",
        "--windows-data",
        "C:\\Data",
        "--wsl-data",
        "/home/user/data"
      ]
    }
  }
}
```

#### Scenario 2: Using npx

```json
{
  "mcpServers": {
    "hybrid-server": {
      "command": "npx",
      "args": [
        "mcp-cross",
        "--",
        "node",
        "/mnt/c/servers/bridge.js",
        "--windows-data",
        "C:\\Data",
        "--wsl-data",
        "/home/user/data"
      ]
    }
  }
}
```

## Environment Variables

- `MCP_CROSS_DEBUG`: Set to `true` to enable debug logging
- All other environment variables are passed through to the MCP server

## Troubleshooting

### Server Not Starting

Enable debug mode:

```bash
MCP_CROSS_DEBUG=true mcp-cross your-command
```

Check the debug output for:

- Path translation issues
- Command resolution problems
- Process spawning errors

### Windows Executable Not Found in WSL

Ensure:

1. The path uses Windows format (e.g., `C:\...`) or WSL format (e.g., `/mnt/c/...`)
2. The executable exists at the specified path
3. You have execute permissions

Test path translation:

```bash
wslpath "C:\Program Files\MyApp\app.exe"
```

### Permission Denied

Make sure the executable has execute permissions:

```bash
chmod +x /path/to/server
```

### "Command not found" in WSL (e.g., node, npm)

If you see errors like `zsh:1: command not found: node` or `bash: node: command not found` when using `--wsl`, it usually means the command is not in the system PATH of your WSL distribution.

This is common if you use version managers like `nvm` or `pyenv`, which configure PATH in interactive shell profiles (`.bashrc`, `.zshrc`), but `mcp-cross` (via `wsl.exe`) runs commands in a non-interactive shell.

**Solutions:**

1. **Use the absolute path** to the executable in WSL:

   ```bash
   mcp-cross --wsl /home/user/.nvm/versions/node/v18.0.0/bin/node server.js
   ```

   *(Tip: Run `which node` inside WSL to find this path)*

2. **Wrap the command in a login shell**:

   ```bash
   mcp-cross --wsl bash -l -c "node server.js"
   ```

   *(Note: This might complicate argument quoting)*

3. **Install the tool globally** in WSL (e.g., via `apt` or `brew`) so it's in `/usr/bin` or `/bin`.

## Development

### Running Tests

```bash
npm test
```

### Project Structure

```text
mcp-cross/
├── index.js          # Main CLI entry point and bridge logic
├── package.json      # NPM package configuration
├── README.md         # This file
└── test.js           # Test suite (coming soon)
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Credits

Built for seamless MCP server integration across different AI coding environments, with special focus on WSL/Windows interoperability.
