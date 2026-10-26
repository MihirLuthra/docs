import {useEffect, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent} from 'react';
import {Shot, type StepProps} from '.';
import styles from './styles.module.css';

// A walkthrough's screenshots full screen, loaded only when opened. Zoom
// with the wheel, a pinch, + and − or a double click (around the pointer);
// drag to pan when zoomed in; swipe, ← → or the buttons for the other
// steps; Esc or the close button to go back.

const MIN = 1;
const MAX = 5;
const STEP = 1.25; // one + or − press, or wheel notch
const SWIPE = 60;

type View = {s: number; x: number; y: number};
const FIT: View = {s: 1, x: 0, y: 0};

export default function Lightbox({
  steps,
  active,
  onChange,
  onClose,
}: {
  steps: StepProps[];
  active: number;
  onChange: (k: number) => void;
  onClose: () => void;
}): ReactNode {
  const [view, setView] = useState<View>(FIT);
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, {x: number; y: number}>());
  const gesture = useRef<{view: View; x: number; y: number; dist?: number; moved: boolean} | null>(null);
  const step = steps[active];

  // A new step starts fitted.
  useEffect(() => setView(FIT), [active]);

  // Focus inside while open, back to the page after; the page doesn't scroll under it.
  useEffect(() => {
    dialog.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  /** Zooms to scale s, keeping the point (px, py) of the stage (from its centre) where it is. */
  const zoomTo = (s: number, px = 0, py = 0) =>
    setView((v) => {
      const next = Math.max(MIN, Math.min(MAX, s));
      if (next === MIN) return FIT;
      const qx = (px - v.x) / v.s;
      const qy = (py - v.y) / v.s;
      return {s: next, x: px - next * qx, y: py - next * qy};
    });
  const centreOf = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    return [clientX - r.left - r.width / 2, clientY - r.top - r.height / 2] as const;
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onChange(active + 1);
      else if (e.key === 'ArrowLeft') onChange(active - 1);
      else if (e.key === '+' || e.key === '=') zoomTo(view.s * STEP);
      else if (e.key === '-') zoomTo(view.s / STEP);
      else if (e.key === '0') setView(FIT);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const [px, py] = centreOf(e.clientX, e.clientY);
    zoomTo(view.s * (e.deltaY < 0 ? STEP : 1 / STEP), px, py);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const pts = [...pointers.current.values()];
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined;
    gesture.current = {view, x: e.clientX, y: e.clientY, dist, moved: false};
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist) {
      // Pinch: zoom around the middle of the two fingers.
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const [px, py] = centreOf((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      const s = Math.max(MIN, Math.min(MAX, g.view.s * (dist / g.dist)));
      const qx = (px - g.view.x) / g.view.s;
      const qy = (py - g.view.y) / g.view.s;
      g.moved = true;
      setView(s === MIN ? FIT : {s, x: px - s * qx, y: py - s * qy});
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) g.moved = true;
    // Zoomed in: pan. Fitted: the drag is a swipe, shown as a nudge.
    if (g.view.s > MIN) setView({...g.view, x: g.view.x + dx, y: g.view.y + dy});
    else setView({s: 1, x: dx / 3, y: 0});
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (!g) return;
    if (pointers.current.size > 0) {
      // One finger of a pinch lifted: carry on from here with the other.
      const [p] = [...pointers.current.values()];
      gesture.current = {view, x: p.x, y: p.y, moved: true};
      return;
    }
    gesture.current = null;
    if (g.view.s === MIN && !g.dist) {
      const dx = e.clientX - g.x;
      setView(FIT);
      if (dx <= -SWIPE) onChange(active + 1);
      else if (dx >= SWIPE) onChange(active - 1);
    }
  };

  return (
    <div
      ref={dialog}
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Step ${active + 1} of ${steps.length}, ${step.title}`}
      tabIndex={-1}>
      <div className={styles.lbBar}>
        <span className={styles.lbTitle}>
          <span className={styles.lbNumber}>{active + 1}</span>
          {step.title}
          <span className={styles.lbCount}>
            {active + 1} / {steps.length}
          </span>
        </span>
        <span className={styles.lbTools}>
          <button type="button" aria-label="Zoom out" onClick={() => zoomTo(view.s / STEP)} disabled={view.s <= MIN}>
            −
          </button>
          <button type="button" className={styles.lbLevel} aria-label="Fit to screen" onClick={() => setView(FIT)}>
            {Math.round(view.s * 100)}%
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomTo(view.s * STEP)} disabled={view.s >= MAX}>
            +
          </button>
          <button type="button" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </span>
      </div>

      <div
        ref={stage}
        className={styles.lbStage}
        data-zoomed={view.s > MIN || undefined}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={(e) => {
          const [px, py] = centreOf(e.clientX, e.clientY);
          if (view.s > MIN) setView(FIT);
          else zoomTo(2.5, px, py);
        }}>
        <div className={styles.lbCanvas} style={{transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`}} data-moving={!!gesture.current || undefined}>
          <Shot key={active} step={step} n={active + 1} eager whole />
        </div>
        <button type="button" className={`${styles.nav} ${styles.prev}`} aria-label="Previous step" disabled={active === 0} onClick={() => onChange(active - 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className={`${styles.nav} ${styles.next}`} aria-label="Next step" disabled={active === steps.length - 1} onClick={() => onChange(active + 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <p className={styles.lbHint}>Scroll or pinch to zoom, drag to move, ← → for the other steps, Esc to close.</p>
    </div>
  );
}
