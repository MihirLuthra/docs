import {useCallback, useEffect, useState, type ComponentType, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {SPEECH_ROOT, speechBlocks, speechDir} from '@site/src/lib/speech/blocks';
import {findKey, nodesAlong, normalize, useTree} from '@site/src/components/DocsTree/tree';
import type {PlayerProps, Request} from './Player';
import styles from './styles.module.css';

// "Listen" for doc pages (audio made at build time by scripts/speech.mjs).
// The button sits in the path above the title; selecting text in the page
// offers "Listen" for just that or "From here"; each heading has "Listen
// from here" (ListenFrom). The player itself is loaded only when one of them
// is used, so pages carry no more than this.

/** Asks the page's Listen to read from an element (a heading). */
export const listenFrom = (el: Element) => document.dispatchEvent(new CustomEvent('fx-listen-from', {detail: {el}}));

/** Whether the page being shown has audio. */
export function usePageListens(): boolean {
  const tree = useTree();
  const key = findKey(tree, normalize(useLocation().pathname));
  return !!key && !!nodesAlong(tree, key).at(-1)?.listen;
}

function HeadphonesIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Where to offer "Listen" for the current selection, if it is in text the page reads. */
function selectionSpot(): {x: number; y: number; range: Range} | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0 || sel.toString().trim().length < 2) return null;
  const range = sel.getRangeAt(0);
  const root = document.querySelector(SPEECH_ROOT);
  if (!root || !root.contains(range.commonAncestorContainer)) return null;
  const start = range.startContainer.nodeType === 1 ? (range.startContainer as Element) : range.startContainer.parentElement;
  if (!start || !speechBlocks(root).some((b) => !b.narration && b.el.contains(start))) return null;
  // Centred above the selection's first line, clear of the text selected.
  const box = range.getBoundingClientRect();
  const first = range.getClientRects()[0] ?? box;
  return {x: (box.left + box.right) / 2 + window.scrollX, y: first.top + window.scrollY, range: range.cloneRange()};
}

export default function Listen(): ReactNode {
  const {pathname} = useLocation();
  const base = useBaseUrl('/');
  const manifestUrl = useBaseUrl(`/speech/${speechDir(pathname, base)}/manifest.json`);
  const [Player, setPlayer] = useState<ComponentType<PlayerProps> | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [spot, setSpot] = useState<ReturnType<typeof selectionSpot>>(null);

  const open = useCallback((r: Request) => {
    setRequest(r);
    if (!Player) void import('./Player').then((m) => setPlayer(() => m.default));
  }, [Player]);

  // Offer "Listen" by a selection in the page's text.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSpot(selectionSpot()));
    };
    document.addEventListener('selectionchange', update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', update);
    };
  }, []);

  // "Listen from here" on a heading.
  useEffect(() => {
    const onFrom = (e: Event) => open({kind: 'from', at: (e as CustomEvent<{el: Element}>).detail.el, nonce: Date.now()});
    document.addEventListener('fx-listen-from', onFrom);
    return () => document.removeEventListener('fx-listen-from', onFrom);
  }, [open]);

  // L (when not typing): listen, or pause and play again.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== 'l' || e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      e.preventDefault();
      open({kind: request ? 'toggle' : 'page', nonce: Date.now()});
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, request]);

  // A new page: close the player.
  useEffect(() => {
    setRequest(null);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className={styles.listen}
        aria-keyshortcuts="L"
        onClick={() => open({kind: request ? 'toggle' : 'page', nonce: Date.now()})}>
        <HeadphonesIcon />
        Listen
        <kbd className={styles.listenKey} aria-hidden="true">
          L
        </kbd>
      </button>
      {spot &&
        createPortal(
          // Keep the selection: a mousedown here would clear it first.
          <div className={styles.selection} style={{left: spot.x, top: spot.y}} onMouseDown={(e) => e.preventDefault()}>
            <button
              type="button"
              className={styles.selectionPart}
              onClick={() => {
                open({kind: 'range', range: spot.range, nonce: Date.now()});
                setSpot(null);
              }}>
              <HeadphonesIcon />
              Listen
            </button>
            <button
              type="button"
              className={styles.selectionPart}
              onClick={() => {
                open({kind: 'from', at: {node: spot.range.startContainer, offset: spot.range.startOffset}, nonce: Date.now()});
                window.getSelection()?.removeAllRanges();
                setSpot(null);
              }}>
              From here
            </button>
          </div>,
          document.body,
        )}
      {Player && request && createPortal(<Player manifestUrl={manifestUrl} request={request} onClose={() => setRequest(null)} />, document.body)}
    </>
  );
}
