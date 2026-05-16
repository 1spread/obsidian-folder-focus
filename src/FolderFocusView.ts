import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile, Menu, Modal, App, setIcon } from 'obsidian';
import type FolderFocusPlugin from './main';

export const VIEW_TYPE_FOLDER_FOCUS = 'folder-focus-view';

export type SortOrder = 'name' | 'modified' | 'created';
export type SortDirection = 'asc' | 'desc';

interface FolderFocusDragData {
  type: 'folder-focus-items';
  paths: string[];
}

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
    return 'Folder focus';
  }

  getIcon(): string {
    return 'folder';
  }

  onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass('folder-focus-container');

    // Header section
    this.headerEl = container.createDiv({ cls: 'folder-focus-header' });

    // List section
    this.listEl = container.createDiv({ cls: 'folder-focus-list' });

    // Register keyboard navigation within the view
    this.registerDomEvent(this.listEl, 'keydown', (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    });

    // Listen to vault changes for live updates
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (this.isInCurrentFolder(file)) {
          void this.refreshCurrentFolder().catch((e) => {
            console.error('Folder focus: failed to refresh after create', e);
          });
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (this.isInCurrentFolder(file)) {
          void this.refreshCurrentFolder().catch((e) => {
            console.error('Folder focus: failed to refresh after delete', e);
          });
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        if (this.isInCurrentFolder(file) || this.wasInCurrentFolder(oldPath)) {
          void this.refreshCurrentFolder().catch((e) => {
            console.error('Folder focus: failed to refresh after rename', e);
          });
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

    return Promise.resolve();
  }

  onClose(): Promise<void> {
    // Cleanup
    this.folderHistory.clear();

    return Promise.resolve();
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
        case 'modified': {
          const aMtime = a instanceof TFile ? a.stat.mtime : 0;
          const bMtime = b instanceof TFile ? b.stat.mtime : 0;
          result = aMtime - bMtime;
          break;
        }
        case 'created': {
          const aCtime = a instanceof TFile ? a.stat.ctime : 0;
          const bCtime = b instanceof TFile ? b.stat.ctime : 0;
          result = aCtime - bCtime;
          break;
        }
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
    nameEl.setText(this.currentFolder.name || 'Vault root');

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
      // Keep the listener synchronous; ignore unknown values safely.
      void (async () => {
        const v = sortSelect.value;
        if (v === 'name' || v === 'modified' || v === 'created') {
          this.sortOrder = v;
        }
        if (!this.currentFolder) return;
        this.items = this.getSortedChildren(this.currentFolder);
        await this.applyFilter();
        this.renderList();
      })().catch((e) => {
        console.error('Folder focus: failed to change sort order', e);
      });
    });

    // Sort direction toggle button
    const dirBtn = sortEl.createEl('button', { cls: 'folder-focus-sort-dir' });
    setIcon(dirBtn, this.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down');
    dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');

    dirBtn.addEventListener('click', () => {
      void (async () => {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        dirBtn.empty();
        setIcon(dirBtn, this.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down');
        dirBtn.setAttribute('aria-label', this.sortDirection === 'asc' ? 'Ascending' : 'Descending');
        if (!this.currentFolder) return;
        this.items = this.getSortedChildren(this.currentFolder);
        await this.applyFilter();
        this.renderList();
      })().catch((e) => {
        console.error('Folder focus: failed to toggle sort direction', e);
      });
    });

    // New folder button
    const newFolderBtn = sortEl.createEl('button', { cls: 'folder-focus-new-folder' });
    setIcon(newFolderBtn, 'folder-plus');
    newFolderBtn.setAttribute('aria-label', 'New folder');
    newFolderBtn.addEventListener('click', () => {
      void this.createNewFolder().catch((e) => {
        console.error('Folder focus: failed to create folder', e);
      });
    });

    // New note button
    const newNoteBtn = sortEl.createEl('button', { cls: 'folder-focus-new-note' });
    setIcon(newNoteBtn, 'file-plus');
    newNoteBtn.setAttribute('aria-label', 'New note');
    newNoteBtn.addEventListener('click', () => {
      void this.createNewNote().catch((e) => {
        console.error('Folder focus: failed to create note', e);
      });
    });

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
    setIcon(clearBtn, 'x');
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.toggleClass('is-hidden', !this.searchQuery);

    clearBtn.addEventListener('click', () => {
      void (async () => {
        this.searchQuery = '';
        this.searchEl.value = '';
        clearBtn.addClass('is-hidden');
        await this.applyFilter();
        this.renderList();
        this.searchEl.focus();
      })().catch((e) => {
        console.error('Folder focus: failed to clear search', e);
      });
    });

    // Update clear button visibility on input
    this.searchEl.addEventListener('input', () => {
      clearBtn.toggleClass('is-hidden', !this.searchEl.value);
    });

    // Enter key to search, Escape to clear
    this.searchEl.addEventListener('keydown', (event: KeyboardEvent) => {
      void (async () => {
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
            clearBtn.addClass('is-hidden');
            await this.applyFilter();
            this.renderList();
          }
          this.listEl.focus();
        }
      })().catch((e) => {
        console.error('Folder focus: failed to handle search keydown', e);
      });
    });

    // Folders only toggle
    const toggleContainer = searchContainer.createDiv({ cls: 'folder-focus-search-toggle' });
    const toggleLabel = toggleContainer.createEl('label', { cls: 'folder-focus-toggle-label' });
    const toggleCheckbox = toggleLabel.createEl('input', { type: 'checkbox' });
    toggleCheckbox.checked = this.searchFoldersOnly;
    toggleLabel.appendText(' Folders only');

    toggleCheckbox.addEventListener('change', () => {
      void (async () => {
        this.searchFoldersOnly = toggleCheckbox.checked;
        if (this.searchQuery) {
          await this.applyFilter();
          this.renderList();
        }
      })().catch((e) => {
        console.error('Folder focus: failed to toggle folders-only filter', e);
      });
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
      setIcon(iconEl, isFolder ? 'folder' : 'file');

      // Name
      const nameEl = itemEl.createSpan({ cls: 'folder-focus-item-name' });
      nameEl.setText(item.name);

      // Chevron for folders
      if (isFolder) {
        const chevronEl = itemEl.createSpan({ cls: 'folder-focus-item-chevron' });
        setIcon(chevronEl, 'chevron-right');
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
        if (item instanceof TFolder) {
          this.enterFolder(item);
          return;
        }
        if (item instanceof TFile) {
          const openInNewTab = event.metaKey || event.ctrlKey;
          this.openFile(item, openInNewTab);
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
            .onClick(() => {
              void this.renameItem(item).catch((e) => {
                console.error('Folder focus: failed to rename item', e);
              });
            });
          });

          menu.addItem((menuItem) => {
            menuItem
              .setTitle('Delete folder')
              .setIcon('trash')
              .onClick(() => {
                void this.deleteItem(item).catch((e) => {
                  console.error('Folder focus: failed to delete item', e);
                });
              });
          });

          menu.addSeparator();
        } else {
          // File-specific options
          menu.addItem((menuItem) => {
          menuItem
            .setTitle('Delete file')
            .setIcon('trash')
            .onClick(() => {
              void this.deleteItem(item).catch((e) => {
                console.error('Folder focus: failed to delete item', e);
              });
            });
          });

          menu.addSeparator();
        }

        // Copy path(s)
        const selectedItems = Array.from(this.selectedIndices)
          .map(i => this.filteredItems[i])
          .filter(Boolean);
        const copyItems = selectedItems.length > 1 ? selectedItems : [item];
        menu.addItem((menuItem) => {
          menuItem
            .setTitle(copyItems.length > 1 ? `Copy paths (${copyItems.length})` : 'Copy path')
            .setIcon('copy')
            .onClick(() => {
              void (async () => {
                const paths = copyItems.map((i) => i.path).join('\n');
                await navigator.clipboard.writeText(paths);
              })().catch((e) => {
                console.error('Folder focus: failed to copy paths', e);
              });
            });
        });

        menu.addSeparator();

        // Custom item: Create folder with selection
        menu.addItem((menuItem) => {
        menuItem
          .setTitle('Create folder with selection')
          .setIcon('folder-plus')
          .onClick(() => {
            void this.createFolderWithSelection().catch((e) => {
              console.error('Folder focus: failed to create folder from selection', e);
            });
          });
        });

        menu.addSeparator();

        // Add Obsidian's standard file menu items
        this.app.workspace.trigger('file-menu', menu, item, 'folder-focus-view', this.leaf);
        menu.showAtMouseEvent(event);
      });

      // Drag and drop - make item draggable
      itemEl.setAttribute('draggable', 'true');

      itemEl.addEventListener('dragstart', (event: DragEvent) => {
        // If dragged item is not selected, select only it
        if (!this.selectedIndices.has(index)) {
          this.selectedIndices.clear();
          this.selectedIndices.add(index);
          this.anchorIndex = index;
          this.focusIndex = index;
          this.updateSelection();
        }

        // Store selected item paths in DataTransfer
        const selectedPaths = Array.from(this.selectedIndices)
          .map((i) => this.filteredItems[i]?.path)
          .filter((p): p is string => typeof p === 'string');

        const dt = event.dataTransfer;
        if (!dt) return;
        dt.setData('application/json', JSON.stringify({
          type: 'folder-focus-items',
          paths: selectedPaths,
        }));
        dt.effectAllowed = 'move';

        // Add visual feedback
        this.selectedIndices.forEach(i => {
          this.itemElements[i]?.addClass('is-dragging');
        });
      });

      itemEl.addEventListener('dragend', () => {
        // Clean up drag visual state
        this.itemElements.forEach(el => {
          el.removeClass('is-dragging');
          el.removeClass('is-drop-target');
          el.removeClass('is-drop-invalid');
        });
      });

      // Drop target events - only for folders
      if (isFolder) {
        itemEl.addEventListener('dragover', (event: DragEvent) => {
          event.preventDefault();

          const dragData = this.getDragData(event);
          if (!dragData) return;

          if (!(item instanceof TFolder)) return;
          const targetFolder = item;
          const isInvalidTarget = this.isInvalidDropTarget(dragData.paths, targetFolder);

          if (isInvalidTarget) {
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
            itemEl.removeClass('is-drop-target');
            itemEl.addClass('is-drop-invalid');
          } else {
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            itemEl.addClass('is-drop-target');
            itemEl.removeClass('is-drop-invalid');
          }
        });

        itemEl.addEventListener('dragenter', (event: DragEvent) => {
          event.preventDefault();
        });

        itemEl.addEventListener('dragleave', (event: DragEvent) => {
          const rt = event.relatedTarget;
          if (rt instanceof Node && !itemEl.contains(rt)) {
            itemEl.removeClass('is-drop-target');
            itemEl.removeClass('is-drop-invalid');
          }
        });

        itemEl.addEventListener('drop', (event: DragEvent) => {
          void (async () => {
            event.preventDefault();
            itemEl.removeClass('is-drop-target');
            itemEl.removeClass('is-drop-invalid');

            const dragData = this.getDragData(event);
            if (!dragData) return;
            if (!(item instanceof TFolder)) return;
            const targetFolder = item;

            if (this.isInvalidDropTarget(dragData.paths, targetFolder)) {
              return;
            }

            await this.moveItemsToFolder(dragData.paths, targetFolder);
          })().catch((e) => {
            console.error('Folder focus: failed to drop items', e);
          });
        });
      }

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
          void this.createNewNote().catch((e) => {
            console.error('Folder focus: failed to create note from shortcut', e);
          });
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
    void leaf.openFile(file).catch((e) => {
      console.error('Folder focus: failed to open file', e);
    });
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
    await this.app.fileManager.trashFile(item);
  }

  async promptForName(currentName: string, title: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new RenameModal(this.app, currentName, title, (result) => {
        resolve(result);
      });
      modal.open();
    });
  }

  // --- Drag and Drop helpers ---

  private getDragData(event: DragEvent): FolderFocusDragData | null {
    try {
      const data = event.dataTransfer?.getData('application/json');
      if (!data) return null;
      const parsed: unknown = JSON.parse(data);
      if (!this.isFolderFocusDragData(parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private isFolderFocusDragData(value: unknown): value is FolderFocusDragData {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as { type?: unknown; paths?: unknown };
    return candidate.type === 'folder-focus-items'
      && Array.isArray(candidate.paths)
      && candidate.paths.every((path): path is string => typeof path === 'string');
  }

  private isInvalidDropTarget(sourcePaths: string[], targetFolder: TFolder): boolean {
    for (const sourcePath of sourcePaths) {
      // Cannot drop on itself
      if (sourcePath === targetFolder.path) {
        return true;
      }

      const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);

      // Already in target folder
      if (sourceFile?.parent?.path === targetFolder.path) {
        return true;
      }

      // Cannot drop folder into its own descendant (circular reference)
      if (sourceFile instanceof TFolder) {
        if (targetFolder.path.startsWith(sourcePath + '/')) {
          return true;
        }
      }

      // Check for name conflict
      const sourceFileName = sourceFile?.name;
      if (sourceFileName) {
        const existingPath = targetFolder.path
          ? `${targetFolder.path}/${sourceFileName}`
          : sourceFileName;
        if (this.app.vault.getAbstractFileByPath(existingPath)) {
          return true;
        }
      }
    }
    return false;
  }

  private async moveItemsToFolder(sourcePaths: string[], targetFolder: TFolder): Promise<void> {
    for (const sourcePath of sourcePaths) {
      const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
      if (!sourceFile) continue;

      const newPath = targetFolder.path
        ? `${targetFolder.path}/${sourceFile.name}`
        : sourceFile.name;

      try {
        await this.app.fileManager.renameFile(sourceFile, newPath);
      } catch (error) {
        console.error(`Failed to move ${sourcePath}:`, error);
      }
    }

    // Clear selection after move
    this.selectedIndices.clear();
    if (this.filteredItems.length > 0) {
      this.selectedIndices.add(0);
    }
    this.anchorIndex = 0;
    this.focusIndex = 0;
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
    contentEl.createDiv({ cls: 'folder-focus-modal-title', text: this.title });

    const inputEl = contentEl.createEl('input', {
      type: 'text',
      value: this.currentName,
      cls: 'folder-focus-modal-input',
    });
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
