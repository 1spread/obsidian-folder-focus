# Folder Focus

A Finder-like folder navigation view for [Obsidian](https://obsidian.md).

## Features

- **Focused folder view** in the right sidebar
- **Finder-compatible keyboard shortcuts**
- **Single-click to open files**, double-click to enter folders
- **Selection history** - remembers your position when navigating back
- **Context menu integration** - right-click any folder to open it in Folder Focus
- **Sort options** - sort by name, modified date, or created date

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
- Right-click any folder → **"Open in Folder Focus"**
- Use command palette: **"Folder Focus: Open Folder Focus view"**

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘↑` / `Ctrl+↑` | Navigate to parent folder |
| `⌘↓` / `Ctrl+↓` | Enter folder / Open file |
| `⇧⌘N` / `Ctrl+Shift+N` | Create new note in current folder |
| `↑` / `↓` | Move selection up/down |
| `Enter` | Enter folder / Open file |

### Mouse Actions

- **Single click on file**: Opens the file in a new tab
- **Single click on folder**: Selects the folder
- **Double click on folder**: Enters the folder

### Commands

All commands are available via the command palette (`⌘P` / `Ctrl+P`):

- **Open Folder Focus view** - Opens the Folder Focus panel
- **Reveal active file in Folder Focus** - Shows the current file in Folder Focus
- **Navigate to parent folder** - Go up one level
- **Enter folder / Open file** - Enter selected folder or open selected file
- **Create new note in current folder** - Creates a new note

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

## License

MIT License - see [LICENSE](LICENSE) for details.
