import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import type {TreeNode} from './types';
import {ancestors, findKey, normalize, useTree} from './tree';
import GoToPage from './GoToPage';
import {resetNav, useNavReset} from '@site/src/lib/nav-reset';
import {readHoverOpen, writeHoverOpen} from '@site/src/lib/tree-prefs';
import styles from './styles.module.css';

type Row = {
  key: string;
  node: TreeNode;
  depth: number;
  parentKey: string | null;
};

function visibleRows(nodes: TreeNode[], open: Set<string>): Row[] {
  const rows: Row[] = [];
  const walk = (list: TreeNode[], depth: number, parentKey: string | null) => {
    list.forEach((node, i) => {
      const key = parentKey ? `${parentKey}.${i}` : `${i}`;
      rows.push({key, node, depth, parentKey});
      if (node.items && open.has(key)) walk(node.items, depth + 1, key);
    });
  };
  walk(nodes, 0, null);
  return rows;
}

// How long the mouse rests on a section before it opens, so sweeping across
// the tree doesn't open everything on the way.
const HOVER_DELAY_MS = 200;

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

function HoverIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 3l14 7-6 2-2 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
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
 * tree, collapsed except along the current page's path. Resting the mouse on
 * a section opens it, and it stays open; only a click closes it. Hover-open
 * can be turned off, and "Collapse all" closes everything.
 */
export default function DocsTree({onNavigate}: {onNavigate?: () => void}): ReactNode {
  const tree = useTree();
  const pathname = normalize(useLocation().pathname);
  const currentKey = useMemo(() => findKey(tree, pathname), [tree, pathname]);

  const [open, setOpen] = useState(() => new Set(ancestors(currentKey)));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const navRef = useRef<HTMLElement>(null);

  // On until the saved choice is read after hydration (localStorage).
  const [hoverOpen, setHoverOpen] = useState(true);
  useEffect(() => {
    setHoverOpen(readHoverOpen());
  }, []);
  const hoverTimer = useRef<number | undefined>(undefined);
  const openSoon = (key: string | null) => {
    window.clearTimeout(hoverTimer.current);
    if (key && hoverOpen) hoverTimer.current = window.setTimeout(() => toggle(key, true), HOVER_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

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

  const rows = useMemo(() => visibleRows(tree, open), [tree, open]);
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
        className={clsx(styles.row, styles.top, styles.home, pathname === '/' && styles.selected)}
        aria-current={pathname === '/' ? 'page' : undefined}
        onClick={() => {
          resetNav();
          onNavigate?.();
        }}>
        {/* The icon takes the chevron's slot, so "Home" lines up with the sections. */}
        <span className={styles.twisty} aria-hidden="true">
          <HomeIcon />
        </span>
        <span className={styles.label}>Home</span>
      </Link>
      <div className={styles.divider} aria-hidden="true" />
      {/* Stays at the top while the tree scrolls. */}
      <div className={styles.toolbar}>
        <GoToPage onNavigate={onNavigate} />
        <button
          type="button"
          className={styles.toolButton}
          aria-pressed={hoverOpen}
          aria-label="Open sections on hover"
          title="Open sections on hover"
          onClick={() => {
            writeHoverOpen(!hoverOpen);
            setHoverOpen(!hoverOpen);
          }}>
          <HoverIcon />
        </button>
        <button
          type="button"
          className={styles.toolButton}
          aria-label="Collapse all"
          title="Collapse all"
          disabled={open.size === 0}
          onClick={() => {
            window.clearTimeout(hoverTimer.current);
            setOpen(new Set());
          }}>
          <CollapseAllIcon />
        </button>
      </div>
      <div
        role="tree"
        aria-label="Documentation"
        className={styles.tree}
        onPointerLeave={() => openSoon(null)}>
        {rows.map((row, index) => {
          const {key, node, depth} = row;
          const isFolder = !!node.items;
          const isOpen = open.has(key);
          const isCurrent = key === currentKey;
          const common = {
            ref: (el: HTMLElement | null) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            },
            role: 'treeitem',
            'aria-level': depth + 1,
            tabIndex: key === tabKey ? 0 : -1,
            onKeyDown: (e: KeyboardEvent) => onKeyDown(e, row, index),
            onFocus: () => setFocusKey(key),
            // Sections open on hover (mouse only); pages don't.
            onPointerEnter: (e: PointerEvent) => openSoon(isFolder && e.pointerType === 'mouse' ? key : null),
            className: clsx(styles.row, depth === 0 && styles.top, isCurrent && styles.selected),
            style: {'--depth': depth} as CSSProperties,
            title: node.label,
          };
          const content = (
            <>
              {Array.from({length: depth}, (_, i) => (
                <span key={i} className={styles.guide} style={{'--level': i} as CSSProperties} aria-hidden="true" />
              ))}
              <span className={styles.twisty} aria-hidden="true">
                {isFolder && <Chevron />}
              </span>
              <span className={styles.label}>{node.label}</span>
              {node.badge && <span className={styles.badge}>{node.badge}</span>}
            </>
          );
          return (
            <div key={key}>
              {depth === 0 && index > 0 && <div className={styles.divider} aria-hidden="true" />}
              {isFolder ? (
                <div
                  {...common}
                  aria-expanded={isOpen}
                  onClick={() => {
                    window.clearTimeout(hoverTimer.current); // a pending hover-open
                    toggle(key);
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
          );
        })}
      </div>
    </nav>
  );
}
