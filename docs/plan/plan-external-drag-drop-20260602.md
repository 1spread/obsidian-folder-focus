# External drag and drop investigation plan

- [x] Confirm existing drag/drop behavior in `FolderFocusView.ts`.
- [x] Determine whether Folder Focus currently supports dragging vault items out to external apps.
- [x] Summarize whether external drop is feasible and what implementation would be needed.

## Findings

- Current implementation supports two drag/drop directions:
  - External Finder/filesystem -> Folder Focus: imports files/folders into the vault.
  - Folder Focus item -> Folder Focus folder: moves selected vault items inside the vault.
- Current implementation does not expose selected vault items as native OS file drags.
- Electron's native file drag-out support requires `webContents.startDrag({ file, icon })` from the app/main-process side. A normal Obsidian plugin renderer event can set custom `DataTransfer` values, but that is not enough for reliable drops into Finder, Chrome, or Google Drive as actual files.
- Practical workaround: open/reveal the file in Finder, then drag the real file from Finder into Google Drive or another app.
