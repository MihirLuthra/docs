import {useId, type ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import {normalize} from '@site/src/components/DocsTree/tree';
import type {Contributors as Data, Person} from './types';
import styles from './styles.module.css';

// Avatars shown once expanded, overlapping in one short row; the rest are a
// "+N" chip, and "Page history on GitHub" lists every change and its author.
const MAX_SHOWN = 5;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

function Avatar({person, commits}: {person: Person; commits: number}): ReactNode {
  const detail = `${person.name}${person.login ? ` (@${person.login})` : ''}, ${commits} commit${commits === 1 ? '' : 's'}`;
  if (!person.login || !person.avatar) {
    return (
      <li className={styles.initials} title={detail} aria-label={detail}>
        <span aria-hidden="true">{initials(person.name)}</span>
      </li>
    );
  }
  return (
    <li>
      <a className={styles.avatarLink} href={`https://github.com/${person.login}`} title={detail} aria-label={detail}>
        <img
          className={styles.avatar}
          // GitHub serves the size asked for; twice the shown size for sharp
          // avatars on high-density screens.
          src={`${person.avatar}${person.avatar.includes('?') ? '&' : '?'}s=64`}
          width={32}
          height={32}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </a>
    </li>
  );
}

/** The page's history on GitHub (its file's commits), for pages that have one. */
export function usePageHistory(): string | null {
  const {repo, branch, pages} = usePluginData('contributors') as Data;
  const page = pages[normalize(useLocation().pathname)];
  return page ? `https://github.com/${repo}/commits/${branch}/${page.file}` : null;
}

/**
 * The page's contributors, collapsed to a "Contributors" line with a count.
 * Expanded, it shows the first few avatars (to their GitHub profiles) in a
 * compact row and "View all on GitHub" (the file's history). The avatars
 * load only when it is opened. From plugins/contributors.ts.
 *
 * Shown beside "Edit this page" (theme/DocItem/Footer).
 */
export default function Contributors(): ReactNode {
  const headingId = useId();
  const {repo, branch, people, pages} = usePluginData('contributors') as Data;
  const page = pages[normalize(useLocation().pathname)];
  if (!page) return null;
  const count = page.authors.length;
  const hidden = count - MAX_SHOWN;
  const history = `https://github.com/${repo}/commits/${branch}/${page.file}`;
  return (
    <section className={styles.contributors} aria-labelledby={headingId}>
      <details className={styles.details}>
        <summary className={styles.summary}>
          <h2 id={headingId} className={styles.heading}>
            Contributors <span className={styles.count}>{count}</span>
          </h2>
          <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </summary>
        <div className={styles.body}>
          <ul className={styles.avatars}>
            {page.authors.slice(0, MAX_SHOWN).map(({person, commits}) => (
              <Avatar key={person} person={people[person]} commits={commits} />
            ))}
            {hidden > 0 && (
              <li className={styles.moreChip} aria-label={`and ${hidden} more`}>
                <span aria-hidden="true">+{hidden}</span>
              </li>
            )}
          </ul>
          <a className={styles.more} href={history}>
            Page history on GitHub
          </a>
        </div>
      </details>
    </section>
  );
}
