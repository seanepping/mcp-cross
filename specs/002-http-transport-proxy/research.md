# Research: HTTP Transport for MCP

**Feature ID**: 002-http-transport-proxy
**Date**: 2025-12-02

## MCP HTTP Transport Overview

The Model Context Protocol supports multiple transport mechanisms. The HTTP transport is defined in the [MCP Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports).

### Transport Types

1. **Stdio** - Process-based, stdin/stdout communication
2. **HTTP with SSE** (legacy, 2024-11-05) - Separate SSE and POST endpoints
3. **Streamable HTTP** (current, 2025-03-26) - Single endpoint, optional SSE

## Streamable HTTP Transport (2025-03-26)

### Sending Messages (POST)

```http
POST /mcp HTTP/1.1
Host: example.com
Content-Type: application/json
Accept: application/json, text/event-stream
Mcp-Session-Id: <session-id>  (if established)

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { ... },
  "id": 1
}
```

### Response Formats

**JSON Response (simple)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Mcp-Session-Id: <new-or-existing-session-id>

{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
```

**SSE Response (streaming)**:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: message
data: {"jsonrpc": "2.0", "result": {...}, "id": 1}

event: message
data: {"jsonrpc": "2.0", "method": "notification", "params": {...}}
```

### Listening for Server Messages (GET)

Clients can open a GET request to receive server-initiated messages:

```http
GET /mcp HTTP/1.1
Host: example.com
Accept: text/event-stream
Mcp-Session-Id: <session-id>
```

### Session Management

- Server MAY return `Mcp-Session-Id` header
- Client MUST include session ID in subsequent requests
- Session cleanup via DELETE request

## TypeScript SDK Implementation

The MCP TypeScript SDK provides `StreamableHTTPClientTransport`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({ name: 'my-client', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3000/mcp')
);
await client.connect(transport);
```

## Implementation Considerations for mcp-cross

### Minimal Implementation (MVP)

For the MVP, we can implement a simpler approach:

1. **POST-only**: Most MCP operations are request/response
2. **JSON responses**: Handle JSON responses, defer SSE
3. **No session**: Stateless mode first

```javascript
// Simplified HTTP transport
async function sendRequest(url, headers, message) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Node.js HTTP Options

1. **Built-in `http`/`https`**: No dependencies, full control
2. **Built-in `fetch`** (Node 18+): Modern API, simpler code
3. **`node-fetch`**: Polyfill for older Node versions

Recommendation: Use built-in `fetch` (available in Node 18+), with `http`/`https` fallback for complex scenarios (SSE).

### SSE Parsing

For SSE support, we need to parse the event stream format:

```javascript
// SSE event format
// event: message
// data: {"jsonrpc": ...}
// id: 42
//
// (empty line separates events)

function parseSSE(chunk) {
  const events = [];
  const lines = chunk.split('\n');
  let currentEvent = {};
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      currentEvent.data = (currentEvent.data || '') + line.slice(5).trim();
    } else if (line.startsWith('id:')) {
      currentEvent.id = line.slice(3).trim();
    } else if (line === '') {
      if (currentEvent.data) {
        events.push(currentEvent);
      }
      currentEvent = {};
    }
  }
  
  return events;
}
```

## Authentication Patterns

### Bearer Token

Most common pattern for API authentication:

```
Authorization: Bearer <token>
```

### Custom Headers

Some APIs use custom headers:

```
X-API-Key: <key>
X-Tenant-ID: <tenant>
```

### Environment Variable Expansion

Common patterns to support:

- `$VAR` - Simple expansion
- `${VAR}` - Bracketed expansion
- `${VAR:-default}` - Default value (future enhancement)

## GitHub MCP Server Specifics

The GitHub MCP server at `https://api.githubcopilot.com/mcp/`:

- Uses Bearer token authentication
- Token is a GitHub Copilot token (from `gh auth token` or similar)
- Standard MCP JSON-RPC interface
- Likely stateless (no session management needed)

## Conclusion

For `mcp-cross` HTTP transport proxy:

1. **Start simple**: POST/JSON only, no SSE initially
2. **Use `fetch`**: Modern, built-in to Node 18+
3. **Support env vars**: Essential for the secret-access use case
4. **Add SSE later**: Phase 2 enhancement for streaming servers
