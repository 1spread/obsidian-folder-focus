import { Plugin, WorkspaceLeaf, TFile, TFolder, Menu, PluginSettingTab, App, Setting } from 'obsidian';
import { FolderFocusView, VIEW_TYPE_FOLDER_FOCUS } from './FolderFocusView';

interface FolderFocusSettings {
  openInNewTab: boolean;
}

const DEFAULT_SETTINGS: FolderFocusSettings = {
  openInNewTab: true,
};

export default class FolderFocusPlugin extends Plugin {
  settings!: FolderFocusSettings;

  async onload() {
    await this.loadSettings();

    // 1. Register the view
    this.registerView(
      VIEW_TYPE_FOLDER_FOCUS,
      (leaf) => new FolderFocusView(leaf, this)
    );

    // 2. Add ribbon icon
    this.addRibbonIcon('folder', 'Open Folder Focus', () => {
      this.activateView();
    });

    // 3. Register commands
    this.addCommand({
      id: 'open-folder-focus',
      name: 'Open Folder Focus view',
      callback: () => this.activateView(),
    });

    // Commands without default hotkeys - shortcuts are handled in the view's keydown handler
    this.addCommand({
      id: 'navigate-parent',
      name: 'Navigate to parent folder',
      callback: () => this.getView()?.navigateToParent(),
    });

    this.addCommand({
      id: 'enter-folder-or-open',
      name: 'Enter folder / Open file',
      callback: () => this.getView()?.enterOrOpen(),
    });

    this.addCommand({
      id: 'create-new-note',
      name: 'Create new note in current folder',
      callback: () => this.getView()?.createNewNote(),
    });

    this.addCommand({
      id: 'reveal-active-file',
      name: 'Reveal active file in Folder Focus',
      callback: async () => {
        await this.activateView();
        this.getView()?.revealActiveFile();
      },
    });

    // 4. Add context menu for folders
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file, source) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle('Open in Folder Focus')
              .setIcon('folder')
              .onClick(async () => {
                await this.activateView();
                const view = this.getView();
                if (view) {
                  view.setFolder(file);
                }
              });
          });
        }
      })
    );

    // 5. Add settings tab
    this.addSettingTab(new FolderFocusSettingTab(this.app, this));
  }

  async onunload() {
    // View cleanup handled automatically by Obsidian
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getView(): FolderFocusView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_FOCUS);
    return leaves.length > 0 ? (leaves[0].view as FolderFocusView) : null;
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_FOLDER_FOCUS)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: VIEW_TYPE_FOLDER_FOCUS, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}

class FolderFocusSettingTab extends PluginSettingTab {
  plugin: FolderFocusPlugin;

  constructor(app: App, plugin: FolderFocusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // How to Use section
    const howtoEl = containerEl.createEl('div', { cls: 'folder-focus-howto' });
    howtoEl.createEl('h3', { text: 'How to Use' });
    const steps = howtoEl.createEl('ol');
    const stepData = [
      ['Open Folder Focus', 'Click the folder icon in the left ribbon, or right-click any folder and select "Open in Folder Focus".'],
      ['Navigate folders', 'Double-click a folder to enter it. Use ⌘+↑ to go back to the parent folder.'],
      ['Open files', 'Double-click a file to open it. Use ⌘+Double-click to open in a new tab.'],
      ['Search', 'Type in the search box and press Enter to search file names and content across all subfolders.'],
      ['Multi-select', 'Hold ⌘ and click to select multiple items. Hold Shift and click for range selection.'],
    ];
    for (const [title, desc] of stepData) {
      const li = steps.createEl('li');
      li.createEl('strong', { text: title });
      li.createEl('span', { text: ` — ${desc}` });
    }

    // Options section
    containerEl.createEl('h3', { text: 'Options', cls: 'folder-focus-section-heading' });

    new Setting(containerEl)
      .setName('Open files in new tab')
      .setDesc('When enabled, files will open in a new tab instead of the current one.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openInNewTab)
          .onChange(async (value) => {
            this.plugin.settings.openInNewTab = value;
            await this.plugin.saveSettings();
          })
      );

    // Keyboard shortcuts (collapsible)
    const shortcutsDetails = containerEl.createEl('details', { cls: 'folder-focus-details' });
    shortcutsDetails.createEl('summary', { text: 'Keyboard Shortcuts' });
    const shortcutsTable = shortcutsDetails.createEl('table', { cls: 'folder-focus-table' });
    const shortcuts = [
      ['↑ / ↓', 'Move selection'],
      ['Shift+↑ / ↓', 'Extend selection'],
      ['⌘+A', 'Select all'],
      ['⌘+↑', 'Parent folder'],
      ['⌘+↓ / Enter', 'Enter folder / Open file'],
      ['⌘+Enter', 'Open in new tab'],
      ['⇧⌘+N', 'Create new note'],
      ['Escape', 'Clear search'],
    ];
    for (const [key, action] of shortcuts) {
      const row = shortcutsTable.createEl('tr');
      row.createEl('td', { text: key, cls: 'folder-focus-key' });
      row.createEl('td', { text: action });
    }

    // Mouse actions (collapsible)
    const mouseDetails = containerEl.createEl('details', { cls: 'folder-focus-details' });
    mouseDetails.createEl('summary', { text: 'Mouse Actions' });
    const mouseTable = mouseDetails.createEl('table', { cls: 'folder-focus-table' });
    const mouseActions = [
      ['Click', 'Select item'],
      ['⌘+Click', 'Toggle selection'],
      ['Shift+Click', 'Range selection'],
      ['Double-click', 'Enter folder / Open file'],
      ['⌘+Double-click', 'Open in new tab'],
      ['Right-click', 'Context menu'],
    ];
    for (const [action, result] of mouseActions) {
      const row = mouseTable.createEl('tr');
      row.createEl('td', { text: action, cls: 'folder-focus-key' });
      row.createEl('td', { text: result });
    }

    // Buy Me a Coffee
    const supportEl = containerEl.createEl('div', { cls: 'folder-focus-support' });
    supportEl.createEl('p', { text: 'If you find this plugin helpful, consider supporting its development:' });
    const link = supportEl.createEl('a', { href: 'https://buymeacoffee.com/1spread' });
    const img = link.createEl('img', { cls: 'folder-focus-bmc-img' });
    img.src = 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png';
    img.alt = 'Buy Me A Coffee';
  }
}
