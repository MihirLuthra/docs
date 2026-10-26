import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import Contributors, {usePageHistory} from '@site/src/components/Contributors';
import styles from './styles.module.css';

function HistoryIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path
        d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The page's meta line: Docusaurus's "Edit this page" and the page's history
// on GitHub on the left, the page's contributors (collapsed) on the right.
// All are about the page's source, so they sit together after the content
// rather than beside the table of contents.
export default function DocItemFooter(): ReactNode {
  const history = usePageHistory();
  return (
    <div className={styles.meta}>
      <div className={styles.links}>
        <Footer />
        {history && (
          <a className={styles.history} href={history}>
            <HistoryIcon />
            Page history
          </a>
        )}
      </div>
      <Contributors />
    </div>
  );
}
