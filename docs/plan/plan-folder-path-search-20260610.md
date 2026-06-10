# Plan: Folder Path Search

## Goal

Add a folder search flow so typing part of a folder path, such as `owis/lp/pdf-captures-20260610/`, can jump directly to the matching folder.

## Checklist

- [x] Inspect current search and folder navigation behavior.
- [x] Add path-aware folder matching helpers.
- [x] Let path-like search queries jump to the best matching folder on Enter.
- [x] Include folder path matches in filtered search results.
- [x] Add focused tests.
- [x] Run tests and build.
- [x] Record verification results.

## Notes

- Existing search matches item names and Markdown content, but not folder paths.
- Keep normal keyword search behavior unchanged for queries like `html`.
- Path-like queries are queries containing `/`.
- Existing uncommitted `plan-gh-account-ignite-20260610.md` is unrelated and should be left intact.

## Implementation

- Added folder path query normalization and matching helpers in `src/searchUtils.ts`.
- Pressing Enter with a path-like query jumps to the best matching folder.
- Search results now include folder path matches for path-like queries.
- Normal keyword searches such as `html` continue to filter normally instead of jumping.

## Verification

- `npm run test` passed: 15 tests.
- `npm run build` passed.
- `git diff --check` passed.

## Branch

- Created branch `codex/folder-path-search`.
- Commit and push this change separately from `main`.
