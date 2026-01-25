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

    containerEl.createEl('h2', { text: 'Folder Focus Settings' });

    containerEl.createEl('p', {
      text: 'A Finder-like folder navigation view for Obsidian.',
      cls: 'setting-item-description',
    });

    // Features section
    containerEl.createEl('h3', { text: 'Features' });
    const featuresEl = containerEl.createEl('div', { cls: 'folder-focus-usage' });
    featuresEl.innerHTML = `
      <ul>
        <li><strong>Multi-selection:</strong> Cmd+Click to toggle, Shift+Click for range</li>
        <li><strong>Full-text search:</strong> Search file names and content in subfolders</li>
        <li><strong>Folders only filter:</strong> Toggle to show only folders in search</li>
        <li><strong>Live refresh:</strong> Automatically updates when files change externally</li>
        <li><strong>Context menu:</strong> Rename, Delete, Create folder with selection</li>
        <li><strong>New folder/note buttons:</strong> Quick creation from header</li>
      </ul>
    `;

    // Keyboard shortcuts section
    containerEl.createEl('h3', { text: 'Keyboard Shortcuts' });
    const usageEl = containerEl.createEl('div', { cls: 'folder-focus-usage' });
    usageEl.innerHTML = `
      <ul>
        <li><strong>↑/↓:</strong> Move selection</li>
        <li><strong>Shift+↑/↓:</strong> Extend selection</li>
        <li><strong>⌘+A:</strong> Select all</li>
        <li><strong>⌘+↑:</strong> Navigate to parent folder</li>
        <li><strong>⌘+↓:</strong> Enter folder / Open file</li>
        <li><strong>Enter:</strong> Enter folder / Open file</li>
        <li><strong>⌘+Enter:</strong> Open file in new tab</li>
        <li><strong>⇧⌘+N:</strong> Create new note</li>
        <li><strong>Escape:</strong> Clear search / Collapse selection</li>
      </ul>
    `;

    // Mouse actions section
    containerEl.createEl('h3', { text: 'Mouse Actions' });
    const mouseEl = containerEl.createEl('div', { cls: 'folder-focus-usage' });
    mouseEl.innerHTML = `
      <ul>
        <li><strong>Click:</strong> Select item</li>
        <li><strong>Cmd+Click:</strong> Toggle selection (multi-select)</li>
        <li><strong>Shift+Click:</strong> Range selection</li>
        <li><strong>Double-click:</strong> Enter folder / Open file</li>
        <li><strong>Cmd+Double-click:</strong> Open file in new tab</li>
        <li><strong>Right-click:</strong> Context menu</li>
      </ul>
    `;

    // Options section
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
