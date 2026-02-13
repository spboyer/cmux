# Product Requirements Document: Multi-Repo Workspace Manager

## Overview

An Electron-based application that provides a unified interface for managing multiple workspaces across different repositories, with integrated Copilot agents, file browsing, and editing capabilities.

## Problem Statement

Developers frequently work across multiple repositories simultaneously, requiring them to juggle multiple terminal windows and file explorers. Context switching between repos is cumbersome, and there's no unified way to orchestrate AI agents across a multi-repo workflow.

## Solution

A three-pane desktop application that organizes work by workspace context, allowing users to:
- Manage multiple workspace terminals in one window
- Create AI agents from chat to work autonomously in repositories
- Browse files relative to each workspace's working directory
- Open and view files associated with each workspace context
- Quickly switch between repo contexts with a single click

---

## User Interface

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         Title Bar                                │
├──────────────┬─────────────────────────────┬────────────────────┤
│              │                             │                    │
│   Left Pane  │        Center Pane          │    Right Pane      │
│   (Nav)      │        (Content)            │    (File Tree)     │
│              │                             │                    │
│  ┌─────────┐ │                             │   📁 src/          │
│  │ Term 1  │ │   $ npm run dev             │   ├── 📁 components│
│  │  └─file │ │   Starting server...        │   │   └── App.tsx  │
│  │ Term 2 ◀│ │   Ready on port 3000        │   ├── 📄 index.ts  │
│  │ Term 3  │ │   █                         │   └── 📄 main.ts   │
│  └─────────┘ │                             │                    │
│              │                             │                    │
├──────────────┴─────────────────────────────┴────────────────────┤
│                         Status Bar                               │
└─────────────────────────────────────────────────────────────────┘
```

### Left Pane (Navigation Panel)

**Purpose:** Display all open workspaces, agents, and their associated files in a hierarchical list.

**Features:**
- **"+" button** in the pane header to create a new workspace
- List of all open workspace sessions and chat-created agents
- Each workspace displays its working directory name or custom label
- Files opened from a workspace appear as children under that workspace
- Visual indicator (highlight/arrow) showing the currently active item
- Right-click context menu (context-sensitive):
  
  **On a workspace item:**
  - Rename workspace
  - Close workspace
  - Open new workspace in same directory
  
  **On a file item (nested under workspace):**
  - Close file
  - Copy file path
  - Reveal in file tree (scrolls/highlights in right pane)

**Behavior:**
- Clicking a workspace switches the center pane to that workspace and updates the right pane
- Clicking a file switches the center pane to that file's content
- Drag-and-drop to reorder workspaces (stretch goal)

### Center Pane (Content View)

**Purpose:** Display the active workspace terminal, agent activity feed, or file content.

**Features:**
- **Workspace Mode:**
  - Fully interactive terminal emulator (xterm.js or similar)
  - Support for standard shell features (bash, zsh, PowerShell, cmd)
  - Copy/paste support
  - Scrollback buffer
  - Search within terminal output

- **Agent Mode:**
  - Card-based activity feed showing tool calls and agent reasoning
  - Live status updates as the agent works

- **File Mode:**
  - Syntax-highlighted code viewer
  - Read-only by default (MVP)
  - Line numbers
  - Search within file (Ctrl+F)
  - Future: Edit capability with save

**Behavior:**
- Seamlessly switches between workspace, agent, and file views based on left pane selection
- Maintains workspace state when switching away and back

### Right Pane (File Tree)

**Purpose:** Display the directory structure of the current workspace's working directory.

**Features:**
- Hierarchical tree view of files and folders
- Expand/collapse folders
- File type icons
- Show/hide hidden files toggle
- Search/filter files

**Behavior:**
- Updates automatically when a different workspace is selected in the left pane
- Single-click to preview file (optional)
- Double-click (or single-click, configurable) to open file in center pane
- Opening a file adds it to the left pane under the current workspace
- Right-click context menu for:
  - Open file
  - Open workspace here (creates new workspace at this folder)
  - Copy path
  - Reveal in system file explorer
  - Future: Create/rename/delete files

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New workspace | Ctrl+Shift+T | Cmd+Shift+T |
| Close workspace/file | Ctrl+W | Cmd+W |
| Next workspace | Ctrl+Tab | Cmd+Tab |
| Previous workspace | Ctrl+Shift+Tab | Cmd+Shift+Tab |
| Toggle file tree | Ctrl+B | Cmd+B |
| Focus left pane | Ctrl+1 | Cmd+1 |
| Focus center pane | Ctrl+2 | Cmd+2 |
| Focus right pane | Ctrl+3 | Cmd+3 |
| Find in file | Ctrl+F | Cmd+F |
| Find in terminal | Ctrl+Shift+F | Cmd+Shift+F |

---

## Menu Bar

### File Menu
- New Workspace (opens directory picker)
- New Workspace in... → Recent directories
- Close Workspace
- Close File
- Exit

### View Menu
- Toggle Left Pane
- Toggle Right Pane
- Zoom In / Out / Reset

### Workspace Menu
- Clear Terminal
- Kill Process
- Rename Workspace

---

## Core Features (MVP)

### F1: Workspace Management
- Create new workspace sessions
- Each workspace opens in a user-specified directory
- Close workspace sessions
- Workspace sessions persist their state while app is running

### F2: Multi-Workspace Navigation
- Switch between workspaces via left pane
- Visual indication of active workspace
- Terminal output preserved when switching

### F3: File Tree Browsing
- Display directory tree for current workspace's working directory
- Expand/collapse folders
- Refresh tree

### F4: File Viewing
- Open files from the file tree
- Syntax highlighting for common languages
- Files appear nested under their parent workspace in left pane

### F5: Context Switching
- Clicking a workspace updates both center and right panes
- Clicking a file updates center pane to show file content
- Right pane always reflects the directory of the selected workspace (not the file)

---

## Technical Requirements

### Platform
- **Framework:** Electron
- **Target OS:** Windows, macOS, Linux

### Terminal Emulation
- Use **xterm.js** for terminal rendering within the app
- Use **node-pty** for PTY (pseudo-terminal) backend
- Automatically detect and use the **OS's default shell**:
  - Windows: PowerShell (or cmd as fallback)
  - macOS: zsh (or user's configured shell)
  - Linux: bash (or user's configured shell)
- User's shell configuration (aliases, .bashrc, .zshrc, etc.) is respected
- Note: This is the same approach used by VS Code's integrated terminal

### File Tree
- Native Node.js fs module for directory reading
- Efficient handling of large directories (lazy loading)

### File Viewing
- Monaco Editor (VS Code's editor) or CodeMirror for syntax highlighting
- Support common file types: JS, TS, Python, Go, Rust, JSON, YAML, Markdown, etc.

### State Management
- Track open terminals and their working directories
- Track open files and their parent terminal association
- Persist session state (optional, for restore on restart)

---

## User Stories

### US1: Open Multiple Workspaces
> As a developer, I want to open multiple workspaces in different repo directories so that I can run different services simultaneously.

### US2: Switch Repo Context
> As a developer, I want to click a workspace in the left pane and have the file tree update to that repo so that I can quickly browse files in the correct context.

### US3: Open Files from Tree
> As a developer, I want to click a file in the tree view and see its contents in the center pane so that I can quickly reference code without leaving the app.

### US4: Track Open Files
> As a developer, I want to see which files I have open under each workspace so that I can quickly navigate back to files I was looking at.

### US5: Close Items
> As a developer, I want to close workspaces and files I no longer need so that my workspace stays organized.

---

## Future Enhancements (Post-MVP)

### Phase 2
- [ ] File editing with save
- [ ] Split center pane (side-by-side terminals or files)
- [ ] Tabs in center pane for multiple files
- [ ] Terminal search (find in scrollback)
- [ ] Keyboard shortcuts for all actions

### Phase 3
- [ ] Session persistence (restore workspaces on app restart)
- [ ] Workspace presets (save/load sets of workspaces)
- [ ] Git integration (branch indicator, status)
- [ ] Customizable themes
- [ ] Plugin system

### Phase 4
- [ ] Remote terminal support (SSH)
- [ ] Integrated diff viewer
- [ ] File change watching (auto-refresh tree)

---

## Success Metrics

- User can create and manage 5+ workspaces without performance degradation
- Context switch (workspace to workspace) feels instant (<100ms perceived)
- File tree loads directories with 1000+ files without blocking UI
- App startup time < 3 seconds

---

## Open Questions

1. Should files remember scroll position when switching away and back?
2. Should we support dragging a file from one terminal's context to another?
3. Default shell detection vs. user configuration?
4. Should the right pane file tree stay synced if the terminal's working directory changes (e.g., user runs `cd`)?

---

## Appendix

### Terminology
- **Workspace:** A PTY terminal session and its associated working directory, created via the `+` button
- **Agent:** An AI-powered session created from Copilot Chat that works autonomously in a repository
- **Subagent:** An internal sub-task spawned by the SDK within an agent session
- **Active Item:** The currently selected workspace, agent, or file shown in the center pane
- **Parent Workspace:** The workspace under which a file was opened (determines its context)
