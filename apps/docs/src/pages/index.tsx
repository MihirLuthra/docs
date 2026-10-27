import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocsTree from '@site/src/components/DocsTree';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {directory, reference, type DirLink, type DocIcon} from '@site/src/data/featured';
import {useFooterOverlap} from '@site/src/lib/footer-overlap';
import {readRecents, writeRecents} from '@site/src/lib/recents';
import styles from './index.module.css';

// The home page (ux-spec.md, Home; D17): a page of the docs, laid out like
// the others, in the docs tree's own visual language. The tree with "Go to
// page" on the left; in the middle, the title, recently viewed pages in one
// row, then a directory: each doc set a heading with its main pages listed
// under it, in two columns, and the reference pages in one row.

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

function Icon({name}: {name: DocIcon}): ReactNode {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24">{ICONS[name]}</svg>
    </span>
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
  code: (
    <>
      <path {...stroke} d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" />
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

/** A page in the directory: a row like the docs tree's (dimmed, not a link, while it has no pages). */
function DirRow({link}: {link: DirLink}): ReactNode {
  const inner = (
    <>
      {link.icon && <Icon name={link.icon} />}
      <span className={styles.rowLabel}>{link.label}</span>
    </>
  );
  return link.href ? (
    <Link to={link.href} className={styles.row}>
      {inner}
    </Link>
  ) : (
    <span className={styles.row} data-empty="" title="No pages yet">
      {inner}
    </span>
  );
}

/** A doc set in the directory: its heading, then its pages. */
function DirColumn({id, icon, title, links}: {id: string; icon: DocIcon; title: string; links: DirLink[]}): ReactNode {
  return (
    <section className={styles.dirColumn} aria-labelledby={id}>
      <h2 id={id} className={styles.dirHeading}>
        <Icon name={icon} />
        {title}
      </h2>
      <ul className={styles.dirList}>
        {links.map((l) => (
          <li key={l.label}>
            <DirRow link={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Recently viewed pages, newest first, in one row under the title. The row
 * is one line tall whether it is empty or full (pages that don't fit are
 * left out), so filling it in after loading moves nothing below it.
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
      <h2 id="recent-heading" ref={headingRef} tabIndex={-1} className={styles.recentHeading}>
        Recently viewed
      </h2>
      {paths !== null && items.length === 0 && <p className={styles.recentEmpty}>Pages you open show up here.</p>}
      {items.length > 0 && (
        <ul ref={listRef} className={styles.recentList}>
          {items.map((item, i) => (
            <li key={item.href} className={styles.recentItem}>
              <Link to={item.href} className={styles.recentLink} title={[...item.path, item.title].join(' / ')}>
                <PageIcon />
                <span className={styles.recentTitle}>{item.title}</span>
                {/* The closest parent section, so two "Overview"s differ; the full path is in the tooltip. */}
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
              <h1 className={styles.title}>
                <span className={styles.titleBrand}>Fortanix</span> Documentation
              </h1>
              <p className={styles.lead}>
                Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.
              </p>
              <p className={styles.notice}>
                <strong>Proof of concept.</strong> Not official Fortanix documentation, and not reviewed or approved by
                Fortanix. Confirm anything here with Fortanix before you rely on it.
              </p>
            </header>

            <RecentlyViewed />

            <div className={styles.directory}>
              {directory.map((d, k) => (
                <DirColumn key={d.title} id={`dir-${k}`} icon={d.icon} title={d.title} links={d.links} />
              ))}
            </div>

            <section className={styles.reference} aria-labelledby="reference-heading">
              <h2 id="reference-heading" className={styles.srOnly}>
                Reference
              </h2>
              <ul className={styles.refList}>
                {reference.map((l) => (
                  <li key={l.label}>
                    <DirRow link={l} />
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </div>
      </div>
    </Layout>
  );
}
