# mcp-cross

Cross-platform MCP server bridge for seamless stdio communication across different environments.

## Overview

`mcp-cross` is a Node.js CLI tool that acts as a bridge between AI coding tools and MCP (Model Context Protocol) servers. It handles the complexity of launching MCP servers across different operating systems and environments, with special support for WSL (Windows Subsystem for Linux) scenarios.

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

Or install directly from the repository:

```bash
cd mcp-cross
npm install -g .
```

## Usage

```bash
mcp-cross <server-command> [args...]
```

### Examples

```bash
# Launch a Node.js MCP server
mcp-cross node server.js

# Launch a Python MCP server
mcp-cross python mcp_server.py --port 3000

# Launch a Windows executable from WSL
mcp-cross "C:\Program Files\mcp-server\server.exe"

# Launch with environment variables
MCP_PORT=3000 mcp-cross node server.js
```

### Debug Mode

Enable debug logging to troubleshoot path translation and process launching:

```bash
MCP_CROSS_DEBUG=true mcp-cross node server.js
```

## Configuration Examples

### Claude Code CLI

Edit your Claude Code configuration file (`~/.config/claude/config.json` on Linux/Mac or `%APPDATA%\Claude\config.json` on Windows):

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

### VSCode with Claude Code Extension (WSL Scenario)

When running VSCode in a WSL tunnel but the MCP server is on Windows:

**Option 1: Windows path (auto-translated)**
```json
{
  "mcpServers": {
    "windows-server": {
      "command": "mcp-cross",
      "args": ["C:\\Program Files\\MyServer\\server.exe"]
    }
  }
}
```

**Option 2: WSL path**
```json
{
  "mcpServers": {
    "wsl-server": {
      "command": "mcp-cross",
      "args": ["node", "/mnt/c/projects/mcp-server/index.js"]
    }
  }
}
```

**Option 3: Node.js MCP server with arguments**
```json
{
  "mcpServers": {
    "my-node-server": {
      "command": "mcp-cross",
      "args": ["node", "/home/user/mcp-servers/my-server.js", "--config", "production"]
    }
  }
}
```

### Claude Code Desktop

In your Claude Desktop configuration:

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

### Cline (VSCode Extension)

In VSCode settings or `.vscode/settings.json`:

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

## How It Works

1. **Command Resolution**: `mcp-cross` receives the MCP server command and arguments
2. **Path Translation**: If running in WSL, Windows paths are automatically translated to WSL paths using `wslpath`
3. **Process Spawning**: The MCP server is spawned as a child process with proper stdio configuration
4. **Stdio Bridging**:
   - Parent stdin → MCP server stdin
   - MCP server stdout → Parent stdout
   - MCP server stderr → Parent stderr (inherited)
5. **Signal Handling**: Gracefully handles SIGINT and SIGTERM to clean up child processes

## WSL-Specific Scenarios

### Scenario 1: VSCode in WSL Tunnel + Claude Code in WSL + MCP Server on Windows

This is the primary use case. When:
- VSCode is running via Remote-WSL
- Claude Code extension runs in WSL
- Your MCP server executable is on Windows (e.g., `C:\Program Files\...`)

Configuration:
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

`mcp-cross` will:
1. Detect WSL environment
2. Translate `C:\Tools\mcp-server.exe` to `/mnt/c/Tools/mcp-server.exe`
3. Launch the Windows executable from WSL
4. Bridge all stdio communication

### Scenario 2: Mixed Path Scenarios

If your MCP server needs to access files on both Windows and WSL:

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

## Development

### Running Tests

```bash
npm test
```

### Project Structure

```
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
