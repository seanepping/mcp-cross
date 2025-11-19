# Manual Integration Test Guide

This guide helps you verify `mcp-cross` functionality on a Windows machine with WSL installed.

## Prerequisites

1. **Windows 10/11** with WSL 2 enabled.
2. **Node.js** installed on Windows.
3. **WSL Distribution** (e.g., Ubuntu) installed and running.
4. This repository cloned to a local folder (e.g., `C:\Projects\mcp-cross`).

## Setup

Open a **Command Prompt** or **PowerShell** window in the repository root:

```powershell
cd C:\Projects\mcp-cross
npm install
```

## Test 1: Basic Connectivity (User Story 1)

Verify that `mcp-cross` can launch a command in WSL.

**Command:**

```powershell
node index.js --wsl echo "Hello from WSL"
```

**Expected Output:**

```text
Hello from WSL
```

**Verification:**

- Run `node index.js --wsl uname -a` to confirm it reports "Linux" and "Microsoft".

## Test 2: Path Translation (User Story 2)

Verify that Windows paths are translated to WSL paths.

**Command:**

```powershell
node index.js --wsl ls "C:\Windows\System32\drivers\etc\hosts"
```

**Expected Output:**

```text
/mnt/c/Windows/System32/drivers/etc/hosts
```

(Or the file listing itself)

**Verification:**

- Create a local test file: `echo "test content" > test.txt`
- Read it via WSL: `node index.js --wsl cat .\test.txt`
- Output should be: `test content`

## Test 3: Distro Selection (User Story 3)

Verify targeting a specific distribution.

**Command:**

```powershell
node index.js --wsl --distro Ubuntu uname -n
```

*(Replace `Ubuntu` with your actual distro name if different, check `wsl -l`)*

**Expected Output:**

- The hostname of your Ubuntu instance.

## Test 4: MCP Server Integration

Verify full JSON-RPC communication using the included example server.

**Command:**

```powershell
echo {"jsonrpc": "2.0", "method": "ping", "id": 1} | node index.js --wsl node example-server.js
```

**Expected Output:**

You should see stderr logs indicating the server started in WSL, followed by the JSON response:

```json
{"jsonrpc":"2.0","id":1,"result":{"echo":{"jsonrpc":"2.0","method":"ping","id":1},"message":"Hello from example MCP server!","timestamp":"..."}}
```

**Check Logs:**

Look at the stderr output (lines starting with `[example-server]`).

- `cwd` should be a linux path (e.g., `/mnt/c/Projects/mcp-cross`).
- `args` should show the script running in Node.

## Test 5: Environment & Tool Verification

Verify that your specific tools (Node.js, Python, uv) are accessible from Windows via `mcp-cross`.

**Prerequisite:**
Ensure you know the paths to your tools in WSL. Run these commands **inside WSL** to find them:

```bash
which node
which python3
which uv
```

**Test Cases:**

1. **Node.js (via nvm):**
   If `node` is in a user directory (e.g., `~/.nvm/...`), use the absolute path:

   ```powershell
   mcp-cross --wsl /home/username/.nvm/versions/node/v18.x.x/bin/node --version
   ```

2. **Python:**
   Use `python3` if `python` is not aliased:

   ```powershell
   mcp-cross --wsl python3 --version
   ```

3. **uv:**
   If `uv` is in `~/.local/bin`, use the absolute path:

   ```powershell
   mcp-cross --wsl /home/username/.local/bin/uv --version
   ```

**Expected Output:**
Each command should print the version number of the tool running in WSL.

## Troubleshooting

If any test fails, enable debug logging to see what's happening under the hood:

```powershell
set MCP_CROSS_DEBUG=true
node index.js --wsl echo test
```
