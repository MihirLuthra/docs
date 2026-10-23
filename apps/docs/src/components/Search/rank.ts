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

const STOPWORDS = new Set(
  'a an and are can do does for from how i in is it my of on or should the to use what when where which who why with need run'.split(
    ' ',
  ),
);

/**
 * Pages related to a free-text question: each meaningful word is scored on
 * its own and the scores are summed, so a question needn't match every word.
 */
export function related(index: IndexEntry[], question: string, limit = 3): IndexEntry[] {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9#+-]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const totals = new Map<IndexEntry, number>();
  for (const word of words) {
    for (const entry of index) {
      const s = score(entry, word);
      if (s > 0) totals.set(entry, (totals.get(entry) ?? 0) + s);
    }
  }
  return [...totals]
    .sort((a, b) => b[1] - a[1] || a[0].depth - b[0].depth)
    .slice(0, limit)
    .map(([entry]) => entry);
}
