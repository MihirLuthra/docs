import {useEffect, useRef, useState, type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import type {TreeNode} from '@site/src/components/DocsTree/types';
import {useOverlays} from '@site/src/components/Overlays/context';
import {featured, type FeaturedIcon, type FeaturedItem} from '@site/src/data/featured';
import {readRecents, writeRecents} from '@site/src/lib/recents';
import {SEARCH_TRIGGER_ATTR} from '@site/src/lib/search-early';
import styles from './index.module.css';

// The home page (ux-spec.md, Home; D17). The first screen answers "what is
// here": a dark hero with the title, the one search box and the pages you
// read last, beside every product and solution. Below it, the whole docs
// tree as a directory. All drawn with CSS and inline SVG: no images to load,
// nothing that moves the page.

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

function CloseIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
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
    <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle {...stroke} strokeWidth={2.2} cx="11" cy="11" r="6.5" />
      <path {...stroke} strokeWidth={2.2} d="M16 16l4.5 4.5" />
    </svg>
  );
}

function InfoIcon(): ReactNode {
  return (
    <svg className={styles.noticeIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} strokeWidth={2} d="M12 3.5L2.5 20h19zM12 10v4.5M12 17.2v.3" />
    </svg>
  );
}

/** One icon per product or solution, on a tile in the brand gradient. */
const CARD_ICONS: Record<FeaturedIcon, ReactNode> = {
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
  insight: (
    <>
      <circle {...stroke} cx="10.5" cy="10.5" r="6.5" />
      <path {...stroke} d="M15.3 15.3L20.5 20.5M7.5 12.5l2-2.5 2 1.5 2.5-3" />
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

/**
 * The page has one search box showing at a time: the header's is hidden
 * (Navbar styles) while the hero's is in view. `data-home` comes with the
 * page's HTML, so the header's never flashes; `data-hero-search-gone` is set
 * once the hero's box scrolls under the header.
 */
function useHeroSearchWatch() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      root.setAttribute('data-hero-search-gone', '');
      return undefined;
    }
    const header = parseFloat(getComputedStyle(root).getPropertyValue('--fx-header-height')) || 56;
    const io = new IntersectionObserver(([e]) => root.toggleAttribute('data-hero-search-gone', !e.isIntersecting), {
      rootMargin: `-${header}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      root.removeAttribute('data-hero-search-gone');
    };
  }, []);
  return ref;
}

/**
 * The pages read last, as one row of chips under the search box (newest
 * first; as many as fit). One row of fixed height whatever is stored, so
 * nothing moves when it fills in after loading.
 */
function RecentStrip(): ReactNode {
  const tree = useTree();
  // null until read from localStorage after hydration.
  const [paths, setPaths] = useState<string[] | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
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
    // Keep focus in the row: the next chip's ×, else the previous, else the label.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
      const target = buttons?.[Math.min(index, buttons.length - 1)];
      (target ?? labelRef.current)?.focus();
    });
  };

  return (
    <div className={styles.recent}>
      <span ref={labelRef} id="recent-label" className={styles.recentLabel} tabIndex={-1}>
        Recently viewed
      </span>
      {paths !== null && items.length === 0 && <span className={styles.recentEmpty}>Pages you open show up here.</span>}
      {items.length > 0 && (
        <ul ref={listRef} className={styles.recentList} aria-labelledby="recent-label">
          {items.map((item, i) => (
            <li key={item.href} className={styles.recentChip}>
              <Link to={item.href} className={styles.recentLink} title={[...item.path, item.title].join(' / ')}>
                {item.title}
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
    </div>
  );
}

function CatalogItem({item}: {item: FeaturedItem}): ReactNode {
  const inner = (
    <>
      <span className={styles.itemIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">{CARD_ICONS[item.icon]}</svg>
      </span>
      <span className={styles.itemText}>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemLine}>{item.line}</span>
      </span>
    </>
  );
  return item.href ? (
    <Link to={item.href} className={styles.item}>
      {inner}
      <ArrowIcon />
    </Link>
  ) : (
    <span className={styles.item} data-empty="">
      {inner}
    </span>
  );
}

/** Every product and solution, in two columns: what Fortanix has, at a glance. */
function Catalog(): ReactNode {
  return (
    <div className={styles.catalog}>
      {featured.map((group) => (
        <section key={group.title} className={styles.group} aria-labelledby={`group-${group.title}`}>
          <h2 id={`group-${group.title}`} className={styles.groupTitle}>
            {group.title}
          </h2>
          <p className={styles.groupLine}>{group.line}</p>
          <ul className={styles.items}>
            {group.items.map((item) => (
              <li key={item.title}>
                <CatalogItem item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Hero(): ReactNode {
  const {openSearch, prefetchSearch} = useOverlays();
  const searchRef = useHeroSearchWatch();
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.inner}>
        <p className={styles.notice}>
          <InfoIcon />
          <span>
            <strong>Proof of concept.</strong> Not official Fortanix documentation, and not reviewed or approved by
            Fortanix. Confirm anything here with Fortanix before you rely on it.
          </span>
        </p>
        <div className={styles.heroBody}>
          <div className={styles.heroText}>
            <h1 id="home-title" className={styles.title}>
              <span className={styles.titleBrand}>Fortanix</span> Documentation
            </h1>
            <p className={styles.lead}>
              Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.
            </p>
            <button
              ref={searchRef}
              type="button"
              className={styles.search}
              onClick={openSearch}
              onPointerEnter={prefetchSearch}
              onFocus={prefetchSearch}
              {...{[SEARCH_TRIGGER_ATTR]: ''}}>
              <SearchIcon />
              <span className={styles.searchText}>Search the docs</span>
              <kbd className={styles.searchKey}>/</kbd>
            </button>
            <RecentStrip />
            <Link to="/get-familiar/what-fortanix-does" className={styles.start}>
              New to Fortanix? Start here
              <ArrowIcon />
            </Link>
          </div>
          <Catalog />
        </div>
      </div>
    </section>
  );
}

/** The first page in a node: itself, or the first inside a folder (folders have no page, D10). */
function firstPage(node: TreeNode): string | undefined {
  if (node.href) return node.href;
  for (const child of node.items ?? []) {
    const href = firstPage(child);
    if (href) return href;
  }
  return undefined;
}

/** A folder whose only page is one page: shown as that page, under the folder's name. */
const single = (node: TreeNode) => node.items?.length === 1 && !!node.items[0].href;

/**
 * The whole docs tree as a directory, one column per top-level section: its
 * pages and folders, and each folder's own (a folder links to its first
 * page). Folders with no pages yet are left out. Built from the tree, so it
 * never goes stale.
 */
function DocsDirectory(): ReactNode {
  const columns = useTree().filter(firstPage);
  const link = (node: TreeNode) => (
    <Link to={firstPage(node)!} className={styles.dirLink}>
      {node.label}
    </Link>
  );
  return (
    <section className={styles.directory} aria-labelledby="directory-heading">
      <div className={styles.inner}>
        <h2 id="directory-heading" className={styles.heading}>
          Browse all docs
        </h2>
        <div className={styles.dirGrid}>
          {columns.map((column) => (
            <nav key={column.label} className={styles.dirColumn} aria-label={column.label}>
              <h3 className={styles.dirTitle}>{column.label}</h3>
              <ul className={styles.dirList}>
                {(column.items ?? []).filter(firstPage).map((node) =>
                  node.items && !single(node) ? (
                    <li key={node.label} className={styles.dirGroup}>
                      <Link to={firstPage(node)!} className={styles.dirGroupLink}>
                        {node.label}
                      </Link>
                      <ul className={styles.dirSub}>
                        {node.items.filter(firstPage).map((child) => (
                          <li key={child.label}>{link(child)}</li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={node.label}>{link(node)}</li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.">
      <Head>
        <html data-home="" />
      </Head>
      <main className={styles.home}>
        <Hero />
        <DocsDirectory />
      </main>
    </Layout>
  );
}
