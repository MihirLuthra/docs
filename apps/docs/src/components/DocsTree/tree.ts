import {usePluginData} from '@docusaurus/useGlobalData';
import type {TreeNode} from './types';

/** The docs tree published by the docs-tree plugin. */
export function useTree(): TreeNode[] {
  return (usePluginData('docs-tree') as {tree: TreeNode[]}).tree;
}

export const normalize = (path: string): string => path.replace(/\/+$/, '') || '/';

/** Key (index path, e.g. "2.0.1.3") of the page at `pathname`, or null. */
export function findKey(nodes: TreeNode[], pathname: string, prefix = ''): string | null {
  for (let i = 0; i < nodes.length; i++) {
    const key = prefix ? `${prefix}.${i}` : `${i}`;
    const node = nodes[i];
    if (node.href && normalize(node.href) === pathname) return key;
    if (node.items) {
      const found = findKey(node.items, pathname, key);
      if (found) return found;
    }
  }
  return null;
}

/** Keys of all folders containing `key`. */
export function ancestors(key: string | null): string[] {
  if (!key) return [];
  const parts = key.split('.');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('.'));
}

/** Nodes along `key`, from the top-level section to the node itself. */
export function nodesAlong(nodes: TreeNode[], key: string): TreeNode[] {
  const out: TreeNode[] = [];
  let list: TreeNode[] | undefined = nodes;
  for (const i of key.split('.').map(Number)) {
    const node: TreeNode | undefined = list?.[i];
    if (!node) break;
    out.push(node);
    list = node.items;
  }
  return out;
}

/** The page at `pathname` and its folder path, or null if not in the tree. */
export function locate(
  nodes: TreeNode[],
  pathname: string,
): {title: string; path: string[]} | null {
  const key = findKey(nodes, normalize(pathname));
  if (!key) return null;
  const along = nodesAlong(nodes, key);
  return {title: along[along.length - 1].label, path: along.slice(0, -1).map((n) => n.label)};
}
