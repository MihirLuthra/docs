/**
 * The home page's map of the docs (ux-spec.md, Home): the solutions, then
 * the products. Every href is a page in the docs tree (the build fails on a
 * broken link). A set with no pages yet has no href and shows dimmed.
 */
export type DocIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom' | 'insight' | 'platform';

export type DocLink = {label: string; href: string};

export type DocSet = {
  icon: DocIcon;
  title: string;
  line: string;
  /** Its overview. None while it has no pages yet. */
  href?: string;
  /** Its main pages, beyond the overview. */
  links?: DocLink[];
  /** For a solution: the products it is built on. */
  uses?: string[];
};

const CAI = '/solutions/confidential-ai';
const CC = '/products/fortanix-armor/confidential-computing';

// TODO(verify): the solution and product lines come from the N5 prototype;
// product claims need review. Tokenization, File system encryption and PQC
// readiness are stubs, so they say nothing about which products they use.
export const solutions: DocSet[] = [
  {
    icon: 'ai',
    title: 'Confidential AI',
    line: 'Run AI models in TEEs and release keys only to attested workloads.',
    href: `${CAI}/overview`,
    links: [
      {label: 'Use cases', href: `${CAI}/use-cases/proprietary-model`},
      {label: 'Plan a deployment', href: `${CAI}/how-to-guides/day-0-plan-and-prepare/plan-a-deployment`},
      {label: 'Deploy and operate', href: `${CAI}/how-to-guides/overview`},
      {label: 'Support matrix', href: `${CAI}/support-matrix`},
    ],
    uses: ['CCM', 'DSM'],
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
    links: [
      {label: 'CCM concepts', href: `${CC}/ccm/concepts`},
      {label: 'Enroll an Intel TDX node', href: `${CC}/ccm/compute-nodes/enroll-an-intel-tdx-node`},
      {label: 'Confidential Containers', href: `${CC}/workload-runtimes/confidential-containers/overview`},
      {label: 'Enclave OS', href: `${CC}/workload-runtimes/enclave-os/overview`},
    ],
  },
  {
    icon: 'key',
    title: 'Data Security Manager',
    line: 'Generate, store and control keys.',
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    icon: 'platform',
    title: 'Platform',
    line: 'Identity and access management for every Armor service.',
    href: '/products/fortanix-armor/platform/identity-and-access-management/create-a-group',
  },
  {
    icon: 'insight',
    title: 'Key Insight',
    line: 'No pages yet.',
  },
];
