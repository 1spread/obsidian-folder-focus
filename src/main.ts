import { Plugin, WorkspaceLeaf, TFolder, Menu, PluginSettingTab, App, Setting } from 'obsidian';
import { FolderFocusView, VIEW_TYPE_FOLDER_FOCUS } from './FolderFocusView';

interface FolderFocusSettings {
  openInNewTab: boolean;
}

const DEFAULT_SETTINGS: FolderFocusSettings = {
  openInNewTab: true,
};

export default class FolderFocusPlugin extends Plugin {
  settings!: FolderFocusSettings;

  onload(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    void this.loadSettings().then(
      () => {
        this.registerPluginFeatures();
      },
      (e) => {
        console.error('Folder focus: failed to load settings', e);
        this.registerPluginFeatures();
      }
    );
  }

  private registerPluginFeatures(): void {
    // 1. Register the view
    this.registerView(
      VIEW_TYPE_FOLDER_FOCUS,
      (leaf) => new FolderFocusView(leaf, this)
    );

    // 2. Add ribbon icon
    this.addRibbonIcon('folder', 'Open folder focus', () => {
      void this.activateView().catch((e) => {
        console.error('Folder focus: failed to activate view', e);
      });
    });

    // 3. Register commands
    this.addCommand({
      id: 'open-view',
      name: 'Open folder navigation view',
      callback: () => {
        void this.activateView().catch((e) => {
          console.error('Folder focus: failed to activate view', e);
        });
      },
    });

    // Commands without default hotkeys - shortcuts are handled in the view's keydown handler
    this.addCommand({
      id: 'navigate-parent',
      name: 'Navigate to parent folder',
      callback: () => this.getView()?.navigateToParent(),
    });

    this.addCommand({
      id: 'enter-folder-or-open',
      name: 'Enter folder or open file',
      callback: () => this.getView()?.enterOrOpen(),
    });

    this.addCommand({
      id: 'create-new-note',
      name: 'Create new note in current folder',
      callback: () => {
        const view = this.getView();
        if (view) {
          void view.createNewNote().catch((e) => {
            console.error('Folder focus: failed to create note', e);
          });
        }
      },
    });

    this.addCommand({
      id: 'reveal-active-file',
      name: 'Reveal active file',
      callback: () => {
        void (async () => {
          await this.activateView();
          this.getView()?.revealActiveFile();
        })().catch((e) => {
          console.error('Folder focus: failed to reveal active file', e);
        });
      },
    });

    // 4. Add context menu for folders
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file, _source) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle('Open in folder focus')
              .setIcon('folder')
              .onClick(() => {
                void (async () => {
                  await this.activateView();
                  const view = this.getView();
                  if (view) {
                    view.setFolder(file);
                  }
                })().catch((e) => {
                  console.error('Folder focus: failed to open folder focus from menu', e);
                });
              });
          });
        }
      })
    );

    // 5. Add settings tab
    this.addSettingTab(new FolderFocusSettingTab(this.app, this));
  }

  onunload() {
    // View cleanup handled automatically by Obsidian
  }

  async loadSettings() {
    const loadedData: unknown = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(isFolderFocusSettings(loadedData) ? loadedData : {}),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getView(): FolderFocusView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_FOCUS);
    const view = leaves[0]?.view;
    return view instanceof FolderFocusView ? view : null;
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
      await workspace.revealLeaf(leaf);
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
    const howtoEl = containerEl.createDiv({ cls: 'folder-focus-howto' });
    new Setting(howtoEl).setName('How to use').setHeading();
    const steps = howtoEl.createEl('ol');
    const stepData = [
      ['Open folder focus', 'Click the folder icon in the left ribbon, or right-click any folder and select "Open in folder focus".'],
      ['Navigate folders', 'Double-click a folder to enter it. Use ⌘+↑ to go back to the parent folder.'],
      ['Open files', 'Double-click a file to open it. Use ⌘+Double-click to open in a new tab.'],
      ['Import from Finder', 'Drag files or folders from Finder into the folder focus list to copy them into the current folder.'],
      ['Search', 'Type in the search box and press Enter to search file names and content across all subfolders.'],
      ['Multi-select', 'Hold ⌘ and click to select multiple items. Hold Shift and click for range selection.'],
    ];
    for (const [title, desc] of stepData) {
      const li = steps.createEl('li');
      li.createEl('strong', { text: title });
      li.createSpan({ text: ` — ${desc}` });
    }

    // Options section
    new Setting(containerEl).setName('Behavior').setHeading();

    new Setting(containerEl)
      .setName('Open files in new tab')
      .setDesc('When enabled, files will open in a new tab instead of the current one.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openInNewTab)
          .onChange((value) => {
            this.plugin.settings.openInNewTab = value;
            void this.plugin.saveSettings().catch((e) => {
              console.error('Folder focus: failed to save settings', e);
            });
          })
      );

    // Keyboard shortcuts (collapsible)
    const shortcutsDetails = containerEl.createEl('details', { cls: 'folder-focus-details' });
    shortcutsDetails.createEl('summary', { text: 'Keyboard shortcuts' });
    const shortcutsTable = shortcutsDetails.createEl('table', { cls: 'folder-focus-table' });
    const shortcuts = [
      ['↑ / ↓', 'Move selection'],
      ['Shift+↑ / ↓', 'Extend selection'],
      ['⌘+A', 'Select all'],
      ['⌘+↑', 'Parent folder'],
      ['⌘+↓ / Enter', 'Enter folder or open file'],
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
    mouseDetails.createEl('summary', { text: 'Mouse actions' });
    const mouseTable = mouseDetails.createEl('table', { cls: 'folder-focus-table' });
    const mouseActions = [
      ['Click', 'Select item'],
      ['⌘+Click', 'Toggle selection'],
      ['Shift+Click', 'Range selection'],
      ['Double-click', 'Enter folder or open file'],
      ['⌘+Double-click', 'Open in new tab'],
      ['Right-click', 'Context menu'],
    ];
    for (const [action, result] of mouseActions) {
      const row = mouseTable.createEl('tr');
      row.createEl('td', { text: action, cls: 'folder-focus-key' });
      row.createEl('td', { text: result });
    }

    // Buy Me a Coffee
    const supportEl = containerEl.createDiv({ cls: 'folder-focus-support' });
    supportEl.createEl('p', { text: 'If you find this plugin helpful, consider supporting its development:' });
    const link = supportEl.createEl('a', { href: 'https://buymeacoffee.com/1spread' });
    const img = link.createEl('img', { cls: 'folder-focus-bmc-img' });
    img.src = 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png';
    img.alt = 'Buy Me A Coffee';
  }
}

function isFolderFocusSettings(value: unknown): value is Partial<FolderFocusSettings> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { openInNewTab?: unknown };
  return candidate.openInNewTab === undefined || typeof candidate.openInNewTab === 'boolean';
}
