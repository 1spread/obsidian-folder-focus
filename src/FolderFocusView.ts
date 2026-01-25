import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile, Menu, Modal, App } from 'obsidian';
import type FolderFocusPlugin from './main';

export const VIEW_TYPE_FOLDER_FOCUS = 'folder-focus-view';

export type SortOrder = 'name' | 'modified' | 'created';
export type SortDirection = 'asc' | 'desc';

export class FolderFocusView extends ItemView {
  plugin: FolderFocusPlugin;

  // State
  currentFolder: TFolder | null = null;
  items: TAbstractFile[] = [];
  filteredItems: TAbstractFile[] = [];
  sortOrder: SortOrder = 'name';
  sortDirection: SortDirection = 'asc';
  searchQuery: string = '';

  // Selection state
  selectedIndices: Set<number> = new Set([0]);  // Multiple selection
  anchorIndex: number = 0;                       // Shift+Click anchor
  focusIndex: number = 0;                        // Keyboard cursor position

  // All files recursively (for search)
  allFilesInFolder: TAbstractFile[] = [];
  searchFoldersOnly: boolean = false;

  // Folder history: remembers selected item path when navigating away
  folderHistory: Map<string, string> = new Map();

  // DOM elements
  headerEl!: HTMLElement;
  searchEl!: HTMLInputElement;
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

    // Listen to vault changes for live updates
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (this.isInCurrentFolder(file)) {
          this.refreshCurrentFolder();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (this.isInCurrentFolder(file)) {
          this.refreshCurrentFolder();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        if (this.isInCurrentFolder(file) || this.wasInCurrentFolder(oldPath)) {
          this.refreshCurrentFolder();
        }
      })
    );

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
    this.allFilesInFolder = this.getAllFilesRecursively(folder);

    // Clear search when changing folders
    this.searchQuery = '';
    this.filteredItems = this.items;

    // Determine which item to select
    let targetIndex = 0;

    if (selectPath) {
      // Select specific item by path
      const index = this.filteredItems.findIndex(item => item.path === selectPath);
      if (index >= 0) targetIndex = index;
    } else {
      // Check folder history for previously selected item
      const historyPath = this.folderHistory.get(folder.path);
      if (historyPath) {
        const index = this.filteredItems.findIndex(item => item.path === historyPath);
        if (index >= 0) targetIndex = index;
      }
    }

    // Initialize selection state
    this.selectedIndices.clear();
    this.selectedIndices.add(targetIndex);
    this.anchorIndex = targetIndex;
    this.focusIndex = targetIndex;

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
        this.selectedIndices.clear();
        this.selectedIndices.add(index);
        this.anchorIndex = index;
        this.focusIndex = index;
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

    sortSelect.addEventListener('change', async () => {
      this.sortOrder = sortSelect.value as SortOrder;
      this.items = this.getSortedChildren(this.currentFolder!);
      await this.applyFilter();
      this.renderList();
    });

    // Sort direction toggle button
    const dirBtn = sortEl.createEl('button', { cls: 'folder-focus-sort-dir' });
    dirBtn.innerHTML = this.sortDirection === 'asc' ? this.getAscIcon() : this.getDescIcon();
    dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');

    dirBtn.addEventListener('click', async () => {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      dirBtn.innerHTML = this.sortDirection === 'asc' ? this.getAscIcon() : this.getDescIcon();
      dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');
      this.items = this.getSortedChildren(this.currentFolder!);
      await this.applyFilter();
      this.renderList();
    });

    // New folder button
    const newFolderBtn = sortEl.createEl('button', { cls: 'folder-focus-new-folder' });
    newFolderBtn.innerHTML = this.getNewFolderIcon();
    newFolderBtn.setAttribute('aria-label', 'New folder');
    newFolderBtn.addEventListener('click', () => this.createNewFolder());

    // New note button
    const newNoteBtn = sortEl.createEl('button', { cls: 'folder-focus-new-note' });
    newNoteBtn.innerHTML = this.getNewNoteIcon();
    newNoteBtn.setAttribute('aria-label', 'New note');
    newNoteBtn.addEventListener('click', () => this.createNewNote());

    const pathEl = this.headerEl.createDiv({ cls: 'folder-focus-path' });
    pathEl.setText(this.currentFolder.path || '/');

    // Search box with clear button
    const searchContainer = this.headerEl.createDiv({ cls: 'folder-focus-search' });
    const searchWrapper = searchContainer.createDiv({ cls: 'folder-focus-search-wrapper' });

    this.searchEl = searchWrapper.createEl('input', {
      type: 'text',
      placeholder: 'Search in folder...',
      cls: 'folder-focus-search-input',
    });
    this.searchEl.value = this.searchQuery;

    // Clear button
    const clearBtn = searchWrapper.createEl('button', { cls: 'folder-focus-search-clear' });
    clearBtn.innerHTML = this.getClearIcon();
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.style.display = this.searchQuery ? 'flex' : 'none';

    clearBtn.addEventListener('click', async () => {
      this.searchQuery = '';
      this.searchEl.value = '';
      clearBtn.style.display = 'none';
      await this.applyFilter();
      this.renderList();
      this.searchEl.focus();
    });

    // Update clear button visibility on input
    this.searchEl.addEventListener('input', () => {
      clearBtn.style.display = this.searchEl.value ? 'flex' : 'none';
    });

    // Enter key to search, Escape to clear
    this.searchEl.addEventListener('keydown', async (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.searchQuery = this.searchEl.value;
        await this.applyFilter();
        this.renderList();
        this.listEl.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (this.searchQuery || this.searchEl.value) {
          this.searchQuery = '';
          this.searchEl.value = '';
          clearBtn.style.display = 'none';
          await this.applyFilter();
          this.renderList();
        }
        this.listEl.focus();
      }
    });

    // Folders only toggle
    const toggleContainer = searchContainer.createDiv({ cls: 'folder-focus-search-toggle' });
    const toggleLabel = toggleContainer.createEl('label', { cls: 'folder-focus-toggle-label' });
    const toggleCheckbox = toggleLabel.createEl('input', { type: 'checkbox' });
    toggleCheckbox.checked = this.searchFoldersOnly;
    toggleLabel.appendText(' Folders only');

    toggleCheckbox.addEventListener('change', async () => {
      this.searchFoldersOnly = toggleCheckbox.checked;
      if (this.searchQuery) {
        await this.applyFilter();
        this.renderList();
      }
    });
  }

  async applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredItems = this.items;
    } else {
      const query = this.searchQuery.toLowerCase();
      const matchedItems: TAbstractFile[] = [];

      // Search all files recursively (including subfolders)
      for (const item of this.allFilesInFolder) {
        // If folders only, skip files
        if (this.searchFoldersOnly && !(item instanceof TFolder)) {
          continue;
        }

        // Match by name
        if (item.name.toLowerCase().includes(query)) {
          matchedItems.push(item);
          continue;
        }

        // Match by file content (for markdown files only, skip if folders only)
        if (!this.searchFoldersOnly && item instanceof TFile && item.extension === 'md') {
          try {
            const content = await this.app.vault.cachedRead(item);
            if (content.toLowerCase().includes(query)) {
              matchedItems.push(item);
            }
          } catch {
            // Skip if can't read
          }
        }
      }

      this.filteredItems = matchedItems;
    }

    // Reset selection to first item
    this.selectedIndices.clear();
    if (this.filteredItems.length > 0) {
      this.selectedIndices.add(0);
    }
    this.anchorIndex = 0;
    this.focusIndex = 0;
  }

  renderList() {
    this.listEl.empty();
    this.listEl.setAttribute('tabindex', '0');
    this.itemElements = [];

    this.filteredItems.forEach((item, index) => {
      const isFolder = item instanceof TFolder;
      const itemEl = this.listEl.createDiv({
        cls: `folder-focus-item ${isFolder ? 'is-folder' : 'is-file'}`,
      });
      itemEl.dataset.index = String(index);

      if (this.selectedIndices.has(index)) {
        itemEl.addClass('is-selected');
      }
      if (index === this.focusIndex) {
        itemEl.addClass('is-focused');
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

      // Click handler - select with modifier key support
      itemEl.addEventListener('click', (event: MouseEvent) => {
        const isMod = event.metaKey || event.ctrlKey;
        const isShift = event.shiftKey;

        if (isMod && !isShift) {
          // Cmd/Ctrl+Click: Toggle selection
          if (this.selectedIndices.has(index)) {
            if (this.selectedIndices.size > 1) {
              this.selectedIndices.delete(index);
            }
          } else {
            this.selectedIndices.add(index);
          }
          this.focusIndex = index;
        } else if (isShift) {
          // Shift+Click: Range selection
          this.selectedIndices.clear();
          const start = Math.min(this.anchorIndex, index);
          const end = Math.max(this.anchorIndex, index);
          for (let i = start; i <= end; i++) {
            this.selectedIndices.add(i);
          }
          this.focusIndex = index;
        } else {
          // Normal click: Single selection
          this.selectedIndices.clear();
          this.selectedIndices.add(index);
          this.anchorIndex = index;
          this.focusIndex = index;
        }

        this.updateSelection();
        this.listEl.focus();
      });

      // Double-click handler - enter folder or open file
      itemEl.addEventListener('dblclick', (event: MouseEvent) => {
        this.focusIndex = index;
        if (isFolder) {
          this.enterFolder(item as TFolder);
        } else {
          const openInNewTab = event.metaKey || event.ctrlKey;
          this.openFile(item as TFile, openInNewTab);
        }
      });

      // Right-click handler - context menu
      itemEl.addEventListener('contextmenu', (event: MouseEvent) => {
        event.preventDefault();

        // If right-clicked item is not selected, select only it
        if (!this.selectedIndices.has(index)) {
          this.selectedIndices.clear();
          this.selectedIndices.add(index);
          this.anchorIndex = index;
          this.focusIndex = index;
          this.updateSelection();
        }

        // Show context menu
        const menu = new Menu();

        // Folder-specific options
        if (isFolder) {
          menu.addItem((menuItem) => {
            menuItem
              .setTitle('Rename folder')
              .setIcon('pencil')
              .onClick(() => this.renameItem(item));
          });

          menu.addItem((menuItem) => {
            menuItem
              .setTitle('Delete folder')
              .setIcon('trash')
              .onClick(() => this.deleteItem(item));
          });

          menu.addSeparator();
        }

        // Custom item: Create folder with selection
        menu.addItem((menuItem) => {
          menuItem
            .setTitle('Create folder with selection')
            .setIcon('folder-plus')
            .onClick(() => this.createFolderWithSelection());
        });

        menu.addSeparator();

        // Add Obsidian's standard file menu items
        this.app.workspace.trigger('file-menu', menu, item, 'folder-focus-view', this.leaf);
        menu.showAtMouseEvent(event);
      });

      this.itemElements.push(itemEl);
    });

    // Scroll focused item into view
    this.scrollToFocused();
  }

  updateSelection() {
    // Update all item elements with current selection state
    this.itemElements.forEach((el, index) => {
      el.toggleClass('is-selected', this.selectedIndices.has(index));
      el.toggleClass('is-focused', index === this.focusIndex);
    });

    this.scrollToFocused();
  }

  scrollToFocused() {
    const focusedEl = this.itemElements[this.focusIndex];
    if (focusedEl) {
      // Use scrollIntoView with 'nearest' to minimize scrolling
      focusedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
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

  getNewFolderIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>';
  }

  getNewNoteIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
  }

  getClearIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  // --- Keyboard Navigation ---

  handleKeyDown(event: KeyboardEvent) {
    const isMod = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (isMod) {
          this.navigateToParent();
        } else if (isShift) {
          this.extendSelectionUp();
        } else {
          this.moveFocusUp();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (isMod) {
          this.enterOrOpen();
        } else if (isShift) {
          this.extendSelectionDown();
        } else {
          this.moveFocusDown();
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (isMod) {
          // Cmd+Enter: Open in new tab
          this.enterOrOpenInNewTab();
        } else {
          this.enterOrOpen();
        }
        break;
      case 'n':
      case 'N':
        if (isMod && isShift) {
          event.preventDefault();
          this.createNewNote();
        }
        break;
      case 'a':
      case 'A':
        if (isMod) {
          event.preventDefault();
          this.selectAll();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.collapseSelectionToFocus();
        break;
    }
  }

  moveFocusUp() {
    if (this.focusIndex > 0) {
      this.focusIndex--;
      this.selectedIndices.clear();
      this.selectedIndices.add(this.focusIndex);
      this.anchorIndex = this.focusIndex;
      this.updateSelection();
    }
  }

  moveFocusDown() {
    if (this.focusIndex < this.filteredItems.length - 1) {
      this.focusIndex++;
      this.selectedIndices.clear();
      this.selectedIndices.add(this.focusIndex);
      this.anchorIndex = this.focusIndex;
      this.updateSelection();
    }
  }

  extendSelectionUp() {
    if (this.focusIndex > 0) {
      this.focusIndex--;
      this.selectRange(this.anchorIndex, this.focusIndex);
      this.updateSelection();
    }
  }

  extendSelectionDown() {
    if (this.focusIndex < this.filteredItems.length - 1) {
      this.focusIndex++;
      this.selectRange(this.anchorIndex, this.focusIndex);
      this.updateSelection();
    }
  }

  selectRange(fromIndex: number, toIndex: number) {
    this.selectedIndices.clear();
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    for (let i = start; i <= end; i++) {
      this.selectedIndices.add(i);
    }
  }

  selectAll() {
    for (let i = 0; i < this.filteredItems.length; i++) {
      this.selectedIndices.add(i);
    }
    this.updateSelection();
  }

  collapseSelectionToFocus() {
    this.selectedIndices.clear();
    this.selectedIndices.add(this.focusIndex);
    this.anchorIndex = this.focusIndex;
    this.updateSelection();
  }

  // --- Commands ---

  navigateToParent() {
    if (!this.currentFolder?.parent) return;

    // Save current focus to history before navigating
    const currentItem = this.filteredItems[this.focusIndex];
    if (currentItem) {
      this.folderHistory.set(this.currentFolder.path, currentItem.path);
    }

    // Navigate to parent, selecting current folder
    this.setFolder(this.currentFolder.parent, this.currentFolder.path);
  }

  enterFolder(folder: TFolder) {
    // Save current focus before entering
    const currentItem = this.filteredItems[this.focusIndex];
    if (currentItem && this.currentFolder) {
      this.folderHistory.set(this.currentFolder.path, currentItem.path);
    }

    this.setFolder(folder);
  }

  openFile(file: TFile, forceNewTab?: boolean) {
    // Use forceNewTab if provided, otherwise respect the setting
    const openInNewTab = forceNewTab ?? this.plugin.settings.openInNewTab;
    const leaf = this.app.workspace.getLeaf(openInNewTab ? 'tab' : false);
    leaf.openFile(file);
  }

  enterOrOpen() {
    const focused = this.filteredItems[this.focusIndex];
    if (!focused) return;

    if (focused instanceof TFolder) {
      this.enterFolder(focused);
    } else if (focused instanceof TFile) {
      this.openFile(focused);
    }
  }

  enterOrOpenInNewTab() {
    const focused = this.filteredItems[this.focusIndex];
    if (!focused) return;

    if (focused instanceof TFolder) {
      this.enterFolder(focused);
    } else if (focused instanceof TFile) {
      this.openFile(focused, true); // force new tab
    }
  }

  async createNewFolder() {
    if (!this.currentFolder) return;

    let folderName = 'New Folder';
    let counter = 1;
    const parentPath = this.currentFolder.path || '';

    while (this.app.vault.getAbstractFileByPath(
      parentPath ? `${parentPath}/${folderName}` : folderName
    )) {
      folderName = `New Folder ${counter}`;
      counter++;
    }

    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    await this.app.vault.createFolder(folderPath);
    // Vault event will trigger refresh automatically
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

  async createFolderWithSelection() {
    const selectedItems = Array.from(this.selectedIndices)
      .map(i => this.filteredItems[i])
      .filter(Boolean);

    if (selectedItems.length === 0 || !this.currentFolder) return;

    const parentPath = this.currentFolder.path || '';

    // Generate unique folder name
    let folderName = 'New Folder';
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(
      parentPath ? `${parentPath}/${folderName}` : folderName
    )) {
      folderName = `New Folder ${counter}`;
      counter++;
    }

    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

    try {
      // Create folder
      await this.app.vault.createFolder(folderPath);

      // Move selected items into folder
      for (const item of selectedItems) {
        const newPath = `${folderPath}/${item.name}`;
        await this.app.fileManager.renameFile(item, newPath);
      }

      // Refresh view
      this.setFolder(this.currentFolder);
    } catch (error) {
      console.error('Failed to create folder with selection:', error);
    }
  }

  // --- Recursive file retrieval ---

  getAllFilesRecursively(folder: TFolder): TAbstractFile[] {
    const results: TAbstractFile[] = [];

    const traverse = (f: TFolder) => {
      for (const child of f.children) {
        results.push(child);
        if (child instanceof TFolder) {
          traverse(child);
        }
      }
    };

    traverse(folder);
    return results;
  }

  // --- Vault change helpers ---

  isInCurrentFolder(file: TAbstractFile): boolean {
    if (!this.currentFolder) return false;
    return file.parent?.path === this.currentFolder.path;
  }

  wasInCurrentFolder(oldPath: string): boolean {
    if (!this.currentFolder) return false;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '';
    return parentPath === this.currentFolder.path;
  }

  async refreshCurrentFolder() {
    if (this.currentFolder) {
      this.items = this.getSortedChildren(this.currentFolder);
      this.allFilesInFolder = this.getAllFilesRecursively(this.currentFolder);
      await this.applyFilter();
      this.renderList();
    }
  }

  // --- Rename and Delete ---

  async renameItem(item: TAbstractFile) {
    const newName = await this.promptForName(item.name, 'Rename');
    if (newName && newName !== item.name) {
      const parentPath = item.parent?.path || '';
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      await this.app.fileManager.renameFile(item, newPath);
    }
  }

  async deleteItem(item: TAbstractFile) {
    await this.app.vault.trash(item, true);
  }

  async promptForName(currentName: string, title: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new RenameModal(this.app, currentName, title, (result) => {
        resolve(result);
      });
      modal.open();
    });
  }
}

// --- Rename Modal ---

class RenameModal extends Modal {
  currentName: string;
  title: string;
  onSubmit: (result: string | null) => void;

  constructor(app: App, currentName: string, title: string, onSubmit: (result: string | null) => void) {
    super(app);
    this.currentName = currentName;
    this.title = title;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: this.title });

    const inputEl = contentEl.createEl('input', {
      type: 'text',
      value: this.currentName,
    });
    inputEl.style.width = '100%';
    inputEl.style.marginBottom = '1em';
    inputEl.select();

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    buttonContainer.createEl('button', { text: 'Cancel' })
      .addEventListener('click', () => {
        this.close();
        this.onSubmit(null);
      });

    buttonContainer.createEl('button', { text: 'Rename', cls: 'mod-cta' })
      .addEventListener('click', () => {
        this.close();
        this.onSubmit(inputEl.value);
      });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.close();
        this.onSubmit(inputEl.value);
      } else if (e.key === 'Escape') {
        this.close();
        this.onSubmit(null);
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
