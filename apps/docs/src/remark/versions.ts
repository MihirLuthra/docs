// Fills version references in code: `{{coco-keyprovider.version}}` in code
// blocks and inline code becomes the current version from versions/
// (MDX can't evaluate expressions inside code). Also checks the page's
// `applies_to` front matter. Unknown references fail the build.
import {checkAppliesTo, resolveReference} from '../../plugins/versions-data';

type Node = {type: string; value?: unknown; children?: Node[]};
type VFile = {path?: string; data: {frontMatter?: {applies_to?: unknown}}};

const REFERENCE = /\{\{\s*([a-z0-9-]+(?:\.[a-z0-9-]+)+)\s*\}\}/g;

function fill(node: Node, file: VFile): void {
  if ((node.type === 'code' || node.type === 'inlineCode') && typeof node.value === 'string') {
    node.value = node.value.replace(REFERENCE, (_, reference: string) => {
      try {
        return resolveReference(reference);
      } catch (e) {
        throw new Error(`${file.path ?? 'a page'}: ${(e as Error).message}`);
      }
    });
  }
  node.children?.forEach((child) => fill(child, file));
}

export default function versions() {
  return (tree: Node, file: VFile) => {
    const appliesTo = file.data.frontMatter?.applies_to;
    if (Array.isArray(appliesTo)) {
      for (const entry of appliesTo) {
        const problem = checkAppliesTo(String(entry));
        if (problem) throw new Error(`${file.path ?? 'a page'}: applies_to: ${problem}`);
      }
    }
    fill(tree, file);
  };
}
