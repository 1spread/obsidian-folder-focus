# Changelog

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
