# Plan: Branch Update Summary

## Goal

Keep a merge-ready summary of visible updates on `codex/folder-path-search` so later releases can explain what changed.

## Checklist

- [x] Confirm current branch state.
- [x] Create a user-facing update summary.
- [x] Commit the summary on `codex/folder-path-search`.
- [x] Push the branch.

## Merge-Ready Update Summary

### Folder Search

- Added path-based folder search from the Folder Focus search box.
- Typing a path fragment such as `owis/lp/pdf-captures-20260610/` and pressing Enter jumps directly to the best matching folder.
- Folder path matches now appear in filtered search results for path-like queries.
- Normal keyword searches such as `html` continue to work as regular file/folder filtering.

### Quality

- Added tests for path normalization, folder path matching, and best-match ranking.
- Verified with `npm run test`, `npm run build`, and `git diff --check`.

## PR / Release Note Draft

Folder Focus now supports folder path search. Paste part of a folder path into the search box and press Enter to jump straight to the matching folder, while normal keyword search behavior remains unchanged.
