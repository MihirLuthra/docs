import {useEffect, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

// The link's text where the paste shows rich text, in place of the address's leading "/".
const PATH_ROOT = 'fortanix-docs';
const COPIED_MS = 1500;

const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Two chain links.
function LinkIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M10 13.5a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6M14 10.5a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
 * Copies a link to the page, or to a section with #heading. Where the paste
 * takes plain text it is the address; where it takes rich text (Slack, docs,
 * email) it is a link reading as the page's path, starting at "fortanix-docs"
 * instead of "/" (fortanix-docs/solutions/…/page#heading).
 *
 * After the page's name in the path (DocBreadcrumbs), and in each heading in
 * place of Docusaurus's "#" link (theme/Heading).
 */
export default function CopyLink({hash, label}: {hash?: string; label: string}): ReactNode {
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
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([url], {type: 'text/plain'}),
            'text/html': new Blob([`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`], {type: 'text/html'}),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(url);
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
      aria-label={copied ? 'Link copied' : label}
      data-copied={copied || undefined}>
      {copied ? <CheckIcon /> : <LinkIcon />}
      <span className={styles.tip} aria-hidden="true">
        {copied ? 'Link copied' : 'Copy link'}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Link copied' : ''}
      </span>
    </button>
  );
}
