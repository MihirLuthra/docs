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
import {suggested} from '@site/src/data/suggested';
import {search, splitMatch} from './rank';
import type {IndexEntry} from './types';
import {useIndex} from './useIndex';
import {useOverlays} from '../Overlays/context';
import {SparkleIcon} from '../AskAI/SparkleIcon';
import {SEARCH_TRIGGER_ATTR} from '@site/src/lib/search-early';
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

const OPEN_MS = 260;
const CLOSE_MS = 160;
const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * The panel drawn as the header's search bar: moved onto the bar and clipped
 * to its size and radius, so animating from (or to) this keyframe makes the
 * bar grow into the panel. Null when the bar isn't on screen, or the user
 * prefers reduced motion.
 */
function asTrigger(panel: HTMLElement): Keyframe | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const trigger = document.querySelector<HTMLElement>(`[${SEARCH_TRIGGER_ATTR}]`);
  if (!trigger || trigger.offsetParent === null) return null;
  const t = trigger.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const w = Math.min(t.width, p.width);
  const h = Math.min(t.height, p.height);
  const left = (p.width - w) / 2;
  const dx = t.left + (t.width - w) / 2 - (p.left + left);
  const dy = t.top - p.top;
  const radius = getComputedStyle(trigger).borderTopLeftRadius;
  return {
    transform: `translate(${dx}px, ${dy}px)`,
    clipPath: `inset(0px ${p.width - left - w}px ${p.height - h}px ${left}px round ${radius})`,
  };
}

// Room for the panel's shadow (--fx-shadow-modal) outside the clip.
const SHADOW_ROOM = 120;

/**
 * The panel itself: clipped to its own shape, then unclipped so its shadow
 * shows. `offset` is where in the animation the first of the two falls.
 */
function asPanel(panel: HTMLElement, offset: number): Keyframe[] {
  const radius = parseFloat(getComputedStyle(panel).borderTopLeftRadius);
  const at = (room: number) =>
    `inset(${-room}px ${-room}px ${-room}px ${-room}px round ${radius + room}px)`;
  const still = {transform: 'translate(0px, 0px)'};
  return [
    {...still, clipPath: at(0), offset},
    {...still, clipPath: at(SHADOW_ROOM)},
  ];
}

/**
 * Fades the backdrop's tint in or out. Its colour, not its opacity: opacity
 * below 1 on the backdrop would cut the panel's blur off from the page.
 */
function fadeBackdrop(el: HTMLElement | null, show: boolean, options: KeyframeAnimationOptions): void {
  if (!el) return;
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

  const trimmed = query.trim();
  const entries = useMemo(() => {
    if (!index) return [];
    if (!trimmed) {
      return suggested.flatMap((names) => index.filter((e) => sameNames(e, names)));
    }
    return search(index, trimmed);
  }, [index, trimmed]);
  const current = Math.min(active, Math.max(0, entries.length - 1));

  // Grow out of the header's search bar, the content fading in as it does.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const from = panel && asTrigger(panel);
    if (!panel || !from) return;
    panel.animate([from, ...asPanel(panel, 0.85)], {duration: OPEN_MS, easing: EASE_OUT});
    for (const child of panel.children) {
      child.animate([{opacity: 0}, {opacity: 1}], {
        duration: OPEN_MS * 0.6,
        delay: OPEN_MS * 0.1,
        fill: 'backwards',
        easing: 'ease-out',
      });
    }
    fadeBackdrop(backdropRef.current, true, {duration: OPEN_MS});
  }, []);

  // Esc, ×, or a click outside: shrink back into the bar, then close.
  const dismiss = useCallback(() => {
    const panel = panelRef.current;
    if (closing.current) return;
    closing.current = true;
    // Keys and clicks go to the page while it animates out.
    const backdrop = backdropRef.current;
    const focused = document.activeElement;
    if (backdrop) backdrop.inert = true;
    if (focused instanceof HTMLElement && backdrop?.contains(focused)) focused.blur();
    const to = panel && asTrigger(panel);
    if (!panel || !to) {
      onClose();
      return;
    }
    const options = {duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards'} as const;
    const [tight, loose] = asPanel(panel, 0.15);
    panel.animate([{...loose, offset: 0}, tight, to], options).finished.then(onClose, onClose);
    for (const child of panel.children) child.animate([{opacity: 1}, {opacity: 0}], options);
    fadeBackdrop(backdropRef.current, false, options);
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

  const label = trimmed ? (entries.length ? 'Results' : '') : 'Suggested';

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
            aria-expanded="true"
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
