import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import {useHistory} from '@docusaurus/router';
import {flattenPages, goToPage, type Highlights} from './goto';
import {useTree} from './tree';
import {useNavReset} from '@site/src/lib/nav-reset';
import {isPlainShortcut} from '@site/src/lib/keys';
import {useOverlays} from '@site/src/components/Overlays/context';
import styles from './styles.module.css';

const PANEL_WIDTH = 640;
const VIEWPORT_MARGIN = 16; // panel width is at most the viewport minus 2x this

function SearchIcon(): ReactNode {
  return (
    <svg className={styles.filterIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PageIcon(): ReactNode {
  return (
    <svg className={styles.gotoPageIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3h8l4 4v14H6zM14 3v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClearIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/** One path segment with its matched characters in bold. */
function Name({name, ranges}: {name: string; ranges: Highlights[number]}): ReactNode {
  if (ranges.length === 0) return name;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const parts: ReactNode[] = [];
  let at = 0;
  sorted.forEach(([start, end], i) => {
    if (start < at) return; // overlapping matches
    if (start > at) parts.push(name.slice(at, start));
    parts.push(<b key={i}>{name.slice(start, end)}</b>);
    at = end;
  });
  if (at < name.length) parts.push(name.slice(at));
  return parts;
}

/**
 * Where the dropdown goes: below the input, left-aligned with it, 640px wide
 * at most and inside the viewport; inside the mobile drawer, the drawer's
 * full width. Fixed, so the sidebar's scroll container doesn't clip it.
 */
function panelPosition(box: HTMLElement): CSSProperties {
  const rect = box.getBoundingClientRect();
  const top = rect.bottom + 4;
  const maxHeight = Math.max(window.innerHeight - top - VIEWPORT_MARGIN, 120);
  const drawer = box.closest('[role="dialog"]');
  if (drawer) {
    const d = drawer.getBoundingClientRect();
    return {top, left: d.left, width: d.width, maxHeight};
  }
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * VIEWPORT_MARGIN);
  // Left-aligned with the input; shifted left only if it would overflow.
  const left = Math.max(0, Math.min(rect.left, window.innerWidth - VIEWPORT_MARGIN - width));
  return {top, left, width, maxHeight};
}

/**
 * "Go to page" filter above the tree (ux-spec.md, Sidebar), like GitHub's
 * "Go to file": matches page paths word by word, in any order. Separate from
 * the header search; "t" focuses it.
 */
export default function GoToPage({onNavigate}: {onNavigate?: () => void}): ReactNode {
  const tree = useTree();
  const history = useHistory();
  const {openSearch} = useOverlays();
  const id = useId();
  const pages = useMemo(() => flattenPages(tree), [tree]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => goToPage(pages, query), [pages, query]);
  const current = Math.min(active, Math.max(0, matches.length - 1));
  const open = focused && query.trim() !== '';

  const place = useCallback(() => {
    if (boxRef.current) setPosition(panelPosition(boxRef.current));
  }, []);

  // Keep the dropdown under the input while it is open.
  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // "t" focuses the filter when not typing ("/" stays with the header search).
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const input = inputRef.current;
      // Only the visible instance (sidebar or drawer).
      if (!isPlainShortcut(e, 't') || !input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useNavReset(useCallback(() => setQuery(''), []));

  const go = (href: string) => {
    setQuery('');
    history.push(href);
    onNavigate?.();
  };

  const clear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setActive(Math.min(current + 1, matches.length - 1));
    else if (e.key === 'ArrowUp') setActive(Math.max(current - 1, 0));
    else if (e.key === 'Enter' && matches[current]) go(matches[current].entry.href);
    else if (e.key === 'Escape') {
      // Clears and leaves the box. With nothing typed, the Esc goes on (in
      // the mobile drawer, it closes it).
      setQuery('');
      inputRef.current?.blur();
      if (!query) return;
    }
    // "/" opens the header search from an empty box; after text, it's a
    // path separator ("armor/dsm").
    else if (e.key === '/' && !query && !e.metaKey && !e.ctrlKey && !e.altKey) openSearch();
    else return;
    e.preventDefault();
    e.stopPropagation(); // keep Esc from closing the drawer when it clears text
  };

  return (
    <div className={styles.goto}>
      <div ref={boxRef} className={styles.filterBox}>
        <SearchIcon />
        <input
          ref={inputRef}
          className={styles.filterInput}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Go to page"
          aria-label="Go to page"
          aria-keyshortcuts="t"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && matches.length ? `${id}-${current}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className={styles.filterClear}
            onClick={clear}
            // Keep focus (and the dropdown) in the input.
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Clear">
            <ClearIcon />
          </button>
        ) : (
          <kbd className={styles.filterKbd} aria-hidden="true">
            t
          </kbd>
        )}
      </div>
      {/* On <body>: the sticky sidebar is its own stacking context, so from
          inside it the panel would paint under the page's cards. */}
      {open &&
        position &&
        createPortal(
          <div className={styles.gotoPanel} style={position}>
            {matches.length > 0 ? (
              <ul id={`${id}-list`} role="listbox" aria-label="Pages" className={styles.gotoList}>
                {matches.map(({entry, highlights}, i) => (
                  <li
                    key={entry.href}
                    id={`${id}-${i}`}
                    role="option"
                    aria-selected={i === current}
                    className={styles.gotoOption}
                    // mousedown, not click: runs before the input loses focus.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(entry.href);
                    }}
                    onMouseMove={() => i !== current && setActive(i)}>
                    <PageIcon />
                    <span className={styles.gotoPath}>
                      {entry.names.map((name, n) => (
                        <span key={n}>
                          {n > 0 && <span className={styles.gotoSep}> / </span>}
                          <Name name={name} ranges={highlights[n]} />
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.gotoEmpty} role="status">
                No matching pages
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
