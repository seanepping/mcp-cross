# Quickstart: Windows to WSL Bridge

## Prerequisites

- Windows 10/11 with WSL 2 enabled.
- Node.js installed on Windows.
- A WSL distribution (e.g., Ubuntu) installed.

## Installation

```bash
npm install -g mcp-cross
```

## Usage

### Basic Usage

Run a command in the default WSL distribution:

```bash
mcp-cross --wsl echo "Hello from WSL"
```

### Using with MCP Servers

Launch a Node.js MCP server located in WSL:

```bash
mcp-cross --wsl node /home/user/server.js
```

### Path Translation

Pass a Windows file path to a WSL tool. `mcp-cross` will automatically translate it:

```bash
# Windows path C:\data.txt becomes /mnt/c/data.txt in WSL
mcp-cross --wsl cat C:\data.txt
```

### Specific Distribution

Target a specific WSL distribution:

```bash
mcp-cross --wsl --distro Debian uname -a
```

### Configuration in Claude Desktop

Add this to your `config.json`:

```json
{
  "mcpServers": {
    "wsl-server": {
      "command": "mcp-cross",
      "args": [
        "--wsl",
        "node",
        "/home/user/server.js"
      ]
    }
  }
}
```
