# Analysis: Toggle Hidden Files in Workspace File View

## Executive Summary

The file tree in cmux's Explorer (right pane) currently **hard-filters** hidden files at the main-process level in `FileService.readDirectory()` (line 35: `.filter(entry => !entry.name.startsWith('.'))`). There is no mechanism for the renderer to request hidden files, no UI toggle, and no persisted preference. This feature adds a show/hide toggle that flows from UI → IPC → FileService, with persistence via SessionService or localStorage.

## Architecture Comparison

### Current
```
FileService.readDirectory()
  → always filters .dotfiles
  → returns only visible entries
Renderer (FileTree/useDirectoryLoader)
  → receives pre-filtered entries
  → no awareness of hidden files
```

### Target
```
FileService.readDirectory(dirPath, { showHidden })
  → conditionally filters dotfiles based on showHidden flag
  → returns entries accordingly
IPC (fs:readDirectory)
  → passes showHidden option through
Preload (electronAPI.fs.readDirectory)
  → accepts optional showHidden parameter
useDirectoryLoader
  → passes showHidden from app state
RightPane
  → toggle button in header
  → dispatches action to update showHidden
AppState
  → new showHiddenFiles: boolean field
SessionService
  → persists showHiddenFiles across restarts
```

## Pattern Mapping from Existing Codebase

| Pattern | Example | Apply To |
|---------|---------|----------|
| AppState field + AppAction | `viewMode` / `SET_VIEW_MODE` | `showHiddenFiles` / `SET_SHOW_HIDDEN_FILES` |
| Pane header toolbar button | Refresh button in RightPane (line 196-203) | Toggle hidden files button |
| IPC `domain:action` convention | `fs:readDirectory` | Same channel, add optional param |
| Session persistence | `SessionData` v4 fields | Add `showHiddenFiles` to v5 |
| Icon component | `<Icon name="refresh" size="sm" />` | `<Icon name="eye" />` / `<Icon name="eye-closed" />` |

## What Exists vs What's Needed

### Exists
- `FileService.readDirectory()` with hard-coded dotfile filter
- `useDirectoryLoader` hook calling `electronAPI.fs.readDirectory(dirPath)`
- RightPane with header toolbar (refresh button)
- AppState/AppAction discriminated union pattern
- SessionService with versioned migrations (currently v4)
- Icon component with codicon support

### Needed
- `FileService.readDirectory()` accepts `showHidden` option
- IPC channel passes `showHidden` through
- Preload API updated with optional parameter
- New `showHiddenFiles` field in AppState (default: `false`)
- New `SET_SHOW_HIDDEN_FILES` action
- Toggle button in RightPane header
- SessionService v5 migration adding `showHiddenFiles`
- Update all tests

## Key Insights

### What Works Well
- The filter logic is centralized in one place (`FileService.readDirectory` line 35)
- The IPC pattern is clean and consistent — adding an optional param is straightforward
- SessionService has a well-established migration pattern (v1→v2→v3→v4)

### Gaps/Limitations
- The filter is server-side only, so we must pass the preference through IPC
- Windows "hidden attribute" files (non-dotfiles) are NOT detected by the current `startsWith('.')` check — the issue mentions this but implementing OS-level hidden attribute detection adds complexity
- No existing "settings" or "preferences" UI — this toggle lives in the pane header

### Design Decision: Where to Filter
- **Keep filtering in FileService (main process)** — avoids sending unnecessary data over IPC, consistent with current architecture
- Alternative (filter in renderer) would require sending all files always — rejected for performance
