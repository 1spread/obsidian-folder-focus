# Plan: Visible Header Icons

## Goal

Make the small action icons in the Folder Focus header visible across Obsidian themes, including the right-side sort, new folder, new note, and favorite buttons.

## Checklist

- [x] Inspect current header button markup and styles.
- [x] Add scoped CSS so header button SVG icons inherit a visible color.
- [x] Build and test the plugin.
- [x] Record verification results.

## Notes

- User screenshot shows the header buttons rendering as empty rounded boxes.
- Existing worktree has unrelated pending changes, so keep this change scoped to `styles.css` and this plan.

## Implementation

- Added scoped CSS for `.folder-focus-sort-dir`, `.folder-focus-new-folder`, `.folder-focus-new-note`, and `.folder-focus-favorite-toggle`.
- The button text color now uses `var(--text-normal)`, and child SVGs explicitly inherit that color with full opacity.

## Verification

- `npm run test` passed: 8 tests.
- `npm run build` passed.
