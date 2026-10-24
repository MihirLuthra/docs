import type {ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import {normalize} from '@site/src/components/DocsTree/tree';
import type {Contributors as Data, Person} from './types';
import styles from './styles.module.css';

// Avatars shown before "+N".
const MAX_SHOWN = 12;

// Built in UTC with a fixed locale, so the server and the browser render the
// same text.
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(iso));

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
      <span className={styles.initials} title={detail} aria-label={detail} role="img">
        {initials(person.name)}
      </span>
    );
  }
  return (
    <a className={styles.avatarLink} href={`https://github.com/${person.login}`} title={detail} aria-label={`${detail}, on GitHub`}>
      <img
        className={styles.avatar}
        // GitHub serves the size asked for; twice the shown size for sharp
        // avatars on high-density screens.
        src={`${person.avatar}${person.avatar.includes('?') ? '&' : '?'}s=56`}
        width={28}
        height={28}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}

function PersonName({person}: {person: Person}): ReactNode {
  return person.login ? <a href={`https://github.com/${person.login}`}>{person.name}</a> : person.name;
}

/**
 * Who has contributed to this page, like GitHub's file contributors: their
 * avatars (to their GitHub profiles), how many, when it last changed and by
 * whom, and the file's history on GitHub. From plugins/contributors.ts.
 */
export default function Contributors(): ReactNode {
  const {repo, branch, people, pages} = usePluginData('contributors') as Data;
  const page = pages[normalize(useLocation().pathname)];
  if (!page) return null;
  const count = page.authors.length;
  const updatedBy = people[page.updated.person];
  return (
    <section className={styles.contributors} aria-label="Contributors">
      <div className={styles.avatars}>
        {page.authors.slice(0, MAX_SHOWN).map(({person, commits}) => (
          <Avatar key={person} person={people[person]} commits={commits} />
        ))}
        {count > MAX_SHOWN && <span className={styles.more}>+{count - MAX_SHOWN}</span>}
      </div>
      <p className={styles.text}>
        <strong>
          {count} contributor{count === 1 ? '' : 's'}
        </strong>
        <span className={styles.dot} aria-hidden="true">
          ·
        </span>
        Last updated {formatDate(page.updated.date)} by <PersonName person={updatedBy} />
        <span className={styles.dot} aria-hidden="true">
          ·
        </span>
        <a href={`https://github.com/${repo}/commits/${branch}/${page.file}`}>View history</a>
      </p>
    </section>
  );
}
