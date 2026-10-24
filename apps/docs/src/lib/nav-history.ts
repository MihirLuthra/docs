/**
 * This tab's navigation history within the site, for the header's back and
 * forward buttons and their lists. Browsers don't let pages read their
 * history, so it is recorded here (clientModules/nav-history.ts) and kept in
 * sessionStorage (one list per tab, kept across reloads).
 *
 * Each entry is matched by the router's location key, which the browser
 * keeps in its own history entry: a navigation to a known key is a move
 * back or forward to it; an unknown key is a new page, which drops whatever
 * was ahead (as the browser does).
 */

export type HistoryEntry = {key: string; path: string; title: string};
export type HistoryState = {entries: HistoryEntry[]; index: number};

const STORAGE_KEY = 'fx-docs-history';
// Older entries are dropped beyond this.
const MAX_ENTRIES = 50;

const EMPTY: HistoryState = {entries: [], index: -1};
let state: HistoryState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as HistoryState | null;
    if (saved && Array.isArray(saved.entries) && typeof saved.index === 'number') state = saved;
  } catch {
    // Storage unavailable or unreadable: start empty.
  }
}

function save(next: HistoryState): void {
  state = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the list lasts until the page is left.
  }
  listeners.forEach((listener) => listener());
}

/** Records arriving at `path` (router location key `key`). */
export function recordVisit(key: string, path: string): void {
  load();
  const at = state.entries.findIndex((e) => e.key === key);
  if (at !== -1) {
    if (at !== state.index) save({...state, index: at});
    return;
  }
  const kept = state.entries.slice(0, state.index + 1);
  const entries = [...kept, {key, path, title: ''}].slice(-MAX_ENTRIES);
  save({entries, index: entries.length - 1});
}

/** Fills in the title of the entry for `key` once the page has set it. */
export function recordTitle(key: string, title: string): void {
  const at = state.entries.findIndex((e) => e.key === key);
  if (at === -1 || state.entries[at].title === title) return;
  const entries = state.entries.map((e, i) => (i === at ? {...e, title} : e));
  save({...state, entries});
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHistory(): HistoryState {
  load();
  return state;
}

/** Before hydration (and on the server): nothing to go back to. */
export function getServerHistory(): HistoryState {
  return EMPTY;
}
