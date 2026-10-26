import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {SPEECH_ROOT, speechBlocks, speechKey, textMap, type Manifest, type Origin, type SpeechBlock, type WordTime} from '@site/src/lib/speech/blocks';
import styles from './styles.module.css';

// The "Listen" player, loaded on first use. It plays the page's audio and
// follows it: the block being read is tinted, the word being read is
// highlighted, the block is kept in view, and a diagram shows the step being
// read. It skips what isn't showing (other tabs, the diagram path not
// chosen) and anything that changed since the build. Everything follows the
// audio's own clock, so it keeps pace at any speed.
//
// Keys (while open, when not typing): Space play/pause, ← → a word back or
// forward (hold to keep going), Shift ← → a block, ↑ ↓ faster or slower,
// V the next voice (when there are several), Esc close.

export type Request =
  | {kind: 'page'; nonce: number}
  | {kind: 'toggle'; nonce: number}
  | {kind: 'range'; range: Range; nonce: number}
  /** Listen from here: a point in the page's text, or an element (a heading). */
  | {kind: 'from'; at: {node: Node; offset: number} | Element; nonce: number};

export type PlayerProps = {manifestUrl: string; request: Request; onClose: () => void};

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const VOICE_KEY = 'fx-listen-voice';
const SPEED_KEY = 'fx-listen-speed';
const READING = 'fx-speech-reading'; // custom.css: the block being read
const WORD = 'fx-speech-word'; // custom.css ::highlight(): the word being read (its colour)
const WORD_MARKER = 'fx-speech-marker'; // custom.css: the rounded marker behind it
const SELECTION = 'fx-speech-selection'; // custom.css ::highlight(): the text chosen to read
const REPEAT_DELAY = 350; // holding a word button: the first repeat, then every…
const REPEAT_EVERY = 110;

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the choice lasts for this page.
  }
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** CSS Custom Highlights, where the browser has them (no word highlight otherwise). */
type Highlights = {set: (name: string, h: unknown) => void; delete: (name: string) => void};
const highlights = (): Highlights | null =>
  typeof CSS !== 'undefined' && 'highlights' in CSS ? (CSS as unknown as {highlights: Highlights}).highlights : null;
const mark = (name: string, range: Range | null) => {
  const h = highlights();
  if (!h) return;
  if (!range) h.delete(name);
  else h.set(name, new (window as unknown as {Highlight: new (r: Range) => unknown}).Highlight(range));
};

/**
 * The word being read: a rounded marker that slides from word to word (and
 * jumps, without sliding, to a new line). It sits over the text, blended so
 * the text shows through; the word's own colour comes from the highlight.
 */
const marker = {
  el: null as HTMLDivElement | null,
  range: null as Range | null,
  top: NaN,
  show(range: Range | null) {
    this.range = range;
    const rect = range?.getClientRects()[0];
    if (!rect) return this.hide();
    let el = this.el;
    if (!el) {
      el = this.el = document.createElement('div');
      el.className = WORD_MARKER;
      el.setAttribute('aria-hidden', 'true');
      document.body.append(el);
    }
    const top = rect.top + window.scrollY;
    // A new line (or just shown): no slide across the text.
    el.toggleAttribute('data-jump', el.hidden || Math.abs(top - this.top) > 2);
    this.top = top;
    el.hidden = false;
    el.style.transform = `translate(${rect.left + window.scrollX}px, ${top}px)`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  },
  /** After the page reflows (a resize): the same word, where it is now. */
  refresh() {
    if (this.el && !this.el.hidden && this.range) {
      this.top = NaN;
      this.show(this.range);
    }
  },
  hide() {
    this.range = null;
    if (this.el) this.el.hidden = true;
  },
  remove() {
    this.el?.remove();
    this.el = null;
    this.range = null;
  },
};

/** The page range of characters [from, to) of a block's text. */
function rangeOf(origins: Origin[], from: number, to: number): Range | null {
  let a: Origin = null;
  let b: Origin = null;
  for (let i = from; i < to && !a; i++) a = origins[i] ?? null;
  for (let i = to - 1; i >= from && !b; i--) b = origins[i] ?? null;
  if (!a || !b) return null;
  const r = document.createRange();
  r.setStart(a[0], a[1]);
  r.setEnd(b[0], b[1] + 1);
  return r;
}

const ICONS = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8 5h2.5v14H8zM13.5 5H16v14h-2.5z',
  prevBlock: 'M18 6l-8 6 8 6zM6 6v12',
  nextBlock: 'M6 6l8 6-8 6zM18 6v12',
  prevWord: 'M12 7l-5 5 5 5M18 7l-5 5 5 5',
  nextWord: 'M6 7l5 5-5 5M12 7l5 5-5 5',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  caret: 'M7 14l5-5 5 5',
  voice: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
};
const FILLED = new Set(['play', 'pause', 'prevBlock', 'nextBlock']);

function Icon({name}: {name: keyof typeof ICONS}): ReactNode {
  const filled = FILLED.has(name);
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d={ICONS[name]}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 1.5 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A control's tooltip: what it does and its keys. */
function Tip({label, keys}: {label: string; keys: string[]}): ReactNode {
  return (
    <span className={styles.tip} aria-hidden="true">
      {label}
      {keys.map((k) => (
        <kbd key={k} className={styles.kbd}>
          {k}
        </kbd>
      ))}
    </span>
  );
}

export default function Player({manifestUrl, request, onClose}: PlayerProps): ReactNode {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [voice, setVoice] = useState<string | null>(null);
  const [speed, setSpeed] = useState(() => (SPEEDS.includes(Number(read(SPEED_KEY))) ? Number(read(SPEED_KEY)) : 1));
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [selection, setSelection] = useState(false);
  const [menu, setMenu] = useState<'speed' | 'voice' | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const blocks = useRef<(SpeechBlock | null)[]>([]);
  const maps = useRef(new Map<number, Origin[]>());
  const current = useRef(-1);
  const word = useRef('');
  const lit = useRef<Element | null>(null);
  const reading = useRef<'page' | 'selection'>('page');
  const stopAt = useRef<number | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // The manifest, and the page's blocks matched to it (a block whose text
  // changed since the build has no audio).
  useEffect(() => {
    let live = true;
    fetch(manifestUrl)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : Promise.reject(new Error(String(r.status)))))
      .then((m) => {
        if (!live) return;
        const root = document.querySelector(SPEECH_ROOT);
        const found = root ? speechBlocks(root) : [];
        blocks.current = m.blocks.map((b, i) => (found[i] && speechKey(found[i]) === b.key ? found[i] : null));
        const saved = read(VOICE_KEY);
        setVoice(m.voices.some((v) => v.id === saved) ? saved : m.voices[0].id);
        setManifest(m);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [manifestUrl]);

  const count = manifest?.blocks.length ?? 0;
  const times = useCallback((i: number) => (voice ? manifest?.blocks[i]?.times[voice] : undefined), [manifest, voice]);

  /** Whether block i is read: it has audio and is showing (its tab, its diagram path). */
  const playable = useCallback((i: number) => {
    const b = blocks.current[i];
    if (!b || b.el.closest('[hidden]')) return false;
    if (b.figure && b.variant && b.figure.getAttribute('data-speech-variant') !== b.variant) return false;
    return true;
  }, []);
  const nextPlayable = (from: number) => {
    for (let i = from; i < count; i++) if (playable(i)) return i;
    return -1;
  };
  const prevPlayable = (from: number) => {
    for (let i = from; i >= 0; i--) if (playable(i)) return i;
    return -1;
  };
  const blockAt = (t: number) => {
    for (let i = 0; i < count; i++) {
      const tm = times(i);
      if (tm && t < tm.end) return i;
    }
    return count - 1;
  };
  const wordAt = (i: number, t: number): WordTime | undefined => {
    let found: WordTime | undefined;
    for (const w of times(i)?.words ?? []) {
      if (w[0] > t) break;
      found = w;
    }
    return found && t < found[1] + 0.25 ? found : undefined;
  };
  const originsOf = (i: number) => {
    let o = maps.current.get(i);
    const b = blocks.current[i];
    if (!o && b && !b.narration) {
      o = textMap(b.el).origins;
      maps.current.set(i, o);
    }
    return o;
  };

  const clearMarks = () => {
    lit.current?.classList.remove(READING);
    lit.current = null;
    word.current = '';
    mark(WORD, null);
    marker.hide();
  };

  const enterBlock = (i: number) => {
    lit.current?.classList.remove(READING);
    lit.current = null;
    current.current = i;
    const b = blocks.current[i];
    if (!b) return;
    // Reading the page, its block is tinted; reading a selection, only the selection is.
    if (!b.narration && reading.current === 'page') {
      b.el.classList.add(READING);
      lit.current = b.el;
    }
    if (b.figure && b.step !== undefined) b.figure.dispatchEvent(new CustomEvent('fx-speech-step', {detail: {step: b.step}}));
    // Keep what's being read in view, without moving the page when it already is.
    const target = b.figure ?? b.el;
    const r = target.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx-header-height')) || 64;
    const bottom = window.innerHeight - (barRef.current?.offsetHeight ?? 80) - 24;
    if (r.top < top || r.bottom > bottom) target.scrollIntoView({block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth'});
  };

  // The audio element for the chosen voice.
  useEffect(() => {
    if (!manifest || !voice) return undefined;
    const file = manifest.voices.find((v) => v.id === voice)!.file;
    const a = audio.current ?? new Audio();
    audio.current = a;
    a.preload = 'auto';
    a.src = new URL(file, new URL(manifestUrl, window.location.href)).href;
    a.playbackRate = speed;
    const onMeta = () => {
      if (pendingSeek.current !== null) {
        a.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      endSelection();
      clearMarks();
    };
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
    };
  }, [manifest, voice]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Follows the audio at time t: the block (skipping what isn't showing) and the word. */
  const follow = (t: number) => {
    const a = audio.current;
    if (!a) return;
    const i = blockAt(t);
    if (i !== current.current) {
      if (playable(i)) enterBlock(i);
      else {
        const j = nextPlayable(i + 1);
        const tm = j >= 0 ? times(j) : undefined;
        if (tm && stopAt.current === null) a.currentTime = tm.start;
        else {
          a.pause();
          a.currentTime = times(count - 1)?.end ?? a.duration;
        }
        return;
      }
    }
    const found = wordAt(i, t);
    // Reading a selection, nothing past its last word is marked.
    const w = found && stopAt.current !== null && found[0] >= stopAt.current - 0.06 ? undefined : found;
    const id = w ? `${i}:${w[2]}` : '';
    if (id !== word.current) {
      word.current = id;
      const origins = w && originsOf(i);
      const range = w && origins ? rangeOf(origins, w[2], w[3]) : null;
      mark(WORD, range);
      marker.show(range);
    }
  };

  /** Back to reading the page (skipping around after a selection). */
  const endSelection = () => {
    if (reading.current !== 'selection') return;
    reading.current = 'page';
    stopAt.current = null;
    setSelection(false);
    mark(SELECTION, null);
    current.current = -2; // re-enter the block, tinted again
  };

  // While playing, follow every frame; stop at the end of a selection.
  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    const tick = () => {
      const a = audio.current;
      if (!a) return;
      // A jump waiting for the audio to load: don't follow time 0 (the page's
      // start) meanwhile, or the page scrolls up and back down.
      if (pendingSeek.current !== null) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const t = a.currentTime;
      if (stopAt.current !== null && t >= stopAt.current) {
        a.pause();
        endSelection();
        clearMarks();
        return;
      }
      follow(t);
      setNow(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  // A selection also stops on a timer at its end, so the stop doesn't wait for the next frame.
  useEffect(() => {
    const a = audio.current;
    if (!playing || !selection || !a || stopAt.current === null) return undefined;
    const end = stopAt.current;
    let timer = 0;
    const check = () => {
      if (stopAt.current !== end) return;
      const left = end - a.currentTime;
      // The audio may start a moment after the timer: wait out what's left.
      if (left > 0.01) timer = window.setTimeout(check, (left / a.playbackRate) * 1000);
      else {
        a.pause();
        endSelection();
        clearMarks();
      }
    };
    check();
    return () => window.clearTimeout(timer);
  }, [playing, selection, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = (t: number, play?: boolean) => {
    const a = audio.current;
    if (!a) return;
    if (a.readyState === 0) pendingSeek.current = t;
    else a.currentTime = t;
    current.current = -2; // re-enter the block
    follow(t);
    setNow(t);
    if (play) void a.play().catch(() => setPlaying(false));
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  // What was asked for: the page from the top, play/pause, or a selection.
  // Each request once (not again when the voice changes).
  const handled = useRef(0);
  useEffect(() => {
    if (!manifest || !voice || handled.current === request.nonce) return;
    const a = audio.current;
    if (!a) return;
    handled.current = request.nonce;
    if (request.kind === 'toggle') return toggle();
    if (request.kind === 'page') {
      endSelection();
      const first = nextPlayable(0);
      return seek(first >= 0 ? times(first)!.start : 0, true);
    }
    if (request.kind === 'from') {
      endSelection();
      const at = request.at;
      if (at instanceof Element) {
        // The first block at or after it.
        const i = blocks.current.findIndex(
          (b, k) => b && playable(k) && (b.el === at || at.contains(b.el) || !!(at.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING)),
        );
        return i >= 0 ? seek(times(i)!.start, true) : undefined;
      }
      const t = timeAt(at.node, at.offset, false);
      return t === null ? undefined : seek(Math.max(0, t - 0.05), true);
    }
    // A selection: from the word it starts in to the word it ends in, only
    // the chosen text tinted (not its whole block).
    const range = request.range;
    const start = timeAt(range.startContainer, range.startOffset, false);
    const end = timeAt(range.endContainer, range.endOffset, true);
    if (start === null) return;
    clearMarks();
    reading.current = 'selection';
    stopAt.current = end !== null && end > start ? end + 0.04 : null;
    setSelection(true);
    mark(SELECTION, range);
    window.getSelection()?.removeAllRanges();
    seek(Math.max(0, start - 0.05), true);
  }, [request, manifest, voice]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The time of the word at a point in the page's text: its start, or with `end`, its end. */
  function timeAt(node: Node, offset: number, end: boolean): number | null {
    let found = -1;
    blocks.current.forEach((b, i) => {
      if (b && !b.narration && b.el.contains(node.nodeType === 1 ? node : node.parentNode)) found = i;
    });
    const b = blocks.current[found];
    const tm = times(found);
    if (!b || !tm) return null;
    const r = document.createRange();
    r.selectNodeContents(b.el);
    r.setEnd(node, offset);
    const c = r.toString().replace(/\s+/g, ' ').trimStart().length; // where in the block's text
    const w = end ? [...tm.words].reverse().find((x) => x[2] < c) : tm.words.find((x) => x[3] > c);
    return w ? (end ? w[1] : w[0]) : end ? tm.end : tm.start;
  }

  // Speed, kept for next time.
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
    write(SPEED_KEY, String(speed));
  }, [speed]);

  // Another voice: the same place in its recording.
  const chooseVoice = (id: string) => {
    if (id === voice) return;
    const a = audio.current;
    const i = current.current;
    const old = times(i);
    const tm = manifest?.blocks[i]?.times[id];
    const wasPlaying = a ? !a.paused : false;
    endSelection();
    if (a && old && tm) pendingSeek.current = tm.start + ((a.currentTime - old.start) / (old.end - old.start)) * (tm.end - tm.start);
    write(VOICE_KEY, id);
    setVoice(id);
    if (wasPlaying && a) a.addEventListener('canplay', () => void a.play().catch(() => setPlaying(false)), {once: true});
  };

  /** The next or previous word to stop at (a narration line counts as one). */
  const stepWord = (dir: 1 | -1) => {
    const a = audio.current;
    if (!a) return;
    endSelection();
    const t = a.currentTime;
    const stops: number[] = [];
    for (let i = 0; i < count; i++) {
      const tm = times(i);
      if (!tm || !playable(i)) continue;
      if (tm.words.length) stops.push(...tm.words.map((w) => w[0]));
      else stops.push(tm.start);
    }
    let target: number | undefined;
    if (dir === 1) target = stops.find((s) => s > t + 0.05);
    else {
      const before = stops.filter((s) => s <= t + 0.01);
      const here = before[before.length - 1];
      target = here !== undefined && t - here > 0.35 ? here : before[before.length - 2];
    }
    if (target !== undefined) seek(target);
  };

  const stepBlock = (dir: 1 | -1) => {
    const a = audio.current;
    if (!a) return;
    endSelection();
    const i = current.current < 0 ? blockAt(a.currentTime) : current.current;
    const tm = times(i);
    const j = dir === -1 && tm && a.currentTime - tm.start > 2 ? i : dir === 1 ? nextPlayable(i + 1) : prevPlayable(i - 1);
    const tj = j >= 0 ? times(j) : undefined;
    if (tj) seek(tj.start);
  };

  const faster = (dir: 1 | -1) => setSpeed((s) => SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + dir))] ?? 1);
  const nextVoice = () => {
    if (!manifest || !voice) return;
    const k = manifest.voices.findIndex((v) => v.id === voice);
    chooseVoice(manifest.voices[(k + 1) % manifest.voices.length].id);
  };

  // Keys, while open and not typing (the latest handlers, through a ref).
  const keys = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keys.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
    if (e.key === 'Escape') {
      if (menu) setMenu(null);
      else onClose();
    } else if (e.key === ' ' || e.key === 'k') {
      // Space on a focused player button presses it: leave that to the button.
      if (t?.closest('button') && barRef.current?.contains(t)) return;
      toggle();
    } else if (e.key === 'ArrowRight' && !menu) (e.shiftKey ? stepBlock : stepWord)(1);
    else if (e.key === 'ArrowLeft' && !menu) (e.shiftKey ? stepBlock : stepWord)(-1);
    else if ((e.key === 'ArrowUp' && !menu) || e.key === '>') faster(1);
    else if ((e.key === 'ArrowDown' && !menu) || e.key === '<') faster(-1);
    else if (e.key === 'v' || e.key === 'V') nextVoice();
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Holding a word button keeps going, word by word.
  const holdTimer = useRef<number | undefined>(undefined);
  const stopHold = () => window.clearTimeout(holdTimer.current);
  const hold = (dir: 1 | -1) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      stepWord(dir);
      const again = (delay: number) => {
        holdTimer.current = window.setTimeout(() => {
          stepWord(dir);
          again(REPEAT_EVERY);
        }, delay);
      };
      again(REPEAT_DELAY);
    },
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    // Enter or Space on the focused button: one word (a pointer press already moved).
    onClick: (e: ReactMouseEvent) => {
      if (e.detail === 0) stepWord(dir);
    },
  });

  // Stop and clear on close (and when leaving the page).
  useEffect(
    () => () => {
      audio.current?.pause();
      stopHold();
      lit.current?.classList.remove(READING);
      mark(WORD, null);
      mark(SELECTION, null);
      marker.remove();
    },
    [],
  );

  // The page reflows on a resize: the marker follows its word.
  useEffect(() => {
    const onResize = () => marker.refresh();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The OS's media controls (media keys, lock screen).
  const media = useRef({toggle, stepBlock, stepWord});
  media.current = {toggle, stepBlock, stepWord};
  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    navigator.mediaSession.metadata = new MediaMetadata({title: document.title, artist: 'Fortanix Docs'});
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', () => void audio.current?.play()],
      ['pause', () => audio.current?.pause()],
      ['previoustrack', () => media.current.stepBlock(-1)],
      ['nexttrack', () => media.current.stepBlock(1)],
      ['seekbackward', () => media.current.stepWord(-1)],
      ['seekforward', () => media.current.stepWord(1)],
    ];
    for (const [action, fn] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch {
        // An action this browser doesn't have.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, []);

  // Progress over what is read: the blocks showing, not the whole recording.
  const shown = useMemo(() => {
    const list: {start: number; end: number}[] = [];
    for (let i = 0; i < count; i++) {
      const tm = times(i);
      if (tm && playable(i)) list.push(tm);
    }
    return list;
  }, [count, times, playable, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = shown.reduce((n, b) => n + b.end - b.start, 0);
  const elapsed = shown.reduce((n, b) => n + (now >= b.end ? b.end - b.start : now > b.start ? now - b.start : 0), 0);
  /** The recording's time at a share of what is read. */
  const timeAtShare = (share: number) => {
    let left = Math.max(0, Math.min(1, share)) * total;
    for (const b of shown) {
      const d = b.end - b.start;
      if (left <= d) return b.start + left;
      left -= d;
    }
    return shown[shown.length - 1]?.end ?? 0;
  };

  // Drag along the progress line to move through the page.
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    endSelection();
    seek(timeAtShare((e.clientX - r.left) / r.width));
  };

  const status = failed
    ? "This page's audio isn't built. Run pnpm speech after the build."
    : !manifest
      ? 'Loading…'
      : selection
        ? 'Reading your selection'
        : 'Listening to this page';
  const voiceLabel = manifest?.voices.find((v) => v.id === voice)?.label ?? '';
  const share = total ? `${Math.min(100, (elapsed / total) * 100)}%` : '0%';

  return (
    <div ref={barRef} className={styles.bar} role="region" aria-label="Listen to this page">
      <div className={styles.controls}>
        <button type="button" className={styles.control} aria-label="Previous block" aria-keyshortcuts="Shift+ArrowLeft" onClick={() => stepBlock(-1)} disabled={!manifest}>
          <Icon name="prevBlock" />
          <Tip label="Previous block" keys={['Shift', '←']} />
        </button>
        <button type="button" className={styles.control} aria-label="Back a word" aria-keyshortcuts="ArrowLeft" disabled={!manifest} {...hold(-1)}>
          <Icon name="prevWord" />
          <Tip label="Back a word" keys={['←']} />
        </button>
        <button type="button" className={`${styles.control} ${styles.play}`} aria-label={playing ? 'Pause' : 'Play'} aria-keyshortcuts="Space" disabled={!manifest} onClick={toggle}>
          <Icon name={playing ? 'pause' : 'play'} />
          <Tip label={playing ? 'Pause' : 'Play'} keys={['Space']} />
        </button>
        <button type="button" className={styles.control} aria-label="Forward a word" aria-keyshortcuts="ArrowRight" disabled={!manifest} {...hold(1)}>
          <Icon name="nextWord" />
          <Tip label="Forward a word" keys={['→']} />
        </button>
        <button type="button" className={styles.control} aria-label="Next block" aria-keyshortcuts="Shift+ArrowRight" onClick={() => stepBlock(1)} disabled={!manifest}>
          <Icon name="nextBlock" />
          <Tip label="Next block" keys={['Shift', '→']} />
        </button>
      </div>

      <div className={styles.middle}>
        <span className={styles.status} aria-live="polite">
          {status}
        </span>
        <span className={styles.time}>
          {clock(elapsed)} / {clock(total)}
        </span>
        <div
          className={styles.progress}
          role="slider"
          tabIndex={-1}
          aria-label="Position"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(elapsed)}
          aria-valuetext={`${clock(elapsed)} of ${clock(total)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
          }}>
          <div className={styles.progressDone} style={{width: share}} />
          <div className={styles.thumb} style={{left: share}} />
        </div>
      </div>

      <div className={styles.options}>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={`${styles.control} ${styles.pill}`}
            aria-haspopup="menu"
            aria-expanded={menu === 'speed'}
            aria-label={`Speed, ${speed} times`}
            aria-keyshortcuts="ArrowUp ArrowDown"
            onClick={() => setMenu(menu === 'speed' ? null : 'speed')}>
            {speed}×
            {menu !== 'speed' && <Tip label="Speed" keys={['↑', '↓']} />}
          </button>
          {menu === 'speed' && (
            <Menu label="Speed" onClose={() => setMenu(null)}>
              {SPEEDS.map((s) => (
                <MenuItem
                  key={s}
                  checked={s === speed}
                  onPick={() => {
                    setSpeed(s);
                    setMenu(null);
                  }}>
                  {s === 1 ? 'Normal' : `${s}×`}
                </MenuItem>
              ))}
            </Menu>
          )}
        </div>
        {manifest && manifest.voices.length > 1 && (
          <div className={styles.menuWrap}>
            <button
              type="button"
              className={`${styles.control} ${styles.pill}`}
              aria-haspopup="menu"
              aria-expanded={menu === 'voice'}
              aria-label={`Voice, ${voiceLabel}`}
              aria-keyshortcuts="V"
              onClick={() => setMenu(menu === 'voice' ? null : 'voice')}>
              <span className={styles.voiceName}>{voiceLabel.replace(/ \(.*\)$/, '')}</span>
              <span className={styles.voiceIcon}>
                <Icon name="voice" />
              </span>
              <Icon name="caret" />
              {menu !== 'voice' && <Tip label="Voice" keys={['V']} />}
            </button>
            {menu === 'voice' && (
              <Menu label="Voice" onClose={() => setMenu(null)}>
                {manifest.voices.map((v) => (
                  <MenuItem
                    key={v.id}
                    checked={v.id === voice}
                    onPick={() => {
                      chooseVoice(v.id);
                      setMenu(null);
                    }}>
                    {v.label}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </div>
        )}
        <button type="button" className={styles.control} aria-label="Close" aria-keyshortcuts="Escape" onClick={onClose}>
          <Icon name="close" />
          <Tip label="Close" keys={['Esc']} />
        </button>
      </div>
    </div>
  );
}

const menuItems = (menu: HTMLElement | null): HTMLElement[] =>
  menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')) : [];

/** A small menu above its button: ↑ ↓ move, Enter picks, Esc or a click outside closes. */
function Menu({label, onClose, children}: {label: string; onClose: () => void; children: ReactNode}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  // Once, when it opens (the player re-renders every frame while playing).
  useEffect(() => {
    const items = menuItems(ref.current);
    (items.find((el) => el.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) close.current();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
  return (
    <div
      ref={ref}
      className={styles.menu}
      role="menu"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = menuItems(ref.current);
        const at = items.indexOf(document.activeElement as HTMLElement);
        items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        e.preventDefault();
      }}>
      {children}
    </div>
  );
}

function MenuItem({checked, onPick, children}: {checked: boolean; onPick: () => void; children: ReactNode}): ReactNode {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} className={styles.menuItem} onClick={onPick}>
      <span className={styles.menuCheck}>{checked && <Icon name="check" />}</span>
      {children}
    </button>
  );
}
