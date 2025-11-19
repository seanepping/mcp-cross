<!--
Sync Impact Report:
- Version change: 0.0.0 -> 1.0.0
- Modified principles:
  - Added: Cross-Platform Interoperability
  - Added: Mandatory Agent Protocol
  - Added: Memory-Driven Development
  - Added: Behavior-Driven Development (BDD)
  - Added: Value-Slice Delivery
- Added sections: Technology Standards, Development Workflow
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
- Follow-up TODOs: None
-->

# mcp-cross Constitution

## Core Principles

### I. Cross-Platform Interoperability

The system MUST seamlessly bridge Windows and WSL environments. Path translation (Windows <-> WSL) and process management MUST handle OS differences transparently to the user and the MCP client.

### II. Mandatory Agent Protocol

All AI agents working in this repository MUST follow the protocol defined in `AGENTS.md`: Initialize Context, Set Focus, Check Memory, and Store New Knowledge. This ensures session continuity and context preservation.

### III. Memory-Driven Development

Development MUST utilize `ghostis-brain` for persistent context. Architectural decisions, complex fixes, and session summaries MUST be recorded using `remember_this` to ensure continuity across sessions and environments.

### IV. Behavior-Driven Development (BDD)

Define behavior with tests/specs before implementation where possible. Quality gates (linting, testing, documentation) MUST be updated and passed with every change.

### V. Value-Slice Delivery

Work MUST be broken into small, working increments rather than large batches. Prioritize deliverable value and working software over comprehensive but incomplete features.

## Technology Standards

The project is a Node.js-based CLI tool. It MUST adhere to the Model Context Protocol (MCP) standards. Code should be written in modern JavaScript/Node.js, maintaining compatibility with recent LTS versions.

## Development Workflow

Follow the Ghostis Workflow as detailed in `AGENTS.md`. Agents must use the provided tools (`get_current_context`, `recall_memory`, `remember_this`, `set_focus`) to manage their lifecycle and state.

## Governance

This Constitution supersedes all other practices. Amendments require documentation and justification.
All PRs and code reviews must verify compliance with these principles.
Use `AGENTS.md` for specific runtime guidance for AI agents.

**Version**: 1.0.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-11-19
