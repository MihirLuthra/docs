/**
 * Explore Fortanix cards on the home page (ux-spec.md, Home): every solution
 * and product with equal weight.
 */
export type FeaturedIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom';

/** The card's colour (tokens in custom.css, --fx-card-<accent>). */
export type FeaturedAccent = 'violet' | 'blue' | 'teal' | 'green' | 'amber' | 'rose';

export type FeaturedCard = {
  icon: FeaturedIcon;
  accent: FeaturedAccent;
  title: string;
  line: string;
  /** A page in the docs tree. */
  href: string;
};

// TODO(verify): card copy comes from the N5 prototype; product claims need review.
export const featured: FeaturedCard[] = [
  {
    icon: 'ai',
    accent: 'violet',
    title: 'Confidential AI',
    line: 'Protect models and data while they run on CPUs and GPUs.',
    href: '/solutions/confidential-ai/overview',
  },
  {
    icon: 'key',
    accent: 'blue',
    title: 'Key management',
    line: 'Generate, store and control keys in Data Security Manager.',
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    icon: 'token',
    accent: 'teal',
    title: 'Tokenization',
    line: 'Replace sensitive fields with format-preserving tokens.',
    href: '/solutions/tokenization/overview',
  },
  {
    icon: 'chip',
    accent: 'green',
    title: 'Confidential Computing',
    line: 'Verify workloads in TEEs before they get secrets.',
    href: '/products/fortanix-armor/confidential-computing/overview',
  },
  {
    icon: 'folder',
    accent: 'amber',
    title: 'File system encryption',
    line: 'Encrypt files on Linux and Windows with keys in DSM.',
    href: '/solutions/file-system-encryption/overview',
  },
  {
    icon: 'atom',
    accent: 'rose',
    title: 'PQC readiness',
    line: 'Find quantum-vulnerable cryptography across your estate.',
    href: '/solutions/pqc-readiness/overview',
  },
];
