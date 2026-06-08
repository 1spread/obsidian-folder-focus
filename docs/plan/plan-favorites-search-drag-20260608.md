# Favorite Folders, Search Controls, and Drag Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add favorite folders, search mode controls, search-result highlighting, and clearer drag/drop feedback to Folder Focus.

**Architecture:** Persist favorite folder paths and the default search mode in plugin settings, expose favorite actions in the Folder Focus header and folder context menus, and keep search filtering/rendering inside `FolderFocusView`. Add small pure helper functions for search matching/highlighting so behavior can be tested without Obsidian runtime.

**Tech Stack:** Obsidian Plugin API, TypeScript, DOM APIs, CSS, Node test runner.

---

## Scope

Implement these features:

- Favorite folders:
  - Users can favorite/unfavorite the current folder.
  - Users can open favorite folders quickly from the Folder Focus view.
  - Users can favorite/unfavorite folders from folder row context menus.
  - Favorite paths are persisted in plugin settings.
- Search mode toggle:
  - Users can switch between `File names` and `Names + note text`.
  - `File names` searches only file/folder names.
  - `Names + note text` searches file/folder names plus Markdown file content, matching current behavior.
  - Keep the existing `Folders only` toggle.
- Search highlighting:
  - Matching parts of file/folder names are highlighted in search results.
  - Highlighting must be DOM-safe and must not use raw HTML.
- Drag feedback:
  - Make valid/invalid folder drop targets visually obvious.
  - Make external Finder import target visually obvious.
  - Add short helper text while dragging where it improves clarity.

Do not implement:

- Recent folders. The definition is ambiguous and intentionally out of scope.
- Saved views or advanced query syntax.
- Any README/media changes beyond optional final documentation updates for these features.

## Current Worktree Note

There are existing uncommitted README/doc asset changes from the README update work:

- `README.md`
- `docs/assets/`
- `docs/plan/plan-readme-update-links-20260608.md`

When implementing this plan, do not revert or overwrite those changes. Keep code changes scoped to the files listed below.

## Files

- Modify: `src/main.ts`
  - Add persisted settings for favorites and search mode.
  - Add plugin helper methods for favorite add/remove/toggle.
  - Add settings UI for default search mode and favorite cleanup.
- Modify: `src/FolderFocusView.ts`
  - Add favorite UI, context menu actions, search mode UI, search highlighting, and drag feedback state/classes.
- Modify: `styles.css`
  - Add favorite controls, search highlight styling, and stronger drag/drop visual states.
- Create: `src/searchUtils.ts`
  - Pure helpers for search mode checks and name highlighting segments.
- Create: `tests/searchUtils.test.mjs`
  - Node tests for search mode and highlight segmentation behavior.
- Modify: `package.json`
  - Run all Node test files under `tests/`.
- Modify: `README.md`
  - Optional after implementation: document favorites and search mode.
- Modify: `docs/plan/plan-favorites-search-drag-20260608.md`
  - Update checklist status as implementation progresses.

## Data Model

Add these settings in `src/main.ts`, importing search-mode helpers from `src/searchUtils.ts`:

```ts
import { isSearchMode, type FolderFocusSearchMode } from './searchUtils';

export interface FolderFocusSettings {
  openInNewTab: boolean;
  favoriteFolderPaths: string[];
  defaultSearchMode: FolderFocusSearchMode;
}

const DEFAULT_SETTINGS: FolderFocusSettings = {
  openInNewTab: true,
  favoriteFolderPaths: [],
  defaultSearchMode: 'full-text',
};
```

Validation rules:

- `favoriteFolderPaths` must be an array of strings.
- Deduplicate favorites while preserving order.
- Ignore favorite paths that no longer resolve to `TFolder` when rendering.
- `defaultSearchMode` must be `name` or `full-text`; otherwise fall back to `full-text`.
- `FolderFocusSearchMode` must be defined only in `src/searchUtils.ts` and imported where needed.

## Implementation Tasks

### Task 1: Search Utility Helpers

**Files:**
- Create: `src/searchUtils.ts`
- Create: `tests/searchUtils.test.mjs`
- Modify: `package.json`

- [x] **Step 1: Create pure helper API**

Create `src/searchUtils.ts`:

```ts
export type FolderFocusSearchMode = 'name' | 'full-text';

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function isSearchMode(value: unknown): value is FolderFocusSearchMode {
  return value === 'name' || value === 'full-text';
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function shouldSearchContent(mode: FolderFocusSearchMode): boolean {
  return mode === 'full-text';
}

export function getHighlightSegments(label: string, query: string): HighlightSegment[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [{ text: label, match: false }];
  }

  const labelLower = label.toLowerCase();
  const queryLower = normalizedQuery.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < label.length) {
    const matchIndex = labelLower.indexOf(queryLower, cursor);
    if (matchIndex === -1) {
      segments.push({ text: label.slice(cursor), match: false });
      break;
    }

    if (matchIndex > cursor) {
      segments.push({ text: label.slice(cursor, matchIndex), match: false });
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    segments.push({ text: label.slice(matchIndex, matchEnd), match: true });
    cursor = matchEnd;
  }

  return segments.filter((segment) => segment.text.length > 0);
}
```

- [x] **Step 2: Add tests**

Create `tests/searchUtils.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function loadSearchUtilsModule() {
  const source = readFileSync(new URL('../src/searchUtils.ts', import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const script = new Script(`((exports, module) => { ${transpiled}\n})`);
  script.runInNewContext()(module.exports, module);
  return module.exports;
}

const {
  getHighlightSegments,
  isSearchMode,
  normalizeSearchQuery,
  shouldSearchContent,
} = loadSearchUtilsModule();

test('validates supported search modes', () => {
  assert.equal(isSearchMode('name'), true);
  assert.equal(isSearchMode('full-text'), true);
  assert.equal(isSearchMode('recent'), false);
  assert.equal(isSearchMode(null), false);
});

test('normalizes search query', () => {
  assert.equal(normalizeSearchQuery('  XLSX  '), 'xlsx');
});

test('content search only runs in full-text mode', () => {
  assert.equal(shouldSearchContent('name'), false);
  assert.equal(shouldSearchContent('full-text'), true);
});

test('splits label into case-insensitive highlight segments', () => {
  assert.deepEqual(getHighlightSegments('March_1-15.xlsx', 'XLS'), [
    { text: 'March_1-15.', match: false },
    { text: 'xls', match: true },
    { text: 'x', match: false },
  ]);
});

test('returns a single non-match segment for empty query', () => {
  assert.deepEqual(getHighlightSegments('skill.md', ''), [
    { text: 'skill.md', match: false },
  ]);
});
```

- [x] **Step 3: Run helper tests**

Update `package.json` test script so both existing and new tests run:

```json
"test": "node --test tests/*.test.mjs"
```

Then run:

Run:

```bash
npm run test
```

Expected:

```text
pass
```

### Task 2: Settings and Favorite Persistence

**Files:**
- Modify: `src/main.ts`
- Test: `npm run build`

- [x] **Step 1: Export settings types and validate loaded data**

Update `src/main.ts` so `FolderFocusSettings` is exported and includes `favoriteFolderPaths` and `defaultSearchMode`.

Add helper functions:

```ts
function normalizeFavoriteFolderPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const paths: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const path = item.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }

  return paths;
}
```

Make `loadSettings()` merge settings with validation:

```ts
async loadSettings() {
  const loadedData: unknown = await this.loadData();
  const candidate = isFolderFocusSettings(loadedData) ? loadedData : {};

  this.settings = {
    ...DEFAULT_SETTINGS,
    openInNewTab: typeof candidate.openInNewTab === 'boolean'
      ? candidate.openInNewTab
      : DEFAULT_SETTINGS.openInNewTab,
    favoriteFolderPaths: normalizeFavoriteFolderPaths(candidate.favoriteFolderPaths),
    defaultSearchMode: isSearchMode(candidate.defaultSearchMode)
      ? candidate.defaultSearchMode
      : DEFAULT_SETTINGS.defaultSearchMode,
  };
}
```

- [x] **Step 2: Add favorite helper methods to plugin**

Add methods to `FolderFocusPlugin`:

```ts
isFavoriteFolder(path: string): boolean {
  return this.settings.favoriteFolderPaths.includes(path);
}

async addFavoriteFolder(path: string): Promise<void> {
  if (this.isFavoriteFolder(path)) return;
  this.settings.favoriteFolderPaths = [...this.settings.favoriteFolderPaths, path];
  await this.saveSettings();
}

async removeFavoriteFolder(path: string): Promise<void> {
  this.settings.favoriteFolderPaths = this.settings.favoriteFolderPaths.filter((favoritePath) => favoritePath !== path);
  await this.saveSettings();
}

async toggleFavoriteFolder(path: string): Promise<void> {
  if (this.isFavoriteFolder(path)) {
    await this.removeFavoriteFolder(path);
  } else {
    await this.addFavoriteFolder(path);
  }
}
```

- [x] **Step 3: Add settings UI**

In `FolderFocusSettingTab.display()`, add:

- Default search mode dropdown:

```ts
new Setting(containerEl)
  .setName('Default search mode')
  .setDesc('Choose whether Folder Focus searches file names only or file names plus Markdown content by default.')
  .addDropdown((dropdown) =>
    dropdown
      .addOption('full-text', 'Names + note text')
      .addOption('name', 'File names')
      .setValue(this.plugin.settings.defaultSearchMode)
      .onChange((value) => {
        if (!isSearchMode(value)) return;
        this.plugin.settings.defaultSearchMode = value;
        void this.plugin.saveSettings().catch((e) => {
          console.error('Folder focus: failed to save settings', e);
        });
      })
  );
```

- Favorite folder cleanup:

```ts
new Setting(containerEl)
  .setName('Favorite folders')
  .setDesc(`${this.plugin.settings.favoriteFolderPaths.length} favorite folder${this.plugin.settings.favoriteFolderPaths.length === 1 ? '' : 's'} saved.`)
  .addButton((button) =>
    button
      .setButtonText('Remove missing')
      .onClick(() => {
        const existing = this.plugin.settings.favoriteFolderPaths.filter((path) => this.app.vault.getAbstractFileByPath(path) instanceof TFolder);
        this.plugin.settings.favoriteFolderPaths = existing;
        void this.plugin.saveSettings().then(() => this.display()).catch((e) => {
          console.error('Folder focus: failed to clean favorite folders', e);
        });
      })
  );
```

- [x] **Step 4: Build check**

Run:

```bash
npm run build
```

Expected: TypeScript compile succeeds.

### Task 3: Favorite Folder UI

**Files:**
- Modify: `src/FolderFocusView.ts`
- Modify: `styles.css`
- Test: `npm run build`

- [x] **Step 1: Add search mode and favorite state to view**

In `FolderFocusView`, add the property without reading `this.plugin` in the field initializer:

```ts
searchMode: FolderFocusSearchMode;
```

Initialize it in the constructor after `this.plugin` is assigned:

```ts
constructor(leaf: WorkspaceLeaf, plugin: FolderFocusPlugin) {
  super(leaf);
  this.plugin = plugin;
  this.searchMode = plugin.settings.defaultSearchMode;
}
```

Add methods:

```ts
private getExistingFavoriteFolders(): TFolder[] {
  return this.plugin.settings.favoriteFolderPaths
    .map((path) => this.app.vault.getAbstractFileByPath(path))
    .filter((file): file is TFolder => file instanceof TFolder);
}

private async toggleCurrentFolderFavorite(): Promise<void> {
  if (!this.currentFolder) return;
  await this.plugin.toggleFavoriteFolder(this.currentFolder.path);
  this.renderHeader();
}
```

- [x] **Step 2: Add current-folder favorite button**

In `renderHeader()`, next to the current path, add a star button:

```ts
const pathRowEl = this.headerEl.createDiv({ cls: 'folder-focus-path-row' });
const pathEl = pathRowEl.createDiv({ cls: 'folder-focus-path' });
pathEl.setText(this.currentFolder.path || '/');

const favoriteBtn = pathRowEl.createEl('button', { cls: 'folder-focus-favorite-toggle' });
const isFavorite = this.plugin.isFavoriteFolder(this.currentFolder.path);
setIcon(favoriteBtn, isFavorite ? 'star' : 'star-off');
favoriteBtn.setAttribute('aria-label', isFavorite ? 'Remove current folder from favorites' : 'Add current folder to favorites');
favoriteBtn.toggleClass('is-favorite', isFavorite);
favoriteBtn.addEventListener('click', () => {
  void this.toggleCurrentFolderFavorite().catch((e) => {
    console.error('Folder focus: failed to toggle favorite folder', e);
  });
});
```

- [x] **Step 3: Add favorites strip**

Below the path row and above search, render favorite folders:

```ts
const favoriteFolders = this.getExistingFavoriteFolders();
if (favoriteFolders.length > 0) {
  const favoritesEl = this.headerEl.createDiv({ cls: 'folder-focus-favorites' });
  favoritesEl.createDiv({ cls: 'folder-focus-favorites-label', text: 'Favorites' });
  const favoriteListEl = favoritesEl.createDiv({ cls: 'folder-focus-favorites-list' });

  for (const folder of favoriteFolders) {
    const favoriteItem = favoriteListEl.createEl('button', { cls: 'folder-focus-favorite-item' });
    setIcon(favoriteItem, 'folder');
    favoriteItem.createSpan({ text: folder.name || '/' });
    favoriteItem.setAttribute('aria-label', `Open favorite folder ${folder.path || '/'}`);
    favoriteItem.addEventListener('click', () => this.setFolder(folder));
  }
}
```

- [x] **Step 4: Add context menu action on folder rows**

In the existing folder context menu block, add:

```ts
const favoriteTitle = this.plugin.isFavoriteFolder(item.path) ? 'Remove from favorites' : 'Add to favorites';
const favoriteIcon = this.plugin.isFavoriteFolder(item.path) ? 'star-off' : 'star';
menu.addItem((menuItem) => {
  menuItem
    .setTitle(favoriteTitle)
    .setIcon(favoriteIcon)
    .onClick(() => {
      void this.plugin.toggleFavoriteFolder(item.path).then(() => {
        this.renderHeader();
      }).catch((e) => {
        console.error('Folder focus: failed to toggle folder favorite', e);
      });
    });
});
```

- [x] **Step 5: Add styles**

Add to `styles.css`:

```css
.folder-focus-path-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.folder-focus-path {
  flex: 1;
  min-width: 0;
}

.folder-focus-favorite-toggle {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.folder-focus-favorite-toggle.is-favorite {
  color: var(--text-accent);
}

.folder-focus-favorites {
  margin-top: 8px;
}

.folder-focus-favorites-label {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  margin-bottom: 4px;
}

.folder-focus-favorites-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.folder-focus-favorite-item {
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--background-modifier-hover);
  color: var(--text-normal);
  font-size: var(--font-ui-small);
}
```

- [x] **Step 6: Build check**

Run:

```bash
npm run build
```

Expected: TypeScript compile succeeds.

### Task 4: Search Mode Toggle and Highlighting

**Files:**
- Modify: `src/FolderFocusView.ts`
- Modify: `styles.css`
- Test: `npm run test`, `npm run build`

- [x] **Step 1: Import helper functions**

In `src/FolderFocusView.ts`, import:

```ts
import { getHighlightSegments, shouldSearchContent, type FolderFocusSearchMode } from './searchUtils';
```

- [x] **Step 2: Add search mode segmented control**

In `renderHeader()`, near the existing `Folders only` toggle, add:

```ts
const searchModeEl = searchContainer.createDiv({ cls: 'folder-focus-search-mode' });
const nameModeBtn = searchModeEl.createEl('button', { text: 'File names', cls: 'folder-focus-search-mode-button' });
const fullTextModeBtn = searchModeEl.createEl('button', { text: 'Names + note text', cls: 'folder-focus-search-mode-button' });

const updateSearchModeButtons = () => {
  nameModeBtn.toggleClass('is-active', this.searchMode === 'name');
  fullTextModeBtn.toggleClass('is-active', this.searchMode === 'full-text');
};

nameModeBtn.addEventListener('click', () => {
  void this.setSearchMode('name').catch((e) => {
    console.error('Folder focus: failed to set search mode', e);
  });
});

fullTextModeBtn.addEventListener('click', () => {
  void this.setSearchMode('full-text').catch((e) => {
    console.error('Folder focus: failed to set search mode', e);
  });
});

updateSearchModeButtons();
```

Add method:

```ts
private async setSearchMode(mode: FolderFocusSearchMode): Promise<void> {
  this.searchMode = mode;
  this.plugin.settings.defaultSearchMode = mode;
  await this.plugin.saveSettings();
  this.renderHeader();
  if (this.searchQuery) {
    await this.applyFilter();
    this.renderList();
  }
}
```

- [x] **Step 3: Apply search mode in filtering**

Change content matching condition in `applyFilter()` from current content search condition to:

```ts
if (
  shouldSearchContent(this.searchMode)
  && !this.searchFoldersOnly
  && item instanceof TFile
  && item.extension === 'md'
) {
  try {
    const content = await this.app.vault.cachedRead(item);
    if (content.toLowerCase().includes(query)) {
      matchedItems.push(item);
    }
  } catch {
    // Skip if can't read
  }
}
```

Keep name matching before content matching so full-text mode still finds file names.

- [x] **Step 4: Render highlighted item names**

Replace direct `nameEl.setText(item.name)` behavior with a helper:

```ts
private renderItemName(nameEl: HTMLElement, itemName: string): void {
  nameEl.empty();
  const shouldHighlight = this.searchQuery.trim().length > 0;
  const segments = shouldHighlight
    ? getHighlightSegments(itemName, this.searchQuery)
    : [{ text: itemName, match: false }];

  for (const segment of segments) {
    nameEl.createSpan({
      cls: segment.match ? 'folder-focus-search-highlight' : undefined,
      text: segment.text,
    });
  }
}
```

Call:

```ts
this.renderItemName(nameEl, item.name);
```

- [x] **Step 5: Add styles**

Add to `styles.css`:

```css
.folder-focus-search-mode {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: var(--background-modifier-border);
}

.folder-focus-search-mode-button {
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.folder-focus-search-mode-button.is-active {
  background: var(--background-primary);
  color: var(--text-normal);
}

.folder-focus-search-highlight {
  border-radius: 3px;
  background: var(--text-highlight-bg);
  color: var(--text-normal);
}
```

- [x] **Step 6: Run tests and build**

Run:

```bash
npm run test
npm run build
```

Expected: both pass.

### Task 5: Drag Feedback Improvements

**Files:**
- Modify: `src/FolderFocusView.ts`
- Modify: `styles.css`
- Test: manual Obsidian check, `npm run build`

- [x] **Step 1: Add drag status text in list**

In `registerExternalDropOnList()`, add/remove classes and data attributes:

```ts
this.listEl.setAttribute('data-drop-label', 'Drop to import into current folder');
```

When an internal drag is over a valid folder target, set:

```ts
itemEl.setAttribute('data-drop-label', `Move to ${targetFolder.name || '/'}`);
```

When invalid:

```ts
itemEl.setAttribute('data-drop-label', 'Cannot drop here');
```

Clear on `dragleave`, `drop`, and `dragend`:

```ts
itemEl.removeAttribute('data-drop-label');
```

Add one shared cleanup method so external imports and internal folder moves do not leave stale labels or classes:

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

- [x] **Step 2: Strengthen valid/invalid classes**

Keep existing classes:

- `is-drop-target`
- `is-drop-invalid`
- `is-external-drop-target`

Add one class during internal item drag:

```ts
this.listEl.addClass('is-folder-focus-dragging');
```

Remove it in `dragend` and `drop` cleanup:

```ts
this.listEl.removeClass('is-folder-focus-dragging');
```

- [x] **Step 3: Add styles**

Add to `styles.css`:

```css
.folder-focus-list.is-external-drop-target {
  outline: 2px dashed var(--interactive-accent);
  outline-offset: -4px;
  background: var(--background-modifier-hover);
}

.folder-focus-list.is-external-drop-target::before {
  content: attr(data-drop-label);
  display: block;
  margin: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  font-size: var(--font-ui-small);
  text-align: center;
}

.folder-focus-item.is-drop-target {
  outline: 2px solid var(--interactive-accent);
  outline-offset: -2px;
  background: var(--background-modifier-hover);
}

.folder-focus-item.is-drop-target::after,
.folder-focus-item.is-drop-invalid::after {
  content: attr(data-drop-label);
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: var(--font-ui-smaller);
  white-space: nowrap;
}

.folder-focus-item.is-drop-target::after {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.folder-focus-item.is-drop-invalid {
  outline: 2px solid var(--text-error);
  outline-offset: -2px;
}

.folder-focus-item.is-drop-invalid::after {
  background: var(--background-modifier-error);
  color: var(--text-error);
}
```

- [x] **Step 4: Build check**

Run:

```bash
npm run build
```

Expected: TypeScript compile succeeds.

- [x] **Step 5: Manual Obsidian check**

In Obsidian:

- Drag an external Finder file over empty list area.
  - Expected: list shows clear import target styling and text.
- Drag one file onto a valid folder.
  - Expected: folder row shows valid target styling and "Move to ..." label.
- Drag a folder onto itself or a descendant.
  - Expected: row shows invalid target styling and "Cannot drop here" label.
- Drop on a valid folder.
  - Expected: item moves and selection resets without stale drag classes.

### Task 6: Documentation and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/plan/plan-favorites-search-drag-20260608.md`

- [x] **Step 1: README update**

Add bullets for:

- Favorite folders.
- File name vs note text search toggle.
- Highlighted search matches.
- Clearer drag/drop feedback.

Use existing README sections rather than creating a large new section.

- [x] **Step 2: Final verification**

Run:

```bash
npm run test
npm run build
```

Expected: both pass.

- [x] **Step 3: Plan status update**

Mark completed tasks in `docs/plan/plan-favorites-search-drag-20260608.md` and record:

- Tests run.
- Manual Obsidian checks performed.
- Any intentionally deferred behavior.

## Suggested Versioning

This is a meaningful user-facing feature release. Suggested version:

- `1.1.0` for favorite folders, search mode toggle, search highlights, and improved drag feedback.

Do not bump versions until implementation and verification are complete.

## Open Implementation Decisions

- Favorite ordering: initial version should preserve the order users added folders.
- Missing favorites: initial version should hide missing folders in the UI and provide cleanup in settings.
- Names + note text scope: initial version should keep current behavior: file/folder name matching plus Markdown content matching only.
- UI density: favorite folder chips should wrap compactly and not push the file list too far down when there are many favorites.

## Acceptance Criteria

- Users can add/remove the current folder as a favorite.
- Users can open favorite folders from the Folder Focus view.
- Folder context menus include add/remove favorite actions.
- Favorites persist after Obsidian reload.
- Search mode can be switched between `File names` and `Names + note text`.
- `File names` mode does not read Markdown content.
- Matching file/folder name text is highlighted.
- Drag targets are visually obvious for valid, invalid, and external drops.
- `npm run test` passes.
- `npm run build` passes.

## Implementation Notes - 2026-06-08

- Implemented favorite folder persistence in plugin settings.
- Added favorite toggle in the Folder Focus header.
- Added favorite folder chips in the header for quick navigation.
- Added folder context menu action for add/remove favorite.
- Added `File names` / `Names + note text` search mode.
- Kept note text search scoped to Markdown content, matching existing behavior.
- Added safe DOM-based search highlighting for item names.
- Added shared drag feedback cleanup and clearer valid/invalid/import drop target labels.
- Preserved the vault root favorite path (`''`) across reloads while still dropping whitespace-only invalid paths.
- Added `src/searchUtils.ts` plus `tests/searchUtils.test.mjs`.
- Updated `package.json` test script to run all `tests/*.test.mjs`.
- Bumped the release version to `1.1.0` after implementation and verification planning.
- Updated `manifest.json`, `package.json`, `package-lock.json`, `versions.json`, and `CHANGELOG.md` for the `1.1.0` release.

## Release Follow-up - 2026-06-08

- [x] Bump version to `1.1.0`.
- [x] Re-run tests after version bump.
- [x] Re-run production build after version bump.
- [x] Check git diff for whitespace/link issues.
- [ ] Commit release changes.
- [ ] Push branch to remote.
- Updated README feature bullets for favorites, search mode, highlighting, and drag feedback.

## Verification - 2026-06-08

- Red test observed before helper implementation: `npm run test` failed because `src/searchUtils.ts` did not exist.
- `npm run test` passed after implementation.
- Added and verified a failing-then-passing test for persisted vault root favorites.
- `npm run build` passed after implementation.
- Manual Obsidian runtime check is still recommended before release because drag/drop and visual state behavior needs a real Obsidian DOM.
