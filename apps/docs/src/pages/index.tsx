import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocsTree from '@site/src/components/DocsTree';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {docGroups, reference, startHere, type DocIcon, type DocSet} from '@site/src/data/featured';
import {useFooterOverlap} from '@site/src/lib/footer-overlap';
import {readRecents, writeRecents} from '@site/src/lib/recents';
import styles from './index.module.css';

// The home page (ux-spec.md, Home; D17): a page of the docs, laid out like
// the others. The docs tree with "Go to page" on the left; the title, where
// to start, every doc set grouped by topic with links to its main parts, and
// reference pages in the middle; recently viewed pages on the right, where a
// doc page has its table of contents.

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

function Icon({name}: {name: DocIcon}): ReactNode {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24">{ICONS[name]}</svg>
    </span>
  );
}

function ArrowIcon(): ReactNode {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} strokeWidth={2.2} d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function ChevronIcon(): ReactNode {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} strokeWidth={2.2} d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function PageIcon(): ReactNode {
  return (
    <svg className={styles.pageIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

const ICONS: Record<DocIcon, ReactNode> = {
  ai: (
    <>
      <rect {...stroke} x="6" y="6" width="12" height="12" rx="2.5" />
      <path {...stroke} d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" />
      <path {...stroke} d="M10 14.5l2-5 2 5M10.7 12.8h2.6" />
    </>
  ),
  key: (
    <>
      <circle {...stroke} cx="8" cy="12" r="4" />
      <path {...stroke} d="M12 12h9M18 12v3M21 12v2" />
    </>
  ),
  token: (
    <>
      <rect {...stroke} x="3" y="7" width="18" height="10" rx="2.5" />
      <path {...stroke} d="M7.5 10.5v3M6.2 11.2l2.6 1.6M6.2 12.8l2.6-1.6M12 10.5v3M10.7 11.2l2.6 1.6M10.7 12.8l2.6-1.6M16.5 10.5v3M15.2 11.2l2.6 1.6M15.2 12.8l2.6-1.6" />
    </>
  ),
  chip: (
    <>
      <path {...stroke} d="M12 2.8l7.5 3v6c0 4.6-3.2 8-7.5 9.4C7.7 19.8 4.5 16.4 4.5 11.8v-6z" />
      <path {...stroke} d="M8.8 12l2.2 2.2 4.2-4.4" />
    </>
  ),
  folder: (
    <>
      <path {...stroke} d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <rect {...stroke} x="9.5" y="12" width="5" height="4" rx="1" />
      <path {...stroke} d="M10.5 12v-1a1.5 1.5 0 0 1 3 0v1" />
    </>
  ),
  users: (
    <>
      <circle {...stroke} cx="9" cy="8.5" r="3.2" />
      <path {...stroke} d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.6a3.2 3.2 0 0 1 0 6M17 13.6a5.5 5.5 0 0 1 3.5 5.4" />
    </>
  ),
  compass: (
    <>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  notes: (
    <>
      <path {...stroke} d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4" />
    </>
  ),
  alert: (
    <>
      <path {...stroke} d="M12 3l8 3v5.5c0 4.5-3.3 8-8 9.5-4.7-1.5-8-5-8-9.5V6z" />
      <path {...stroke} d="M12 8.5v4M12 15.5v.3" />
    </>
  ),
  download: (
    <>
      <path {...stroke} d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)" />
    </>
  ),
};

/** A page to go to: its icon, title and one line, all one link. */
function PageCard({set}: {set: DocSet}): ReactNode {
  return (
    <Link to={set.href} className={styles.pageCard}>
      <Icon name={set.icon} />
      <span className={styles.cardText}>
        <span className={styles.cardTitle}>{set.title}</span>
        <span className={styles.cardLine}>{set.line}</span>
      </span>
      <ArrowIcon />
    </Link>
  );
}

/** A doc set: its overview (the head of the card) and links to its main parts. */
function SetCard({set}: {set: DocSet}): ReactNode {
  return (
    <div className={styles.setCard}>
      <Link to={set.href} className={styles.setHead}>
        <Icon name={set.icon} />
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>
            {set.title}
            <ArrowIcon />
          </span>
          <span className={styles.cardLine}>{set.line}</span>
        </span>
      </Link>
      <ul className={styles.setLinks} aria-label={`${set.title}, main parts`}>
        {(set.links ?? []).map((l) => (
          <li key={l.href}>
            <Link to={l.href} className={styles.setLink}>
              <ChevronIcon />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({id, title, children}: {id: string; title: string; children: ReactNode}): ReactNode {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.heading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Recently viewed pages, newest first, in the right column (after the page's
 * content on narrower screens). Filling in after loading moves nothing: on
 * the right nothing is below it, and narrower it comes last.
 */
function RecentlyViewed(): ReactNode {
  const tree = useTree();
  // null until read from localStorage after hydration.
  const [paths, setPaths] = useState<string[] | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setPaths(readRecents());
  }, []);

  const items = (paths ?? []).flatMap((p) => {
    const loc = locate(tree, p);
    return loc ? [{href: p, ...loc}] : [];
  });
  // Pages moved or removed since: forgotten.
  useEffect(() => {
    if (paths !== null && items.length !== paths.length) writeRecents(items.map((i) => i.href));
  }, [paths, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (href: string, index: number) => {
    const next = (paths ?? []).filter((p) => p !== href);
    writeRecents(next);
    setPaths(next);
    // Keep focus in the list: the next page's ×, else the previous, else the heading.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
      const target = buttons?.[Math.min(index, buttons.length - 1)];
      (target ?? headingRef.current)?.focus();
    });
  };

  return (
    <section className={styles.recent} aria-labelledby="recent-heading">
      <h2 id="recent-heading" ref={headingRef} tabIndex={-1} className={styles.railHeading}>
        Recently viewed
      </h2>
      {paths !== null && items.length === 0 && <p className={styles.recentEmpty}>Pages you open show up here.</p>}
      {items.length > 0 && (
        <ul ref={listRef} className={styles.recentList}>
          {items.map((item, i) => (
            <li key={item.href} className={styles.recentItem} style={{animationDelay: `${i * 40}ms`}}>
              <Link to={item.href} className={styles.recentLink} title={[...item.path, item.title].join(' / ')}>
                <PageIcon />
                <span className={styles.recentTitle}>{item.title}</span>
                {/* The closest parent section; the full path is in the tooltip. */}
                <span className={styles.recentPath}>{item.path[item.path.length - 1]}</span>
              </Link>
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(item.href, i)}
                aria-label={`Remove ${item.title} from recently viewed`}>
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The docs tree beside the page, as on doc pages. The column is as tall as
 * the page; the scroller inside sticks under the header and ends above the
 * footer.
 */
function HomeSidebar(): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useFooterOverlap(ref);
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarFrame}>
        <div ref={ref} className={styles.sidebarScroll}>
          <DocsTree />
        </div>
      </div>
    </aside>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.">
      <div className={styles.layout}>
        <HomeSidebar />
        <div className={styles.content}>
          <main className={styles.main}>
            <header className={styles.intro}>
              <h1 className={styles.title}>Fortanix Documentation</h1>
              <p className={styles.lead}>
                Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.
              </p>
              <p className={styles.notice}>
                <strong>Proof of concept.</strong> Not official Fortanix documentation, and not reviewed or approved by
                Fortanix. Confirm anything here with Fortanix before you rely on it.
              </p>
            </header>

            <Section id="start-heading" title="Start here">
              <ul className={styles.startGrid}>
                {startHere.map((set) => (
                  <li key={set.href}>
                    <PageCard set={set} />
                  </li>
                ))}
              </ul>
            </Section>

            {docGroups.map((group, k) => (
              <Section key={group.title} id={`group-${k}`} title={group.title}>
                <ul className={group.sets.some((s) => s.links?.length) ? styles.setGrid : styles.pageGrid}>
                  {group.sets.map((set) => (
                    <li key={set.href}>{set.links?.length ? <SetCard set={set} /> : <PageCard set={set} />}</li>
                  ))}
                </ul>
              </Section>
            ))}

            <Section id="reference-heading" title="Reference">
              <ul className={styles.startGrid}>
                {reference.map((set) => (
                  <li key={set.href}>
                    <PageCard set={set} />
                  </li>
                ))}
              </ul>
            </Section>
          </main>
          <aside className={styles.rail}>
            <RecentlyViewed />
          </aside>
        </div>
      </div>
    </Layout>
  );
}
