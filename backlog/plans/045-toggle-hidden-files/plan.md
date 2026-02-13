# Implementation Plan: Toggle Hidden Files

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Renderer                          │
│                                                      │
│  RightPane                                           │
│  ┌──────────────────────────┐                        │
│  │ [Files] [👁 Toggle] [↻]  │  ← toggle button      │
│  │                          │                        │
│  │  FileTree                │                        │
│  │   └─ useDirectoryLoader ─┼──→ electronAPI         │
│  │      (passes showHidden) │     .fs.readDirectory  │
│  └──────────────────────────┘     (dirPath, show)    │
│                                                      │
│  AppState { showHiddenFiles: boolean }               │
│  AppAction: SET_SHOW_HIDDEN_FILES                    │
│                                                      │
├──────────────── IPC ─────────────────────────────────┤
│                                                      │
│  fs:readDirectory(dirPath, showHidden?)              │
│                                                      │
├─────────────────────────────────────────────────────┤
│                    Main Process                      │
│                                                      │
│  FileService.readDirectory(dirPath, { showHidden })  │
│   → conditionally filters dotfiles                   │
│                                                      │
│  SessionService v5                                   │
│   → persists showHiddenFiles                         │
└─────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `FileService` | Accept `showHidden` option, conditionally filter dotfiles |
| `files.ts` (IPC) | Pass `showHidden` param through to FileService |
| `preload.ts` | Add optional `showHidden` param to `fs.readDirectory` |
| `types.ts` | Add `showHiddenFiles` to AppState, `SET_SHOW_HIDDEN_FILES` to AppAction |
| `agentReducer.ts` | Handle `SET_SHOW_HIDDEN_FILES` action |
| `useDirectoryLoader.ts` | Accept and pass `showHidden` to API calls |
| `FileTree.tsx` | Accept and forward `showHiddenFiles` prop |
| `RightPane.tsx` | Toggle button, dispatch action, pass to FileTree |
| `SessionService.ts` | v4→v5 migration, persist `showHiddenFiles` |
| `useSessionRestore.ts` | Restore `showHiddenFiles` from session |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/main/services/FileService.ts` | MODIFY | Add `showHidden` option to `readDirectory` |
| `src/main/ipc/files.ts` | MODIFY | Pass `showHidden` through IPC |
| `src/preload.ts` | MODIFY | Add optional param to `fs.readDirectory` |
| `src/shared/types.ts` | MODIFY | Add state field and action |
| `src/renderer/contexts/agentReducer.ts` | MODIFY | Handle new action |
| `src/renderer/hooks/useDirectoryLoader.ts` | MODIFY | Accept `showHidden` param |
| `src/renderer/components/RightPane/FileTree.tsx` | MODIFY | Accept `showHiddenFiles` prop |
| `src/renderer/components/RightPane/RightPane.tsx` | MODIFY | Add toggle button |
| `src/main/services/SessionService.ts` | MODIFY | v5 migration |
| `src/main/ipc/session.ts` | MODIFY | Pass `showHiddenFiles` if needed |
| `src/renderer/hooks/useSessionRestore.ts` | MODIFY | Restore preference |
| `src/main/services/FileService.test.ts` | MODIFY | Test showHidden param |
| `src/renderer/hooks/useDirectoryLoader.test.ts` | MODIFY | Test showHidden param |
| `src/main/services/SessionService.test.ts` | MODIFY | Test v5 migration |
| `src/renderer/components/RightPane/RightPane.test.tsx` | MODIFY | Test toggle button |

## Key Design Decisions

1. **Filter in main process, not renderer** — Avoids sending unnecessary file data over IPC. Consistent with existing pattern.

2. **Global preference, not per-workspace** — Simpler implementation. The `showHiddenFiles` lives in AppState (global), not per-agent. Can be extended later.

3. **Session persistence, not localStorage** — Follows existing pattern (agentNotes, activeConversationId). Requires SessionService v5 migration.

4. **Optional IPC parameter** — Backward-compatible. Existing code that doesn't pass `showHidden` gets default `false` behavior.

5. **Trigger full refresh on toggle** — Simplest approach. Bumps `refreshTrigger` to reload all expanded directories.

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing callers | Optional param with `false` default |
| Session migration failure | Default `showHiddenFiles: false` preserves current behavior |
| Missing icon | Verify codicon availability; fall back to text |
