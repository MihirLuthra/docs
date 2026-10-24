import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {useHistory} from '@docusaurus/router';
import {KindIcon, KindPill} from '../KindIcon';
import {search, splitMatch} from './rank';
import type {IndexEntry} from './types';
import {useIndex} from './useIndex';
import {useOverlays} from '../Overlays/context';
import {SparkleIcon} from '../AskAI/SparkleIcon';
import styles from './styles.module.css';

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

// Motion: a quick entrance that settles fast, the height following the
// results as you type, and a shorter exit. None with reduced motion.
const OPEN_MS = 200;
const RESIZE_MS = 180;
const CLOSE_MS = 120;
const SETTLE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fades the backdrop's tint in or out. Its colour, not its opacity: opacity
 * below 1 on the backdrop would cut the panel's blur off from the page.
 */
function fadeBackdrop(el: HTMLElement, show: boolean, options: KeyframeAnimationOptions): void {
  const frames = [{backgroundColor: 'transparent'}, {backgroundColor: getComputedStyle(el).backgroundColor}];
  el.animate(show ? frames : frames.reverse(), options);
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
  const backdropRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const height = useRef<{last: number; animation?: Animation}>({last: 0});

  const trimmed = query.trim();
  // Nothing until something is typed: then the panel opens below the input.
  const entries = useMemo(() => (index && trimmed ? search(index, trimmed) : []), [index, trimmed]);
  const current = Math.min(active, Math.max(0, entries.length - 1));

  // Entrance.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || reducedMotion()) return;
    panel.animate(
      [{opacity: 0, transform: 'translateY(-8px) scale(0.97)'}, {opacity: 1, transform: 'none'}],
      {duration: OPEN_MS, easing: SETTLE},
    );
    fadeBackdrop(backdrop, true, {duration: OPEN_MS, easing: 'ease-out'});
  }, []);

  // The panel's height glides to fit the results instead of jumping. Runs
  // after every render; does nothing when the height hasn't changed.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const state = height.current;
    // Mid-glide, start from where it is now, not where it was heading.
    const from = state.animation ? panel.offsetHeight : state.last;
    state.animation?.cancel();
    state.animation = undefined;
    const to = panel.offsetHeight;
    state.last = to;
    if (!from || Math.abs(from - to) < 1 || reducedMotion() || closing.current) return;
    const animation = panel.animate([{height: `${from}px`}, {height: `${to}px`}], {
      duration: RESIZE_MS,
      easing: SETTLE,
    });
    state.animation = animation;
    animation.onfinish = () => {
      if (state.animation === animation) state.animation = undefined;
    };
  });

  // Esc, ×, or a click outside: a short exit, then close. Keys and clicks go
  // to the page meanwhile.
  const dismiss = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (closing.current) return;
    closing.current = true;
    if (!panel || !backdrop || reducedMotion()) {
      onClose();
      return;
    }
    const focused = document.activeElement;
    backdrop.inert = true;
    if (focused instanceof HTMLElement && backdrop.contains(focused)) focused.blur();
    const options = {duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards'} as const;
    panel
      .animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-4px) scale(0.98)'}], options)
      .finished.then(onClose, onClose);
    fadeBackdrop(backdrop, false, options);
  }, [onClose]);

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
      dismiss();
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

  return (
    <div ref={backdropRef} className={styles.backdrop} onMouseDown={dismiss}>
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
            aria-expanded={!!trimmed}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={entries.length ? `search-option-${current}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className={styles.close} onClick={dismiss} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>

        {trimmed && (
          <div className={styles.results}>
            <ul ref={listRef} id="search-results" role="listbox" aria-label="Results" className={styles.list}>
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
            {index && entries.length === 0 && (
              <p className={styles.empty} role="status">
                No pages match “{trimmed}”. Try other words{askAIEnabled ? ', or ask AI below' : ''}.
              </p>
            )}
          </div>
        )}

        {trimmed && (
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
              <button type="button" className={styles.askAI} onClick={() => openAskAI(trimmed)}>
                <SparkleIcon size={13} />
                <span className={styles.askAIText}>Ask AI about “{trimmed}”</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
