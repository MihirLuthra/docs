import {useRef, type ReactNode} from 'react';
import DocsTree from '@site/src/components/DocsTree';
import {useFooterOverlap} from '@site/src/lib/footer-overlap';
import styles from './styles.module.css';

// Replaces Docusaurus's sidebar with the docs tree (ux-spec.md). On narrow
// screens Docusaurus hides this column; the header drawer shows the tree.
export default function DocSidebar(): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useFooterOverlap(ref);
  return (
    <div ref={ref} className={styles.sidebar}>
      <DocsTree />
    </div>
  );
}
