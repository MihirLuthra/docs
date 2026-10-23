/**
 * The single list of documented products. Adding a product means adding a
 * folder under `content/<id>` and one entry here; the docs plugin instances,
 * search index, navbar and landing page grid are all derived from this list.
 */
export type ProductLink = {
  label: string;
  /** Path within the product's docs, relative to `/<id>/`. */
  to: string;
};

export type Product = {
  /** Content folder name under `content/` and the URL prefix. */
  id: string;
  name: string;
  /** Short name for the navbar. */
  shortName: string;
  description: string;
  links: ProductLink[];
};

export const products: Product[] = [
  {
    id: 'ccm',
    name: 'Confidential Computing Manager',
    shortName: 'CCM',
    // From the product page meta description on fortanix.com.
    description:
      'Protects sensitive data and applications in use by running them within secure enclaves.',
    links: [
      {label: 'Overview', to: ''},
      {label: 'Quickstart', to: '#quickstart'},
      {label: 'Release notes', to: '#release-notes'},
    ],
  },
];

export const productPath = (product: Product, to = ''): string =>
  `/${product.id}/${to}`;
