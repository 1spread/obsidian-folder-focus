export type FolderFocusItemKind = 'folder' | 'file';

export function getRenameMenuTitle(kind: FolderFocusItemKind): string {
  return kind === 'folder' ? 'Rename folder' : 'Rename file';
}
