import type {ReactNode} from 'react';
import clsx from 'clsx';
import type {Kind} from '../Search/types';
import styles from './styles.module.css';

// One icon per kind (ux-spec.md, Kind icons); no per-topic icons.
const ICONS: Record<Kind, string> = {
  Solution: 'M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5',
  Product: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  Concept:
    'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  Quickstart: 'M7 4v16l13-8z',
  Guide: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  Reference:
    'M9 4H7.5A1.5 1.5 0 0 0 6 5.5V10l-2 2 2 2v4.5A1.5 1.5 0 0 0 7.5 20H9M15 4h1.5A1.5 1.5 0 0 1 18 5.5V10l2 2-2 2v4.5a1.5 1.5 0 0 1-1.5 1.5H15',
  Tutorial: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19',
  Section:
    'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z',
};

/** Kind icon on a tinted tile. Decorative: the kind is also shown as text. */
export function KindIcon({kind, size = 'md'}: {kind: Kind; size?: 'sm' | 'md'}): ReactNode {
  return (
    <span className={clsx(styles.tile, styles[size], styles[kind])} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={ICONS[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The kind as a coloured text pill. */
export function KindPill({kind}: {kind: Kind}): ReactNode {
  return <span className={clsx(styles.pill, styles[kind])}>{kind}</span>;
}
