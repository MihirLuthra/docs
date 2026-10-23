import type {IndexEntry} from './types';

export const MAX_RESULTS = 8;

const GENERIC_TITLES = new Set(['overview', 'troubleshooting', 'api']);

/**
 * Score of `entry` for the lowercased, trimmed query `q` (ux-spec.md,
 * Ranking), or 0 when it doesn't match.
 */
export function score(entry: IndexEntry, q: string): number {
  const title = entry.title.toLowerCase();
  const names = [...entry.path, entry.title].join(' ').toLowerCase();
  const {keywords} = entry;

  // 1. Match: every token is in the path names or prefixes a keyword.
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches = (token: string) =>
    names.includes(token) || keywords.some((k) => k.startsWith(token));
  if (tokens.length === 0 || !tokens.every(matches)) return 0;

  // 2. Base score.
  let s: number;
  if (title === q) s = 100;
  else if (keywords.includes(q)) s = 90;
  else if (title.startsWith(q)) s = 80;
  else if (` ${title}`.includes(` ${q}`)) s = 68;
  else if (keywords.some((k) => k.startsWith(q))) s = 60;
  else if (title.includes(q)) s = 50;
  else s = 20;

  // 3. Adjust.
  if (entry.kind === 'Solution' || entry.kind === 'Product') s += 8;
  if (entry.kind === 'Section') s -= 4;
  s -= entry.depth;
  if (GENERIC_TITLES.has(title)) s -= 6;
  return s;
}

/** 4. The top results for `query`, best first. */
export function search(index: IndexEntry[], query: string): IndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .map((entry) => ({entry, s: score(entry, q)}))
    .filter((hit) => hit.s > 0)
    .sort((a, b) => b.s - a.s || a.entry.depth - b.entry.depth)
    .slice(0, MAX_RESULTS)
    .map((hit) => hit.entry);
}

/** Splits `title` around the first match of `query`, for highlighting. */
export function splitMatch(title: string, query: string): [string, string, string] {
  const q = query.trim().toLowerCase();
  const at = q ? title.toLowerCase().indexOf(q) : -1;
  if (at === -1) return [title, '', ''];
  return [title.slice(0, at), title.slice(at, at + q.length), title.slice(at + q.length)];
}
