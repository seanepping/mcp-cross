# mcp-cross Agent Documentation

## Project Overview

`mcp-cross` is a Node.js-based CLI tool designed to bridge Model Context Protocol (MCP) servers across different operating systems, specifically targeting the interoperability between Windows and WSL (Windows Subsystem for Linux).

## Mandatory Agent Protocol

All AI agents working in this repository **MUST** follow this protocol at the start of every session:

1. **Initialize Context**: Call `get_current_context()` to understand the session state and recent history.
2. **Set Focus**: Call `set_focus(focus)` to declare the current task or objective.
3. **Check Memory**: Call `recall_memory(query)` to check for relevant past decisions, errors, or patterns before starting work.

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

### Core Tools

* **`get_current_context()`**: Call this at the start of every session to understand the current state, active focus, and recent memories.
* **`recall_memory(query)`**: Search for past decisions, errors, and context.
  * **Syntax**: Supports field-specific searches (`type:decision`, `tag:wsl`), boolean operators (`AND`, `OR`, `NOT`), and natural language.
  * **Example**: `recall_memory("type:error tag:wsl path translation")`
* **`remember_this(content, context)`**: Store important information.
  * **Content**: Clear, searchable description of the item.
  * **Context**: Metadata object with `type`, `tags`, `priority`, etc.
  * **Example**:

    ```javascript
    remember_this({
      content: "Fixed path translation issue for drive letters in WSL",
      context: { type: "fix", tags: ["wsl", "path-translation"], priority: "high" }
    })
    ```

* **`set_focus(focus)`**: Update the current session focus when switching tasks.
* **`get_focus_history()`**: Review past focus changes to understand the session trajectory.

### Best Practices

1. **Session Init**: Always run `get_current_context()` first.
2. **Search First**: Before asking or implementing, search memory for similar issues or decisions.
3. **Document Decisions**: Store architectural decisions and complex fixes using `remember_this`.
4. **Update Focus**: Keep the session focus current to aid context retrieval.

## Development Workflow

We follow the **Ghostis Workflow** to ensure quality and continuity:

1. **BDD-First**: Define behavior with tests/specs before implementation where possible.
2. **Value-Slice Planning**: Break work into small, working increments rather than large batches.
3. **Memory-Enhanced**: Actively read from and write to project memory.
4. **Quality Gates**: Ensure linting, testing, and documentation are updated with every change.
