import type {ReactNode} from 'react';
import DocsTree from '@site/src/components/DocsTree';
import styles from './styles.module.css';

// Replaces Docusaurus's sidebar with the docs tree (ux-spec.md). On narrow
// screens Docusaurus hides this column; the header drawer shows the tree.
export default function DocSidebar(): ReactNode {
  return (
    <div className={styles.sidebar}>
      <DocsTree />
    </div>
  );
}
