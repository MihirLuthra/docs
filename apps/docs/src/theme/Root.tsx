import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {OverlaysContext} from '@site/src/components/Overlays/context';

// Loaded on first open, so pages don't ship the modal's code.
const SearchModal = lazy(() => import('@site/src/components/Search/SearchModal'));

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

// Hosts the search modal for every page, with its keyboard shortcuts.
export default function Root({children}: {children: ReactNode}): ReactNode {
  const [searchOpen, setSearchOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const openSearch = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    returnFocus.current?.focus();
  }, []);

  // ⌘K / Ctrl+K anywhere; "/" when not typing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const modK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (!modK && !slash) return;
      e.preventDefault();
      openSearch();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  const overlays = useMemo(() => ({openSearch}), [openSearch]);

  return (
    <OverlaysContext.Provider value={overlays}>
      {children}
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchModal onClose={closeSearch} />
        </Suspense>
      )}
    </OverlaysContext.Provider>
  );
}
