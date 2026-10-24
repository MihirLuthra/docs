import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import Contributors from '@site/src/components/Contributors';

// Docusaurus's doc footer ("Edit this page"), then the page's contributors.
export default function DocItemFooter(): ReactNode {
  return (
    <>
      <Footer />
      <Contributors />
    </>
  );
}
