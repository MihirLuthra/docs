import {useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {SPEECH_ROOT, speechBlocks, tidy, type Manifest, type SpeechBlock} from '@site/src/lib/speech/blocks';
import styles from './styles.module.css';

// The "Listen" player, loaded on first use. It plays the page's audio and
// follows it: the block being read is highlighted and kept in view, and a
// diagram shows the step being read. It skips what isn't showing (other
// tabs, the diagram path not chosen) and anything that changed since the
// build. It follows the playback speed, since it reads the audio's own time.

export type Request =
  | {kind: 'page'; nonce: number}
  | {kind: 'toggle'; nonce: number}
  | {kind: 'range'; range: Range; nonce: number};

export type PlayerProps = {manifestUrl: string; request: Request; onClose: () => void};

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const VOICE_KEY = 'fx-listen-voice';
const SPEED_KEY = 'fx-listen-speed';
const READING = 'fx-speech-reading'; // custom.css

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

type Times = Manifest['blocks'][number]['times'][string];

function Icon({d, filled}: {d: string; filled?: boolean}): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d={d} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const PLAY = 'M8 5.5v13l10.5-6.5z';
const PAUSE = 'M8 5h2.5v14H8zM13.5 5H16v14h-2.5z';
const PREV = 'M18 6l-8 6 8 6zM6 6v12';
const NEXT = 'M6 6l8 6-8 6zM18 6v12';
const CLOSE = 'M6 6l12 12M18 6L6 18';

export default function Player({manifestUrl, request, onClose}: PlayerProps): ReactNode {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [voice, setVoice] = useState<string | null>(null);
  const [speed, setSpeed] = useState(() => Number(read(SPEED_KEY)) || 1);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0); // the audio's time, for the progress line
  const [selection, setSelection] = useState(false); // reading a selection
  const audio = useRef<HTMLAudioElement | null>(null);
  const blocks = useRef<(SpeechBlock | null)[]>([]);
  const current = useRef(-1);
  const lit = useRef<Element | null>(null); // the block highlighted
  const stopAt = useRef<number | null>(null);
  const pendingSeek = useRef<number | null>(null);

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
        blocks.current = m.blocks.map((b, i) => (found[i] && tidy(found[i].text) === b.text ? found[i] : null));
        const saved = read(VOICE_KEY);
        setVoice(m.voices.some((v) => v.id === saved) ? saved : m.voices[0].id);
        setManifest(m);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [manifestUrl]);

  const times = useCallback((i: number): Times | undefined => (voice ? manifest?.blocks[i]?.times[voice] : undefined), [manifest, voice]);

  /** Whether block i is read: it has audio and is showing (its tab, its diagram path). */
  const playable = useCallback((i: number) => {
    const b = blocks.current[i];
    if (!b || b.el.closest('[hidden]')) return false;
    if (b.figure && b.variant && b.figure.getAttribute('data-speech-variant') !== b.variant) return false;
    return true;
  }, []);

  const count = manifest?.blocks.length ?? 0;
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

  const highlight = (i: number) => {
    lit.current?.classList.remove(READING);
    lit.current = null;
    current.current = i;
    const b = blocks.current[i];
    if (!b) return;
    b.el.classList.add(READING);
    lit.current = b.el;
    if (b.figure && b.step !== undefined) b.figure.dispatchEvent(new CustomEvent('fx-speech-step', {detail: {step: b.step}}));
    // Keep what's being read in view, without moving the page when it already is.
    const target = b.figure ?? b.el;
    const r = target.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx-header-height')) || 64;
    if (r.top < top || r.bottom > window.innerHeight - 96) target.scrollIntoView({block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth'});
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
      setSelection(false);
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

  // Follow the audio: the block being read, skipping what isn't showing, and
  // the end of a selection.
  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    const tick = () => {
      const a = audio.current;
      if (!a) return;
      const t = a.currentTime;
      if (stopAt.current !== null && t >= stopAt.current) {
        stopAt.current = null;
        a.pause();
        setSelection(false);
        lit.current?.classList.remove(READING);
        lit.current = null;
        current.current = -2;
        return; // stopped: nothing more to follow
      }
      const i = blockAt(t);
      if (i !== current.current) {
        if (playable(i)) highlight(i);
        else {
          const j = nextPlayable(i + 1);
          const tm = j >= 0 ? times(j) : undefined;
          if (tm && stopAt.current === null) a.currentTime = tm.start;
          else {
            a.pause();
            a.currentTime = times(count - 1)?.end ?? a.duration;
          }
        }
      }
      setNow(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }); // runs each render: it reads the latest state

  const seek = (t: number, play = true) => {
    const a = audio.current;
    if (!a) return;
    if (a.readyState === 0) pendingSeek.current = t;
    else a.currentTime = t;
    current.current = -2; // re-highlight
    if (play) void a.play().catch(() => setPlaying(false));
  };

  // What was asked for: the page from the top, play/pause, or a selection.
  // Each request once (not again when the voice changes).
  const handled = useRef(0);
  useEffect(() => {
    if (!manifest || !voice || handled.current === request.nonce) return;
    const a = audio.current;
    if (!a) return;
    handled.current = request.nonce;
    if (request.kind === 'toggle') {
      if (a.paused) void a.play().catch(() => setPlaying(false));
      else a.pause();
      return;
    }
    if (request.kind === 'page') {
      stopAt.current = null;
      setSelection(false);
      const first = nextPlayable(0);
      seek(first >= 0 ? times(first)!.start : 0);
      return;
    }
    // A selection: from the word it starts in to the word it ends in.
    const range = request.range;
    const at = (node: Node, offset: number, end: boolean): number | null => {
      let found = -1;
      blocks.current.forEach((b, i) => {
        if (b && b.el.contains(node.nodeType === 1 ? node : node.parentNode)) found = i;
      });
      const b = blocks.current[found];
      const tm = times(found);
      if (!b || !tm) return null;
      const r = document.createRange();
      r.selectNodeContents(b.el);
      r.setEnd(node, offset);
      const text = manifest.blocks[found].text;
      let c = Math.min(tidy(r.toString()).length, text.length);
      if (end) while (c < text.length && /\S/.test(text[c])) c++;
      else while (c > 0 && /\S/.test(text[c - 1])) c--;
      const s = tm.sentences.find(([, , from, to]) => c >= from && c <= to) ?? tm.sentences[tm.sentences.length - 1];
      if (!s) return end ? tm.end : tm.start;
      const [start, stop, from, to] = s;
      return start + ((c - from) / Math.max(1, to - from)) * (stop - start);
    };
    const start = at(range.startContainer, range.startOffset, false);
    const end = at(range.endContainer, range.endOffset, true);
    if (start === null) return;
    stopAt.current = end !== null && end > start ? end + 0.15 : null;
    setSelection(true);
    window.getSelection()?.removeAllRanges();
    seek(Math.max(0, start - 0.05));
  }, [request, manifest, voice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speed, kept for next time.
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
    write(SPEED_KEY, String(speed));
  }, [speed]);

  // Another voice: the same place in its recording.
  const chooseVoice = (id: string) => {
    const a = audio.current;
    const i = current.current;
    const old = times(i);
    const tm = manifest?.blocks[i]?.times[id];
    const wasPlaying = a ? !a.paused : false;
    if (a && old && tm) pendingSeek.current = tm.start + ((a.currentTime - old.start) / (old.end - old.start)) * (tm.end - tm.start);
    write(VOICE_KEY, id);
    setVoice(id);
    if (wasPlaying && a) a.addEventListener('canplay', () => void a.play().catch(() => setPlaying(false)), {once: true});
  };

  // Stop and clear on close (and when leaving the page).
  useEffect(
    () => () => {
      audio.current?.pause();
      lit.current?.classList.remove(READING);
    },
    [],
  );

  // The OS's media controls (keyboard media keys, lock screen).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    navigator.mediaSession.metadata = new MediaMetadata({title: document.title, artist: 'Fortanix Docs'});
    navigator.mediaSession.setActionHandler('play', () => void audio.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.current?.pause());
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, []);

  // Progress over what is read: the blocks showing, not the whole recording.
  const {elapsed, total} = useMemo(() => {
    let elapsedSum = 0;
    let totalSum = 0;
    for (let i = 0; i < count; i++) {
      const tm = times(i);
      if (!tm || !playable(i)) continue;
      const d = tm.end - tm.start;
      totalSum += d;
      if (now >= tm.end) elapsedSum += d;
      else if (now > tm.start) elapsedSum += now - tm.start;
    }
    return {elapsed: elapsedSum, total: totalSum};
  }, [now, count, times, playable]);

  const onProgress = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let left = ((e.clientX - r.left) / r.width) * total;
    for (let i = 0; i < count; i++) {
      const tm = times(i);
      if (!tm || !playable(i)) continue;
      const d = tm.end - tm.start;
      if (left <= d) {
        stopAt.current = null;
        setSelection(false);
        seek(tm.start + left);
        return;
      }
      left -= d;
    }
  };

  const step = (dir: 1 | -1) => {
    const a = audio.current;
    if (!a) return;
    const i = current.current < 0 ? blockAt(a.currentTime) : current.current;
    const tm = times(i);
    let j: number;
    if (dir === -1 && tm && a.currentTime - tm.start > 2) j = i;
    else j = dir === 1 ? nextPlayable(i + 1) : prevPlayable(i - 1);
    const tj = j >= 0 ? times(j) : undefined;
    if (tj) {
      stopAt.current = null;
      setSelection(false);
      seek(tj.start, !a.paused);
    }
  };

  const status = failed ? "This page's audio isn't built. Run pnpm speech after the build." : !manifest ? 'Loading…' : selection ? 'Reading your selection' : 'Listening to this page';

  return (
    <div className={styles.bar} role="region" aria-label="Listen to this page">
      <button type="button" className={styles.control} aria-label="Previous paragraph" onClick={() => step(-1)} disabled={!manifest}>
        <Icon d={PREV} filled />
      </button>
      <button
        type="button"
        className={`${styles.control} ${styles.play}`}
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={!manifest}
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) void a.play().catch(() => setPlaying(false));
          else a.pause();
        }}>
        <Icon d={playing ? PAUSE : PLAY} filled />
      </button>
      <button type="button" className={styles.control} aria-label="Next paragraph" onClick={() => step(1)} disabled={!manifest}>
        <Icon d={NEXT} filled />
      </button>
      <div className={styles.middle}>
        <span className={styles.status} aria-live="polite">
          {status}
        </span>
        <div className={styles.progress} onClick={onProgress} role="presentation">
          <div className={styles.progressDone} style={{width: total ? `${(elapsed / total) * 100}%` : 0}} />
        </div>
        <span className={styles.time}>
          {clock(elapsed)} / {clock(total)}
        </span>
      </div>
      <button
        type="button"
        className={`${styles.control} ${styles.speed}`}
        aria-label={`Speed ${speed} times, change`}
        onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1)}>
        {speed}×
      </button>
      {manifest && manifest.voices.length > 1 && (
        <select className={styles.voice} aria-label="Voice" value={voice ?? ''} onChange={(e) => chooseVoice(e.target.value)}>
          {manifest.voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      <button type="button" className={styles.control} aria-label="Close" onClick={onClose}>
        <Icon d={CLOSE} />
      </button>
    </div>
  );
}
