import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile } from 'obsidian';
import type FolderFocusPlugin from './main';

export const VIEW_TYPE_FOLDER_FOCUS = 'folder-focus-view';

export type SortOrder = 'name' | 'modified' | 'created';
export type SortDirection = 'asc' | 'desc';

export class FolderFocusView extends ItemView {
  plugin: FolderFocusPlugin;

  // State
  currentFolder: TFolder | null = null;
  selectedIndex: number = 0;
  items: TAbstractFile[] = [];
  sortOrder: SortOrder = 'name';
  sortDirection: SortDirection = 'asc';

  // Folder history: remembers selected item path when navigating away
  folderHistory: Map<string, string> = new Map();

  // DOM elements
  headerEl!: HTMLElement;
  listEl!: HTMLElement;
  itemElements: HTMLElement[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: FolderFocusPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_FOLDER_FOCUS;
  }

  getDisplayText(): string {
    return 'Folder Focus';
  }

  getIcon(): string {
    return 'folder';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass('folder-focus-container');

    // Header section
    this.headerEl = container.createDiv({ cls: 'folder-focus-header' });

    // List section
    this.listEl = container.createDiv({ cls: 'folder-focus-list' });

    // Register keyboard navigation within the view
    this.registerDomEvent(this.listEl, 'keydown', this.handleKeyDown.bind(this));

    // Initialize with current file's folder
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.parent) {
      this.setFolder(activeFile.parent, activeFile.path);
    } else {
      // Fallback to vault root
      this.setFolder(this.app.vault.getRoot());
    }
  }

  async onClose() {
    // Cleanup
    this.folderHistory.clear();
  }

  // --- State Management ---

  setFolder(folder: TFolder, selectPath?: string) {
    this.currentFolder = folder;
    this.items = this.getSortedChildren(folder);

    // Determine which item to select
    let targetIndex = 0;

    if (selectPath) {
      // Select specific item by path
      const index = this.items.findIndex(item => item.path === selectPath);
      if (index >= 0) targetIndex = index;
    } else {
      // Check folder history for previously selected item
      const historyPath = this.folderHistory.get(folder.path);
      if (historyPath) {
        const index = this.items.findIndex(item => item.path === historyPath);
        if (index >= 0) targetIndex = index;
      }
    }

    this.selectedIndex = targetIndex;
    this.renderAll();
  }

  getSortedChildren(folder: TFolder): TAbstractFile[] {
    const children = [...folder.children];
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    // Sort: folders first, then files, sorted within each group
    return children.sort((a, b) => {
      const aIsFolder = a instanceof TFolder;
      const bIsFolder = b instanceof TFolder;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // Apply sort order within same type
      let result: number;
      switch (this.sortOrder) {
        case 'modified':
          const aMtime = a instanceof TFile ? a.stat.mtime : 0;
          const bMtime = b instanceof TFile ? b.stat.mtime : 0;
          result = aMtime - bMtime;
          break;
        case 'created':
          const aCtime = a instanceof TFile ? a.stat.ctime : 0;
          const bCtime = b instanceof TFile ? b.stat.ctime : 0;
          result = aCtime - bCtime;
          break;
        case 'name':
        default:
          result = a.name.localeCompare(b.name);
          break;
      }
      return result * dir;
    });
  }

  syncToFile(file: TFile) {
    if (file.parent && file.parent !== this.currentFolder) {
      this.setFolder(file.parent, file.path);
    } else {
      // Just select the file in current list
      const index = this.items.findIndex(item => item.path === file.path);
      if (index >= 0) {
        this.selectedIndex = index;
        this.updateSelection();
      }
    }
  }

  revealActiveFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.parent) {
      this.setFolder(activeFile.parent, activeFile.path);
    }
  }

  // --- Rendering ---

  renderAll() {
    this.renderHeader();
    this.renderList();
  }

  renderHeader() {
    this.headerEl.empty();
    if (!this.currentFolder) return;

    // Top row: name and sort selector
    const topRow = this.headerEl.createDiv({ cls: 'folder-focus-header-top' });

    const nameEl = topRow.createDiv({ cls: 'folder-focus-name' });
    nameEl.setText(this.currentFolder.name || 'Vault Root');

    // Sort dropdown
    const sortEl = topRow.createDiv({ cls: 'folder-focus-sort' });
    const sortSelect = sortEl.createEl('select', { cls: 'folder-focus-sort-select' });

    const options: { value: SortOrder; label: string }[] = [
      { value: 'name', label: 'Name' },
      { value: 'modified', label: 'Modified' },
      { value: 'created', label: 'Created' },
    ];

    options.forEach(opt => {
      const optionEl = sortSelect.createEl('option', { value: opt.value, text: opt.label });
      if (opt.value === this.sortOrder) {
        optionEl.selected = true;
      }
    });

    sortSelect.addEventListener('change', () => {
      this.sortOrder = sortSelect.value as SortOrder;
      this.items = this.getSortedChildren(this.currentFolder!);
      this.selectedIndex = 0;
      this.renderList();
    });

    // Sort direction toggle button
    const dirBtn = sortEl.createEl('button', { cls: 'folder-focus-sort-dir' });
    dirBtn.innerHTML = this.sortDirection === 'asc' ? this.getAscIcon() : this.getDescIcon();
    dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');

    dirBtn.addEventListener('click', () => {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      dirBtn.innerHTML = this.sortDirection === 'asc' ? this.getAscIcon() : this.getDescIcon();
      dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');
      this.items = this.getSortedChildren(this.currentFolder!);
      this.selectedIndex = 0;
      this.renderList();
    });

    const pathEl = this.headerEl.createDiv({ cls: 'folder-focus-path' });
    pathEl.setText(this.currentFolder.path || '/');
  }

  renderList() {
    this.listEl.empty();
    this.listEl.setAttribute('tabindex', '0');
    this.itemElements = [];

    this.items.forEach((item, index) => {
      const isFolder = item instanceof TFolder;
      const itemEl = this.listEl.createDiv({
        cls: `folder-focus-item ${isFolder ? 'is-folder' : 'is-file'}`,
      });
      itemEl.dataset.index = String(index);

      if (index === this.selectedIndex) {
        itemEl.addClass('is-selected');
      }

      // Icon
      const iconEl = itemEl.createSpan({ cls: 'folder-focus-item-icon' });
      if (isFolder) {
        iconEl.innerHTML = this.getFolderIcon();
      } else {
        iconEl.innerHTML = this.getFileIcon();
      }

      // Name
      const nameEl = itemEl.createSpan({ cls: 'folder-focus-item-name' });
      nameEl.setText(item.name);

      // Chevron for folders
      if (isFolder) {
        const chevronEl = itemEl.createSpan({ cls: 'folder-focus-item-chevron' });
        chevronEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
      }

      // Click handler - select only
      itemEl.addEventListener('click', () => {
        this.selectedIndex = index;
        this.updateSelection();
        this.listEl.focus();
      });

      // Double-click handler - enter folder or open file
      itemEl.addEventListener('dblclick', () => {
        this.selectedIndex = index;
        if (isFolder) {
          this.enterFolder(item as TFolder);
        } else {
          this.openFile(item as TFile);
        }
      });

      this.itemElements.push(itemEl);
    });

    // Focus the list
    this.listEl.focus();

    // Scroll selected item into view
    this.scrollToSelected();
  }

  updateSelection(previousIndex?: number) {
    // Only update the changed elements, not all of them
    if (previousIndex !== undefined && this.itemElements[previousIndex]) {
      this.itemElements[previousIndex].removeClass('is-selected');
    }
    if (this.itemElements[this.selectedIndex]) {
      this.itemElements[this.selectedIndex].addClass('is-selected');
    }

    this.scrollToSelected();
  }

  scrollToSelected() {
    const selectedEl = this.itemElements[this.selectedIndex];
    if (selectedEl) {
      // Use scrollIntoView with 'nearest' to minimize scrolling
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }

  getFolderIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  }

  getFileIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }

  getAscIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>';
  }

  getDescIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
  }

  // --- Keyboard Navigation ---

  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          this.selectPrevious();
        }
        break;
      case 'ArrowDown':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          this.selectNext();
        }
        break;
      case 'Enter':
        event.preventDefault();
        this.enterOrOpen();
        break;
    }
  }

  selectPrevious() {
    if (this.selectedIndex > 0) {
      const prev = this.selectedIndex;
      this.selectedIndex--;
      this.updateSelection(prev);
    }
  }

  selectNext() {
    if (this.selectedIndex < this.items.length - 1) {
      const prev = this.selectedIndex;
      this.selectedIndex++;
      this.updateSelection(prev);
    }
  }

  // --- Commands ---

  navigateToParent() {
    if (!this.currentFolder?.parent) return;

    // Save current selection to history before navigating
    const currentItem = this.items[this.selectedIndex];
    if (currentItem) {
      this.folderHistory.set(this.currentFolder.path, currentItem.path);
    }

    // Navigate to parent, selecting current folder
    this.setFolder(this.currentFolder.parent, this.currentFolder.path);
  }

  enterFolder(folder: TFolder) {
    // Save current selection before entering
    const currentItem = this.items[this.selectedIndex];
    if (currentItem && this.currentFolder) {
      this.folderHistory.set(this.currentFolder.path, currentItem.path);
    }

    this.setFolder(folder);
  }

  openFile(file: TFile) {
    // Respect the "open in new tab" setting
    const openInNewTab = this.plugin.settings.openInNewTab;
    const leaf = this.app.workspace.getLeaf(openInNewTab ? 'tab' : false);
    leaf.openFile(file);
  }

  enterOrOpen() {
    const selected = this.items[this.selectedIndex];
    if (!selected) return;

    if (selected instanceof TFolder) {
      this.enterFolder(selected);
    } else if (selected instanceof TFile) {
      this.openFile(selected);
    }
  }

  async createNewNote() {
    if (!this.currentFolder) return;

    const baseName = 'Untitled';
    let fileName = `${baseName}.md`;
    let counter = 1;

    while (this.app.vault.getAbstractFileByPath(
      this.currentFolder.path ? `${this.currentFolder.path}/${fileName}` : fileName
    )) {
      fileName = `${baseName} ${counter}.md`;
      counter++;
    }

    const filePath = this.currentFolder.path
      ? `${this.currentFolder.path}/${fileName}`
      : fileName;

    const newFile = await this.app.vault.create(filePath, '');
    const openInNewTab = this.plugin.settings.openInNewTab;
    const leaf = this.app.workspace.getLeaf(openInNewTab ? 'tab' : false);
    await leaf.openFile(newFile);

    // Refresh and select the new file
    this.setFolder(this.currentFolder, newFile.path);
  }
}
