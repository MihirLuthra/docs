import type {TreeNode} from './types';

/** A page and the labels along its path, top-level section first. */
export type PageEntry = {href: string; names: string[]};

/** Character ranges [start, end) to show in bold, per name in the path. */
export type Highlights = Array<Array<[number, number]>>;

export type GoToMatch = {entry: PageEntry; highlights: Highlights};

export const GOTO_MAX_RESULTS = 8;

/** Every page in the tree, with its path. */
export function flattenPages(nodes: TreeNode[], parents: string[] = []): PageEntry[] {
  return nodes.flatMap((node) => {
    const names = [...parents, node.label];
    if (node.items) return flattenPages(node.items, names);
    return node.href ? [{href: node.href, names}] : [];
  });
}

const WORD = /[a-z0-9#+]+/gi;

/**
 * Where `token` matches in `name`: as text anywhere, or as the initials of
 * consecutive words ("dsm" in "Data Security Manager").
 */
function matchIn(name: string, token: string): {ranges: Array<[number, number]>; wordStart: boolean} | null {
  const lower = name.toLowerCase();
  const at = lower.indexOf(token);
  if (at !== -1) {
    return {ranges: [[at, at + token.length]], wordStart: at === 0 || !/[a-z0-9]/.test(lower[at - 1])};
  }
  if (token.length < 2) return null;
  const words = [...name.matchAll(WORD)].map((m) => m.index ?? 0);
  for (let i = 0; i + token.length <= words.length; i++) {
    const run = words.slice(i, i + token.length);
    if (run.every((start, j) => lower[start] === token[j])) {
      return {ranges: run.map((start) => [start, start + 1]), wordStart: true};
    }
  }
  return null;
}

/**
 * Pages whose path matches every word of `query` (separated by spaces or
 * "/"), in any order. Best first: more words matched in the page's own
 * title, then at word starts, then shallower pages.
 */
export function goToPage(pages: PageEntry[], query: string): GoToMatch[] {
  const tokens = query.toLowerCase().split(/[\s/]+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: Array<GoToMatch & {score: number}> = [];
  for (const entry of pages) {
    const highlights: Highlights = entry.names.map(() => []);
    let score = 0;
    let ok = true;
    for (const token of tokens) {
      // Prefer a match in the title, then nearer the page.
      let found = false;
      for (let n = entry.names.length - 1; n >= 0; n--) {
        const m = matchIn(entry.names[n], token);
        if (!m) continue;
        highlights[n].push(...m.ranges);
        if (n === entry.names.length - 1) score += 10;
        if (m.wordStart) score += 3;
        found = true;
        break;
      }
      if (!found) {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({entry, highlights, score: score - entry.names.length});
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.names.join('/').localeCompare(b.entry.names.join('/')))
    .slice(0, GOTO_MAX_RESULTS)
    .map(({entry, highlights}) => ({entry, highlights}));
}
