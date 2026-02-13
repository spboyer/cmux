# AI Notes — cmux

## Architecture
- SessionService is now v5 — migration chain: v1→v2→v3→v4→v5; add new fields via `migrateVNToVN+1` pattern
- `AppState` requires all fields in inline test objects; adding a field means updating every test file with inline state (~6 files, ~40 objects)
- IPC channels use `domain:action` convention (e.g. `fs:readDirectory`); optional params are backward-compatible (callers omitting get `undefined`)
- `agentReducer` handles agent/UI actions; `conversationReducer` handles chat actions; new actions need routing in `appReducer` switch in `AppStateContext.tsx`
- FileService filters in main process (not renderer) to avoid sending unnecessary data over IPC

## Gotchas
- Adding a field to `AppState` interface causes TS2741 in ~6 test files with inline state objects — fix with bulk find/replace of `agentNotes: {},` → `agentNotes: {},\n showHiddenFiles: false,`
- `useDirectoryLoader` passes all args to `window.electronAPI.fs.readDirectory` — tests using `toHaveBeenCalledWith('/path')` break when a new param is added (need `'/path', undefined`)
- `@vscode/codicons` provides icon names — verify codicon exists before adding to `IconName` type (e.g. `eye`, `eye-closed`)
- `jest.config.js` uses `identity-obj-proxy` for CSS modules; tests run with `npx jest --no-coverage` for speed

## Testing
- Build: `npm start` | Test: `npm test` or `npx jest --no-coverage` | Single: `npx jest --testPathPattern="FileName" --no-coverage`
- Spec tests (LLM-as-judge): `pwsh -File specs\tests\Invoke-SpecTests.ps1 specs\tests\045-*.md` — requires `judge_prompt.md` in specs/tests/
- Spec test params: `-DryRun` (parse only), `-TestName "exact name"`, `-RerunFailed`, `-Model claude-haiku-4.5`, `-Target path`
- Spec test format: YAML frontmatter `target:`, H2 sections, H3 test names, prose intent, fenced Given/When/Then assertions

## Conventions
- TDD workflow: write failing test (RED) → implement (GREEN) → verify no regressions → commit per phase
- Feature branches: `feature/NNN-description`, planning artifacts in `backlog/plans/NNN-description/`
- Task files use `### TNNN [TEST|IMPL] Title ✅` format for tracking completion
- Commit messages: `feat(NNN): Phase N - description` with bullet list of tasks
