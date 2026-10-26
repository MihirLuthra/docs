import {useCallback, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import Menu, {menuStyles} from '@site/src/components/Menu';
import {findKey, nodesAlong, normalize, useTree} from '@site/src/components/DocsTree/tree';
import type {TreeNode} from '@site/src/components/DocsTree/types';
import {revealInTree} from '@site/src/lib/tree-reveal';
import CopyLink from '@site/src/components/CopyLink';
import Listen from '@site/src/components/Listen';
import styles from './styles.module.css';

function HomeIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.homeIcon} aria-hidden="true">
      <path
        d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z"
        fill="currentColor"
      />
    </svg>
  );
}

function CaretIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.caret} aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * A folder in the path. Folders have no page (D10), so it opens a menu of
 * what's inside: pages open, sub-folders open inside the menu (← or the back
 * row goes up again, as far as this folder), and "Show in sidebar" opens the
 * folder in the tree.
 */
function FolderCrumb({tree, folderKey, currentHref}: {tree: TreeNode[]; folderKey: string; currentHref: string}): ReactNode {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(folderKey);
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const along = nodesAlong(tree, view);
  const shown = along[along.length - 1];
  const name = nodesAlong(tree, folderKey).at(-1)?.label ?? '';
  const parentKey = view.split('.').slice(0, -1).join('.');
  const canGoUp = view !== folderKey;

  const close = useCallback(() => setOpen(false), []);
  const toggle = () => {
    setView(folderKey);
    setOpen(!open);
  };

  // → opens the focused sub-folder; ← goes back up.
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.key === 'ArrowRight' && target.dataset.folder) setView(target.dataset.folder);
    else if (e.key === 'ArrowLeft' && canGoUp) setView(parentKey);
    else return;
    e.preventDefault();
  };

  return (
    <li ref={rootRef} className={`breadcrumbs__item ${styles.folder}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`breadcrumbs__link ${styles.folderButton}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}>
        {name}
        <CaretIcon />
      </button>
      {open && shown?.items && (
        <Menu label={name} rootRef={rootRef} triggerRef={buttonRef} onClose={close} view={view} onKeyDown={onKeyDown}>
          {canGoUp && (
            <>
              <button type="button" role="menuitem" tabIndex={-1} className={menuStyles.item} onClick={() => setView(parentKey)}>
                ‹ {along[along.length - 2]?.label}
              </button>
              <p className={menuStyles.heading}>{shown.label}</p>
            </>
          )}
          {shown.items.length === 0 && <p className={menuStyles.heading}>No pages yet</p>}
          {shown.items.map((child, i) =>
            child.items ? (
              <button
                key={child.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={menuStyles.item}
                data-folder={`${view}.${i}`}
                onClick={() => setView(`${view}.${i}`)}>
                {child.label}
                <span className={menuStyles.chevron} aria-hidden="true">
                  ›
                </span>
              </button>
            ) : (
              <Link
                key={child.label}
                to={child.href!}
                role="menuitem"
                tabIndex={-1}
                className={menuStyles.item}
                aria-current={normalize(child.href!) === currentHref ? 'page' : undefined}
                onClick={close}>
                {child.label}
              </Link>
            ),
          )}
          <div className={`${menuStyles.separator} ${styles.desktopOnly}`} role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`${menuStyles.item} ${styles.desktopOnly}`}
            onClick={() => {
              close();
              revealInTree(view);
            }}>
            Show in sidebar
          </button>
        </Menu>
      )}
    </li>
  );
}

/**
 * The path above a doc's title (ux-spec.md, Doc pages): Home, then each
 * folder as a menu of its contents, then the page itself, then a button that
 * copies a link to the page (components/CopyLink). Pages with audio have
 * "Listen" at the right end (components/Listen).
 */
export default function DocBreadcrumbs(): ReactNode {
  const tree = useTree();
  const pathname = normalize(useLocation().pathname);
  const key = findKey(tree, pathname);
  if (!key) return null;
  const along = nodesAlong(tree, key);
  const parts = key.split('.');
  return (
    <nav className={`theme-doc-breadcrumbs ${styles.container}`} aria-label="Breadcrumbs">
      <ul className="breadcrumbs">
        <li className="breadcrumbs__item">
          <Link aria-label="Home page" className="breadcrumbs__link" to="/">
            <HomeIcon />
          </Link>
        </li>
        {along.slice(0, -1).map((node, i) => (
          <FolderCrumb
            key={parts.slice(0, i + 1).join('.')}
            tree={tree}
            folderKey={parts.slice(0, i + 1).join('.')}
            currentHref={pathname}
          />
        ))}
        <li className="breadcrumbs__item breadcrumbs__item--active">
          <span className="breadcrumbs__link" aria-current="page">
            {along[along.length - 1].label}
          </span>
          {/* In the last crumb, so it stays on the same line as the page's name when the path wraps. */}
          <CopyLink label="Copy link to this page" />
        </li>
      </ul>
      {along[along.length - 1].listen && <Listen />}
    </nav>
  );
}
