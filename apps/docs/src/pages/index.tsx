import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocsTree from '@site/src/components/DocsTree';
import {locate, useTree} from '@site/src/components/DocsTree/tree';
import {featured} from '@site/src/data/featured';
import {RECENTS_VISIBLE, readRecents, setRecentsLayout, writeRecents} from '@site/src/lib/recents';
import {useFooterOverlap} from '@site/src/lib/footer-overlap';
import styles from './index.module.css';

function CompassIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM15.5 8.5l-2 5-5 2 2-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function WarningIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5L2.5 20h19zM12 10v4.5M12 17.2v.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The site is published before Fortanix has reviewed it; says so first.
function PocNotice(): ReactNode {
  return (
    <aside className={styles.notice} aria-label="About this site">
      <span className={styles.noticeIcon}>
        <WarningIcon />
      </span>
      <p className={styles.noticeText}>
        <strong>Proof of concept.</strong> This site is not official Fortanix documentation.
        Fortanix has not reviewed or approved its content, so confirm anything here with Fortanix
        before you rely on it.
      </p>
    </aside>
  );
}

function GetFamiliarBanner(): ReactNode {
  return (
    <Link to="/get-familiar/what-fortanix-does" className={styles.banner}>
      <span className={styles.bannerIcon}>
        <CompassIcon />
      </span>
      {/* Title and description run together, so they share lines where they fit. */}
      <span className={styles.bannerText}>
        <span className={styles.bannerTitle}>New to Fortanix? Get familiar first</span>{' '}
        <span className={styles.bannerLine}>
          What the Armor platform does, confidential computing, attestation and key
          management, in a few short reads.
        </span>
      </span>
      <span className={styles.bannerCta}>Start reading →</span>
    </Link>
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
    if (paths !== null) setRecentsLayout(items.length);
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
            <Link to={card.href} className={styles.exploreCard}>
              <span className={styles.explorePath} title={card.path}>
                {card.path}
              </span>
              <span className={styles.exploreTitle}>{card.title}</span>
              <span className={styles.exploreLine}>{card.line}</span>
              <span className={styles.tags}>
                {card.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="Documentation for Fortanix products.">
      <div className={styles.layout}>
        <HomeSidebar />
        {/* Main column + right rail, centred together beside the sidebar. */}
        <div className={styles.content}>
          <main className={styles.main}>
            <h1 className="sr-only">Fortanix Documentation</h1>
            <PocNotice />
            <GetFamiliarBanner />
            <RecentlyViewed />
            <ExploreFortanix />
          </main>
          {/* Right rail, reserved for later content (e.g. Get help / Slack). Empty for now. */}
          <div className={styles.rail} />
        </div>
      </div>
    </Layout>
  );
}
