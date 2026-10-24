import {useId, useMemo, useState, type KeyboardEvent, type ReactNode} from 'react';
import {useHistory} from '@docusaurus/router';
import {flattenPages, goToPage, type Highlights} from './goto';
import {useTree} from './tree';
import styles from './styles.module.css';

function FilterIcon(): ReactNode {
  return (
    <svg className={styles.filterIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
 * "Go to page" filter above the tree (ux-spec.md, Sidebar), like GitHub's
 * "Go to file": matches page paths word by word, in any order. Separate from
 * the header search.
 */
export default function GoToPage({onNavigate}: {onNavigate?: () => void}): ReactNode {
  const tree = useTree();
  const history = useHistory();
  const id = useId();
  const pages = useMemo(() => flattenPages(tree), [tree]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => goToPage(pages, query), [pages, query]);
  const current = Math.min(active, Math.max(0, matches.length - 1));
  const open = focused && query.trim() !== '';

  const go = (href: string) => {
    setQuery('');
    history.push(href);
    onNavigate?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setActive(Math.min(current + 1, matches.length - 1));
    else if (e.key === 'ArrowUp') setActive(Math.max(current - 1, 0));
    else if (e.key === 'Enter' && matches[current]) go(matches[current].entry.href);
    else if (e.key === 'Escape' && query) setQuery('');
    else return;
    e.preventDefault();
    e.stopPropagation(); // keep Esc from closing the drawer while clearing
  };

  return (
    <div className={styles.goto}>
      <div className={styles.filterBox}>
        <FilterIcon />
        <input
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
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && matches.length ? `${id}-${current}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {open && (
        <div className={styles.gotoPanel}>
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
                  {entry.names.map((name, n) => (
                    <span key={n}>
                      {n > 0 && <span className={styles.gotoSep}> / </span>}
                      <Name name={name} ranges={highlights[n]} />
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.gotoEmpty} role="status">
              No matching pages
            </p>
          )}
        </div>
      )}
    </div>
  );
}
