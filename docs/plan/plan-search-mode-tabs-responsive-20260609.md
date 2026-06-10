# Search Mode Tabs Responsive Plan - 2026-06-09

## Goal

Make the `File names` / `Names + note text` search mode tabs readable when the Folder Focus pane is narrow.

## Plan

- [x] Locate the search mode control and current CSS.
- [x] Update the segmented control CSS so labels wrap or stack instead of overlapping.
- [x] Build and run tests.
- [x] Review changed files and record verification.

## Notes

- The issue is visual only. The TypeScript search behavior should not need changes.

## Verification

- `npm run build` passed.
- `npm test` passed: 7 tests.
- Reviewed diff: only `styles.css` and this plan file changed.
