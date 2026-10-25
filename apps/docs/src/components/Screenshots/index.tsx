import {Children, isValidElement, useId, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import styles from './styles.module.css';

type ScreenshotProps = {caption: string; children?: ReactNode};

/** `<Screenshot caption="…">` with a Markdown image inside: one step of `<Screenshots>`. */
export function Screenshot({children}: ScreenshotProps): ReactNode {
  return children;
}

/**
 * `<Screenshots>` of `<Screenshot caption>`: one screenshot at a time, the
 * steps as tabs above it (arrow keys, Home and End move between them). All
 * screenshots share one grid cell, so the frame is as tall as the tallest and
 * switching steps doesn't move the page. A single `<Screenshot>` is a plain
 * figure with its caption.
 */
export function Screenshots({children}: {children?: ReactNode}): ReactNode {
  const shots = Children.toArray(children)
    .filter((child) => isValidElement<ScreenshotProps>(child))
    .map((child) => (child as {props: ScreenshotProps}).props);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  if (shots.length === 1) {
    return (
      <figure className={styles.figure}>
        <div className={styles.frame}>{shots[0].children}</div>
        <figcaption className={styles.caption}>{shots[0].caption}</figcaption>
      </figure>
    );
  }

  const select = (index: number) => {
    const next = (index + shots.length) % shots.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: shots.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]);
    }
  };

  return (
    <figure className={styles.figure}>
      <div role="tablist" aria-label="Steps" className={styles.steps} onKeyDown={onKeyDown}>
        {shots.map((shot, index) => (
          <button
            key={shot.caption}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            className={styles.step}
            onClick={() => setActive(index)}>
            <span className={styles.number}>{index + 1}</span>
            {shot.caption}
          </button>
        ))}
      </div>
      <div className={styles.stack}>
        {shots.map((shot, index) => (
          <div
            key={shot.caption}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            className={styles.frame}
            data-active={index === active}
            inert={index !== active}>
            {shot.children}
          </div>
        ))}
      </div>
    </figure>
  );
}
