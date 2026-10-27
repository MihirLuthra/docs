import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {OverlaysContext} from '@site/src/components/Overlays/context';
import {loadIndex} from '@site/src/components/Search/useIndex';
import {isTyping} from '@site/src/lib/keys';
// Part of the page (~3KB gzipped), so search opens on the first click
// without waiting for a download. The index is fetched when the page is idle.
import SearchModal from '@site/src/components/Search/SearchModal';

// Loaded on first open, so pages don't ship its code.
const AskAIPanel = lazy(() => import('@site/src/components/AskAI/AskAIPanel'));

// Hosts the search modal and the Ask AI panel for every page.
export default function Root({children}: {children: ReactNode}): ReactNode {
  const askAIEnabled = useDocusaurusContext().siteConfig.customFields?.askAI === true;
  const [searchOpen, setSearchOpen] = useState(false);
  const [askAI, setAskAI] = useState<{open: boolean; question?: string}>({open: false});
  const returnFocus = useRef<HTMLElement | null>(null);
  const aiReturnFocus = useRef<HTMLElement | null>(null);

  // A ref as well as state: openSearch can run twice in one tick (a click
  // just after hydration, then its replay), and only the first may record
  // where focus returns to.
  const searchOpenRef = useRef(false);

  const openSearch = useCallback(() => {
    if (searchOpenRef.current) return;
    searchOpenRef.current = true;
    returnFocus.current = document.activeElement as HTMLElement | null;
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    searchOpenRef.current = false;
    setSearchOpen(false);
    // Unless focus moved on while the modal animated out (e.g. "t").
    const active = document.activeElement;
    if (!active || active === document.body) returnFocus.current?.focus();
  }, []);

  // While the search modal is open, the search boxes it opened from hide
  // (custom.css), so the modal's field is the only one on screen.
  useEffect(() => {
    const html = document.documentElement;
    if (searchOpen) html.setAttribute('data-search-open', '');
    else html.removeAttribute('data-search-open');
  }, [searchOpen]);

  const prefetchSearch = useCallback(() => {
    void loadIndex();
  }, []);

  // Fetch the index once the page has loaded and the browser is idle, so the
  // first keystroke has results.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1000));
    const fetchIndex = () => idle(() => void loadIndex());
    if (document.readyState === 'complete') fetchIndex();
    else window.addEventListener('load', fetchIndex, {once: true});
    return () => window.removeEventListener('load', fetchIndex);
  }, []);

  // Clicks and shortcuts from before hydration were recorded by the inline
  // head script (lib/search-early.ts): take over from it, then replay.
  useEffect(() => {
    window.__fxSearchReady = true;
    if (window.__fxSearchQueued) {
      window.__fxSearchQueued = false;
      document.documentElement.removeAttribute('data-search-pending');
      openSearch();
    }
  }, [openSearch]);

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
      searchOpenRef.current = false;
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
    () => ({openSearch, prefetchSearch, askAIEnabled, askAIOpen: askAI.open, openAskAI, toggleAskAI}),
    [openSearch, prefetchSearch, askAIEnabled, askAI.open, openAskAI, toggleAskAI],
  );

  return (
    <OverlaysContext.Provider value={overlays}>
      {children}
      {searchOpen && <SearchModal onClose={closeSearch} />}
      {askAIEnabled && askAI.open && (
        <Suspense fallback={null}>
          <AskAIPanel initialQuestion={askAI.question} onClose={closeAskAI} />
        </Suspense>
      )}
    </OverlaysContext.Provider>
  );
}
