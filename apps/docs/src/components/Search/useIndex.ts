import {useEffect, useState} from 'react';
import type {IndexEntry} from './types';

// Kept once loaded, so a modal opened after a prefetch has results for the
// first keystroke without waiting a tick.
let loaded: IndexEntry[] | null = null;

/** Fetches the search index chunk; also used to prefetch it. */
export const loadIndex = () =>
  import('@generated/docs-tree/default/search-index.json').then((m) => {
    loaded = m.default;
    return m;
  });

/** The search index, fetched on first use (a separate chunk). */
export function useIndex(): IndexEntry[] | null {
  const [index, setIndex] = useState<IndexEntry[] | null>(loaded);
  useEffect(() => {
    if (index) return undefined;
    let live = true;
    loadIndex().then((m) => {
      if (live) setIndex(m.default);
    });
    return () => {
      live = false;
    };
  }, [index]);
  return index;
}
