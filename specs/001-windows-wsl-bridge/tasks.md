# Tasks: Windows to WSL Bridge

**Input**: Design documents from `/specs/001-windows-wsl-bridge/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `src/lib/` directory and `src/lib/wsl-bridge.js` module skeleton

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Refactor `src/index.js` to support modular bridge logic (prepare for delegation to `wsl-bridge.js`)

**Checkpoint**: Foundation ready - user story implementation can now begin

## Phase 3: User Story 1 - Launch WSL MCP Server from Windows (Priority: P1) 🎯 MVP

**Goal**: Enable launching a process inside WSL from Windows with stdio piping.

**Independent Test**: Run `mcp-cross --wsl echo "Hello"` from Windows and verify output.

### Implementation for User Story 1

- [x] T003 [US1] Implement `detectWSL` (check if on Windows) and `getWSLCommand` in `src/lib/wsl-bridge.js`
- [x] T004 [US1] Update `src/index.js` to parse `--wsl` flag and delegate execution to `wsl-bridge.js`
- [x] T005 [US1] Implement process spawning and stdio piping for `wsl.exe` in `src/lib/wsl-bridge.js`
- [x] T013 [US1] Implement signal propagation (SIGINT, SIGTERM) in `src/lib/wsl-bridge.js`

**Checkpoint**: User Story 1 should be fully functional (launching commands without path translation)

## Phase 4: User Story 2 - Automatic Path Translation (Priority: P1)

**Goal**: Automatically translate Windows paths in arguments to WSL paths.

**Independent Test**: Run `mcp-cross --wsl cat C:\test.txt` and verify it reads the file.

### Implementation for User Story 2

- [x] T006 [US2] Implement `resolveRelativePath` in `src/lib/wsl-bridge.js` to convert relative paths to absolute Windows paths
- [x] T007 [US2] Implement `translateWindowsPathToWSL` in `src/lib/wsl-bridge.js` using the heuristic strategy (drive letter conversion)
- [x] T008 [US2] Implement argument parsing loop in `src/lib/wsl-bridge.js` to identify and translate paths before spawning

**Checkpoint**: User Stories 1 AND 2 should both work independently

## Phase 5: User Story 3 - Configurable Distribution (Priority: P2)

**Goal**: Allow selecting a specific WSL distribution.

**Independent Test**: Run `mcp-cross --wsl --distro Debian uname -a` and verify distro name.

### Implementation for User Story 3

- [x] T009 [US3] Update `src/index.js` to parse `--distro` flag and pass to bridge
- [x] T010 [US3] Update `getWSLCommand` in `src/lib/wsl-bridge.js` to inject `-d <distro>` into `wsl.exe` arguments

**Checkpoint**: All user stories should now be independently functional

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T011 Update `README.md` with new usage instructions and examples
- [x] T012 Add unit tests for path translation logic in `test.js`
