/**
 * Recently viewed pages (ux-spec.md, Home): paths in localStorage, newest
 * first, at most 12. Storage can be unavailable (private mode, blocked site
 * data), so every access is wrapped and failures fall back to "no recents".
 */
export const RECENTS_KEY = 'fx-docs-recent';
export const RECENTS_MAX = 12;

export function readRecents(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeRecents(paths: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(paths.slice(0, RECENTS_MAX)));
  } catch {
    // Storage unavailable: recents just aren't kept.
  }
}

export function addRecent(path: string): void {
  writeRecents([path, ...readRecents().filter((p) => p !== path)]);
}
