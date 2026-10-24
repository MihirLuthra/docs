import {useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {getHistory, getServerHistory, subscribe, type HistoryEntry} from '@site/src/lib/nav-history';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {isPlainShortcut} from '@site/src/lib/keys';
import Menu, {menuStyles} from '@site/src/components/Menu';
import styles from './styles.module.css';

// At most this many pages in each list.
const LIST_MAX = 8;

// "b" goes back, "f" forward (when not typing); shown on the arrows.
const SHORTCUT = {back: 'b', forward: 'f'} as const;

type Direction = 'back' | 'forward';

function ArrowIcon({direction}: {direction: Direction}): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === 'back' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaretIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/**
 * One button (back or forward) and its list: the arrow goes one page, the
 * caret (or a right-click on the arrow) lists the pages that way, nearest
 * first, and picking one goes straight there.
 */
function HistoryButton({
  direction,
  pages,
}: {
  direction: Direction;
  pages: Array<{entry: HistoryEntry; delta: number}>;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);
  const tree = useTree();
  const label = direction === 'back' ? 'Back' : 'Forward';
  // Docs pages: their title and closest section (full path in the tooltip),
  // like the recent cards; others (home, release notes) the title the page
  // set.
  const describe = (entry: HistoryEntry) => {
    const found = locate(tree, entry.path.replace(/[?#].*$/, ''));
    return found
      ? {title: found.title, detail: found.path[found.path.length - 1] ?? '', full: found.path.join(' / ')}
      : {title: entry.title || entry.path, detail: '', full: entry.path};
  };
  const disabled = pages.length === 0;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const close = useCallback(() => setOpen(false), []);

  const go = (delta: number) => {
    setOpen(false);
    window.history.go(delta);
  };

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (disabled || !isPlainShortcut(e, SHORTCUT[direction])) return;
      e.preventDefault();
      setOpen(false);
      window.history.go(direction === 'back' ? -1 : 1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [direction, disabled]);

  return (
    <div ref={rootRef} className={styles.group}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(direction === 'back' ? -1 : 1)}
        onContextMenu={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOpen(true);
        }}
        disabled={disabled}
        aria-label={label}
        aria-keyshortcuts={SHORTCUT[direction]}
        title={disabled ? label : `${label} to ${describe(pages[0].entry).title} (${SHORTCUT[direction]})`}>
        <ArrowIcon direction={direction} />
        <kbd className={styles.kbd} aria-hidden="true">
          {SHORTCUT[direction]}
        </kbd>
      </button>
      <button
        ref={caretRef}
        type="button"
        className={styles.caret}
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-label={`${label} history`}
        aria-haspopup="menu"
        aria-expanded={open}>
        <CaretIcon />
      </button>
      {open && (
        <Menu label={`${label} history`} rootRef={rootRef} triggerRef={caretRef} onClose={close}>
          {pages.slice(0, LIST_MAX).map(({entry, delta}) => {
            const {title, detail, full} = describe(entry);
            return (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={menuStyles.item}
                title={full}
                onClick={() => go(delta)}>
                <span className={menuStyles.itemTitle}>{title}</span>
                <span className={menuStyles.itemDetail}>{detail}</span>
              </button>
            );
          })}
        </Menu>
      )}
    </div>
  );
}

/** Back and forward through this tab's pages, each with a list (ux-spec.md, Header). */
export default function HistoryNav(): ReactNode {
  const {entries, index} = useSyncExternalStore(subscribe, getHistory, getServerHistory);
  const back = entries
    .slice(0, Math.max(index, 0))
    .map((entry, i) => ({entry, delta: i - index}))
    .reverse();
  const forward = entries.slice(index + 1).map((entry, i) => ({entry, delta: i + 1}));
  return (
    <nav className={styles.nav} aria-label="Page history">
      <HistoryButton direction="back" pages={back} />
      <HistoryButton direction="forward" pages={forward} />
    </nav>
  );
}
