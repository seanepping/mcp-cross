# Implementation Plan: Windows to WSL Bridge

**Branch**: `001-windows-wsl-bridge` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-windows-wsl-bridge/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The goal is to enable `mcp-cross` to launch and communicate with MCP servers running in WSL from a Windows environment. This involves adding a `--wsl` flag, detecting Windows paths in arguments, translating them to WSL paths, and managing the `wsl.exe` process with proper stdio piping.

## Technical Context

**Language/Version**: Node.js (>=14.0.0)
**Primary Dependencies**: `child_process` (built-in), `path` (built-in), `os` (built-in)
**Storage**: N/A
**Testing**: `node test.js` (existing custom test runner)
**Target Platform**: Windows (host) -> WSL (target)
**Project Type**: CLI Tool
**Performance Goals**: Minimal overhead on stdio piping
**Constraints**: Must handle path translation reliably for standard Windows paths
**Scale/Scope**: Single CLI entry point modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Cross-Platform Interoperability**: ✅ Core goal of this feature.
- **Mandatory Agent Protocol**: ✅ Agent is following protocol.
- **Memory-Driven Development**: ✅ Using memory for context.
- **Behavior-Driven Development (BDD)**: ✅ Spec defines acceptance scenarios.
- **Value-Slice Delivery**: ✅ Feature is scoped to specific bridge functionality.

## Project Structure

### Documentation (this feature)

```text
specs/001-windows-wsl-bridge/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.js          # Main CLI entry point (to be modified)
├── lib/
│   └── wsl-bridge.js # New module for WSL specific logic (proposed)
└── test.js           # Existing test file
```

**Structure Decision**: We will refactor `index.js` to delegate WSL bridging logic to a new module `lib/wsl-bridge.js` to keep the main entry point clean and testable.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
