import type {ReactNode} from 'react';
import TOCDesktop from '@theme-original/DocItem/TOC/Desktop';
import Contributors from '@site/src/components/Contributors';
import styles from './styles.module.css';

// The right-hand column: the table of contents, then the page's
// contributors, sticking together like GitHub's sidebar.
export default function DocItemTOCDesktop(): ReactNode {
  return (
    <div className={styles.rail}>
      <TOCDesktop />
      <Contributors placement="rail" />
    </div>
  );
}
