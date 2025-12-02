# Feature Specification: HTTP Transport Proxy (Stdio-to-HTTP Bridge)

**Feature ID**: 002-http-transport-proxy
**Created**: 2025-12-02
**Status**: Draft
**Author**: AI Agent (via speckit)

## Problem Statement

Modern MCP clients (like Claude Desktop) support HTTP-based MCP servers using the `type: "http"` configuration. However, when authentication tokens or secrets are stored in a different environment (e.g., WSL), the Windows-based client cannot access them directly.

**Example scenario**: A user has `GH_TOKEN` stored securely in their WSL environment (in `.bashrc`, a secrets manager, or credential store). Claude Desktop on Windows cannot access this token because:

1. The `type: "http"` configuration expects the token in the Windows environment
2. Environment variable interpolation (`$GH_TOKEN`) happens on the Windows side
3. There's no bridge to access WSL-stored secrets for HTTP-based servers

```json
// Current limitation - token must exist in Windows env
{
  "github-mcp-server": {
    "type": "http",
    "url": "https://api.githubcopilot.com/mcp/",
    "headers": {
      "Authorization": "Bearer $GH_TOKEN"  // ❌ Not found if stored in WSL
    }
  }
}
```

## Proposed Solution

Extend `mcp-cross` with an `--http` mode that acts as a **stdio-to-HTTP proxy**. This allows:

1. A stdio-based MCP configuration to wrap an HTTP endpoint
2. The proxy runs in WSL (via `--wsl`), where secrets are accessible
3. Authentication headers are resolved from the WSL environment
4. Full MCP JSON-RPC messages are bridged between stdio and HTTP

### Target Usage

```json
{
  "github-mcp-server": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "-y",
      "mcp-cross@beta",
      "--wsl",
      "--http",
      "https://api.githubcopilot.com/mcp/",
      "--header", "Authorization: Bearer $GH_TOKEN"
    ]
  }
}
```

### Out of Scope (MVP)

The following features are explicitly **not included** in the MVP release:

- **OAuth2 flows**: No built-in token refresh or OAuth2 authentication handling
- **Request caching**: No caching of responses; every request goes to the HTTP server
- **Rate limiting**: No built-in rate limiting; rely on server-side enforcement
- **Certificate pinning**: No TLS certificate pinning options
- **Request/response transformation**: No middleware-style message modification
- **SSE streaming**: Server-Sent Events deferred to v1.1 (see FR-008)

## User Scenarios & Testing

### User Story 1 - Access HTTP MCP Server with WSL-Stored Token (Priority: P1)

As a Windows user with authentication tokens stored in WSL, I want to access HTTP-based MCP servers (like GitHub's MCP) while keeping my tokens secure in my Linux environment, so that I don't need to duplicate secrets across operating systems.

**Why this priority**: This is the primary motivating use case. Without it, users must duplicate tokens in Windows, reducing security posture.

**Independent Test**: Configure Claude Desktop with stdio → http proxy, verify GitHub MCP server responds to tool calls.

**Acceptance Scenarios**:

1. **Given** `GH_TOKEN` is set in WSL `~/.bashrc`, **When** Claude Desktop calls a GitHub MCP tool via the proxy, **Then** the request succeeds with proper authentication.
2. **Given** the token is NOT set in Windows environment, **When** using the proxy with `--wsl`, **Then** the WSL environment's token is used successfully.
3. **Given** an invalid token, **When** a request is made, **Then** the HTTP error (401/403) is properly forwarded back as an MCP error.

---

### User Story 2 - Standard HTTP Proxy (Non-WSL) (Priority: P2)

As a developer, I want to use `mcp-cross --http` without `--wsl` to proxy HTTP MCP servers locally, so that I can add custom headers, logging, or transformations to HTTP-based MCP servers.

**Why this priority**: Useful for debugging and local development, but secondary to the cross-platform secret access use case.

**Acceptance Scenarios**:

1. **Given** I run `mcp-cross --http https://example.com/mcp`, **When** an MCP message is sent via stdin, **Then** it's forwarded as an HTTP POST to the URL.
2. **Given** custom headers are specified, **When** requests are made, **Then** all custom headers are included.

---

### User Story 3 - Support Streamable HTTP with SSE (Priority: DEFERRED v1.1)

As a user of MCP servers that use Server-Sent Events (SSE) for streaming, I want the proxy to handle SSE responses, so that I can use servers that send notifications or streaming responses.

**Why this priority**: Deferred to v1.1. Required for full MCP compatibility, but many simple use cases (like GitHub MCP) work with simple request/response. See FR-008.

**Acceptance Scenarios**:

1. **Given** the HTTP server returns SSE for a long-running operation, **When** messages arrive via SSE, **Then** they are forwarded to stdout as JSON-RPC messages.
2. **Given** the connection drops, **When** reconnecting with `Last-Event-ID`, **Then** missed messages are replayed.

---

### User Story 4 - Session Management (Priority: P3)

As a user of stateful MCP servers, I want the proxy to maintain session state across requests, so that multi-turn interactions work correctly.

**Why this priority**: Important for complex servers, but many servers operate statelessly.

**Acceptance Scenarios**:

1. **Given** a server returns `Mcp-Session-Id` header, **When** subsequent requests are made, **Then** the session ID is included in request headers.
2. **Given** a session is terminated, **When** the proxy shuts down, **Then** a DELETE request is sent to clean up the session.

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept `--http <url>` flag to enable HTTP proxy mode.
- **FR-002**: System MUST accept `--header "Name: Value"` flag (repeatable) for custom HTTP headers.
- **FR-003**: System MUST expand environment variables in header values (e.g., `$GH_TOKEN` or `${GH_TOKEN}`).
- **FR-004**: When combined with `--wsl`, environment variables MUST be resolved from the WSL environment.
- **FR-005**: System MUST read newline-delimited JSON-RPC messages from stdin (one complete JSON message per line) and forward them as HTTP POST requests.
- **FR-006**: System MUST write HTTP responses to stdout as JSON-RPC messages.
- **FR-007**: System MUST handle HTTP errors and convert them to JSON-RPC error responses.
- **FR-008**: [DEFERRED v1.1] System MAY support SSE responses for streaming servers (Content-Type: text/event-stream). MVP supports JSON responses only.
- **FR-009**: System SHOULD maintain `Mcp-Session-Id` header across requests within a session.
- **FR-010**: System MUST validate that the URL is a valid HTTP/HTTPS URL.
- **FR-011**: System MUST support request batching (JSON-RPC batch requests as arrays).
- **FR-012**: System MUST handle graceful shutdown, forwarding SIGINT/SIGTERM and cleaning up sessions.

### Non-Functional Requirements

- **NFR-001**: Latency overhead SHOULD be minimal (< 50ms added to HTTP round-trip).
- **NFR-002**: Memory usage SHOULD remain constant regardless of message throughput.
- **NFR-003**: System MUST work with Node.js 18+ (LTS versions).
- **NFR-004**: No additional npm dependencies beyond what's already in mcp-cross (prefer built-in `http`/`https` modules).

### Edge Cases

- **Empty stdin**: Proxy should wait for input, not exit immediately.
- **Malformed JSON**: Return JSON-RPC parse error (-32700) without crashing.
- **Network timeout**: Return JSON-RPC internal error (-32603) immediately with descriptive message (no retry).
- **Network errors**: All network failures (DNS, connection refused, timeout) return errors immediately without retry; client is responsible for retry logic if desired.
- **SSL/TLS errors**: Report clearly (certificate issues, etc.).
- **Large payloads**: Support reasonable payload sizes (at least 1MB).
- **Concurrent requests**: Buffer and serialize if needed (MCP typically uses sequential request/response).
- **Invalid URL**: Exit with clear error message before starting proxy loop.
- **Missing token**: If `$VAR` resolves to empty, warn but proceed (server will likely return 401).

## Technical Design

### Architecture

```
┌─────────────────┐     stdio      ┌─────────────────┐      HTTP       ┌─────────────────┐
│  Claude Desktop │ ──────────────▶│    mcp-cross    │ ───────────────▶│   HTTP MCP      │
│    (Windows)    │                │  (WSL via --wsl)│                 │    Server       │
│                 │ ◀──────────────│                 │ ◀───────────────│                 │
└─────────────────┘     stdio      └─────────────────┘      HTTP       └─────────────────┘
                                          │
                                          │ reads $GH_TOKEN
                                          │ from WSL env
                                          ▼
                                   ┌─────────────────┐
                                   │  WSL Environment│
                                   │  (~/.bashrc)    │
                                   └─────────────────┘
```

### Component Design

#### 1. HTTP Transport Module (`src/lib/http-proxy.js`)

```javascript
class HTTPTransport {
  constructor(options) {
    this.url = new URL(options.url);
    this.headers = options.headers || {};
    this.sessionId = null;
  }

  async sendRequest(jsonRpcMessage) {
    // POST JSON-RPC to HTTP endpoint
    // Handle response (JSON or SSE)
    // Maintain session state
  }

  async openSSEStream() {
    // GET request with Accept: text/event-stream
    // Parse SSE events, emit as JSON-RPC messages
  }
}
```

#### 2. Header Parser with Environment Variable Expansion

```javascript
function parseHeaders(headerArgs, env = process.env) {
  return headerArgs.map(h => {
    const [name, ...valueParts] = h.split(':');
    let value = valueParts.join(':').trim();
    // Expand $VAR and ${VAR} patterns
    value = value.replace(/\$\{?(\w+)\}?/g, (_, varName) => env[varName] || '');
    return { name: name.trim(), value };
  });
}
```

#### 3. Stdio JSON-RPC Bridge

```javascript
async function bridgeStdioToHttp(transport) {
  const rl = readline.createInterface({ input: process.stdin });
  
  for await (const line of rl) {
    const message = JSON.parse(line);
    const response = await transport.sendRequest(message);
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}
```

### CLI Interface

```
mcp-cross --http <url> [options]

Options:
  --http <url>           Target HTTP MCP endpoint URL
  --header <header>      Add custom header (format: "Name: Value")
                         Can be specified multiple times
                         Environment variables ($VAR) are expanded
  --wsl                  Run in WSL (env vars resolved from WSL)
  --distro <name>        Target specific WSL distribution
  --timeout <ms>         HTTP request timeout (default: 60000)
  --debug                Enable debug logging

Examples:
  # Basic HTTP proxy
  mcp-cross --http https://api.example.com/mcp

  # With authentication header
  mcp-cross --http https://api.example.com/mcp --header "Authorization: Bearer $API_KEY"

  # Via WSL for secret access
  mcp-cross --wsl --http https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GH_TOKEN"
```

## Configuration Examples

### Claude Desktop (Windows) - GitHub MCP via WSL

```json
{
  "mcpServers": {
    "github-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "mcp-cross@beta",
        "--wsl",
        "--http", "https://api.githubcopilot.com/mcp/",
        "--header", "Authorization: Bearer $GH_TOKEN"
      ]
    }
  }
}
```

### Claude Desktop (Windows) - Multiple Headers

```json
{
  "mcpServers": {
    "custom-api": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "mcp-cross@beta",
        "--wsl",
        "--http", "https://internal.api.example.com/mcp",
        "--header", "Authorization: Bearer $API_TOKEN",
        "--header", "X-Tenant-ID: $TENANT_ID",
        "--header", "X-Custom-Header: static-value"
      ]
    }
  }
}
```

### Local Development (Debug Mode)

```json
{
  "mcpServers": {
    "debug-proxy": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "mcp-cross@beta",
        "--debug",
        "--http", "http://localhost:3000/mcp"
      ]
    }
  }
}
```

## Success Criteria

### Measurable Outcomes

- **SC-001**: User can successfully call GitHub MCP tools via the proxy with WSL-stored `GH_TOKEN`.
- **SC-002**: Environment variables are correctly resolved from WSL environment, not Windows.
- **SC-003**: HTTP errors (4xx, 5xx) are properly converted to JSON-RPC errors.
- **SC-004**: Proxy adds < 50ms latency to HTTP round-trips.
- **SC-005**: No memory leaks over extended usage (1000+ requests).

### Test Plan

1. **Unit Tests**: Header parsing, env var expansion, JSON-RPC serialization
2. **Integration Tests**: Mock HTTP server, verify request/response flow
3. **E2E Tests**: Real GitHub MCP endpoint with test token
4. **Cross-Platform Tests**: Windows → WSL → HTTP flow

## Security Considerations

- **Token Exposure**: Tokens are only exposed in the WSL environment, not logged or persisted
- **Origin Header**: Proxy should set appropriate `Origin` header as required by MCP spec
- **HTTPS**: Strongly recommend HTTPS endpoints; warn if HTTP is used for non-localhost
- **Header Injection**: Validate header names/values to prevent header injection attacks
- **Credential Logging**: Debug mode MUST NOT log full header values (mask tokens)

## Future Enhancements

1. **OAuth2 Flow**: Built-in support for OAuth2 token refresh
2. **Certificate Pinning**: Option to pin TLS certificates for high-security scenarios
3. **Request Transformation**: Middleware-style request/response transformation
4. **Caching**: Optional caching of resource responses
5. **Rate Limiting**: Built-in rate limiting for API protection

## Clarifications

### Session 2025-12-02

- Q: Which message framing protocol for stdin? → A: Newline-delimited JSON (one complete JSON message per line)
- Q: How to handle network errors (timeout, DNS, connection refused)? → A: Return JSON-RPC error immediately (no retry)
- Q: Should SSE streaming be in MVP? → A: No; MVP is request/response only, SSE deferred to v1.1
- Q: Default HTTP request timeout? → A: 60 seconds (configurable via --timeout)
- Q: What is explicitly out of scope for MVP? → A: OAuth2 flows, request caching, rate limiting, certificate pinning, request/response transformation

## References

- [MCP Specification - Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP TypeScript SDK - HTTP Client](https://github.com/modelcontextprotocol/typescript-sdk)
- [mcp-cross Spec 001 - Windows WSL Bridge](../001-windows-wsl-bridge/spec.md)
