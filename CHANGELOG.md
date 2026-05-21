# Changelog

## 1.0.3 - 2026-05-21

### Added
- Added Finder drag and drop import for files and folders into Folder Focus.
- Added recursive folder import with automatic non-overwriting names for conflicts.

---

## 1.0.2 - 2026-05-20

### Added
- Added compact file type badges for Markdown, documents, spreadsheets, PDFs, images, JSON, code files, text files, and Obsidian canvas files.

### Fixed
- Stabilized the focused row spacing so the selection indicator does not shift item content.

---

## 1.0.1 - 2026-05-16

### Fixed
- Addressed Obsidian community plugin automated review findings.
- Updated the minimum Obsidian app version to match the APIs used by the plugin.
- Added GitHub artifact attestations for release assets.

---

## 2026-01-25

### Added
- **Multi-selection**: Cmd+Click to toggle, Shift+Click for range selection
- **New folder button**: Create folders directly from header
- **New note button**: Create notes directly from header
- **Search improvements**:
  - Full-text search (searches file content)
  - Subfolder search (includes all nested files)
  - "Folders only" filter toggle
  - Clear button (×) in search box
- **Context menu enhancements**:
  - Rename folder option
  - Delete folder option
  - Create folder with selection
- **Cmd+Enter**: Open file in new tab
- **Cmd+Double-click**: Open file in new tab
- **Live refresh**: Automatically updates when files change externally (Finder, etc.)

### Changed
- Search now requires Enter key to execute (not real-time)
- Selection styling improved with focus indicator

### Removed
- Drag and drop functionality (removed for simplicity)

---

## 2026-01-23

### Added
- **Sort options**: Name, Modified, Created in header dropdown
- **Sort direction toggle**: Ascending/descending button next to sort dropdown
- Folders always sorted first, then files within selected sort order

### Fixed
- **Keyboard shortcuts scope**: Cmd+Up/Down and Shift+Cmd+N only work when Folder Focus is focused
- Default Obsidian shortcuts (like scroll to top) work normally in notes

### Commits
```
14c12a0 feat: add sort options for folder contents
ee69aae feat: add ascending/descending sort toggle
e60b8a4 fix: restrict keyboard shortcuts to when view is focused
3086734 fix: handle shortcuts in view's keydown instead of global hotkeys
```

---

## Initial Release (2026-01-23)

### Features
- Finder-like folder navigation view in right sidebar
- Keyboard shortcuts (when focused):
  - `⌘↑` / `Ctrl+↑`: Navigate to parent folder
  - `⌘↓` / `Ctrl+↓`: Enter folder / Open file
  - `⇧⌘N` / `Ctrl+Shift+N`: Create new note
  - `↑` / `↓`: Move selection
  - `Enter`: Enter folder / Open file
- Double-click to enter folders or open files
- Folder history preservation (remembers selection when navigating back)
- Context menu "Open in Folder Focus" for folders
- Settings: Open files in new tab toggle

### Technical
- TypeScript + esbuild build system
- MIT License
