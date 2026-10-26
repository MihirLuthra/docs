import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocsTree from '@site/src/components/DocsTree';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {useOverlays} from '@site/src/components/Overlays/context';
import {featured, type FeaturedIcon} from '@site/src/data/featured';
import {RECENTS_VISIBLE, readRecents, setRecentsLayout, writeRecents} from '@site/src/lib/recents';
import {SEARCH_TRIGGER_ATTR} from '@site/src/lib/search-early';
import {useFooterOverlap} from '@site/src/lib/footer-overlap';
import styles from './index.module.css';

// The home page (ux-spec.md, Home): a hero with the site's search and the
// pages most people come for, then recently viewed pages, Confidential AI in
// a spotlight, the solutions and products, and popular tasks. All drawn
// with CSS and inline SVG: no images to load, nothing that moves the page.

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

function CloseIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
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

/** One icon per featured card, on a tinted tile. */
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
 * The hero's picture: a protected core (the TEE) holding a chip and a lock,
 * with keys, attestation and data orbiting it. Decorative only.
 */
function HeroArt(): ReactNode {
  return (
    <svg className={styles.heroArt} viewBox="0 0 320 260" aria-hidden="true">
      <defs>
        <linearGradient id="fx-hero-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--fx-hero-art-a)" />
          <stop offset="1" stopColor="var(--fx-hero-art-b)" />
        </linearGradient>
        <radialGradient id="fx-hero-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--fx-hero-art-a)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--fx-hero-art-a)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="130" r="120" fill="url(#fx-hero-glow)" />
      {/* Orbit, with what moves around the core. */}
      <g className={styles.orbit}>
        <ellipse cx="160" cy="130" rx="138" ry="52" fill="none" stroke="url(#fx-hero-line)" strokeWidth="1.2" strokeDasharray="3 6" opacity="0.7" />
        <g transform="translate(26 130)">
          <circle r="15" className={styles.artBadge} />
          <circle {...stroke} cx="-3" cy="0" r="4" className={styles.artGlyph} />
          <path {...stroke} d="M1 0h8M6 0v3" className={styles.artGlyph} />
        </g>
        <g transform="translate(294 130)">
          <circle r="15" className={styles.artBadge} />
          <path {...stroke} d="M-5 0l3.5 3.5L5.5-4" className={styles.artGlyph} />
        </g>
      </g>
      {/* The TEE: a boundary, a chip, a lock. */}
      <rect x="92" y="62" width="136" height="136" rx="28" className={styles.artTee} />
      <rect x="92" y="62" width="136" height="136" rx="28" fill="none" stroke="url(#fx-hero-line)" strokeWidth="2" strokeDasharray="8 6" className={styles.artDash} />
      <g transform="translate(160 130)">
        <rect x="-38" y="-38" width="76" height="76" rx="14" className={styles.artChip} />
        <path
          d="M-24 -48v10M-8 -48v10M8 -48v10M24 -48v10M-24 38v10M-8 38v10M8 38v10M24 38v10M-48 -24h10M-48 -8h10M-48 8h10M-48 24h10M38 -24h10M38 -8h10M38 8h10M38 24h10"
          stroke="url(#fx-hero-line)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g className={styles.artLock}>
          <rect x="-15" y="-4" width="30" height="24" rx="5" fill="url(#fx-hero-line)" />
          <path d="M-9 -4v-6a9 9 0 0 1 18 0v6" fill="none" stroke="url(#fx-hero-line)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="8" r="3" className={styles.artKeyhole} />
        </g>
      </g>
      {/* Data moving in, sparks of attestation. */}
      <circle cx="58" cy="58" r="4" className={styles.artSpark} />
      <circle cx="270" cy="210" r="3" className={styles.artSpark} style={{animationDelay: '1.2s'}} />
      <circle cx="262" cy="48" r="2.5" className={styles.artSpark} style={{animationDelay: '2.1s'}} />
    </svg>
  );
}

function Hero(): ReactNode {
  const {openSearch, prefetchSearch} = useOverlays();
  return (
    <section className={styles.hero} aria-labelledby="home-title">
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
          <div className={styles.heroLinks}>
            <Link to="/get-familiar/what-fortanix-does" className={styles.start}>
              New to Fortanix? Start here
              <ArrowIcon />
            </Link>
          </div>
        </div>
        <HeroArt />
      </div>
    </section>
  );
}

function RecentlyViewed(): ReactNode {
  const tree = useTree();
  // null until read from localStorage after hydration; the slot's height is
  // reserved from the inline head script meanwhile (see lib/recents.ts).
  const [paths, setPaths] = useState<string[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setPaths(readRecents());
  }, []);

  const items = (paths ?? []).flatMap((p) => {
    const loc = locate(tree, p);
    return loc ? [{href: p, ...loc}] : [];
  });
  useEffect(() => {
    if (paths === null) return;
    // Pages moved or removed since: forgotten, so the head script counts only what shows.
    if (items.length !== paths.length) writeRecents(items.map((i) => i.href));
    setRecentsLayout(items.length);
  }, [paths, items.length]);

  const visible = showAll ? items : items.slice(0, RECENTS_VISIBLE);
  const hidden = items.length - RECENTS_VISIBLE;

  const remove = (href: string, index: number) => {
    const next = (paths ?? []).filter((p) => p !== href);
    writeRecents(next);
    setPaths(next);
    // Keep focus in the list: the next card's ×, else the previous, else the heading.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
      const target = buttons?.[Math.min(index, buttons.length - 1)];
      (target ?? headingRef.current)?.focus();
    });
  };

  return (
    <section className={styles.section} aria-labelledby="recent-heading">
      <h2 id="recent-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
        Recently viewed
      </h2>
      <div className={styles.recentSlot}>
        {paths !== null && items.length === 0 && (
          <p className={styles.empty}>Pages you open show up here.</p>
        )}
        {items.length > 0 && (
          <ul ref={listRef} id="recent-list" className={styles.recentGrid}>
            {visible.map((item, i) => (
              <li key={item.href} className={styles.recentItem}>
                <Link to={item.href} className={styles.recentCard} title={item.path.join(' / ')}>
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
        {hidden > 0 && (
          <button
            type="button"
            className={styles.more}
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            aria-controls="recent-list">
            {showAll ? 'Show less' : `View more (${hidden})`}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * The docs tree beside the home page. The column is as tall as the page; the
 * frame fills it without adding height, and the scroller inside sticks under
 * the header and ends above the footer (like the doc pages' sidebar).
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

function ExploreFortanix(): ReactNode {
  return (
    <section className={styles.section} aria-labelledby="explore-heading">
      <h2 id="explore-heading" className={styles.heading}>
        Explore Fortanix
      </h2>
      <ul className={styles.exploreGrid}>
        {featured.map((card) => (
          <li key={card.href}>
            <Link to={card.href} className={styles.exploreCard} data-kind={card.kind}>
              <span className={styles.cardTop}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {CARD_ICONS[card.icon]}
                  </svg>
                </span>
                <span className={styles.cardKind}>{card.kind === 'product' ? 'Product' : 'Solution'}</span>
              </span>
              <span className={styles.exploreTitle}>{card.title}</span>
              <span className={styles.explorePath} title={card.path}>
                {card.path}
              </span>
              <span className={styles.exploreLine}>{card.line}</span>
              <span className={styles.tags}>
                {card.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
              <ArrowIcon />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Guides, concepts and references for protecting data, keys and AI workloads with Fortanix Armor.">
      <div className={styles.layout}>
        <HomeSidebar />
        <div className={styles.content}>
          <Hero />
          <main className={styles.main}>
            <RecentlyViewed />
            <ExploreFortanix />
          </main>
        </div>
      </div>
    </Layout>
  );
}
