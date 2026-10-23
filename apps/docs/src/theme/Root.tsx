import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {OverlaysContext} from '@site/src/components/Overlays/context';

// Loaded on first open, so pages don't ship their code.
const SearchModal = lazy(() => import('@site/src/components/Search/SearchModal'));
const AskAIPanel = lazy(() => import('@site/src/components/AskAI/AskAIPanel'));

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

// Hosts the search modal and the Ask AI panel for every page.
export default function Root({children}: {children: ReactNode}): ReactNode {
  const askAIEnabled = useDocusaurusContext().siteConfig.customFields?.askAI === true;
  const [searchOpen, setSearchOpen] = useState(false);
  const [askAI, setAskAI] = useState<{open: boolean; question?: string}>({open: false});
  const returnFocus = useRef<HTMLElement | null>(null);
  const aiReturnFocus = useRef<HTMLElement | null>(null);

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

  const openAskAI = useCallback(
    (question?: string) => {
      if (!askAIEnabled) return;
      if (!askAI.open) {
        // From the search modal, return to where search was opened from.
        aiReturnFocus.current = searchOpen
          ? returnFocus.current
          : (document.activeElement as HTMLElement | null);
      }
      setSearchOpen(false);
      setAskAI({open: true, question});
    },
    [askAIEnabled, askAI.open, searchOpen],
  );

  const closeAskAI = useCallback(() => {
    setAskAI({open: false});
    aiReturnFocus.current?.focus();
  }, []);

  const toggleAskAI = useCallback(
    () => (askAI.open ? closeAskAI() : openAskAI()),
    [askAI.open, closeAskAI, openAskAI],
  );

  const overlays = useMemo(
    () => ({openSearch, askAIEnabled, askAIOpen: askAI.open, openAskAI, toggleAskAI}),
    [openSearch, askAIEnabled, askAI.open, openAskAI, toggleAskAI],
  );

  return (
    <OverlaysContext.Provider value={overlays}>
      {children}
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchModal onClose={closeSearch} />
        </Suspense>
      )}
      {askAIEnabled && askAI.open && (
        <Suspense fallback={null}>
          <AskAIPanel initialQuestion={askAI.question} onClose={closeAskAI} />
        </Suspense>
      )}
    </OverlaysContext.Provider>
  );
}
