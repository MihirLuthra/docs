/**
 * The home page's map of the docs (ux-spec.md, Home): the solutions, then
 * the products, each linking to its overview. Every href is a page in the docs tree (the build fails on a
 * broken link). A set with no pages yet has no href and shows dimmed.
 */
export type DocIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom' | 'insight' | 'platform';

export type DocSet = {
  icon: DocIcon;
  title: string;
  line: string;
  /** Its overview. None while it has no pages yet. */
  href?: string;
};

const CAI = '/solutions/confidential-ai';
const CC = '/products/fortanix-armor/confidential-computing';

// TODO(verify): the solution lines come from the N5 prototype and need
// review. The product lines follow support.fortanix.com's Fortanix Armor
// overview: Armor is the platform, with DSM, CCM, Key Insight and shared
// platform services (IAM among them).
export const solutions: DocSet[] = [
  {
    icon: 'ai',
    title: 'Confidential AI',
    line: 'Run AI models in TEEs and release keys only to attested workloads.',
    href: `${CAI}/overview`,
  },
  {
    icon: 'token',
    title: 'Tokenization',
    line: 'Replace sensitive fields with format-preserving tokens.',
    href: '/solutions/tokenization/overview',
  },
  {
    icon: 'folder',
    title: 'File system encryption',
    line: 'Encrypt files on Linux and Windows with keys in DSM.',
    href: '/solutions/file-system-encryption/overview',
  },
  {
    icon: 'atom',
    title: 'PQC readiness',
    line: 'Find quantum-vulnerable cryptography across your estate.',
    href: '/solutions/pqc-readiness/overview',
  },
];

export const products: DocSet[] = [
  {
    icon: 'chip',
    title: 'Confidential Computing',
    line: 'Verify workloads in TEEs with CCM before they get secrets.',
    href: `${CC}/overview`,
  },
  {
    icon: 'key',
    title: 'Data Security Manager',
    line: 'Store and use keys, certificates and other secrets.',
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    icon: 'platform',
    title: 'Platform services',
    line: 'Identity and access management, and other services every Armor product shares.',
    href: '/products/fortanix-armor/platform/identity-and-access-management/create-a-group',
  },
  {
    icon: 'insight',
    title: 'Key Insight',
    line: 'Find encryption keys and data services across on-premises and multicloud. No pages yet.',
  },
];
