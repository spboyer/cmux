# Research: Toggle Hidden Files

## Conformance Analysis

### Platform Hidden File Conventions

| Platform | Convention | Current Support |
|----------|-----------|----------------|
| macOS/Linux | Files/dirs starting with `.` | ✅ Current filter handles this |
| Windows | `FILE_ATTRIBUTE_HIDDEN` flag | ❌ Not detected |
| Cross-platform | Dotfiles (`.git`, `.env`, etc.) | ✅ Works everywhere |

### Decision
For v1, use dotfile convention only (`.` prefix). This is consistent with VS Code, most file managers, and covers the primary use case. Windows hidden attribute support can be added later.

## Existing Patterns in Similar Apps

### VS Code
- Files → Preferences → `files.exclude` patterns
- Toggle via explorer context menu
- Per-workspace settings

### Terminal file managers (lf, ranger)
- Toggle with `zh` or `.` key
- Session-only preference

### cmux approach
- Simpler: single toggle button in pane header
- Persisted in session data (like other cmux preferences)
- Global, not per-workspace

## Electron IPC Optional Parameter Pattern

The `fs:readDirectory` IPC channel currently takes a single `dirPath` argument. Adding an optional second argument is safe:

```typescript
// Before
ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => ...)

// After  
ipcMain.handle('fs:readDirectory', async (_event, dirPath: string, showHidden?: boolean) => ...)
```

This is backward-compatible — existing callers that don't pass the second arg get `undefined`, which we default to `false`.

## Recommendations

### Critical
1. Keep filtering in main process (FileService) — don't send unnecessary data over IPC
2. Default to `false` to preserve current behavior
3. Use session migration pattern (v4→v5)

### Minor
4. Use `eye`/`eye-closed` codicons for visual clarity
5. Add tooltip to toggle button

### Future
6. Per-workspace preferences via workspace-level settings
7. Windows `FILE_ATTRIBUTE_HIDDEN` detection via `fs.stat()` or native module
