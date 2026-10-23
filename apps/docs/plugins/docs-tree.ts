import type {LoadContext, Plugin} from '@docusaurus/types';
import type {TreeNode} from '../src/components/DocsTree/types';

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

type DocMeta = {id: string; title: string; permalink: string};

type LoadedVersion = {
  docs: DocMeta[];
  sidebars: {[name: string]: SidebarItem[]};
};

/**
 * Publishes the docs sidebar as a compact tree in global data, so the tree
 * can be rendered on pages outside the docs (the home page) as well as in
 * the docs sidebar. Built from the sidebar Docusaurus generates from content/.
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

      const toNodes = (items: SidebarItem[]): TreeNode[] =>
        items.flatMap((item): TreeNode[] => {
          if (item.type === 'category') {
            return [
              {
                label: item.label,
                items: toNodes(item.items),
                ...(item.customProps?.badge && {badge: item.customProps.badge}),
              },
            ];
          }
          if (item.type === 'doc' || item.type === 'ref') {
            const doc = docsById.get(item.id);
            if (!doc) throw new Error(`docs-tree: unknown doc ${item.id}`);
            return [{label: item.label ?? doc.title, href: doc.permalink}];
          }
          return [];
        });

      actions.setGlobalData({tree: toNodes(version.sidebars.docs)});
    },
  };
}
