import {useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import {useHistory} from '@docusaurus/router';
import {KindIcon, KindPill} from '../KindIcon';
import {suggested} from '@site/src/data/suggested';
import {search, splitMatch} from './rank';
import type {IndexEntry} from './types';
import {useIndex} from './useIndex';
import {useOverlays} from '../Overlays/context';
import {SparkleIcon} from '../AskAI/SparkleIcon';
import styles from './styles.module.css';

const sameNames = (entry: IndexEntry, names: string[]) =>
  [...entry.path, entry.title].join('\u0000') === names.join('\u0000');

function SearchIcon(): ReactNode {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/** The search bar's panel: search over the build-time index (ux-spec.md, Search). */
export default function SearchModal({onClose}: {onClose: () => void}): ReactNode {
  const index = useIndex();
  const history = useHistory();
  const {askAIEnabled, openAskAI} = useOverlays();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const trimmed = query.trim();
  const entries = useMemo(() => {
    if (!index) return [];
    if (!trimmed) {
      return suggested.flatMap((names) => index.filter((e) => sameNames(e, names)));
    }
    return search(index, trimmed);
  }, [index, trimmed]);
  const current = Math.min(active, Math.max(0, entries.length - 1));

  useEffect(() => {
    inputRef.current?.focus();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({block: 'nearest'});
  }, [current]);

  const open = (entry: IndexEntry) => {
    onClose();
    history.push(entry.href);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(current + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === 'Enter' && e.target === inputRef.current) {
      e.preventDefault();
      if (entries[current]) open(entries[current]);
    } else if (e.key === 'Tab' && panelRef.current) {
      // Keep focus inside the dialog.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('input, button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const label = trimmed ? (entries.length ? 'Results' : '') : 'Suggested';

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Search the docs"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}>
        <div className={styles.inputRow}>
          <SearchIcon />
          <input
            ref={inputRef}
            className={styles.input}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search the docs"
            aria-label="Search the docs"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={entries.length ? `search-option-${current}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.results}>
          {label && <p className={styles.listLabel}>{label}</p>}
          <ul ref={listRef} id="search-results" role="listbox" aria-label={label || 'Results'} className={styles.list}>
            {entries.map((entry, i) => {
              const [before, match, after] = splitMatch(entry.title, trimmed);
              return (
                <li
                  key={entry.href + entry.title}
                  id={`search-option-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === current}
                  className={styles.option}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={() => open(entry)}>
                  <KindIcon kind={entry.kind} />
                  <span className={styles.text}>
                    <span className={styles.title}>
                      {before}
                      {match && <mark className={styles.match}>{match}</mark>}
                      {after}
                    </span>
                    <span className={styles.path}>{entry.path.join(' / ')}</span>
                  </span>
                  <KindPill kind={entry.kind} />
                </li>
              );
            })}
          </ul>
          {index && trimmed && entries.length === 0 && (
            <p className={styles.empty} role="status">
              No pages match “{trimmed}”. Try other words{askAIEnabled ? ', or ask AI below' : ''}.
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          {askAIEnabled && (
            <button type="button" className={styles.askAI} onClick={() => openAskAI(trimmed || undefined)}>
              <SparkleIcon size={13} />
              <span className={styles.askAIText}>{trimmed ? `Ask AI about “${trimmed}”` : 'Ask AI'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
