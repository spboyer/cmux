---
target:
  - src/main/services/FileService.ts
  - src/main/ipc/files.ts
  - src/preload.ts
  - src/shared/types.ts
  - src/renderer/contexts/agentReducer.ts
  - src/renderer/contexts/AppStateContext.tsx
  - src/renderer/hooks/useDirectoryLoader.ts
  - src/renderer/components/RightPane/FileTree.tsx
  - src/renderer/components/RightPane/RightPane.tsx
  - src/main/services/SessionService.ts
  - src/renderer/hooks/useSessionRestore.ts
---
# Toggle Hidden Files in Workspace File View

## Default Behavior

### Dotfiles are hidden by default

A clean, uncluttered file tree is the default experience. New users and fresh sessions should never see dotfiles (`.git/`, `.env/`, `.copilot/`) unless they explicitly ask for them. This prevents confusion and keeps the workspace focused on source files.

```
Given the src/main/services/FileService.ts file
When readDirectory is called without a showHidden option (or with showHidden false)
Then entries whose names start with "." are filtered out of the results
```

### AppState defaults to hidden files off

The initial application state must hide dotfiles without any user action. A fresh install with no saved preferences should behave identically to the current behavior — no regression.

```
Given the src/shared/types.ts and src/renderer/contexts/AppStateContext.tsx files
Then AppState includes a showHiddenFiles field of type boolean
And the initial state sets showHiddenFiles to false
```

## Toggle UI

### Toggle button exists in the Explorer pane header

Developers frequently need to inspect or edit dotfiles (`.env`, `.gitignore`, `.github/workflows/`) but don't want them visible all the time. The toggle must be directly in the Explorer pane header — not buried in a settings menu or modal — so it's one click away when needed.

```
Given the src/renderer/components/RightPane/RightPane.tsx file
Then a toggle button is rendered in the Files pane header alongside the existing refresh button
And the button dispatches a SET_SHOW_HIDDEN_FILES action when clicked
And the button icon changes based on the current showHiddenFiles state (e.g., eye vs eye-closed)
```

### Toggling refreshes the file tree immediately

When a user clicks the toggle, dotfiles must appear or disappear without requiring a manual refresh or page reload. Immediate feedback is essential so users trust the toggle is working.

```
Given the src/renderer/components/RightPane/RightPane.tsx and src/renderer/components/RightPane/FileTree.tsx files
When the SET_SHOW_HIDDEN_FILES action is dispatched
Then the file tree re-renders to reflect the new visibility state without a full page reload
```

## State Management

### SET_SHOW_HIDDEN_FILES action updates state

The reducer must handle the toggle action so the UI and data-fetching layer stay in sync. Without this wiring, clicking the button would do nothing.

```
Given the src/renderer/contexts/agentReducer.ts file
When a SET_SHOW_HIDDEN_FILES action is dispatched with payload { show: true }
Then the reducer returns state with showHiddenFiles set to true
And when dispatched with { show: false } it returns showHiddenFiles set to false
```

## Data Path

### FileService accepts showHidden parameter

The main-process file service must conditionally filter dotfiles based on the caller's preference. Keeping the filter server-side avoids sending unnecessary data over IPC.

```
Given the src/main/services/FileService.ts file
When readDirectory is called with showHidden set to true
Then all entries including dotfiles are returned
And when showHidden is false or omitted, dotfiles are filtered out
```

### IPC layer passes showHidden through

The IPC channel must forward the showHidden preference from renderer to main process. A break here would silently ignore the user's toggle.

```
Given the src/main/ipc/files.ts and src/preload.ts files
Then the fs:readDirectory IPC channel accepts an optional showHidden boolean parameter
And the preload bridge's fs.readDirectory function accepts an optional showHidden parameter
And callers that omit the parameter get the default hide behavior (backward compatible)
```

### useDirectoryLoader passes showHidden to the API

The renderer's directory-loading hook must thread the preference through to every readDirectory call. If this link is missing, the toggle has no effect on actual file loading.

```
Given the src/renderer/hooks/useDirectoryLoader.ts file
Then it accepts a showHidden parameter
And passes it to every electronAPI.fs.readDirectory call
```

## Persistence

### Toggle preference persists across app restarts

If a user enables hidden files, that choice should persist. Forcing them to re-enable it every session would be frustrating, especially for users who routinely work with config files.

```
Given the src/main/services/SessionService.ts and src/renderer/hooks/useSessionRestore.ts files
Then SessionService includes showHiddenFiles in the persisted session data
And useSessionRestore dispatches SET_SHOW_HIDDEN_FILES with the saved value on load
```

### Session migration preserves existing behavior

Upgrading from a previous session version (before this feature existed) must default to hidden files off, preserving the current behavior. A bad migration could unexpectedly show dotfiles to every existing user.

```
Given the src/main/services/SessionService.ts file
When session data from a previous version (without showHiddenFiles) is loaded
Then it migrates to include showHiddenFiles defaulting to false
```

## Backward Compatibility

### No breaking changes to existing callers

This feature adds new capability without disturbing anything that already works. Existing IPC callers and session data must continue to function identically.

```
Given the src/main/ipc/files.ts and src/preload.ts files
When fs.readDirectory is called without the showHidden parameter
Then dotfiles are filtered out (same as current behavior)
Because the parameter is optional with a false default
```
