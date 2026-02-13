# Implementation Plan: Multi-Repo Workspace Manager MVP

## Overview

Build an Electron app with a three-pane layout for managing multiple workspaces across repositories with integrated file browsing and AI agents.

**Tech Stack:**
- Electron + Electron Forge
- React + TypeScript
- xterm.js + node-pty (terminal)
- Monaco Editor (file viewer)

**Testing Stack:**
- Jest + ts-jest (unit tests)
- React Testing Library (component tests)
- Playwright (integration/E2E tests for Electron)

---

## Testing Strategy

| Layer | Tool | What to Test |
|-------|------|--------------|
| Unit | Jest | Pure functions, state reducers, utilities, services (mocked IO) |
| Component | React Testing Library | Component rendering, user interactions, state changes |
| Integration | Playwright | Full app flows, IPC communication, workspace + file tree interaction |

**TDD Approach:**
- Write tests FIRST for state management, services, and component behavior
- Use integration tests for hard-to-unit-test areas (xterm.js rendering, Monaco, IPC)
- Mocking strategy: Mock IPC in renderer tests, mock node-pty/fs in main process tests

---

## Workplan

### Phase 1: Project Setup ✅
- [x] Initialize Electron Forge project with React + TypeScript template
- [x] Configure project structure (main process, renderer, preload)
- [x] Install core dependencies (xterm.js, Monaco Editor, React)
- [x] **Install testing dependencies (Jest, ts-jest, React Testing Library, Playwright)**
- [x] **Configure Jest for renderer**
- [x] **Configure Playwright for Electron**
- [x] Set up IPC communication pattern between main and renderer
- [x] **Write smoke test: app launches successfully**
- [x] Verify basic Electron app launches

> **Note:** node-pty deferred due to Windows Spectre library build issues. Will address in Phase 3.

### Phase 2: Core Layout & State Management ✅
- [x] **TDD: Write tests for app state reducer** ✅ 16 tests
- [x] Implement app state reducer to pass tests
- [x] **TDD: Write tests for state selectors**
- [x] Implement state selectors to pass tests
- [x] Create state context provider (AppStateProvider, useAppState)
- [x] **Write component tests for ThreePaneLayout** ✅ 3 tests
- [x] Create three-pane layout component (Left, Center, Right)
- [x] **Write component tests for LeftPane** ✅ 7 tests
- [x] Build LeftPane component with workspace/file list

### Phase 3: Workspace Integration (F1, F2) - In Progress
- [x] AgentService in main process (child_process fallback - pty needs Spectre libs)
- [x] Set up workspace IPC handlers
- [x] **Write component tests for WorkspaceItem** (covered in LeftPane tests)
- [x] Implement WorkspaceItem component (integrated in LeftPane)
- [x] Create xterm.js wrapper component (AgentView)
- [x] Connect xterm.js to workspace via IPC
- [x] **Write component tests for "+" button** (covered in LeftPane tests)
- [x] Add "+" button to create new workspace (with directory picker)
- [x] Display workspaces in left pane list
- [x] Implement workspace selection (click to switch)
- [x] Workspace state preserved when switching (hidden/shown, not destroyed)
- [x] Add close workspace functionality (right-click context menu)
- [x] Auto-open default workspace on app launch (user's home directory)

### Phase 4: File Tree (F3) - Next
- [ ] **TDD: Write tests for FileService.readDirectory (returns sorted files/folders, handles errors)**
- [ ] Implement FileService in main process
- [ ] **TDD: Write tests for file tree data transformation (flat list → tree structure)**
- [ ] Implement tree data utilities
- [ ] **Write component tests for FileTree (renders nodes, expand/collapse, click handlers)**
- [ ] Build file tree React component with expand/collapse
- [ ] Add file/folder icons
- [ ] Connect file tree to current workspace's working directory via IPC
- [ ] **Integration test: Switch workspace → file tree updates to new cwd**
- [ ] Implement right-click context menu (Open file, Copy path)

### Phase 5: File Viewing (F4)
- [ ] **TDD: Write tests for FileService.readFile (returns content, handles errors, binary detection)**
- [ ] Implement file reading in FileService
- [ ] Create Monaco Editor wrapper component (integration test only)
- [ ] **Write component tests for FileItem in left pane (renders name, active state, close button)**
- [ ] Implement FileItem component
- [ ] **TDD: Write tests for state logic: opening file adds to workspace's openFiles**
- [ ] Handle file opening from tree (click → load in center pane)
- [ ] Add opened files as children under workspace in left pane
- [ ] **Write component tests for CenterPane (switches between workspace and file views)**
- [ ] Switch center pane between workspace and file views
- [ ] **Integration test: Click file in tree → file opens in center → appears in left pane**
- [ ] Implement close file functionality
- [ ] **Integration test: Close file → removed from left pane → returns to workspace view**

### Phase 6: Context Switching & Polish (F5)
- [ ] **Integration test: Click workspace → center pane shows workspace AND file tree updates**
- [ ] Ensure clicking workspace updates center pane AND file tree
- [ ] **Integration test: Click file → center pane shows file, file tree stays on workspace's dir**
- [ ] Ensure clicking file updates center pane only (tree stays on workspace's directory)
- [ ] Add visual indicator for active item in left pane
- [ ] **Integration test: Keyboard shortcuts trigger correct actions**
- [ ] Implement basic keyboard shortcuts (Ctrl+Shift+T, Ctrl+W)
- [ ] Add basic menu bar (File → New Workspace, Exit)
- [ ] Basic styling/theming (dark theme)

### Phase 7: Testing & Packaging
- [ ] Run full test suite, ensure all pass
- [ ] Manual exploratory testing of all MVP features
- [ ] Fix critical bugs (with regression tests)
- [ ] Configure Electron Forge for packaging
- [ ] Build distributables for Windows (primary), macOS, Linux
- [ ] **Smoke test packaged app on each platform**

---

## Project Structure

```
multi-repo-workspace/
├── package.json
├── forge.config.ts
├── tsconfig.json
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry, window creation
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── agent.ts         # Workspace PTY management
│   │   │   └── filesystem.ts    # File tree & file reading
│   │   └── services/
│   │       ├── AgentService.ts
│   │       └── FileService.ts
│   ├── preload/
│   │   └── index.ts             # Preload script, expose APIs
│   ├── renderer/                # React app
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── ThreePaneLayout.tsx
│   │   │   │   └── ResizableDivider.tsx
│   │   │   ├── LeftPane/
│   │   │   │   ├── LeftPane.tsx
│   │   │   │   ├── WorkspaceItem.tsx
│   │   │   │   └── FileItem.tsx
│   │   │   ├── CenterPane/
│   │   │   │   ├── CenterPane.tsx
│   │   │   │   ├── AgentView.tsx
│   │   │   │   └── FileView.tsx
│   │   │   └── RightPane/
│   │   │       ├── RightPane.tsx
│   │   │       └── FileTree.tsx
│   │   ├── contexts/
│   │   │   └── AppStateContext.tsx
│   │   ├── hooks/
│   │   │   ├── useTerminal.ts
│   │   │   └── useFileTree.ts
│   │   └── styles/
│   │       └── global.css
│   └── shared/
│       └── types.ts             # Shared TypeScript types
└── resources/                   # Icons, assets
```

---

## State Shape

```typescript
interface AppState {
  agents: Agent[];               // workspaces + agents share this type
  activeItemId: string | null;   // workspace, agent, or file ID
  activeAgentId: string | null;  // for file tree context
}

interface Agent {
  id: string;
  label: string;
  cwd: string;
  openFiles: OpenFile[];
  hasSession?: boolean;          // true = chat-created agent, false/undefined = workspace
}

interface OpenFile {
  id: string;
  path: string;
  name: string;
  parentAgentId: string;
}
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| electron | Desktop app framework |
| @electron-forge/* | Build tooling |
| react, react-dom | UI framework |
| typescript | Type safety |
| xterm, xterm-addon-fit | Terminal UI |
| node-pty | PTY backend |
| monaco-editor | Code viewer |
| jest, ts-jest | Unit testing |
| @testing-library/react | Component testing |
| playwright, electron | E2E/integration testing |

---

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:create` | renderer → main | Spawn new workspace terminal |
| `terminal:write` | renderer → main | Send input to workspace |
| `terminal:resize` | renderer → main | Resize workspace terminal |
| `terminal:kill` | renderer → main | Close workspace |
| `terminal:data` | main → renderer | Terminal output |
| `fs:readdir` | renderer → main | Get directory contents |
| `fs:readfile` | renderer → main | Get file contents |
| `dialog:openDirectory` | renderer → main | Open folder picker |

---

## Notes & Risks

1. **node-pty native module** - Requires rebuild for Electron. Electron Forge handles this, but watch for issues.
2. **Monaco Editor bundle size** - Large; consider lazy loading.
3. **Workspace state preservation** - xterm.js maintains buffer; just hide/show, don't destroy.
4. **Cross-platform shells** - Test shell detection on all platforms.
5. **Testing xterm.js/Monaco** - These are hard to unit test; rely on integration tests for rendering verification.
6. **IPC mocking** - Create mock preload API for renderer component tests.

---

## Test File Structure

```
src/
├── main/
│   ├── services/
│   │   ├── AgentService.ts
│   │   ├── AgentService.test.ts    # Unit tests with mocked node-pty
│   │   ├── FileService.ts
│   │   └── FileService.test.ts        # Unit tests with mocked fs
├── renderer/
│   ├── contexts/
│   │   ├── AppStateContext.tsx
│   │   └── AppStateContext.test.tsx   # Reducer & selector tests
│   ├── components/
│   │   ├── LeftPane/
│   │   │   ├── LeftPane.tsx
│   │   │   └── LeftPane.test.tsx
│   │   ├── CenterPane/
│   │   │   ├── CenterPane.tsx
│   │   │   └── CenterPane.test.tsx
│   │   └── RightPane/
│   │       ├── FileTree.tsx
│   │       └── FileTree.test.tsx
│   └── test/
│       └── mocks/
│           └── electronApi.ts          # Mock IPC for renderer tests
tests/
└── e2e/
    ├── app.spec.ts                     # Smoke tests
    ├── workspace.spec.ts               # Workspace flow tests
    └── fileTree.spec.ts                # File browsing tests
```

---

## Out of Scope (MVP)

- File editing/saving
- Session persistence
- Split panes/tabs
- Git integration
- Themes/customization
- Keyboard shortcuts beyond basics
- Chat-driven agents (post-MVP feature)
