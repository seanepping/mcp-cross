# mcp-cross Agent Documentation

## Project Overview

`mcp-cross` is a Node.js-based CLI tool designed to bridge Model Context Protocol (MCP) servers across different operating systems, specifically targeting the interoperability between Windows and WSL (Windows Subsystem for Linux).

## Mandatory Agent Protocol

All AI agents working in this repository **MUST** follow this protocol at the start of every session:

1. **Initialize Context**: Call `get_current_context()` to understand the session state and recent history.
2. **Set Focus**: Call `set_focus(focus)` to declare the current task or objective.
3. **Check Memory**: Call `recall_memory(query)` to check for relevant past decisions, errors, or patterns before starting work.
4. **Store New Knowledge**: Whenever you create noteworthy fixes, release plans, or workflow tweaks, call `remember_this(...)` so future agents inherit the context.

## Core Logic

The main logic resides in `index.js`, which defines the `MCPBridge` class.

### Key Capabilities

1. **Environment Detection**: Detects if running in WSL via `detectWSL()`.
2. **Path Translation**:
   * `windowsToWSL(path)`: Converts Windows paths (e.g., `C:\...`) to WSL paths (`/mnt/c/...`) using `wslpath` or manual parsing.
   * `wslToWindows(path)`: Converts WSL paths to Windows paths.
3. **Command Resolution**: Resolves the server command path, handling cross-platform nuances.
4. **Process Bridging**:
   * Spawns the target MCP server process.
   * Pipes `stdin` from the parent process to the child process.
   * Pipes `stdout` from the child process to the parent process.
   * Inherits `stderr` for error visibility.
   * Propagates signals (`SIGINT`, `SIGTERM`) to the child process.

## Usage Patterns

* **Direct**: `mcp-cross node server.js`
* **Via npx**: `npx mcp-cross -- node server.js` (Recommended to use `--` delimiter)
* **Debug Mode**: Set `MCP_CROSS_DEBUG=true` or use `--debug` flag.

## File Structure

* `index.js`: Entry point and implementation of `MCPBridge`.
* `package.json`: Project metadata and dependencies.
* `README.md`: User-facing documentation.
* `example-server.js`: A simple MCP server for testing purposes.
* `examples/`: Configuration examples for various clients (Claude Desktop, VS Code).

## Ghostis Brain Usage

This project utilizes `ghostis-brain` for persistent memory and context management. Agents should use the following tools and patterns:

## Development Workflow

We follow this workflow to ensure quality and continuity:

1. **BDD-First**: Define behavior with tests/specs before implementation where possible.
2. **Value-Slice Planning**: Break work into small, working increments rather than large batches.
3. **Memory-Enhanced**: Actively read from and write to project memory.
4. **Quality Gates**: Ensure linting, testing, and documentation are updated with every change.
