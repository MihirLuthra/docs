/**
 * Products and solutions in the home page's hero (ux-spec.md, Home): every
 * one with equal weight, in the order of the docs tree.
 */
export type FeaturedIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom' | 'users' | 'insight';

export type FeaturedItem = {
  icon: FeaturedIcon;
  title: string;
  line: string;
  /** A page in the docs tree; none for a product with no pages yet. */
  href?: string;
};

export type FeaturedGroup = {
  title: string;
  /** What the group is, in one line. */
  line: string;
  items: FeaturedItem[];
};

// TODO(verify): item lines come from the N5 prototype; product claims need review.
export const featured: FeaturedGroup[] = [
  {
    title: 'Products',
    line: 'Fortanix Armor and its parts.',
    items: [
      {
        icon: 'users',
        title: 'Platform',
        line: 'Accounts, groups and access in Armor.',
        href: '/products/fortanix-armor/platform/identity-and-access-management/create-a-group',
      },
      {
        icon: 'chip',
        title: 'Confidential Computing',
        line: 'Verify workloads in TEEs before they get secrets.',
        href: '/products/fortanix-armor/confidential-computing/overview',
      },
      {
        icon: 'insight',
        title: 'Key Insight',
        line: 'No pages yet.',
      },
      {
        icon: 'key',
        title: 'Data Security Manager',
        line: 'Generate, store and control keys.',
        href: '/products/fortanix-armor/data-security-manager/overview',
      },
    ],
  },
  {
    title: 'Solutions',
    line: 'Built on the products, for one problem each.',
    items: [
      {
        icon: 'ai',
        title: 'Confidential AI',
        line: 'Protect models and data while they run on CPUs and GPUs.',
        href: '/solutions/confidential-ai/overview',
      },
      {
        icon: 'folder',
        title: 'File system encryption',
        line: 'Encrypt files on Linux and Windows with keys in DSM.',
        href: '/solutions/file-system-encryption/overview',
      },
      {
        icon: 'token',
        title: 'Tokenization',
        line: 'Replace sensitive fields with format-preserving tokens.',
        href: '/solutions/tokenization/overview',
      },
      {
        icon: 'atom',
        title: 'PQC readiness',
        line: 'Find quantum-vulnerable cryptography across your estate.',
        href: '/solutions/pqc-readiness/overview',
      },
    ],
  },
];
