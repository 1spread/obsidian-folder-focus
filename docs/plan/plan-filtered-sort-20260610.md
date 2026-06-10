# Plan: Filtered Sort

## Goal

Make search-filtered results respect the selected sort order and direction, including `Created` and `Modified`.

## Checklist

- [x] Confirm how current sorting and search filtering are applied.
- [x] Share one sorting path between normal folder items and filtered search results.
- [x] Add focused test coverage for filtered result sorting.
- [x] Run tests and build.
- [x] Record verification results.

## Notes

- Current search filtering walks `allFilesInFolder` and assigns `matchedItems` directly to `filteredItems`.
- That bypasses the selected sort order after a search query is active.
- Existing worktree has unrelated pending changes, so keep edits scoped to sorting behavior, tests, and this plan.

## Implementation

- Added `src/sortUtils.ts` with shared sort order and direction handling.
- Updated `FolderFocusView` so normal folder children and search-filtered matches use the same sort path.
- Search matches are now sorted after filtering, so `Name`, `Created`, `Modified`, and ascending/descending apply even while a query is active.

## Verification

- `npm run test` passed: 11 tests.
- `npm run build` passed.
