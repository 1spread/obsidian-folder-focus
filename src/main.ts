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

    this.addCommand({
      id: 'navigate-parent',
      name: 'Navigate to parent folder',
      hotkeys: [{ modifiers: ['Mod'], key: 'ArrowUp' }],
      callback: () => this.getView()?.navigateToParent(),
    });

    this.addCommand({
      id: 'enter-folder-or-open',
      name: 'Enter folder / Open file',
      hotkeys: [{ modifiers: ['Mod'], key: 'ArrowDown' }],
      callback: () => this.getView()?.enterOrOpen(),
    });

    this.addCommand({
      id: 'create-new-note',
      name: 'Create new note in current folder',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
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

    this.addCommand({
      id: 'delete-selected',
      name: 'Delete selected file/folder',
      hotkeys: [{ modifiers: ['Mod'], key: 'Backspace' }],
      callback: () => this.getView()?.deleteSelected(),
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

    // 5. Listen for active file changes to sync view
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file) this.getView()?.syncToFile(file);
      })
    );

    // 6. Add settings tab
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

      // Sync to current file on open
      const activeFile = workspace.getActiveFile();
      if (activeFile) {
        this.getView()?.syncToFile(activeFile);
      }
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

    containerEl.createEl('h2', { text: 'Folder Focus Settings' });

    containerEl.createEl('p', {
      text: 'A Finder-like folder navigation view for Obsidian.',
      cls: 'setting-item-description',
    });

    containerEl.createEl('h3', { text: 'Usage' });

    const usageEl = containerEl.createEl('div', { cls: 'folder-focus-usage' });
    usageEl.innerHTML = `
      <ul>
        <li><strong>Open view:</strong> Click the folder icon in the left ribbon, or right-click a folder → "Open in Folder Focus"</li>
        <li><strong>⌘↑ (Cmd+Up):</strong> Navigate to parent folder</li>
        <li><strong>⌘↓ (Cmd+Down):</strong> Enter folder / Open file</li>
        <li><strong>⇧⌘N (Shift+Cmd+N):</strong> Create new note in current folder</li>
        <li><strong>⌘⌫ (Cmd+Backspace):</strong> Delete selected file/folder</li>
        <li><strong>↑/↓:</strong> Move selection up/down</li>
        <li><strong>Single click:</strong> Select folder / Open file</li>
        <li><strong>Double click:</strong> Enter folder</li>
      </ul>
    `;

    containerEl.createEl('h3', { text: 'Options' });

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
  }
}
