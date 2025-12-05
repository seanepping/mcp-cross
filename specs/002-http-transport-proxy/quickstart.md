h# Quickstart: HTTP Transport Proxy

**Feature ID**: 002-http-transport-proxy

## Problem

You have an HTTP-based MCP server (like GitHub's MCP) that requires authentication, but your tokens are stored in WSL, not Windows.

## Solution

Use `mcp-cross` with `--wsl --http` to proxy HTTP MCP servers through WSL, where your tokens are accessible.

## Before (Doesn't Work)

```json
{
  "github-mcp-server": {
    "type": "http",
    "url": "https://api.githubcopilot.com/mcp/",
    "headers": {
      "Authorization": "Bearer $GH_TOKEN"
    }
  }
}
```

❌ **Problem**: `$GH_TOKEN` is looked up in Windows environment, where it doesn't exist.

## After (Works)

```json
{
  "github-mcp-server": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "-y",
      "mcp-cross@beta",
      "--wsl",
      "--http", "https://api.githubcopilot.com/mcp/",
      "--header", "Authorization: Bearer $GH_TOKEN"
    ]
  }
}
```

✅ **Solution**: The proxy runs in WSL where `$GH_TOKEN` exists, then forwards requests to the HTTP endpoint.

## How It Works

```text
Claude Desktop (Windows)
        │
        │ stdio (JSON-RPC)
        ▼
   mcp-cross --wsl --http
   (runs in WSL via wsl.exe)
        │
        │ reads $GH_TOKEN from WSL env
        │
        │ HTTP POST (JSON-RPC)
        ▼
GitHub MCP Server (api.githubcopilot.com)
```

## CLI Usage

```bash
# Basic HTTP proxy
mcp-cross --http https://api.example.com/mcp

# With authentication
mcp-cross --http https://api.example.com/mcp --header "Authorization: Bearer $TOKEN"

# Via WSL (for Windows → WSL secret access)
mcp-cross --wsl --http https://api.example.com/mcp --header "Authorization: Bearer $TOKEN"

# Multiple headers
mcp-cross --http https://api.example.com/mcp \
  --header "Authorization: Bearer $TOKEN" \
  --header "X-Custom: value"

# Debug mode
mcp-cross --debug --http https://api.example.com/mcp
```

## Requirements

- Node.js 18+ (for built-in fetch)
- `mcp-cross` version with HTTP support (coming soon)
- For WSL mode: Windows with WSL2 installed
