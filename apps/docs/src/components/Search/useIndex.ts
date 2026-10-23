import {useEffect, useState} from 'react';
import type {IndexEntry} from './types';

/** Fetches the search index chunk; also used to prefetch it. */
export const loadIndex = () => import('@generated/docs-tree/default/search-index.json');

/** The search index, fetched on first use (a separate chunk). */
export function useIndex(): IndexEntry[] | null {
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    loadIndex().then((m) => {
      if (live) setIndex(m.default);
    });
    return () => {
      live = false;
    };
  }, []);
  return index;
}
