# Data Model: HTTP Transport Proxy

**Feature ID**: 002-http-transport-proxy
**Phase**: 1 (Design & Contracts)
**Date**: 2025-12-02

## Overview

This feature is primarily stateless and does not introduce persistent entities. The data model defines the runtime structures used during HTTP proxying.

---

## Entities

### 1. HTTPProxyConfig

Configuration for the HTTP proxy, parsed from CLI arguments.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `url` | `URL` | ✅ | Target HTTP endpoint | Valid HTTP/HTTPS URL |
| `headers` | `Map<string, string>` | ❌ | Custom headers with expanded env vars | Header name valid, no injection |
| `timeout` | `number` | ❌ | Request timeout in ms (default: 60000) | Positive integer |
| `debug` | `boolean` | ❌ | Enable debug logging | Boolean |

**State Transitions**: None (immutable after parse)

---

### 2. HTTPProxySession

Runtime state for an active proxy session.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `sessionId` | `string \| null` | ❌ | MCP session ID from server | String if set by server |
| `isActive` | `boolean` | ✅ | Whether session is active | Boolean |
| `requestCount` | `number` | ✅ | Number of requests processed | Non-negative integer |

**State Transitions**:

```
[created] → isActive: true, sessionId: null
   │
   ├── (server returns Mcp-Session-Id) → sessionId: <id>
   │
   └── (SIGINT/SIGTERM) → isActive: false, cleanup triggered
```

---

### 3. ParsedHeader

A single parsed header with environment variable expansion applied.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `name` | `string` | ✅ | Header name (e.g., "Authorization") | Valid HTTP header name |
| `value` | `string` | ✅ | Header value (after env expansion) | Non-empty after expansion (warn if empty) |
| `originalValue` | `string` | ✅ | Original value before expansion | For debug logging |

**Validation Rules**:

- Header name: Match `/^[A-Za-z0-9-]+$/`
- Header value: No CRLF characters (prevent header injection)

---

### 4. JSONRPCMessage (External - MCP Protocol)

Standard JSON-RPC 2.0 message structure. Not defined by this feature but used throughout.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jsonrpc` | `"2.0"` | ✅ | Protocol version |
| `method` | `string` | ✅ (request) | Method name |
| `params` | `object` | ❌ | Method parameters |
| `id` | `string \| number` | ✅ (request/response) | Request ID |
| `result` | `any` | ✅ (success response) | Method result |
| `error` | `JSONRPCError` | ✅ (error response) | Error details |

---

### 5. JSONRPCError (External - MCP Protocol)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `number` | ✅ | Error code (see standard codes) |
| `message` | `string` | ✅ | Human-readable message |
| `data` | `any` | ❌ | Additional error data |

**Standard Codes**:

- `-32700`: Parse error (malformed JSON)
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error (network errors, timeouts)

---

## Relationships

```
HTTPProxyConfig (1) ──────── (1) HTTPProxySession
       │
       │ contains
       ▼
ParsedHeader (0..*)

HTTPProxySession ──processes──> JSONRPCMessage (0..*)
```

---

## Validation Rules Summary

| Entity | Rule | Error Handling |
|--------|------|----------------|
| HTTPProxyConfig.url | Must be valid HTTP/HTTPS URL | Exit with error code 1, clear message |
| HTTPProxyConfig.timeout | Must be positive integer | Default to 60000 if invalid |
| ParsedHeader.name | No special characters | Reject header, warn user |
| ParsedHeader.value | No CRLF injection | Reject header, error |
| JSONRPCMessage | Valid JSON | Return parse error (-32700) |

---

## Notes

- No persistent storage required
- All state is runtime-only
- Session ID is server-managed, client just echoes it back
