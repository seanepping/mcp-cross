# Implementation Tasks: HTTP Transport Proxy

**Feature ID**: 002-http-transport-proxy
**Status**: Planning

## Phase 1: Core HTTP Proxy (MVP)

### Task 1.1: HTTP Transport Module
**Priority**: P1
**Estimate**: 2-3 hours

- [ ] Create `src/lib/http-transport.js`
- [ ] Implement `HTTPTransport` class with:
  - Constructor accepting URL and headers
  - `sendRequest(jsonRpcMessage)` method
  - HTTP POST to endpoint with JSON body
  - Response parsing (JSON)
  - Error handling (network errors, HTTP errors)
- [ ] Add request timeout support
- [ ] Add debug logging

**Acceptance**:
- Can send JSON-RPC message to HTTP endpoint
- Receives and parses JSON response
- Handles HTTP 4xx/5xx errors

---

### Task 1.2: Header Parsing with Environment Variable Expansion
**Priority**: P1
**Estimate**: 1 hour

- [ ] Create `parseHeaders(headerArgs, env)` function
- [ ] Support `--header "Name: Value"` format
- [ ] Expand `$VAR` and `${VAR}` patterns
- [ ] Handle missing variables (resolve to empty string, warn)
- [ ] Support multiple headers

**Acceptance**:
- `--header "Auth: Bearer $TOKEN"` expands correctly
- Multiple `--header` flags work
- Missing env vars produce warning but don't fail

---

### Task 1.3: CLI Integration
**Priority**: P1
**Estimate**: 1-2 hours

- [ ] Add `--http <url>` argument parsing in `index.js`
- [ ] Add `--header <header>` argument (repeatable)
- [ ] Add `--timeout <ms>` argument
- [ ] URL validation (must be http:// or https://)
- [ ] Update help text

**Acceptance**:
- `mcp-cross --http https://example.com/mcp` starts proxy
- Headers are parsed and passed to transport
- Invalid URLs produce clear error

---

### Task 1.4: Stdio-to-HTTP Bridge
**Priority**: P1
**Estimate**: 2 hours

- [ ] Implement readline-based stdin reading
- [ ] JSON-RPC message parsing
- [ ] Forward to HTTP transport
- [ ] Write response to stdout
- [ ] Handle JSON parse errors (return -32700)
- [ ] Handle empty lines / whitespace

**Acceptance**:
- JSON-RPC messages flow stdin → HTTP → stdout
- Malformed JSON returns proper error
- Process stays alive waiting for input

---

### Task 1.5: WSL Integration for HTTP Mode
**Priority**: P1
**Estimate**: 1-2 hours

- [ ] Support `--wsl --http` combination
- [ ] Ensure env vars are resolved in WSL context
- [ ] Update `wsl-bridge.js` to handle HTTP mode
- [ ] Pass headers with expanded env vars to WSL subprocess

**Acceptance**:
- `--wsl --http` runs proxy in WSL
- `$GH_TOKEN` resolves from WSL environment
- Full flow works: Windows Claude → WSL proxy → HTTP server

---

## Phase 2: Enhanced Protocol Support

### Task 2.1: Session Management
**Priority**: P2
**Estimate**: 1-2 hours

- [ ] Parse `Mcp-Session-Id` from response headers
- [ ] Include session ID in subsequent requests
- [ ] Handle session expiration/renewal
- [ ] Send DELETE on graceful shutdown

**Acceptance**:
- Session ID is maintained across requests
- Stateful servers work correctly

---

### Task 2.2: SSE Streaming Support
**Priority**: P2
**Estimate**: 3-4 hours

- [ ] Implement `openSSEStream()` method
- [ ] Parse SSE event format (`event:`, `data:`, `id:`)
- [ ] Forward SSE messages to stdout
- [ ] Support `Last-Event-ID` for resumption
- [ ] Handle connection drops and reconnection

**Acceptance**:
- SSE streams are correctly parsed
- Messages appear on stdout
- Reconnection works with event replay

---

### Task 2.3: Batch Request Support
**Priority**: P2
**Estimate**: 1 hour

- [ ] Detect JSON-RPC batch (array) format
- [ ] Send batch as single HTTP request
- [ ] Parse batch response
- [ ] Forward individual responses

**Acceptance**:
- Array of requests sent as batch
- Array of responses received and forwarded

---

## Phase 3: Robustness & Polish

### Task 3.1: Error Handling Improvements
**Priority**: P2
**Estimate**: 1-2 hours

- [ ] Map HTTP status codes to JSON-RPC errors
- [ ] Include helpful error messages
- [ ] Handle network timeouts gracefully
- [ ] Handle SSL/TLS errors with clear messages
- [ ] Rate limit errors (429) handling

**Acceptance**:
- All error scenarios produce valid JSON-RPC errors
- Error messages are actionable

---

### Task 3.2: Security Hardening
**Priority**: P2
**Estimate**: 1-2 hours

- [ ] Mask tokens in debug output
- [ ] Validate header names (no injection)
- [ ] Warn on non-HTTPS non-localhost URLs
- [ ] Set appropriate `Origin` header

**Acceptance**:
- Debug logs don't expose full tokens
- Security warnings are shown

---

### Task 3.3: Documentation
**Priority**: P2
**Estimate**: 1-2 hours

- [ ] Update README.md with HTTP proxy section
- [ ] Add example configurations
- [ ] Document security considerations
- [ ] Add troubleshooting guide

**Acceptance**:
- Users can configure HTTP proxy from docs
- Common issues are documented

---

### Task 3.4: Tests
**Priority**: P2
**Estimate**: 2-3 hours

- [ ] Unit tests for header parsing
- [ ] Unit tests for env var expansion
- [ ] Integration tests with mock HTTP server
- [ ] E2E test script for manual testing

**Acceptance**:
- Core functionality has test coverage
- CI passes

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 (MVP) | 5 tasks | 7-10 hours |
| Phase 2 (Enhanced) | 3 tasks | 5-7 hours |
| Phase 3 (Polish) | 4 tasks | 5-9 hours |
| **Total** | **12 tasks** | **17-26 hours** |

## Dependencies

- Node.js built-in `http`/`https` modules
- Node.js built-in `readline` module
- Existing `wsl-bridge.js` module
