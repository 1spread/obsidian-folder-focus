export type FolderFocusSearchMode = 'name' | 'full-text';

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function isSearchMode(value: unknown): value is FolderFocusSearchMode {
  return value === 'name' || value === 'full-text';
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function shouldSearchContent(mode: FolderFocusSearchMode): boolean {
  return mode === 'full-text';
}

export function normalizeFavoriteFolderPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const paths: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const path = item === '' ? '' : item.trim();
    if (item !== '' && !path) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }

  return paths;
}

export function getHighlightSegments(label: string, query: string): HighlightSegment[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [{ text: label, match: false }];
  }

  const labelLower = label.toLowerCase();
  const queryLower = normalizedQuery.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < label.length) {
    const matchIndex = labelLower.indexOf(queryLower, cursor);
    if (matchIndex === -1) {
      segments.push({ text: label.slice(cursor), match: false });
      break;
    }

    if (matchIndex > cursor) {
      segments.push({ text: label.slice(cursor, matchIndex), match: false });
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    segments.push({ text: label.slice(matchIndex, matchEnd), match: true });
    cursor = matchEnd;
  }

  return segments.filter((segment) => segment.text.length > 0);
}
