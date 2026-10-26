import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import Contributors from '@site/src/components/Contributors';
import styles from './styles.module.css';

// The page's meta line: Docusaurus's "Edit this page" and, beside it, the
// page's contributors (collapsed). Both are about editing the page, so they
// sit together after the content rather than beside the table of contents.
export default function DocItemFooter(): ReactNode {
  return (
    <div className={styles.meta}>
      <Footer />
      <Contributors />
    </div>
  );
}
