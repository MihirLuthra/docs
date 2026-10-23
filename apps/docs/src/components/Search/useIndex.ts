import {useEffect, useState} from 'react';
import type {IndexEntry} from './types';

/** The search index, fetched on first use (a separate chunk). */
export function useIndex(): IndexEntry[] | null {
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    import('@generated/docs-tree/default/search-index.json').then((m) => {
      if (live) setIndex(m.default);
    });
    return () => {
      live = false;
    };
  }, []);
  return index;
}
