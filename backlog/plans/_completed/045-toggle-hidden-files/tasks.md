# Tasks: 045-toggle-hidden-files

## Phase 1: Core Backend — FileService + IPC

### T001 [TEST] FileService showHidden parameter tests ✅
Add tests to `FileService.test.ts` verifying:
- `readDirectory(path)` still filters dotfiles (backward compat)
- `readDirectory(path, { showHidden: false })` filters dotfiles
- `readDirectory(path, { showHidden: true })` returns dotfiles
**File:** `src/main/services/FileService.test.ts`

### T002 [IMPL] FileService showHidden parameter ✅
Modify `FileService.readDirectory` to accept optional `options?: { showHidden?: boolean }` param. When `showHidden` is truthy, skip the dotfile filter.
**File:** `src/main/services/FileService.ts`

### T003 [IMPL] IPC passthrough ✅
Update `fs:readDirectory` handler to pass `showHidden` param to `fileService.readDirectory`.
**File:** `src/main/ipc/files.ts`

### T004 [IMPL] Preload API update ✅
Add optional `showHidden?: boolean` param to `fs.readDirectory` in preload and ElectronAPI interface.
**File:** `src/preload.ts`

## Phase 2: State Management

### T005 [TEST] AppAction and reducer tests ✅
Add tests to `agentReducer.test.ts` verifying `SET_SHOW_HIDDEN_FILES` action updates `showHiddenFiles` in state.
**File:** `src/renderer/contexts/agentReducer.test.ts`

### T006 [IMPL] Types — AppState + AppAction ✅
Add `showHiddenFiles: boolean` to `AppState` and `SET_SHOW_HIDDEN_FILES` action to `AppAction` union.
**File:** `src/shared/types.ts`

### T007 [IMPL] Reducer handler ✅
Add `SET_SHOW_HIDDEN_FILES` case to `agentReducer`. Add to `AgentAction` type extract.
**File:** `src/renderer/contexts/agentReducer.ts`

### T008 [IMPL] Initial state ✅
Update `initialState` in `AppStateContext.tsx` to include `showHiddenFiles: false`.
**File:** `src/renderer/contexts/AppStateContext.tsx`

## Phase 3: UI — Toggle Button + FileTree

### T009 [IMPL] Icon type update ✅
Add `'eye'` and `'eye-closed'` to `IconName` type.
**File:** `src/renderer/components/Icon.tsx`

### T010 [TEST] useDirectoryLoader showHidden tests ✅
Add tests to `useDirectoryLoader.test.ts` verifying `showHidden` param is passed to `electronAPI.fs.readDirectory`.
**File:** `src/renderer/hooks/useDirectoryLoader.test.ts`

### T011 [IMPL] useDirectoryLoader showHidden param ✅
Add `showHidden` parameter to `useDirectoryLoader`. Pass it through all `readDirectory` calls.
**File:** `src/renderer/hooks/useDirectoryLoader.ts`

### T012 [IMPL] FileTree showHiddenFiles prop ✅
Add `showHiddenFiles` prop to `FileTree` and pass to `useDirectoryLoader`.
**File:** `src/renderer/components/RightPane/FileTree.tsx`

### T013 [TEST] RightPane toggle button tests ✅
Add tests to `RightPane.test.tsx` verifying toggle button renders, dispatches action, and shows correct icon.
**File:** `src/renderer/components/RightPane/RightPane.test.tsx`

### T014 [IMPL] RightPane toggle button ✅
Add toggle button to Files pane header. Read `showHiddenFiles` from state, dispatch `SET_SHOW_HIDDEN_FILES`.
**File:** `src/renderer/components/RightPane/RightPane.tsx`

## Phase 4: Persistence

### T015 [TEST] SessionService v5 migration tests ✅
Add tests to `SessionService.test.ts` verifying v4→v5 migration adds `showHiddenFiles: false`.
**File:** `src/main/services/SessionService.test.ts`

### T016 [IMPL] SessionService v5 migration ✅
Bump `SESSION_VERSION` to 5, add `showHiddenFiles` to `SessionData`, add `migrateV4ToV5` method.
**File:** `src/main/services/SessionService.ts`

### T017 [IMPL] Session save — include showHiddenFiles ✅
Ensure session save includes `showHiddenFiles` from AppState.
**File:** `src/renderer/hooks/useSessionRestore.ts` (or wherever session save is triggered)

### T018 [IMPL] Session restore — dispatch showHiddenFiles ✅
In `useSessionRestore`, dispatch `SET_SHOW_HIDDEN_FILES` when loading session data.
**File:** `src/renderer/hooks/useSessionRestore.ts`

## Phase 5: Integration + Cleanup

### T019 [IMPL] Update all test AppState objects ✅
Add `showHiddenFiles: false` to all inline `AppState` objects in tests.
**Files:** All test files with inline AppState

### T020 [SPEC] Run spec tests ✅
Verify all spec tests in `specs/tests/045-toggle-hidden-files.md` pass.

## Dependency Diagram

```
T001 → T002 → T003 → T004
                         ↘
T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014
                                                                    ↓
                                              T015 → T016 → T017 → T018
                                                                    ↓
                                                                  T019 → T020
```

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T004 | Backend: FileService + IPC + Preload |
| 2 | T005-T008 | State: Types + Reducer + Initial state |
| 3 | T009-T014 | UI: Icons + Hook + FileTree + RightPane |
| 4 | T015-T018 | Persistence: Session v5 + Save/Restore |
| 5 | T019-T020 | Cleanup: Test updates + Spec verification |
