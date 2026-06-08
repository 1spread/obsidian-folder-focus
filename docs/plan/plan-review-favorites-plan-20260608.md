# Favorites Plan Review - 2026-06-08

## Goal

Review `docs/plan/plan-favorites-search-drag-20260608.md` against the existing codebase and Obsidian plugin conventions before implementation.

## Checklist

- [x] Read the feature plan end to end.
- [x] Check relevant Obsidian plugin conventions and API expectations.
- [x] Compare the plan against current project structure and tests.
- [x] Identify blockers, corrections, and recommended adjustments.
- [x] Record review outcome.

## Review Outcome

The feature direction is sound and mostly aligned with Obsidian plugin conventions. The plan should be corrected before implementation because a few snippets would either fail at runtime, leave UI state stale, or create avoidable type duplication.

## Findings

### P1: `FolderFocusView` field initializer reads `this.plugin` before constructor assignment

Plan location: `docs/plan/plan-favorites-search-drag-20260608.md:389-395`

The planned field initializer:

```ts
searchMode: FolderFocusSearchMode = this.plugin.settings.defaultSearchMode;
```

will run before the constructor body assigns `this.plugin = plugin`. Implementing it this way can throw during view construction.

Correction:

```ts
searchMode: FolderFocusSearchMode;

constructor(leaf: WorkspaceLeaf, plugin: FolderFocusPlugin) {
  super(leaf);
  this.plugin = plugin;
  this.searchMode = plugin.settings.defaultSearchMode;
}
```

### P1: Search mode buttons can stay visually stale

Plan location: `docs/plan/plan-favorites-search-drag-20260608.md:587-600`

`setSearchMode()` updates the state and re-renders only the list when `searchQuery` exists. The active segmented button class is created in `renderHeader()`, so changing mode while a search is active can leave the visible active button wrong.

Correction: after changing search mode, either call `this.renderHeader()` before/after filtering, or make `updateSearchModeButtons()` a view method and call it inside `setSearchMode()`.

### P1: Search mode type is planned in two places

Plan locations:

- `docs/plan/plan-favorites-search-drag-20260608.md:74-89`
- `docs/plan/plan-favorites-search-drag-20260608.md:112-130`

The plan defines `FolderFocusSearchMode` in both `src/main.ts` and `src/searchUtils.ts`. TypeScript may tolerate structurally equivalent unions, but it makes imports and validation easier to get wrong. The plan also uses `isSearchMode()` in `main.ts` without explicitly importing it.

Correction: define `FolderFocusSearchMode` and `isSearchMode()` only in `src/searchUtils.ts`, then import them into `src/main.ts` and `src/FolderFocusView.ts`.

### P2: `Full text` label may overpromise

Plan locations:

- `docs/plan/plan-favorites-search-drag-20260608.md:22-26`
- `docs/plan/plan-favorites-search-drag-20260608.md:603-625`

The implementation plan keeps current behavior: file/folder names plus Markdown content only. That is compatible with the codebase, but the UI label `Full text` can imply XLSX/PDF/DOCX content search too.

Correction: use clearer UI text such as `Names + note text` or `Markdown text`, or explicitly document that full-text content search applies to Markdown files.

### P2: Drag feedback needs cleanup coverage for row labels

Plan location: `docs/plan/plan-favorites-search-drag-20260608.md:704-748`

The plan says to remove `data-drop-label` on `dragleave`, `drop`, and `dragend`, which is good, but it should explicitly include both external row-drop handlers and internal folder-drop handlers. The current code has separate handlers for external file drops on every row and internal moves onto folder rows.

Correction: add a small cleanup helper, for example:

```ts
private clearDragFeedback(): void {
  this.listEl.removeClass('is-folder-focus-dragging');
  this.listEl.removeClass('is-external-drop-target');
  this.listEl.removeAttribute('data-drop-label');
  this.itemElements.forEach((el) => {
    el.removeClass('is-dragging');
    el.removeClass('is-drop-target');
    el.removeClass('is-drop-invalid');
    el.removeAttribute('data-drop-label');
  });
}
```

Call it from `dragend`, successful/failed `drop`, and external `dragleave` paths where the drag leaves the list.

## Obsidian Convention Check

- Settings persistence via `Plugin.loadData()` / `Plugin.saveData()` is correct.
- Keeping imperative `PluginSettingTab.display()` is acceptable for current `minAppVersion: 1.7.2`. Obsidian 1.13.0 has declarative settings, but using it would require either bumping `minAppVersion` or maintaining dual settings implementations.
- Using `new Setting(...).addDropdown(...)` and `addToggle(...)` is consistent with the current code and official examples for older-compatible plugins.
- The plan uses CSS classes and Obsidian CSS variables rather than inline styles, which aligns with review guidance.
- No new top-level Node.js modules are planned, so mobile compatibility is not made worse.
- The suggested version `1.1.0` is appropriate for a user-facing feature release.

## Recommended Plan Changes Before Implementation

- Move `FolderFocusSearchMode` ownership to `src/searchUtils.ts`.
- Initialize `searchMode` in the `FolderFocusView` constructor, not as a field initializer.
- Make search mode button active state update when mode changes during an active search.
- Rename or clarify `Full text` if content search remains Markdown-only.
- Add a shared drag feedback cleanup method to the plan.
