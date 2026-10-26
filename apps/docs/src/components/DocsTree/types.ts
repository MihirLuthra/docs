/** A node of the docs tree: a page (has `href`) or a folder (has `items`). */
export type TreeNode = {
  label: string;
  href?: string;
  items?: TreeNode[];
  /** Small pill shown after the label, e.g. "standalone". */
  badge?: string;
  /** The page can be listened to (`listen: true` in front matter, scripts/speech.mjs). */
  listen?: true;
};
