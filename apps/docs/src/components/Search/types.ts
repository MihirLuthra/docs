export type Kind =
  | 'Solution'
  | 'Product'
  | 'Concept'
  | 'Quickstart'
  | 'Guide'
  | 'Reference'
  | 'Tutorial'
  | 'Section';

/** One search index entry: a page or a folder of the docs tree. */
export type IndexEntry = {
  title: string;
  /** Folder labels above the entry, top-level section first. */
  path: string[];
  /** The page itself, or a folder's first page. */
  href: string;
  kind: Kind;
  /** 1 for top-level sections. */
  depth: number;
  keywords: string[];
};
