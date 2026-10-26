import type {ReactNode} from 'react';
import {listenFrom, usePageListens} from '.';
import styles from './styles.module.css';

/**
 * "Listen from here" in a section heading (theme/Heading), beside its copy
 * button, on pages that have audio: the page's Listen reads from the heading.
 */
export default function ListenFrom(): ReactNode {
  const listens = usePageListens();
  if (!listens) return null;
  return (
    <button
      type="button"
      className={styles.fromHeading}
      aria-label="Listen from here"
      onClick={(e) => {
        const heading = e.currentTarget.closest('h2, h3, h4, h5, h6');
        if (heading) listenFrom(heading);
      }}>
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path
          d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.fromTip} aria-hidden="true">
        Listen from here
      </span>
    </button>
  );
}
