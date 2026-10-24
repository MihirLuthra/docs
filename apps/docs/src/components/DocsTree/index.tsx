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

// How long the pointer rests on a row before the hover state follows it, so
// sweeping across the tree doesn't open and close everything on the way.
const HOVER_DELAY_MS = 200;

/** Whether row `a` comes before row `b` and isn't one of its folders. */
function isAbove(a: string, b: string): boolean {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] !== y[i]) return x[i] < y[i];
  }
  return false; // one contains the other
}

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

/**
 * The docs navigation tree (ux-spec.md, Sidebar): a Home row, then the whole
 * tree, collapsed except along the current page's path. Resting the mouse on
 * a folder opens it for as long as the pointer stays on it or inside it;
 * clicking keeps it open.
 */
export default function DocsTree({onNavigate}: {onNavigate?: () => void}): ReactNode {
  const tree = useTree();
  const pathname = normalize(useLocation().pathname);
  const currentKey = useMemo(() => findKey(tree, pathname), [tree, pathname]);

  const [open, setOpen] = useState(() => new Set(ancestors(currentKey)));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const navRef = useRef<HTMLElement>(null);

  // Folders shown open because the mouse is on them or inside them, without
  // being added to `open`. Moving to another row closes the ones below it,
  // but not those above, which would pull the row away from the pointer;
  // leaving the tree closes them all.
  const [hoverOpen, setHoverOpen] = useState<Set<string>>(() => new Set());
  const hoverTimer = useRef<number | undefined>(undefined);
  const hoverSoon = (key: string | null) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHoverOpen((prev) =>
        key === null ? new Set() : new Set([...[...prev].filter((k) => isAbove(k, key)), ...ancestors(key), key]),
      );
    }, HOVER_DELAY_MS);
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
      setHoverOpen(new Set());
      for (let el = navRef.current?.parentElement; el; el = el.parentElement) {
        if (el.scrollTop) el.scrollTop = 0;
      }
    }, []),
  );

  const shown = useMemo(() => new Set([...open, ...hoverOpen]), [open, hoverOpen]);
  const rows = useMemo(() => visibleRows(tree, shown), [tree, shown]);
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

  // Keeps a folder open (also one only open because it's hovered), or closes
  // one that was kept open, even while the pointer is still on it.
  const clickFolder = (row: Row) => {
    if (open.has(row.key)) {
      toggle(row.key, false);
      window.clearTimeout(hoverTimer.current);
      setHoverOpen((prev) => new Set([...prev].filter((k) => k !== row.key)));
    } else {
      toggle(row.key, true);
    }
  };

  const focus = (key: string | null | undefined) => {
    if (!key) return;
    setFocusKey(key);
    itemRefs.current.get(key)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, row: Row, index: number) => {
    const isFolder = !!row.node.items;
    const isOpen = shown.has(row.key);
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
        clickFolder(row);
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
      <GoToPage onNavigate={onNavigate} />
      <div
        role="tree"
        aria-label="Documentation"
        className={styles.tree}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hoverSoon(null)}>
        {rows.map((row, index) => {
          const {key, node, depth} = row;
          const isFolder = !!node.items;
          const isOpen = shown.has(key);
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
            onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && hoverSoon(key),
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
                <div {...common} aria-expanded={isOpen} onClick={() => clickFolder(row)}>
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
