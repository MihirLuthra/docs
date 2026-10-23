import type {LoadContext, Plugin} from '@docusaurus/types';
import type {TreeNode} from '../src/components/DocsTree/types';
import type {IndexEntry, Kind} from '../src/components/Search/types';

// Minimal shapes of the docs plugin's loaded content that this plugin reads.
type SidebarItem =
  | {type: 'doc' | 'ref'; id: string; label?: string}
  | {
      type: 'category';
      label: string;
      items: SidebarItem[];
      customProps?: {badge?: string};
    }
  | {type: 'link' | 'html'};

type DocMeta = {
  id: string;
  title: string;
  permalink: string;
  frontMatter: {doc_type?: string; keywords?: string[]};
};

type LoadedVersion = {
  docs: DocMeta[];
  sidebars: {[name: string]: SidebarItem[]};
};

const KINDS: Kind[] = [
  'Solution',
  'Product',
  'Concept',
  'Quickstart',
  'Guide',
  'Reference',
  'Tutorial',
  'Section',
];

/**
 * Kind of a tree node (ux-spec.md, Kind icons): `doc_type` in front matter
 * when set, otherwise derived from the node's position in the tree.
 * `names` runs from the top-level section to the node itself.
 */
function kindOf(names: string[], isFolder: boolean, docType?: string): Kind {
  if (docType) {
    const kind = KINDS.find((k) => k.toLowerCase() === docType.toLowerCase());
    if (!kind) throw new Error(`docs-tree: unknown doc_type "${docType}"`);
    return kind;
  }
  const [top] = names;
  const title = names[names.length - 1];
  const parent = names[names.length - 2] ?? '';
  if (isFolder) {
    if (top === 'Solutions' && names.length === 2) return 'Solution';
    // Products → Fortanix Armor → its services (and their direct sections).
    if (top === 'Products' && names.length >= 3 && names.length <= 4) return 'Product';
    return 'Section';
  }
  if (/quickstart|get started|install the toolchain/i.test(title)) return 'Quickstart';
  if (/^api$|reference|cli$|library|provider|glossary/i.test(title)) return 'Reference';
  if (top === 'Get familiar' || title === 'Concepts' || parent === 'Concepts') return 'Concept';
  if (top === 'Learn' || ['Tutorials', 'Examples'].includes(title) || ['Tutorials', 'Examples'].includes(parent)) {
    return 'Tutorial';
  }
  return 'Guide';
}

/**
 * Publishes the docs sidebar as a compact tree in global data, so the tree
 * can be rendered on pages outside the docs (the home page) as well as in
 * the docs sidebar, and builds the search index from the same sidebar.
 * Both come from the sidebar Docusaurus generates from content/.
 */
export default function docsTreePlugin(_context: LoadContext): Plugin {
  return {
    name: 'docs-tree',
    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent['docusaurus-plugin-content-docs']
        ?.default as {loadedVersions: LoadedVersion[]} | undefined;
      if (!docsContent) throw new Error('docs-tree: docs plugin not loaded');
      const version = docsContent.loadedVersions[0];
      const docsById = new Map(version.docs.map((d) => [d.id, d]));
      const index: IndexEntry[] = [];

      const toNodes = (items: SidebarItem[], parents: string[]): TreeNode[] =>
        items.flatMap((item): TreeNode[] => {
          if (item.type === 'category') {
            const names = [...parents, item.label];
            // Push the folder before its children; its href is set below.
            const entry: IndexEntry = {
              title: item.label,
              path: parents,
              href: '',
              kind: kindOf(names, true),
              depth: names.length,
              keywords: [],
            };
            index.push(entry);
            const children = toNodes(item.items, names);
            entry.href = firstHref(children);
            return [
              {
                label: item.label,
                items: children,
                ...(item.customProps?.badge && {badge: item.customProps.badge}),
              },
            ];
          }
          if (item.type === 'doc' || item.type === 'ref') {
            const doc = docsById.get(item.id);
            if (!doc) throw new Error(`docs-tree: unknown doc ${item.id}`);
            const label = item.label ?? doc.title;
            const names = [...parents, label];
            index.push({
              title: label,
              path: parents,
              href: doc.permalink,
              kind: kindOf(names, false, doc.frontMatter.doc_type),
              depth: names.length,
              keywords: (doc.frontMatter.keywords ?? []).map((k) => k.toLowerCase()),
            });
            return [{label, href: doc.permalink}];
          }
          return [];
        });

      actions.setGlobalData({tree: toNodes(version.sidebars.docs, [])});
      // Loaded on demand by the search modal, not shipped with every page.
      await actions.createData('search-index.json', index);
    },
  };
}

function firstHref(nodes: TreeNode[]): string {
  for (const node of nodes) {
    if (node.href) return node.href;
    const inner = node.items && firstHref(node.items);
    if (inner) return inner;
  }
  return '';
}
