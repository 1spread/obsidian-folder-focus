export type SortOrder = 'name' | 'modified' | 'created';
export type SortDirection = 'asc' | 'desc';

export interface SortableVaultItem {
  name: string;
}

export interface SortVaultItemsOptions<T extends SortableVaultItem> {
  sortOrder: SortOrder;
  sortDirection: SortDirection;
  isFolder: (item: T) => boolean;
  getModifiedTime: (item: T) => number;
  getCreatedTime: (item: T) => number;
}

export function sortVaultItems<T extends SortableVaultItem>(
  items: T[],
  options: SortVaultItemsOptions<T>
): T[] {
  const dir = options.sortDirection === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    const aIsFolder = options.isFolder(a);
    const bIsFolder = options.isFolder(b);
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    let result: number;
    switch (options.sortOrder) {
      case 'modified':
        result = options.getModifiedTime(a) - options.getModifiedTime(b);
        break;
      case 'created':
        result = options.getCreatedTime(a) - options.getCreatedTime(b);
        break;
      case 'name':
      default:
        result = a.name.localeCompare(b.name);
        break;
    }

    return result * dir;
  });
}
