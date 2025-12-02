# Tasks: HTTP Transport Proxy

**Input**: Design documents from `/specs/002-http-transport-proxy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in spec. Unit tests included for critical functions only.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/lib/` for modules, `index.js` as entry point
- **Tests**: `tests/` directory
- **Examples**: `examples/` directory

---

## Phase 1: Setup

**Purpose**: Project structure preparation for HTTP proxy feature

- [ ] T001 Create tests/ directory structure for http-proxy tests
- [ ] T002 [P] Create example config files directory structure in examples/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement header parser with environment variable expansion in src/lib/header-parser.js
- [ ] T004 [P] Implement URL validator for HTTP/HTTPS endpoints in src/lib/url-validator.js
- [ ] T005 [P] Implement JSON-RPC error formatter in src/lib/jsonrpc-error.js
- [ ] T006 Unit test for header parser (env var expansion, validation) in tests/header-parser.test.js
- [ ] T007 [P] Unit test for URL validator in tests/url-validator.test.js

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Access HTTP MCP Server with WSL-Stored Token (Priority: P1) 🎯 MVP

**Goal**: Enable Windows users to access HTTP MCP servers (like GitHub's) with tokens stored in WSL

**Independent Test**: Configure Claude Desktop with stdio → http proxy, verify GitHub MCP server responds to tool calls

### Implementation for User Story 1

- [ ] T008 [US1] Create HTTPProxyConfig class in src/lib/http-proxy.js (url, headers, timeout, debug fields per data-model.md)
- [ ] T009 [US1] Create HTTPProxySession class in src/lib/http-proxy.js (sessionId, isActive, requestCount fields)
- [ ] T010 [US1] Implement sendRequest() method using built-in fetch in src/lib/http-proxy.js
- [ ] T010a [US1] Implement JSON-RPC batch array detection and response handling in src/lib/http-proxy.js (FR-011)
- [ ] T011 [US1] Implement HTTP error to JSON-RPC error conversion in src/lib/http-proxy.js
- [ ] T012 [US1] Implement stdin readline loop with NDJSON parsing in src/lib/http-proxy.js
- [ ] T013 [US1] Implement stdout JSON-RPC response writer in src/lib/http-proxy.js
- [ ] T014 [US1] Add --http flag parsing to CLI argument handler in index.js
- [ ] T015 [US1] Add --header flag parsing (repeatable) to CLI in index.js
- [ ] T016 [US1] Add --timeout flag parsing with 60000ms default in index.js
- [ ] T017 [US1] Integrate http-proxy module with existing --wsl mode in index.js
- [ ] T018 [US1] Handle SIGINT/SIGTERM for graceful shutdown in src/lib/http-proxy.js
- [ ] T019 [US1] Add HTTPS warning for non-localhost HTTP URLs in src/lib/http-proxy.js
- [ ] T020 [US1] Integration test: mock HTTP server with token auth in tests/http-proxy.test.js

**Checkpoint**: User Story 1 complete - Windows → WSL → HTTP flow works with token authentication

---

## Phase 4: User Story 2 - Standard HTTP Proxy (Non-WSL) (Priority: P2)

**Goal**: Enable developers to use `--http` without `--wsl` for local proxying and debugging

**Independent Test**: Run `mcp-cross --http https://example.com/mcp` directly, verify stdin → HTTP → stdout flow

### Implementation for User Story 2

- [ ] T021 [US2] Ensure --http works independently of --wsl flag in index.js
- [ ] T022 [US2] Add --debug flag for verbose logging in index.js
- [ ] T023 [US2] Implement debug logging (mask sensitive header values) in src/lib/http-proxy.js
- [ ] T024 [US2] Add multiple --header support verification in tests/http-proxy.test.js
- [ ] T025 [US2] Create example config for local development in examples/claude-desktop-http.json
- [ ] T026 [P] [US2] Create VS Code settings example in examples/vscode-settings-http.json

**Checkpoint**: User Story 2 complete - Local HTTP proxy works for debugging

---

## Phase 5: User Story 4 - Session Management (Priority: P3)

**Goal**: Maintain MCP session state across requests for stateful servers

**Note**: User Story 3 (SSE) is DEFERRED to v1.1 per spec.md FR-008

**Independent Test**: Verify Mcp-Session-Id header is echoed back on subsequent requests

### Implementation for User Story 4

- [ ] T027 [US4] Capture Mcp-Session-Id from response headers in src/lib/http-proxy.js
- [ ] T028 [US4] Include session ID in subsequent request headers in src/lib/http-proxy.js
- [ ] T029 [US4] Send DELETE request on session cleanup (graceful shutdown) in src/lib/http-proxy.js
- [ ] T030 [US4] Unit test for session ID management in tests/http-proxy.test.js

**Checkpoint**: User Story 4 complete - Stateful MCP servers supported

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, examples, and final validation

- [ ] T031 [P] Update README.md with HTTP proxy usage examples
- [ ] T032 [P] Update package.json version for beta release
- [ ] T033 Verify all edge cases from spec.md (malformed JSON, network timeout, large payloads)
- [ ] T034 Run quickstart.md validation scenarios manually
- [ ] T035 [P] Add JSDoc comments to exported functions in src/lib/http-proxy.js
- [ ] T036 Final integration test: GitHub MCP server with real token (manual E2E)

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──── BLOCKS ALL USER STORIES
    │
    ├────────────────────────────────┬─────────────────────────────┐
    ▼                                ▼                             ▼
Phase 3 (US1 - P1)           Phase 4 (US2 - P2)           Phase 5 (US4 - P3)
    │                                │                             │
    └────────────────────────────────┴─────────────────────────────┘
                                     │
                                     ▼
                           Phase 6 (Polish)
```

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - Core MVP functionality
- **User Story 2 (P2)**: Can start after Phase 2 - Extends US1 with debug features
- **User Story 4 (P3)**: Can start after Phase 2 - Independent session management

### Within Each User Story

- Config/model classes before methods
- Core methods before CLI integration
- Implementation before tests
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:

```text
T003 (header-parser.js)  ║  T004 (url-validator.js)  ║  T005 (jsonrpc-error.js)
                         ║                           ║
T006 (test header)       ║  T007 (test url)          ║
```

**Phase 3 (US1) - Models**:

```text
T008 (HTTPProxyConfig)   ║  T009 (HTTPProxySession)
```

**Phase 3 (US1) - CLI flags**:

```text
T014 (--http)  ║  T015 (--header)  ║  T016 (--timeout)
```

**Phase 4 (US2) - Examples**:

```text
T025 (claude-desktop)  ║  T026 (vscode-settings)
```

**Phase 6 (Polish)**:

```text
T031 (README)  ║  T032 (package.json)  ║  T035 (JSDoc)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T007)
3. Complete Phase 3: User Story 1 (T008-T020)
4. **STOP and VALIDATE**: Test with Claude Desktop → WSL → GitHub MCP
5. Deploy beta if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP Release** 🎯
3. Add User Story 2 → Test independently → Add debug support
4. Add User Story 4 → Test independently → Add session support
5. Polish → Final beta release

### Suggested MVP Scope

**Minimal viable release includes**:

- Phase 1: Setup (2 tasks)
- Phase 2: Foundational (5 tasks)
- Phase 3: User Story 1 (13 tasks)
- **Total MVP: 20 tasks**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 3 (SSE) is DEFERRED to v1.1 - not included in tasks
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
