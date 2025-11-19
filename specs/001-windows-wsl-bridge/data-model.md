# Data Model: Windows to WSL Bridge

**Status**: Draft
**Date**: 2025-11-19

## Entities

### 1. Bridge Configuration

Represents the runtime configuration for the bridge.

| Field | Type | Description |
|-------|------|-------------|
| `isWSL` | `boolean` | Whether the target environment is WSL (via `--wsl` flag). |
| `distro` | `string?` | Optional specific WSL distribution name (via `--distro`). |
| `command` | `string` | The command to run in the target environment. |
| `args` | `string[]` | Arguments to pass to the command. |
| `env` | `object` | Environment variables to pass. |

### 2. Path Translation

Represents the logic for converting paths.

| Operation | Input | Output | Description |
|-----------|-------|--------|-------------|
| `resolveRelative` | `string` (path) | `string` (abs path) | Resolves `.\file` to `C:\cwd\file`. |
| `winToWsl` | `string` (win path) | `string` (wsl path) | Converts `C:\path` to `/mnt/c/path`. |

## State Transitions

1. **Initialization**: Parse CLI args -> Create `Bridge Configuration`.
2. **Path Resolution**: Iterate `args` -> Identify paths -> Resolve relative paths -> Translate to WSL paths.
3. **Execution**: Construct `wsl.exe` command -> Spawn process -> Pipe stdio.
