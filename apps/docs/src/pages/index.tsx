import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {useOverlays} from '@site/src/components/Overlays/context';
import {products, solutions, type DocIcon, type DocSet} from '@site/src/data/featured';
import {readRecents, writeRecents} from '@site/src/lib/recents';
import {SEARCH_TRIGGER_ATTR} from '@site/src/lib/search-early';
import styles from './index.module.css';

// The home page (ux-spec.md, Home; D19): a map of what the docs cover. A
// tinted band with the title and a large search; then three rows of the
// same cards: the solutions, the products, and the pages viewed recently.

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

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
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse {...stroke} cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)" />
    </>
  ),
  insight: (
    <>
      <circle {...stroke} cx="11" cy="11" r="7" />
      <path {...stroke} d="M20 20l-3.5-3.5M8 12.5l2-2.5 2 1.5 2-3" />
    </>
  ),
  platform: (
    <>
      <path {...stroke} d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
};

const PAGE_ICON = <path {...stroke} d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4" />;

function Icon({children}: {children: ReactNode}): ReactNode {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24">{children}</svg>
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

function SearchIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle {...stroke} strokeWidth={2} cx="11" cy="11" r="7" />
      <path {...stroke} strokeWidth={2} d="M20 20l-3.5-3.5" />
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

/**
 * A doc set: its icon, title and one line, linking to its overview; then its
 * main pages, or for a solution the products it uses. Dimmed, not a link,
 * while it has no pages.
 */
function Card({set}: {set: DocSet}): ReactNode {
  const head = (
    <>
      <Icon>{ICONS[set.icon]}</Icon>
      <span className={styles.cardTitle}>
        {set.title}
        {set.href && <ArrowIcon />}
      </span>
      <span className={styles.cardLine}>{set.line}</span>
    </>
  );
  return (
    <div className={styles.card} data-empty={set.href ? undefined : ''}>
      {set.href ? (
        <Link to={set.href} className={styles.cardHead}>
          {head}
        </Link>
      ) : (
        <span className={styles.cardHead}>{head}</span>
      )}
      {!!set.links?.length && (
        <ul className={styles.links} aria-label={`${set.title}, main pages`}>
          {set.links.map((l) => (
            <li key={l.href}>
              <Link to={l.href} className={styles.link}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!!set.uses?.length && (
        <p className={styles.uses}>
          Uses
          {set.uses.map((u) => (
            <span key={u} className={styles.use}>
              {u}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function Section({id, title, line, children}: {id: string; title: string; line: string; children: ReactNode}): ReactNode {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id} className={styles.heading}>
          {title}
        </h2>
        <p className={styles.sectionLine}>{line}</p>
      </div>
      {children}
    </section>
  );
}

/** The large search in the band: the header's search, opened from here. */
function HeroSearch(): ReactNode {
  const {openSearch, prefetchSearch} = useOverlays();
  const [commandKey, setCommandKey] = useState(false);
  useEffect(() => {
    setCommandKey(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <button
      type="button"
      className={styles.search}
      onClick={openSearch}
      onPointerEnter={prefetchSearch}
      onFocus={prefetchSearch}
      onTouchStart={prefetchSearch}
      {...{[SEARCH_TRIGGER_ATTR]: ''}}
      aria-label="Search the docs"
      aria-keyshortcuts="Control+K Meta+K /">
      <SearchIcon />
      <span>Search the docs</span>
      <kbd className={styles.kbd} aria-hidden="true">
        {commandKey ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

const RECENT_MAX = 4;

/**
 * The last pages opened, newest first, as cards like the ones above. The row
 * keeps its height whether it is empty or full, so filling it in after
 * loading moves nothing.
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

  const all = (paths ?? []).flatMap((p) => {
    const loc = locate(tree, p);
    return loc ? [{href: p, ...loc}] : [];
  });
  const items = all.slice(0, RECENT_MAX);
  // Pages moved or removed since: forgotten.
  useEffect(() => {
    if (paths !== null && all.length !== paths.length) writeRecents(all.map((i) => i.href));
  }, [paths, all.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (href: string, index: number) => {
    const next = (paths ?? []).filter((p) => p !== href);
    writeRecents(next);
    setPaths(next);
    // Keep focus in the row: the next card's ×, else the previous, else the heading.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
      const target = buttons?.[Math.min(index, buttons.length - 1)];
      (target ?? headingRef.current)?.focus();
    });
  };

  return (
    <section className={styles.section} aria-labelledby="recent-heading">
      <div className={styles.sectionHead}>
        <h2 id="recent-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          Recently viewed
        </h2>
        <p className={styles.sectionLine}>The last pages you opened, on this device.</p>
      </div>
      <ul ref={listRef} className={styles.recentGrid}>
        {paths !== null && items.length === 0 && (
          <li className={styles.recentEmpty}>Pages you open show up here.</li>
        )}
        {items.map((item, i) => (
          <li key={item.href} className={styles.recentItem}>
            <Link to={item.href} className={styles.recentCard} title={[...item.path, item.title].join(' / ')}>
              <Icon>{PAGE_ICON}</Icon>
              <span className={styles.recentText}>
                <span className={styles.recentTitle}>{item.title}</span>
                {/* The closest parent section; the full path is in the tooltip. */}
                <span className={styles.recentPath}>{item.path[item.path.length - 1]}</span>
              </span>
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
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.">
        {/* fx-home: the header hides its own search here (Navbar/styles.module.css). */}
        <main className={`${styles.page} fx-home`}>
          <header className={styles.band}>
            <h1 className={styles.title}>
              <span className={styles.titleBrand}>Fortanix</span> Documentation
            </h1>
            <p className={styles.lead}>
              Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.
            </p>
            <HeroSearch />
            <p className={styles.notice}>
              <strong>Proof of concept.</strong> Not official Fortanix documentation, and not reviewed or approved by
              Fortanix.
            </p>
          </header>

          <div className={styles.body}>
            <Section id="solutions-heading" title="Solutions" line="Products put together for one use case, end to end.">
              <ul className={styles.grid}>
                {solutions.map((set) => (
                  <li key={set.title}>
                    <Card set={set} />
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="products-heading" title="Products" line="The Fortanix Armor services you set up, call and integrate with.">
              <ul className={styles.grid}>
                {products.map((set) => (
                  <li key={set.title}>
                    <Card set={set} />
                  </li>
                ))}
              </ul>
            </Section>

            <RecentlyViewed />
          </div>
        </main>
      </Layout>
  );
}
