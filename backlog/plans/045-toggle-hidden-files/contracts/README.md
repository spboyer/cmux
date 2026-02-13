# Contracts: Toggle Hidden Files

## IPC Contract Changes

### `fs:readDirectory` (modified)

```typescript
// Before
ipcMain.handle('fs:readDirectory', async (_event, dirPath: string): Promise<FileEntry[]> => ...)

// After
ipcMain.handle('fs:readDirectory', async (_event, dirPath: string, showHidden?: boolean): Promise<FileEntry[]> => ...)
```

### Preload API (modified)

```typescript
// Before
readDirectory: (dirPath: string) => Promise<FileEntry[]>;

// After
readDirectory: (dirPath: string, showHidden?: boolean) => Promise<FileEntry[]>;
```

## State Contract Changes

### AppState Addition

```typescript
export interface AppState {
  // ... existing fields
  showHiddenFiles: boolean;  // NEW
}
```

### AppAction Addition

```typescript
export type AppAction =
  // ... existing actions
  | { type: 'SET_SHOW_HIDDEN_FILES'; payload: { show: boolean } }  // NEW
```

### SessionData v5

```typescript
export interface SessionData {
  version: number;  // 5
  // ... existing fields
  showHiddenFiles?: boolean;  // NEW
}
```
