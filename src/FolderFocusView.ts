import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import type FolderFocusPlugin from './main';

export const VIEW_TYPE_FOLDER_FOCUS = 'folder-focus-view';

export class FolderFocusView extends ItemView {
  plugin: FolderFocusPlugin;

  // State
  currentFolder: TFolder | null = null;
  selectedIndex: number = 0;
  items: TAbstractFile[] = [];

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
    // Sort: folders first, then files, alphabetically within each group
    return children.sort((a, b) => {
      const aIsFolder = a instanceof TFolder;
      const bIsFolder = b instanceof TFolder;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.name.localeCompare(b.name);
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

    const nameEl = this.headerEl.createDiv({ cls: 'folder-focus-name' });
    nameEl.setText(this.currentFolder.name || 'Vault Root');

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

      // Click handler - different behavior for files vs folders
      itemEl.addEventListener('click', () => {
        this.selectedIndex = index;
        this.updateSelection();

        // Single click opens files immediately
        if (!isFolder) {
          this.openFile(item as TFile);
        }
      });

      // Double-click handler - only for folders
      if (isFolder) {
        itemEl.addEventListener('dblclick', () => {
          this.enterFolder(item as TFolder);
        });
      }

      this.itemElements.push(itemEl);
    });

    // Focus the list
    this.listEl.focus();

    // Scroll selected item into view
    this.scrollToSelected();
  }

  updateSelection() {
    // Update CSS classes without re-rendering entire list
    this.itemElements.forEach((el, index) => {
      if (index === this.selectedIndex) {
        el.addClass('is-selected');
      } else {
        el.removeClass('is-selected');
      }
    });

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
      case 'Backspace':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          this.deleteSelected();
        }
        break;
    }
  }

  selectPrevious() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
    }
  }

  selectNext() {
    if (this.selectedIndex < this.items.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
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
    const leaf = this.app.workspace.getLeaf('tab');
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
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.openFile(newFile);

    // Refresh and select the new file
    this.setFolder(this.currentFolder, newFile.path);
  }

  async deleteSelected() {
    const selected = this.items[this.selectedIndex];
    if (!selected) return;

    const isFolder = selected instanceof TFolder;
    const typeName = isFolder ? 'folder' : 'file';

    // Confirm deletion
    const confirmed = await this.confirmDelete(selected.name, typeName);
    if (!confirmed) return;

    try {
      // Move to trash
      await this.app.vault.trash(selected, true);
      new Notice(`Moved "${selected.name}" to trash`);

      // Refresh the view
      if (this.currentFolder) {
        // Adjust selection if needed
        const newIndex = Math.min(this.selectedIndex, this.items.length - 2);
        this.setFolder(this.currentFolder);
        this.selectedIndex = Math.max(0, newIndex);
        this.updateSelection();
      }
    } catch (error) {
      new Notice(`Failed to delete: ${error}`);
    }
  }

  async confirmDelete(name: string, type: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new ConfirmDeleteModal(this.app, name, type, resolve);
      modal.open();
    });
  }
}

// Simple confirmation modal for deletion
import { Modal, App } from 'obsidian';

class ConfirmDeleteModal extends Modal {
  name: string;
  type: string;
  resolve: (value: boolean) => void;

  constructor(app: App, name: string, type: string, resolve: (value: boolean) => void) {
    super(app);
    this.name = name;
    this.type = type;
    this.resolve = resolve;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: `Delete ${this.type}?` });
    contentEl.createEl('p', { text: `Are you sure you want to move "${this.name}" to trash?` });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.resolve(false);
      this.close();
    });

    const deleteBtn = buttonContainer.createEl('button', {
      text: 'Delete',
      cls: 'mod-warning',
    });
    deleteBtn.addEventListener('click', () => {
      this.resolve(true);
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
