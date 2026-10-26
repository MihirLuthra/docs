import fs from 'node:fs';
import path from 'node:path';
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
  frontMatter: {doc_type?: string; keywords?: string[]; listen?: boolean};
};

type LoadedVersion = {
  contentPath: string;
  docs: DocMeta[];
  sidebars: {[name: string]: SidebarItem[]};
};

// `doc_type` values from docs-meta/style-guide.md, and the kind each maps to.
const DOC_TYPE_KINDS: Record<string, Kind> = {
  concept: 'Concept',
  'how-to': 'Guide',
  tutorial: 'Tutorial',
  reference: 'Reference',
};

/**
 * Kind of a tree node (ux-spec.md, Kind icons): `doc_type` in front matter
 * when set, otherwise derived from the node's position in the tree.
 * `names` runs from the top-level section to the node itself.
 */
function kindOf(names: string[], isFolder: boolean, docType?: string): Kind {
  if (docType) {
    const kind = DOC_TYPE_KINDS[docType];
    if (!kind) {
      throw new Error(
        `docs-tree: unknown doc_type "${docType}" on "${names.join(' / ')}"; ` +
          `use one of ${Object.keys(DOC_TYPE_KINDS).join(', ')} (style-guide.md)`,
      );
    }
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
export default function docsTreePlugin(context: LoadContext): Plugin {
  // Pages that can be listened to (permalinks): those with `listen: true` in
  // front matter, for now. For the speech build (scripts/speech.mjs), which
  // reads them from the generated files.
  const listenPages: string[] = [];
  return {
    name: 'docs-tree',
    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent['docusaurus-plugin-content-docs']
        ?.default as {loadedVersions: LoadedVersion[]} | undefined;
      if (!docsContent) throw new Error('docs-tree: docs plugin not loaded');
      const version = docsContent.loadedVersions[0];
      const docsById = new Map(version.docs.map((d) => [d.id, d]));
      listenPages.length = 0; // reloads in dev
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
            const listen = doc.frontMatter.listen === true;
            if (listen) listenPages.push(doc.permalink);
            return [{label, href: doc.permalink, ...(listen && {listen: true})}];
          }
          return [];
        });

      const tree = withEmptyFolders(toNodes(version.sidebars.docs, []), version.contentPath, version.contentPath, context.baseUrl);
      actions.setGlobalData({tree});
      // Loaded on demand by the search modal, not shipped with every page.
      await actions.createData('search-index.json', index);
    },
    async postBuild() {
      const file = path.join(context.generatedFilesDir, 'speech-pages.json');
      fs.writeFileSync(file, JSON.stringify({baseUrl: context.baseUrl, pages: listenPages}));
    },
  };
}

type Category = {label?: string; position?: number; customProps?: {badge?: string}};

/**
 * Docusaurus leaves folders without pages out of the sidebar. The tree keeps
 * them (the planned structure shows before its pages exist), so this adds
 * every folder in content/ that has a _category_.json and no node yet, in
 * the order Docusaurus would place it (position, then name). Nodes already
 * there keep their order; empty folders go before the first node that sorts
 * after them. They have no href, so they aren't in the search index.
 */
function withEmptyFolders(nodes: TreeNode[], dir: string, contentPath: string, baseUrl: string): TreeNode[] {
  const readCategory = (folder: string): Category | null => {
    const file = path.join(folder, '_category_.json');
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Category) : null;
  };
  const docPosition = (file: string): number | undefined => {
    const match = /^sidebar_position:\s*([\d.]+)\s*$/m.exec(fs.readFileSync(file, 'utf8'));
    return match ? Number(match[1]) : undefined;
  };

  // Each folder and page in `dir`, with its sort key and its node (if any).
  type Entry = {position: number; name: string; node?: TreeNode; empty?: TreeNode};
  const entries: Entry[] = [];
  for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      const category = readCategory(full);
      if (!category) continue;
      const label = category.label ?? item.name;
      const existing = nodes.find((n) => n.items && n.label === label);
      const position = category.position ?? Infinity;
      if (existing) {
        existing.items = withEmptyFolders(existing.items!, full, contentPath, baseUrl);
        entries.push({position, name: item.name, node: existing});
      } else {
        const items = withEmptyFolders([], full, contentPath, baseUrl);
        const empty: TreeNode = {
          label,
          items,
          ...(category.customProps?.badge && {badge: category.customProps.badge}),
        };
        entries.push({position, name: item.name, empty});
      }
    } else if (/\.mdx?$/.test(item.name)) {
      // Permalinks carry the site's base (/docs/ on GitHub Pages).
      const route = `${baseUrl}${path.relative(contentPath, full).replace(/\.mdx?$/, '')}`;
      const node = nodes.find((n) => !n.items && n.href?.replace(/\/+$/, '') === route);
      if (node) entries.push({position: docPosition(full) ?? Infinity, name: item.name, node});
    }
  }
  entries.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  const result = [...nodes];
  entries.forEach((entry, i) => {
    if (!entry.empty) return;
    const later = entries.slice(i + 1).find((e) => e.node);
    const at = later?.node ? result.indexOf(later.node) : -1;
    result.splice(at === -1 ? result.length : at, 0, entry.empty);
  });
  return result;
}

function firstHref(nodes: TreeNode[]): string {
  for (const node of nodes) {
    if (node.href) return node.href;
    const inner = node.items && firstHref(node.items);
    if (inner) return inner;
  }
  return '';
}
