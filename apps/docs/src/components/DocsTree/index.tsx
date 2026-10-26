import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {TreeNode} from './types';
import {ancestors, findKey, normalize, useTree} from './tree';
import GoToPage from './GoToPage';
import {resetNav, useNavReset} from '@site/src/lib/nav-reset';
import {useTreeReveal} from '@site/src/lib/tree-reveal';
import {readSmartIndex, writeSmartIndex} from '@site/src/lib/tree-prefs';
import {isPlainShortcut} from '@site/src/lib/keys';
import styles from './styles.module.css';

type Row = {
  key: string;
  node: TreeNode;
  depth: number;
  parentKey: string | null;
  /** "No pages yet": the content of an open folder that has no pages. */
  empty?: boolean;
};

function visibleRows(nodes: TreeNode[], open: Set<string>): Row[] {
  const rows: Row[] = [];
  const walk = (list: TreeNode[], depth: number, parentKey: string | null) => {
    list.forEach((node, i) => {
      const key = parentKey ? `${parentKey}.${i}` : `${i}`;
      rows.push({key, node, depth, parentKey});
      if (!node.items || !open.has(key)) return;
      if (node.items.length === 0) {
        rows.push({key: `${key}.empty`, node: {label: 'No pages yet'}, depth: depth + 1, parentKey: key, empty: true});
      }
      walk(node.items, depth + 1, key);
    });
  };
  walk(nodes, 0, null);
  return rows;
}

// How long the mouse rests on a section before it opens, so sweeping across
// the tree doesn't open everything on the way.
const HOVER_DELAY_MS = 200;
// Smart index: an open section no longer in use closes after this long.
const SMART_CLOSE_MS = 1000;
// Rows slide open and shut (--fx-duration-slide in custom.css). A closed
// section's rows go when their slide ends; this is the latest they go if it
// never runs (reduced motion, a hidden tab).
const SLIDE_FALLBACK_MS = 1000;

// How long a row revealed from a path menu stays highlighted.
const REVEAL_FLASH_MS = 1500;

function Chevron(): ReactNode {
  return (
    <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function HomeIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Top-level sections, each on a small tile (by label; a folder otherwise).
const SECTION_ICONS: Record<string, string> = {
  'Get familiar': 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.5 8.5l-2 5-5 2 2-5z',
  Solutions: 'M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z',
  Products: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  Learn: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
};
const FOLDER_ICON = 'M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';

function SectionIcon({d}: {d: string}): ReactNode {
  return (
    <span className={styles.sectionIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Smart index: only the active line of a list is open (a dot), the rest stay short.
function SmartIndexIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="2.2" fill="currentColor" />
      <path d="M10 12h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 5h7M10 19h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

function CollapseAllIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4l5 5 5-5M7 20l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The docs navigation tree (ux-spec.md, Sidebar): a Home row, then the whole
 * tree, collapsed except along the current page's path. With the smart
 * index on (the default), resting the mouse on a section opens it, and any
 * open section that is no longer in use closes a second later: only the
 * sections holding the pointer, the keyboard focus or the current page stay
 * open. "Collapse all" closes everything. Sections slide open and shut.
 */
export default function DocsTree({onNavigate}: {onNavigate?: () => void}): ReactNode {
  const tree = useTree();
  const pathname = normalize(useLocation().pathname);
  const home = normalize(useBaseUrl('/'));
  const currentKey = useMemo(() => findKey(tree, pathname), [tree, pathname]);
  // The sections holding the current page: their names are emphasised.
  const pathKeys = useMemo(() => new Set(ancestors(currentKey)), [currentKey]);

  const [open, setOpen] = useState(() => new Set(ancestors(currentKey)));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const navRef = useRef<HTMLElement>(null);

  // On until the saved choice is read after hydration (localStorage).
  const [smart, setSmart] = useState(true);
  useEffect(() => {
    setSmart(readSmartIndex());
  }, []);
  const hoverTimer = useRef<number | undefined>(undefined);
  // The section a hover has just opened, while the pointer is still on it:
  // a click on it then keeps it open instead of closing it (someone who
  // didn't notice it opened meant to open it).
  const hoverOpened = useRef<string | null>(null);
  const openSoon = (key: string | null) => {
    window.clearTimeout(hoverTimer.current);
    hoverOpened.current = null;
    if (!key || !smart) return;
    hoverTimer.current = window.setTimeout(() => {
      if (open.has(key)) return;
      hoverOpened.current = key;
      toggle(key, true);
    }, HOVER_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // Smart index: the rows the pointer and the keyboard focus are on. Every
  // open section holding neither, nor the current page, closes after a moment.
  // While the pointer or focus is in the tree, a section above it waits: its
  // closing would pull the rows being looked at upwards. It closes once the
  // pointer and focus have left the tree.
  const [pointerKey, setPointerKey] = useState<string | null>(null);
  const [focusIn, setFocusIn] = useState<string | null>(null);
  const closeTimers = useRef(new Map<string, number>());
  useEffect(() => {
    const timers = closeTimers.current;
    const inUse = (key: string) =>
      [pointerKey, focusIn, currentKey].some((at) => at !== null && (at === key || at.startsWith(`${key}.`)));
    const order = visibleRows(tree, open).map((r) => r.key);
    const anchor = order.indexOf(pointerKey ?? focusIn ?? '');
    // A section above the anchor (and so not holding it) lies wholly above it.
    const above = (key: string) => anchor >= 0 && order.indexOf(key) < anchor;
    for (const [key, timer] of timers) {
      if (!smart || !open.has(key) || inUse(key) || above(key)) {
        window.clearTimeout(timer);
        timers.delete(key);
      }
    }
    if (!smart) return;
    for (const key of open) {
      if (inUse(key) || above(key) || timers.has(key)) continue;
      timers.set(
        key,
        window.setTimeout(() => {
          timers.delete(key);
          toggle(key, false);
        }, SMART_CLOSE_MS),
      );
    }
  }, [smart, tree, open, pointerKey, focusIn, currentKey]);
  useEffect(() => () => closeTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // Sections that just closed: their rows stay a moment, sliding shut.
  const [closing, setClosing] = useState<Set<string>>(() => new Set());
  const prevOpen = useRef(open);
  const slideTimers = useRef(new Set<number>());
  const doneClosing = useCallback((keys: string[]) => {
    setClosing((prev) => {
      if (!keys.some((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of keys) next.delete(k);
      return next;
    });
  }, []);
  useLayoutEffect(() => {
    const shut = [...prevOpen.current].filter((k) => !open.has(k));
    prevOpen.current = open;
    if (!shut.length) return;
    setClosing((prev) => new Set([...prev, ...shut]));
    const t = window.setTimeout(() => {
      slideTimers.current.delete(t);
      doneClosing(shut);
    }, SLIDE_FALLBACK_MS);
    slideTimers.current.add(t);
  }, [open, doneClosing]);
  useEffect(() => () => slideTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // Open the tree along the current page whenever it changes.
  useEffect(() => {
    const along = ancestors(currentKey);
    setOpen((prev) => (along.every((k) => prev.has(k)) ? prev : new Set([...prev, ...along])));
  }, [currentKey]);

  // Home row or header logo: collapse everything and scroll back up.
  useNavReset(
    useCallback(() => {
      setOpen(new Set());
      setFocusKey(null);
      window.clearTimeout(hoverTimer.current);
      for (let el = navRef.current?.parentElement; el; el = el.parentElement) {
        if (el.scrollTop) el.scrollTop = 0;
      }
    }, []),
  );

  const collapseAll = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    setOpen(new Set());
  }, []);

  // "c" collapses all, when not typing (only the visible instance: sidebar
  // or drawer).
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isPlainShortcut(e, 'c') || navRef.current?.offsetParent == null) return;
      e.preventDefault();
      collapseAll();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [collapseAll]);

  // "Show in sidebar" (path menus): open down to `key`, then (once the rows
  // exist) scroll to it, focus it and flash it. Only the visible instance.
  const [revealed, setRevealed] = useState<string | null>(null);
  useTreeReveal(
    useCallback((key: string) => {
      if (navRef.current?.offsetParent == null) return;
      setOpen((prev) => new Set([...prev, ...ancestors(key), key]));
      setRevealed(key);
    }, []),
  );
  useEffect(() => {
    if (!revealed) return undefined;
    const el = itemRefs.current.get(revealed);
    el?.scrollIntoView({block: 'center'});
    el?.focus({preventScroll: true});
    setFocusKey(revealed);
    const t = window.setTimeout(() => setRevealed(null), REVEAL_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [revealed]);

  const rows = useMemo(() => visibleRows(tree, open), [tree, open]);
  // What is drawn: the open rows plus those still sliding shut.
  const drawn = useMemo(
    () => (closing.size ? visibleRows(tree, new Set([...open, ...closing])) : rows),
    [tree, open, closing, rows],
  );
  const live = useMemo(() => new Set(rows.map((r) => r.key)), [rows]);
  // Rows slide in when they appear, not on the tree's first render. A row
  // keeps its first answer while it stays drawn, so its animation never replays.
  const slideIn = useRef<Map<string, boolean> | null>(null);
  const firstDraw = slideIn.current === null;
  if (firstDraw) slideIn.current = new Map();
  const slides = slideIn.current!;
  for (const row of drawn) if (!slides.has(row.key)) slides.set(row.key, !firstDraw);
  useEffect(() => {
    const keys = new Set(drawn.map((r) => r.key));
    for (const k of slides.keys()) if (!keys.has(k)) slides.delete(k);
  }, [drawn, slides]);
  const tabKey =
    focusKey && rows.some((r) => r.key === focusKey)
      ? focusKey
      : rows.some((r) => r.key === currentKey)
        ? currentKey
        : rows[0]?.key;

  const toggle = (key: string, force?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      const isOpen = force ?? !next.has(key);
      if (isOpen) next.add(key);
      else next.delete(key);
      return next;
    });

  const focus = (key: string | null | undefined) => {
    if (!key) return;
    setFocusKey(key);
    itemRefs.current.get(key)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, row: Row, index: number) => {
    const isFolder = !!row.node.items;
    const isOpen = open.has(row.key);
    switch (e.key) {
      case 'ArrowDown':
        focus(rows[index + 1]?.key);
        break;
      case 'ArrowUp':
        focus(rows[index - 1]?.key);
        break;
      case 'Home':
        focus(rows[0]?.key);
        break;
      case 'End':
        focus(rows[rows.length - 1]?.key);
        break;
      case 'ArrowRight':
        if (!isFolder) return;
        if (isOpen) focus(rows[index + 1]?.key);
        else toggle(row.key, true);
        break;
      case 'ArrowLeft':
        if (isFolder && isOpen) toggle(row.key, false);
        else focus(row.parentKey);
        break;
      case 'Enter':
      case ' ':
        if (!isFolder) return; // links handle Enter themselves
        toggle(row.key);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Documentation">
      <Link
        to="/"
        className={clsx(styles.row, styles.top, styles.home, pathname === home && styles.selected)}
        aria-current={pathname === home ? 'page' : undefined}
        aria-keyshortcuts="h"
        onClick={() => {
          resetNav();
          onNavigate?.();
        }}>
        {/* On a tile, like the sections' icons below it. */}
        <span className={styles.sectionIcon} aria-hidden="true">
          <HomeIcon />
        </span>
        <span className={styles.label}>Home</span>
        <kbd className={`${styles.filterKbd} ${styles.rowKbd}`} aria-hidden="true">
          h
        </kbd>
      </Link>
      <div className={styles.divider} aria-hidden="true" />
      {/* Stays at the top while the tree scrolls. */}
      <div className={styles.toolbar}>
        <GoToPage onNavigate={onNavigate} />
        <button
          type="button"
          className={styles.toolButton}
          aria-pressed={smart}
          aria-label="Smart index"
          aria-description="Opens the section you point at and closes the ones you leave"
          onClick={() => {
            writeSmartIndex(!smart);
            setSmart(!smart);
          }}>
          <SmartIndexIcon />
          <span className={styles.tip} aria-hidden="true">
            Smart index: {smart ? 'on' : 'off'}
          </span>
        </button>
        {/* The "c" shortcut shows on the button, like "t" in the filter. */}
        <button
          type="button"
          className={`${styles.toolButton} ${styles.withKey}`}
          aria-label="Collapse all"
          aria-keyshortcuts="c"
          disabled={open.size === 0}
          onClick={collapseAll}>
          <CollapseAllIcon />
          <kbd className={styles.filterKbd} aria-hidden="true">
            c
          </kbd>
          <span className={styles.tip} aria-hidden="true">
            Collapse all
          </span>
        </button>
      </div>
      <div
        role="tree"
        aria-label="Documentation"
        className={styles.tree}
        onPointerLeave={(e) => {
          openSoon(null);
          // A lifted finger "leaves" too; on touch, the last row tapped stays in use.
          if (e.pointerType === 'mouse') setPointerKey(null);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(null);
        }}>
        {drawn.map((row, index) => {
          const {key, node, depth} = row;
          const isFolder = !!node.items;
          const isOpen = open.has(key);
          const isCurrent = key === currentKey;
          const exiting = !live.has(key);
          const common = {
            ref: (el: HTMLElement | null) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            },
            role: 'treeitem',
            'aria-level': depth + 1,
            tabIndex: key === tabKey && !exiting ? 0 : -1,
            onKeyDown: (e: KeyboardEvent) => onKeyDown(e, row, index),
            onFocus: (e: FocusEvent<HTMLElement>) => {
              setFocusKey(key);
              // Keyboard focus only: a click focuses the row too, but the mouse is what's in use then.
              setFocusIn(e.currentTarget.matches(':focus-visible') ? key : null);
            },
            // Sections open on hover (mouse only); pages don't.
            onPointerEnter: (e: PointerEvent) => {
              openSoon(isFolder && e.pointerType === 'mouse' ? key : null);
              setPointerKey(key);
            },
            className: clsx(
              styles.row,
              depth === 0 && styles.top,
              isCurrent && styles.selected,
              pathKeys.has(key) && styles.inPath,
              row.empty && styles.emptyRow,
              key === revealed && styles.revealed,
            ),
            style: {'--depth': depth} as CSSProperties,
            title: node.label,
          };
          // A top-level section: its icon tile, its name, the chevron at the
          // end. Deeper rows: guide lines (the current page's, purple), the
          // chevron, the name.
          const content =
            depth === 0 ? (
              <>
                <SectionIcon d={SECTION_ICONS[node.label] ?? FOLDER_ICON} />
                <span className={styles.label}>{node.label}</span>
                {node.badge && <span className={styles.badge}>{node.badge}</span>}
                {isFolder && (
                  <span className={styles.endTwisty} aria-hidden="true">
                    <Chevron />
                  </span>
                )}
              </>
            ) : (
              <>
                {Array.from({length: depth}, (_, i) => (
                  <span
                    key={i}
                    className={clsx(styles.guide, isCurrent && i === depth - 1 && styles.guideCurrent)}
                    style={{'--level': i} as CSSProperties}
                    aria-hidden="true"
                  />
                ))}
                <span className={styles.twisty} aria-hidden="true">
                  {isFolder && <Chevron />}
                </span>
                <span className={styles.label}>{node.label}</span>
                {node.badge && <span className={styles.badge}>{node.badge}</span>}
              </>
            );
          return (
            <div
              key={key}
              className={clsx(styles.item, exiting ? styles.exiting : slides.get(key) && styles.entering)}
              aria-hidden={exiting || undefined}
              // Slid shut: the closed sections above this row are done.
              onAnimationEnd={exiting ? () => doneClosing([...closing].filter((c) => key.startsWith(`${c}.`))) : undefined}>
              <div className={styles.itemInner}>
              {depth === 0 && index > 0 && <div className={styles.divider} aria-hidden="true" />}
              {row.empty ? (
                <div {...common} aria-disabled="true">
                  {content}
                </div>
              ) : isFolder ? (
                <div
                  {...common}
                  aria-expanded={isOpen}
                  onClick={() => {
                    window.clearTimeout(hoverTimer.current); // a pending hover-open
                    if (hoverOpened.current === key) hoverOpened.current = null;
                    else toggle(key);
                  }}>
                  {content}
                </div>
              ) : (
                <Link
                  {...common}
                  to={node.href!}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={onNavigate}>
                  {content}
                </Link>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
