# Data Model: Toggle Hidden Files

## Entity Changes

### AppState (modified)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showHiddenFiles` | `boolean` | `false` | Whether hidden files are visible in file tree |

### SessionData v5 (modified)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showHiddenFiles` | `boolean` | `false` | Persisted hidden file preference |

### AppAction (new variant)

```typescript
| { type: 'SET_SHOW_HIDDEN_FILES'; payload: { show: boolean } }
```

## State Transitions

```
showHiddenFiles: false (default)
  → User clicks toggle → dispatch SET_SHOW_HIDDEN_FILES { show: true }
  → showHiddenFiles: true
  → File tree refreshes, showing dotfiles
  → Session auto-saves with showHiddenFiles: true

showHiddenFiles: true
  → User clicks toggle → dispatch SET_SHOW_HIDDEN_FILES { show: false }
  → showHiddenFiles: false
  → File tree refreshes, hiding dotfiles
  → Session auto-saves with showHiddenFiles: false
```

## Migration: v4 → v5

```typescript
private migrateV4ToV5(data: SessionData & { version: 4 }): SessionData {
  return {
    ...data,
    version: 5,
    showHiddenFiles: false,
  };
}
```

## Validation Rules

- `showHiddenFiles` must be a boolean
- Default to `false` if undefined/null (defensive)
- No dependency on other state fields
