# Implementation Plan: HTTP Transport Proxy

**Branch**: `002-http-transport-proxy` | **Date**: 2025-12-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-http-transport-proxy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extend `mcp-cross` with `--http` mode to act as a stdio-to-HTTP proxy, enabling Windows MCP clients (Claude Desktop) to access HTTP-based MCP servers while resolving authentication tokens from WSL environment. MVP implements request/response only (no SSE streaming), with newline-delimited JSON framing, 60s default timeout, and no retry on network errors.

## Technical Context

**Language/Version**: Node.js 18+ (JavaScript, ES2022+)  
**Primary Dependencies**: Built-in `http`/`https`, `readline` modules (no new dependencies per NFR-004)  
**Storage**: N/A (stateless proxy)  
**Testing**: Node.js built-in test runner or existing test.js pattern  
**Target Platform**: Windows (calling WSL), WSL/Linux, cross-platform  
**Project Type**: Single CLI project  
**Performance Goals**: <50ms added latency to HTTP round-trips (NFR-001)  
**Constraints**: No memory leaks over 1000+ requests, Node.js 18+ LTS only  
**Scale/Scope**: Single proxy instance, sequential request handling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cross-Platform Interoperability | ✅ PASS | Feature bridges Windows → WSL → HTTP. Path translation not needed (URLs, not file paths). |
| II. Mandatory Agent Protocol | ✅ PASS | Agent initialized context, set focus, checked memory at session start. |
| III. Memory-Driven Development | ✅ PASS | Feature spec stored in ghostis-brain (memory_id: 912aec13-6076-40ec-8090-185664820b2f). |
| IV. Behavior-Driven Development | ✅ PASS | Spec includes acceptance scenarios (Given/When/Then) for all user stories. |
| V. Value-Slice Delivery | ✅ PASS | MVP scoped to request/response only; SSE, session mgmt deferred to v1.1. |

**Gate Result**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-http-transport-proxy/
├── plan.md              # This file
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (usage guide)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Single project structure (existing codebase)
index.js                 # Main CLI entry point - ADD http mode handling
src/
└── lib/
    ├── wsl-bridge.js    # Existing WSL bridge module
    └── http-proxy.js    # NEW: HTTP transport proxy module

tests/
└── http-proxy.test.js   # NEW: Unit/integration tests for HTTP proxy

examples/
├── claude-desktop-http.json      # NEW: Example config for HTTP mode
└── vscode-settings-http.json     # NEW: Example config for VS Code
```

**Structure Decision**: Single project layout. Extend existing `index.js` with `--http` flag parsing and delegate to new `src/lib/http-proxy.js` module. Follows existing pattern where `wsl-bridge.js` handles WSL-specific logic.

## Complexity Tracking

> No Constitution Check violations. All principles passed. Table not required.

---

## Phase 0 Complete: Research

**Output**: [research.md](research.md)

All "NEEDS CLARIFICATION" items resolved:

| Item | Resolution |
|------|------------|
| Message framing | Newline-delimited JSON (NDJSON) |
| Network error handling | Return error immediately, no retry |
| SSE support | Deferred to v1.1 |
| Default timeout | 60 seconds |
| Out of scope | OAuth2, caching, rate limiting, cert pinning, transformations |

---

## Phase 1 Complete: Design & Contracts

**Outputs**:

- [data-model.md](data-model.md) - Entity definitions (HTTPProxyConfig, HTTPProxySession, ParsedHeader)
- [quickstart.md](quickstart.md) - Usage guide and examples
- Agent context updated via `update-agent-context.sh copilot`

### Constitution Re-Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cross-Platform Interoperability | ✅ PASS | Design maintains cross-platform support |
| II. Mandatory Agent Protocol | ✅ PASS | Protocol followed throughout session |
| III. Memory-Driven Development | ✅ PASS | All decisions documented |
| IV. Behavior-Driven Development | ✅ PASS | Test scenarios defined in spec |
| V. Value-Slice Delivery | ✅ PASS | MVP scope maintained in design |

**Gate Result**: ✅ PASS - Ready for Phase 2 (Task Generation via `/speckit.tasks`)

---

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks in `tasks.md`
2. Begin implementation following task order
3. PR to `main` when all tasks complete
