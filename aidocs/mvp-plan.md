# Implementation Plan: Multi-Repo Terminal Manager MVP

## Overview

Build an Electron app with a three-pane layout for managing multiple terminal sessions across repositories with integrated file browsing.

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
| Integration | Playwright | Full app flows, IPC communication, terminal + file tree interaction |

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

### Phase 2: Core Layout & State Management (In Progress)
- [x] **TDD: Write tests for app state reducer (add terminal, remove terminal, set active, add file, remove file)** ✅ 16 tests
- [x] Implement app state reducer to pass tests
- [x] **TDD: Write tests for state selectors (getActiveTerminal, getActiveItem, getFilesForTerminal)**
- [x] Implement state selectors to pass tests
- [ ] Create state context provider
- [ ] **Write component tests for ThreePaneLayout (renders three sections)**
- [ ] Create three-pane layout component (Left, Center, Right)
- [ ] Implement resizable pane dividers
- [ ] **Write component tests for LeftPane (renders terminal list, handles clicks)**
- [ ] Build basic left pane component (empty list initially)

### Phase 3: Terminal Integration (F1, F2)
- [ ] **TDD: Write tests for TerminalService (spawn, write, resize, kill) with mocked node-pty**
- [ ] Implement TerminalService in main process
- [ ] Set up node-pty IPC handlers
- [ ] **Write component tests for TerminalItem (renders label, active state, click handler)**
- [ ] Implement TerminalItem component
- [ ] Create xterm.js wrapper component (integration test only - hard to unit test)
- [ ] Connect xterm.js to node-pty via IPC
- [ ] **Write component tests for "+" button (calls create handler)**
- [ ] Add "+" button to create new terminal (with directory picker)
- [ ] Display terminals in left pane list
- [ ] **Integration test: Create terminal → appears in list → shows in center pane**
- [ ] Implement terminal selection (click to switch)
- [ ] Preserve terminal state when switching between terminals
- [ ] **Write component tests for context menu (renders options, calls handlers)**
- [ ] Add close terminal functionality (right-click menu)
- [ ] Auto-open default terminal on app launch (user's home directory)
- [ ] **Integration test: Close terminal → removed from list → next terminal selected**

### Phase 4: File Tree (F3)
- [ ] **TDD: Write tests for FileService.readDirectory (returns sorted files/folders, handles errors)**
- [ ] Implement FileService in main process
- [ ] **TDD: Write tests for file tree data transformation (flat list → tree structure)**
- [ ] Implement tree data utilities
- [ ] **Write component tests for FileTree (renders nodes, expand/collapse, click handlers)**
- [ ] Build file tree React component with expand/collapse
- [ ] Add file/folder icons
- [ ] Connect file tree to current terminal's working directory via IPC
- [ ] **Integration test: Switch terminal → file tree updates to new cwd**
- [ ] Implement right-click context menu (Open file, Copy path)

### Phase 5: File Viewing (F4)
- [ ] **TDD: Write tests for FileService.readFile (returns content, handles errors, binary detection)**
- [ ] Implement file reading in FileService
- [ ] Create Monaco Editor wrapper component (integration test only)
- [ ] **Write component tests for FileItem in left pane (renders name, active state, close button)**
- [ ] Implement FileItem component
- [ ] **TDD: Write tests for state logic: opening file adds to terminal's openFiles**
- [ ] Handle file opening from tree (click → load in center pane)
- [ ] Add opened files as children under terminal in left pane
- [ ] **Write component tests for CenterPane (switches between terminal and file views)**
- [ ] Switch center pane between terminal and file views
- [ ] **Integration test: Click file in tree → file opens in center → appears in left pane**
- [ ] Implement close file functionality
- [ ] **Integration test: Close file → removed from left pane → returns to terminal view**

### Phase 6: Context Switching & Polish (F5)
- [ ] **Integration test: Click terminal → center pane shows terminal AND file tree updates**
- [ ] Ensure clicking terminal updates center pane AND file tree
- [ ] **Integration test: Click file → center pane shows file, file tree stays on terminal's dir**
- [ ] Ensure clicking file updates center pane only (tree stays on terminal's directory)
- [ ] Add visual indicator for active item in left pane
- [ ] **Integration test: Keyboard shortcuts trigger correct actions**
- [ ] Implement basic keyboard shortcuts (Ctrl+Shift+T, Ctrl+W)
- [ ] Add basic menu bar (File → New Terminal, Exit)
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
multi-repo-terminal/
├── package.json
├── forge.config.ts
├── tsconfig.json
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry, window creation
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── terminal.ts      # node-pty management
│   │   │   └── filesystem.ts    # File tree & file reading
│   │   └── services/
│   │       ├── TerminalService.ts
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
│   │   │   │   ├── TerminalItem.tsx
│   │   │   │   └── FileItem.tsx
│   │   │   ├── CenterPane/
│   │   │   │   ├── CenterPane.tsx
│   │   │   │   ├── TerminalView.tsx
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
  terminals: Terminal[];
  activeItemId: string | null;  // terminal or file ID
  activeTerminalId: string | null;  // for file tree context
}

interface Terminal {
  id: string;
  label: string;
  cwd: string;
  openFiles: OpenFile[];
}

interface OpenFile {
  id: string;
  path: string;
  name: string;
  parentTerminalId: string;
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
| `terminal:create` | renderer → main | Spawn new terminal |
| `terminal:write` | renderer → main | Send input to terminal |
| `terminal:resize` | renderer → main | Resize terminal |
| `terminal:kill` | renderer → main | Close terminal |
| `terminal:data` | main → renderer | Terminal output |
| `fs:readdir` | renderer → main | Get directory contents |
| `fs:readfile` | renderer → main | Get file contents |
| `dialog:openDirectory` | renderer → main | Open folder picker |

---

## Notes & Risks

1. **node-pty native module** - Requires rebuild for Electron. Electron Forge handles this, but watch for issues.
2. **Monaco Editor bundle size** - Large; consider lazy loading.
3. **Terminal state preservation** - xterm.js maintains buffer; just hide/show, don't destroy.
4. **Cross-platform shells** - Test shell detection on all platforms.
5. **Testing xterm.js/Monaco** - These are hard to unit test; rely on integration tests for rendering verification.
6. **IPC mocking** - Create mock preload API for renderer component tests.

---

## Test File Structure

```
src/
├── main/
│   ├── services/
│   │   ├── TerminalService.ts
│   │   ├── TerminalService.test.ts    # Unit tests with mocked node-pty
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
    ├── terminal.spec.ts                # Terminal flow tests
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
