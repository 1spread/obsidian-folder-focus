# Folder Focus

A Finder-like folder navigation view for [Obsidian](https://obsidian.md).

## Obsidian Community Plugin Submission

- Obsidian `obsidianmd/obsidian-releases` PR: [#10059](https://github.com/obsidianmd/obsidian-releases/pull/10059)
- When ObsidianReviewBot requests changes:
  - Fix issues in this repository and **push to the same branch** (no new PR needed).
  - **Do not rebase** the submission branch (reviewers will handle it after approval).
  - The bot will re-scan automatically (it may take **up to ~6 hours** after pushing changes).

## Features

### Navigation
- **Focused folder view** in the right sidebar
- **Finder-compatible keyboard shortcuts**
- **Selection history** - remembers your position when navigating back
- **Live refresh** - automatically updates when files change externally (e.g., in Finder)

### File Operations
- **Multi-selection** - Cmd+Click to toggle, Shift+Click for range selection
- **Context menu** - right-click for file operations
- **New folder/note buttons** - quick creation from the header
- **Rename/Delete folders** - directly from context menu

### Search
- **Full-text search** - search file names and content
- **Subfolder search** - includes all nested files
- **Folders only filter** - toggle to show only folders
- **Clear button** - quickly reset search

### Opening Files
- **Single click** - select item
- **Double click** - open file or enter folder
- **Cmd+Double click** - open file in new tab
- **Cmd+Enter** - open selected file in new tab

### Sorting
- Sort by **name**, **modified date**, or **created date**
- Toggle **ascending/descending** order

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to Community plugins and disable Safe mode
3. Click Browse and search for "Folder Focus"
4. Install and enable the plugin

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `obsidian-folder-focus` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Reload Obsidian and enable the plugin in Settings → Community plugins

## Usage

### Opening Folder Focus

- Click the **folder icon** in the left ribbon
- Right-click any folder → **"Open in folder focus"**
- Use command palette: **"Open folder navigation view"**

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Move selection up/down |
| `Shift+↑` / `Shift+↓` | Extend selection up/down |
| `⌘+A` / `Ctrl+A` | Select all |
| `⌘+↑` / `Ctrl+↑` | Navigate to parent folder |
| `⌘+↓` / `Ctrl+↓` | Enter folder or open file |
| `Enter` | Enter folder or open file |
| `⌘+Enter` / `Ctrl+Enter` | Open file in new tab |
| `⇧⌘+N` / `Ctrl+Shift+N` | Create new note |
| `Escape` | Clear search / Collapse selection |

### Mouse Actions

| Action | Result |
|--------|--------|
| Single click | Select item |
| Cmd/Ctrl + Click | Toggle selection (multi-select) |
| Shift + Click | Range selection |
| Double click | Enter folder or open file |
| Cmd/Ctrl + Double click | Open file in new tab |
| Right click | Context menu |

### Context Menu Options

- **Rename folder** - rename the selected folder
- **Delete folder** - move folder to trash
- **Create folder with selection** - create new folder with selected items
- Standard Obsidian file menu options

### Search

1. Type in the search box and press **Enter** to search
2. Search includes:
   - File and folder names
   - File content (markdown files)
   - All subfolders recursively
3. Toggle **"Folders only"** to filter results
4. Click **×** or press **Escape** to clear search

### Commands

All commands are available via the command palette (`⌘+P` / `Ctrl+P`):

- **Open folder navigation view** - Opens the folder navigation panel
- **Reveal active file** - Shows the current file in the navigation view
- **Navigate to parent folder** - Go up one level
- **Enter folder or open file** - Enter selected folder or open selected file
- **Create new note in current folder** - Creates a new note

## Settings

- **Open files in new tab** - When enabled, files open in a new tab instead of the current one

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-folder-focus.git
cd obsidian-folder-focus

# Install dependencies
npm install

# Build for development (with watch mode)
npm run dev

# Build for production
npm run build
```

## Support

If you find this plugin helpful, consider supporting its development:

<a href="https://buymeacoffee.com/1spread"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=1spread&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>

## License

MIT License - see [LICENSE](LICENSE) for details.
