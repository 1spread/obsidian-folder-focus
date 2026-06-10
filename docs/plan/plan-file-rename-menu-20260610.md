# File Rename Menu Plan - 2026-06-10

## Goal

Add an explicit file rename action to the Folder Focus row context menu, so file rows show a rename command alongside delete/copy/move actions.

## Plan

- [x] Inspect the current row context menu implementation.
- [x] Add a failing test for the file rename menu label.
- [x] Implement the smallest menu helper and wire `Rename file` into file row context menus.
- [x] Build the plugin and run the test suite.
- [x] Update documentation/changelog if the behavior change is user-facing.

## Notes

- Current folder rows already show `Rename folder`.
- Current file rows only show `Delete file` before the shared actions and Obsidian standard file menu items.
- Added `src/contextMenuLabels.ts` so the folder/file rename labels are explicit and covered by tests.
- Verification passed: `npm run build` and `npm run test`.
