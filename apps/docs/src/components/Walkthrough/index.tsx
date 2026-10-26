import {
  Children,
  isValidElement,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import styles from './styles.module.css';

/** A highlighted area of a screenshot, in percent of its width and height: [left, top, width, height]. */
export type Mark = [number, number, number, number];

export type StepProps = {
  title: string;
  /** The screenshot: `require('./img/x.webp').default`. */
  image: string;
  /** Its size in pixels, so its space is kept before it loads. */
  width: number;
  height: number;
  /** What the screenshot shows, for screen readers (defaults to the title). */
  alt?: string;
  /** The controls this step uses, outlined on the screenshot. */
  marks?: Mark[];
  /** Left out (a shared flow's optional step, D16). */
  hidden?: boolean;
  children?: ReactNode;
};

/** `<Step title image width height marks>` with what to do in Markdown inside: one step of `<Walkthrough>`. */
export function Step({children}: StepProps): ReactNode {
  return children;
}

const Lightbox = lazy(() => import('./Lightbox'));

// How far a drag must go, in pixels, to move to the next screenshot.
const SWIPE = 48;

/** One screenshot with its marks, fitted inside its slide. */
export function Shot({step, n, eager, whole}: {step: StepProps; n: number; eager?: boolean; whole?: boolean}): ReactNode {
  return (
    <div
      className={styles.frame}
      // On a narrow screen, a wide screenshot zooms in around its first mark (styles.module.css).
      data-wide={(!whole && step.width / step.height > 1.6) || undefined}
      style={
        {
          '--ratio': step.width / step.height,
          '--focus-x': step.marks?.[0] ? `${step.marks[0][0] + step.marks[0][2] / 2}%` : '50%',
          '--focus-y': step.marks?.[0] ? `${step.marks[0][1] + step.marks[0][3] / 2}%` : '50%',
        } as CSSProperties
      }>
      <img
        className={styles.image}
        src={step.image}
        width={step.width}
        height={step.height}
        alt={step.alt ?? step.title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
      {(step.marks ?? []).map((m, k) => (
        <span
          key={k}
          className={styles.mark}
          style={{left: `${m[0]}%`, top: `${m[1]}%`, width: `${m[2]}%`, height: `${m[3]}%`}}
          aria-hidden="true">
          {k === 0 && <span className={styles.badge}>{n}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * A UI task as numbered steps with screenshots (D16). The screenshot of the
 * step chosen is shown large, with the controls it uses outlined; the steps
 * are listed under it, each with what to do. Click a step, swipe or drag the
 * screenshot, or use ← and → on it to move. Click the screenshot (or the
 * zoom button) to see it full screen, zoomed and panned.
 *
 * All the screenshots sit side by side in one track, so moving slides them
 * and the page never jumps. They load only when the walkthrough comes near
 * the screen.
 */
export function Walkthrough({children, label}: {children?: ReactNode; label?: string}): ReactNode {
  const steps = Children.toArray(children)
    .filter((c) => isValidElement<StepProps>(c))
    .map((c) => (c as {props: StepProps}).props)
    .filter((s) => !s.hidden);
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const start = useRef<{x: number; y: number; id: number; moved: boolean} | null>(null);
  const figure = useRef<HTMLElement>(null);
  const viewer = useRef<HTMLDivElement>(null);

  const go = useCallback((k: number) => setActive(Math.max(0, Math.min(steps.length - 1, k))), [steps.length]);

  // "Listen" (components/Listen) shows each step while it reads it.
  useEffect(() => {
    const el = figure.current;
    if (!el) return undefined;
    const onStep = (e: Event) => go((e as CustomEvent<{step: number}>).detail.step);
    el.addEventListener('fx-speech-step', onStep);
    return () => el.removeEventListener('fx-speech-step', onStep);
  }, [go]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(active + 1);
    else if (e.key === 'ArrowLeft') go(active - 1);
    else if (e.key === 'Enter') setZoomed(true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  // Drag or swipe the screenshot to the next or previous one; a click without moving opens it full screen.
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start.current = {x: e.clientX, y: e.clientY, id: e.pointerId, moved: false};
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (!s.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      s.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.moved) {
      // Resists past the first and last.
      const edge = (active === 0 && dx > 0) || (active === steps.length - 1 && dx < 0);
      setDrag(edge ? dx / 3 : dx);
    }
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    setDrag(0);
    if (s.moved) {
      if (dx <= -SWIPE) go(active + 1);
      else if (dx >= SWIPE) go(active - 1);
    } else if ((e.target as Element).closest(`.${styles.frame}`)) setZoomed(true);
  };

  if (!steps.length) return null;
  const step = steps[active];

  return (
    <figure ref={figure} className={styles.walkthrough} data-speech="steps" data-speech-intro="Steps with screenshots follow">
      <div
        ref={viewer}
        className={styles.viewer}
        role="group"
        aria-roledescription="carousel"
        aria-label={label ?? 'Screenshots'}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}>
        <div
          className={styles.track}
          data-dragging={drag !== 0 || undefined}
          style={{transform: `translateX(calc(${-active * 100}% + ${drag}px))`}}>
          {steps.map((s, k) => (
            <div key={k} className={styles.slide} aria-hidden={k !== active} aria-roledescription="slide">
              <Shot step={s} n={k + 1} />
            </div>
          ))}
        </div>
        <span className={styles.counter} aria-live="polite">
          {active + 1} / {steps.length}
        </span>
        <button type="button" className={`${styles.nav} ${styles.prev}`} aria-label="Previous step" disabled={active === 0} onClick={() => go(active - 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className={`${styles.nav} ${styles.next}`} aria-label="Next step" disabled={active === steps.length - 1} onClick={() => go(active + 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <button type="button" className={styles.zoom} aria-label="View full screen and zoom" onClick={() => setZoomed(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>

      <ol className={styles.steps}>
        {steps.map((s, k) => (
          <li
            key={k}
            className={styles.step}
            data-active={k === active}
            data-speech-step={k}
            onClick={(e) => {
              if (!(e.target as Element).closest('a, code, pre')) go(k);
            }}>
            <div
              className={styles.stepHead}
              role="button"
              tabIndex={0}
              aria-current={k === active ? 'step' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  go(k);
                }
              }}>
              <span className={styles.number} aria-hidden="true">
                {k + 1}
              </span>
              <span className={styles.title}>{s.title}</span>
            </div>
            <div className={styles.text}>{s.children}</div>
          </li>
        ))}
      </ol>

      {zoomed &&
        createPortal(
          <Suspense fallback={null}>
            <Lightbox steps={steps} active={active} onChange={go} onClose={() => {
              setZoomed(false);
              viewer.current?.focus({preventScroll: true});
            }} />
          </Suspense>,
          document.body,
        )}
      {/* The step chosen, for screen readers. */}
      <figcaption className="sr-only">
        Step {active + 1} of {steps.length}, {step.title}
      </figcaption>
    </figure>
  );
}

export default Walkthrough;
