import type {ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import {normalize} from '@site/src/components/DocsTree/tree';
import type {Contributors as Data, Person} from './types';
import styles from './styles.module.css';

// Avatars shown; the rest are "+ N contributors", linking to the history.
const MAX_SHOWN = 14;

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

/**
 * The page's contributors, like the Contributors box on a GitHub repo: a
 * count, their avatars (to their GitHub profiles), and "+ N contributors"
 * (the file's history on GitHub) when there are more. From
 * plugins/contributors.ts.
 */
export default function Contributors(): ReactNode {
  const {repo, branch, people, pages} = usePluginData('contributors') as Data;
  const page = pages[normalize(useLocation().pathname)];
  if (!page) return null;
  const count = page.authors.length;
  const hidden = count - MAX_SHOWN;
  return (
    <section className={styles.contributors} aria-labelledby="contributors-heading">
      <h2 id="contributors-heading" className={styles.heading}>
        Contributors <span className={styles.count}>{count}</span>
      </h2>
      <ul className={styles.avatars}>
        {page.authors.slice(0, MAX_SHOWN).map(({person, commits}) => (
          <Avatar key={person} person={people[person]} commits={commits} />
        ))}
      </ul>
      {hidden > 0 && (
        <a className={styles.more} href={`https://github.com/${repo}/commits/${branch}/${page.file}`}>
          + {hidden} contributor{hidden === 1 ? '' : 's'}
        </a>
      )}
    </section>
  );
}
