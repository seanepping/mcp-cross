# Research: Windows to WSL Bridge

**Status**: Complete
**Date**: 2025-11-19

## Unknowns & Clarifications

### 1. Path Translation Strategy

**Question**: How to reliably translate Windows paths to WSL paths?
**Decision**: Use `wslpath` utility inside WSL if possible, or manual string manipulation if performance is critical.
**Rationale**: `wslpath` is the canonical tool provided by Microsoft. However, invoking it for every argument might be slow.
**Refinement**: We will implement a hybrid approach:

1. Detect absolute Windows paths (e.g., `C:\...`).
2. Convert drive letter `C:` to `/mnt/c`.
3. Convert backslashes to forward slashes.
4. This covers 99% of cases without the overhead of spawning a `wslpath` process for every argument.

### 2. Relative Path Resolution

**Question**: How to handle relative paths like `.\file.txt`?
**Decision**: Resolve all relative paths to absolute paths on the Windows side *before* translation.
**Rationale**: The WSL process will likely run in a different working directory (e.g., user's home) or the mapping might be complex. Resolving to absolute Windows paths first ensures unambiguous translation.

### 3. Argument Parsing

**Question**: How to identify which arguments are paths?
**Decision**: Heuristic approach.

- If an argument matches the Windows absolute path pattern (`^[a-zA-Z]:\\`), treat it as a path.
- If an argument exists as a file relative to CWD, treat it as a path.

**Rationale**: We cannot know the schema of the target tool's arguments. A heuristic is the best effort.

### 4. Stdio Piping

**Question**: Does `wsl.exe` handle stdio piping correctly?
**Decision**: Yes, `wsl.exe` passes stdin/stdout/stderr through.
**Rationale**: Verified by standard WSL usage patterns.

## Technology Choices

- **Node.js `child_process.spawn`**: For running `wsl.exe`.
- **Manual Path Translation**: For performance and simplicity, avoiding `wslpath` overhead where possible.

## Alternatives Considered

- **Using `wslpath` for everything**: Rejected due to potential performance impact of spawning a process for every argument.
- **Parsing specific tool arguments**: Rejected as `mcp-cross` must be tool-agnostic.
