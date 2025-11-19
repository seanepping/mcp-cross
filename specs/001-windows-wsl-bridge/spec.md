# Feature Specification: Windows to WSL Bridge

**Feature Branch**: `feature/windows-wsl-bridge`
**Created**: 2025-11-19
**Status**: Draft
**Input**: User description: "Windows to WSL bridge for MCP servers running in WSL context, configurable from Windows, with path translation."

## User Scenarios & Testing

### User Story 1 - Launch WSL MCP Server from Windows (Priority: P1)

As a Windows user, I want to run an MCP server that resides in my WSL environment (e.g., `node /home/user/server.js`) directly from a Windows terminal or Windows-based MCP client (like Claude Desktop), so that I can leverage my Linux development environment without leaving Windows.

**Why this priority**: This is the core functionality requested. Without this, the bridge is one-way (WSL -> Windows) only.

**Independent Test**: Can be fully tested by running `mcp-cross --wsl echo "Hello from WSL"` from a Windows command prompt and verifying it executes in the WSL environment (e.g., checking `uname -a`).

**Acceptance Scenarios**:

1. **Given** I am on Windows, **When** I run `mcp-cross --wsl node --version`, **Then** it should output the Node.js version installed in WSL, not Windows.
2. **Given** I am on Windows, **When** I run `mcp-cross --wsl --distro Ubuntu echo test`, **Then** it should run the command in the Ubuntu distribution.

---

### User Story 2 - Automatic Path Translation (Priority: P1)

As a Windows user, when I pass a Windows file path (absolute `C:\Users\me\doc.txt` or relative `.\doc.txt`) as an argument to a WSL-based MCP server, I want `mcp-cross` to automatically translate it to the corresponding WSL path (e.g., `/mnt/c/Users/me/doc.txt`), so that the Linux tool can successfully read/write the file.

**Why this priority**: Essential for usability. AI agents and users on Windows will naturally use Windows paths. If these aren't translated, the WSL tools will fail to find the files.

**Independent Test**: Run `mcp-cross --wsl ls "C:\Windows\System32\drivers\etc\hosts"` and verify it succeeds (listing the file).

**Acceptance Scenarios**:

1. **Given** a Windows file path `C:\test.txt`, **When** passed to `mcp-cross --wsl cat C:\test.txt`, **Then** it should execute `wsl cat /mnt/c/test.txt`.
2. **Given** a path with spaces `C:\My Documents\file.txt`, **When** passed as an argument, **Then** it should be translated and quoted/handled correctly so WSL receives the single path argument.
3. **Given** I am in `C:\Projects`, **When** I run `mcp-cross --wsl ls .\data`, **Then** it should resolve the relative path to `C:\Projects\data`, translate it to `/mnt/c/Projects/data`, and execute the command in WSL.

---

### User Story 3 - Configurable Distribution (Priority: P2)

As a user with multiple WSL distributions, I want to specify which distribution to use via a configuration flag or environment variable, so that I can target the specific environment where my tools are installed.

**Why this priority**: Important for power users, but the default (default WSL distro) covers many use cases.

**Independent Test**: Run `mcp-cross --wsl --distro Debian uname -a` and verify the output contains "Debian".

**Acceptance Scenarios**:

1. **Given** I have Ubuntu and Debian installed, **When** I run with `--distro Debian`, **Then** the command executes in Debian.
2. **Given** no distro is specified, **When** I run with `--wsl`, **Then** it uses the system default WSL distro.

## Requirements

### Functional Requirements

- **FR-001**: System MUST detect if it is running on Windows.
- **FR-002**: System MUST accept a `--wsl` flag (or similar indicator) to enable Windows-to-WSL bridging.
- **FR-003**: When bridging to WSL, the system MUST construct a command using `wsl.exe`.
- **FR-004**: System MUST iterate through all command arguments and identify Windows paths (both absolute and relative).
- **FR-005**: System MUST resolve relative paths to absolute Windows paths based on the current working directory, then translate all identified Windows paths to their WSL equivalents (e.g., `C:\` -> `/mnt/c/`) before passing them to `wsl.exe`.
- **FR-006**: System MUST support a `--distro <name>` argument to specify the target WSL distribution.
- **FR-007**: System MUST correctly pipe `stdin`, `stdout`, and `stderr` between the Windows host process and the `wsl.exe` child process.
- **FR-008**: System MUST handle process termination signals (SIGINT, SIGTERM) and propagate them to the WSL process.
- **FR-009**: System MUST sanitize and quote all arguments passed to `wsl.exe` to prevent command injection vulnerabilities.
- **FR-010**: System MUST pass all environment variables from the Windows host to the WSL process (excluding Windows-specific system variables if necessary).
- **FR-011**: System MUST report a clear error message if the specified WSL distribution does not exist or if WSL is not installed.

### Edge Cases

- **Path Ambiguity**: Arguments that look like paths but aren't (e.g., `C:something` vs `C:\something`). We should be strict about matching absolute paths.
- **Spaces in Paths**: Paths with spaces must be preserved as single arguments when passed to `wsl.exe`.
- **Special Characters**: Paths containing special characters (e.g., `&`, `$`, `(`, `)`) MUST be correctly escaped/quoted to prevent shell interpretation in WSL.
- **UNC Paths**: UNC paths (e.g., `\\server\share`) are NOT supported in this version and should be passed through as-is or trigger a warning.
- **Case Sensitivity**: Path translation MUST preserve the casing of the Windows path when translating to WSL. Note: `/mnt/c` mounts usually support case-insensitivity, but users should aim for correct casing.
- **WSL Not Installed**: If `wsl.exe` is missing or fails, report a clear error.
- **Mixed Environments**: Running `--wsl` from *within* WSL should probably error or just run locally (since we are already in WSL), or maybe support nested WSL (unlikely use case).

## Success Criteria

### Measurable Outcomes

- **SC-001**: A Windows user can successfully run a "cat" command on a Windows file using a WSL instance of `cat` via `mcp-cross`.
- **SC-002**: Path translation works for 100% of standard absolute Windows paths (Drive letter + backslash).
- **SC-003**: Stdio throughput is sufficient for MCP protocol messages (JSON-RPC) without corruption.

## Configuration Examples

### VS Code (Windows) -> WSL MCP Server

```json
{
  "mcpServers": {
    "wsl-server": {
      "command": "npx",
      "args": [
        "mcp-cross",
        "--wsl",
        "--distro", "Ubuntu",
        "node",
        "/home/user/server.js"
      ]
    }
  }
}
```
