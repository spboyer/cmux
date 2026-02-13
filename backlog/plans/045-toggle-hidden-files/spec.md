# Specification: Toggle Hidden Files in Workspace File View

## Problem Statement

Users cannot see hidden files (e.g., `.copilot/`, `.git/`, `.env`) in the workspace file tree. These files are needed for configuration and debugging, but showing them by default adds clutter.

## Solution Summary

Add a toggle button in the Explorer pane header that controls whether hidden files are displayed. The preference defaults to hidden (current behavior) and persists across restarts.

## User Stories

### US-1: Toggle Hidden Files
**As a** developer working in cmux,  
**I want to** toggle hidden file visibility in the file tree,  
**So that** I can access dotfiles when needed without permanent clutter.

**Acceptance Criteria:**
1. A toggle button appears in the Files pane header (next to refresh)
2. Clicking the toggle shows/hides hidden files immediately
3. The file tree re-renders without a full page reload
4. The toggle state is visually distinct (e.g., different icon)

### US-2: Persist Preference
**As a** developer,  
**I want** my hidden file preference to persist across app restarts,  
**So that** I don't have to re-enable it every session.

**Acceptance Criteria:**
1. The preference is saved when changed
2. On restart, the file tree respects the saved preference
3. Default is `false` (hidden files not shown) for new installs

## Functional Requirements

| ID | Requirement |
|----|------------|
| FR-1 | FileService.readDirectory accepts an optional `showHidden` boolean parameter |
| FR-2 | When `showHidden` is false (default), entries starting with `.` are filtered out |
| FR-3 | When `showHidden` is true, all entries are returned |
| FR-4 | The IPC channel `fs:readDirectory` passes `showHidden` to FileService |
| FR-5 | AppState includes `showHiddenFiles: boolean` (default: `false`) |
| FR-6 | A `SET_SHOW_HIDDEN_FILES` action toggles the state |
| FR-7 | RightPane header shows a toggle button with eye icon |
| FR-8 | Toggling triggers a full refresh of the file tree |
| FR-9 | The preference is persisted in session data |
| FR-10 | SessionService migrates from v4 to v5 adding `showHiddenFiles` |

## Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-1 | Toggle response time < 200ms for typical project directories |
| NFR-2 | No breaking changes to existing IPC contracts (optional param) |

## Scope

### In Scope
- Dotfile filtering toggle (files/dirs starting with `.`)
- UI toggle button in Explorer pane header
- Session persistence
- All existing tests updated

### Out of Scope
- Windows hidden attribute detection (OS-level `FILE_ATTRIBUTE_HIDDEN`)
- Per-workspace preference (use global preference for now)
- Custom ignore patterns / .gitignore integration
- File search integration

### Future Considerations
- Per-workspace hidden file preferences
- Windows hidden attribute support
- Custom filter patterns

## Success Criteria
1. Hidden files are hidden by default (no regression)
2. Toggle shows hidden files without reload
3. Preference persists across restarts
4. All existing tests pass
5. New tests cover the toggle behavior

## Assumptions
- "Hidden" means filename starts with `.` (Unix convention)
- Global preference (not per-workspace) is sufficient for v1
- The eye/eye-closed codicons exist in the Icon component

## Risks

| Risk | Mitigation |
|------|-----------|
| Icon not available | Fall back to text label or add icon |
| Large directories with many hidden files | Filtering is already O(n); no performance concern |
| Session migration breaks existing sessions | Default `showHiddenFiles: false` preserves current behavior |
