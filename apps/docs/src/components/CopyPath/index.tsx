import {useEffect, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

// What the copied path starts with, in place of the address's leading "/".
const PATH_ROOT = 'fortanix-docs';
const COPIED_MS = 1500;

const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function CopyIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Copies the page's path as the address bar shows it, starting at
 * "fortanix-docs" instead of "/" (fortanix-docs/solutions/…/page, plus
 * #heading for a section). Where the paste takes rich text (Slack, docs,
 * email) it is a link to the page; where it takes plain text (a terminal) it
 * is the path alone.
 *
 * After the page's name in the path (DocBreadcrumbs), and in each heading in
 * place of Docusaurus's "#" link (theme/Heading), where it also puts the
 * section in the address bar.
 */
export default function CopyPath({hash, label}: {hash?: string; label: string}): ReactNode {
  const base = useBaseUrl('/');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const {origin, pathname} = window.location;
    const page = (pathname.startsWith(base) ? pathname.slice(base.length) : pathname).replace(/^\/+|\/+$/g, '');
    const fragment = hash ? `#${hash}` : '';
    const text = `${PATH_ROOT}/${page}${fragment}`;
    const url = `${origin}${pathname}${fragment}`;
    if (hash) window.history.replaceState(window.history.state, '', `${pathname}${window.location.search}${fragment}`);
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], {type: 'text/plain'}),
            'text/html': new Blob([`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`], {type: 'text/html'}),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
    } catch {
      // No clipboard access (insecure page, denied): nothing to show.
    }
  };

  return (
    <button
      type="button"
      className={`${styles.copy} ${hash ? styles.inHeading : ''}`}
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      data-copied={copied || undefined}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className={styles.tip} aria-hidden="true">
        {copied ? 'Copied' : 'Copy path'}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
