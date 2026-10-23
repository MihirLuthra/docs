import {useEffect, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import DocsTree from '@site/src/components/DocsTree';
import Logo from '@site/src/components/Logo';
import {useOverlays} from '@site/src/components/Overlays/context';
import {SparkleIcon} from '@site/src/components/AskAI/SparkleIcon';
import {SEARCH_TRIGGER_ATTR} from '@site/src/lib/search-early';
import styles from './styles.module.css';

type HeaderLink = {label: string; to: string};

function useHeaderLinks(): HeaderLink[] {
  const {siteConfig} = useDocusaurusContext();
  return (siteConfig.themeConfig.navbar as {items: HeaderLink[]}).items;
}

function MenuIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function SearchIcon(): ReactNode {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SearchTrigger(): ReactNode {
  const {openSearch, prefetchSearch} = useOverlays();
  // "Ctrl K" until hydrated; the hint has a fixed width, so swapping it for
  // "⌘K" on Apple devices doesn't move anything.
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <button
      type="button"
      className={styles.searchTrigger}
      onClick={openSearch}
      onPointerEnter={prefetchSearch}
      onFocus={prefetchSearch}
      onTouchStart={prefetchSearch}
      {...{[SEARCH_TRIGGER_ATTR]: ''}}
      aria-label="Search the docs"
      aria-keyshortcuts="Control+K Meta+K /">
      <SearchIcon />
      <span className={styles.searchText}>Search the docs</span>
      <kbd className={styles.searchKbd} aria-hidden="true">
        {isApple ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

function AskAIButton(): ReactNode {
  const {askAIEnabled, askAIOpen, toggleAskAI} = useOverlays();
  if (!askAIEnabled) return null;
  return (
    <button type="button" className={styles.askAI} onClick={toggleAskAI} aria-pressed={askAIOpen}>
      <SparkleIcon />
      <span className={styles.askAIText}>Ask AI</span>
    </button>
  );
}

/** Narrow screens: the tree and header links in a left-hand drawer. */
function Drawer({links, onClose}: {links: HeaderLink[]; onClose: () => void}): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // Esc closes; Tab stays inside the drawer.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button, [tabindex="0"]',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.drawerRoot} onKeyDown={onKeyDown}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="docs-drawer"
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation">
        <div className={styles.drawerHead}>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close navigation">
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Site" className={styles.drawerLinks}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={onClose}>
              {l.label}
            </Link>
          ))}
        </nav>
        <DocsTree onNavigate={onClose} />
      </div>
    </div>
  );
}

// Replaces Docusaurus's navbar with the header from ux-spec.md.
export default function Navbar(): ReactNode {
  const links = useHeaderLinks();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const {pathname} = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  };

  return (
    <header className={styles.header}>
      <button
        ref={menuButton}
        type="button"
        className={`${styles.iconButton} ${styles.menuButton}`}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        aria-controls="docs-drawer">
        <MenuIcon />
      </button>
      <Link to="/" className={styles.brand} aria-label="Fortanix Docs, home">
        <Logo className={styles.logo} />
        <span className={styles.brandDocs} aria-hidden="true">
          Docs
        </span>
      </Link>
      <div className={styles.center}>
        <SearchTrigger />
        <AskAIButton />
      </div>
      <nav aria-label="Site" className={styles.links}>
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={styles.link}>
            {l.label}
          </Link>
        ))}
      </nav>
      <NavbarColorModeToggle className={styles.colorMode} />
      {drawerOpen && <Drawer links={links} onClose={closeDrawer} />}
    </header>
  );
}
