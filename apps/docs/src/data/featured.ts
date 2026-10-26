/**
 * The home page's paths into the docs (ux-spec.md, Home): where to start,
 * every doc set grouped by topic, and reference pages. Each doc set links to
 * its overview and to its main parts. Every href is a page in the docs tree
 * (the build fails on a broken link).
 */
export type DocIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom' | 'compass' | 'notes' | 'alert' | 'download' | 'code';

export type DocLink = {label: string; href: string};

export type DocSet = {
  icon: DocIcon;
  title: string;
  line: string;
  /** None while it has no pages yet: shown dimmed, not a link. */
  href?: string;
  /** Its main parts, beyond the overview. */
  links?: DocLink[];
};

export type DocGroup = {title: string; line: string; sets: DocSet[]};

const CAI = '/solutions/confidential-ai';
const CC = '/products/fortanix-armor/confidential-computing';

export const startHere: DocSet[] = [
  {
    icon: 'compass',
    title: 'What Fortanix does',
    line: 'What each product is for.',
    href: '/fundamentals/what-fortanix-does',
  },
  {
    icon: 'chip',
    title: 'TEE technologies',
    line: 'How TEEs keep code and data private.',
    href: '/fundamentals/concepts/tee-technologies/intel-sgx',
  },
];

// TODO(verify): set lines come from the N5 prototype; product claims need review.
export const docGroups: DocGroup[] = [
  {
    title: 'Confidential computing and AI',
    line: 'Run workloads and AI models in TEEs, and prove what runs before it gets a secret.',
    sets: [
      {
        icon: 'ai',
        title: 'Confidential AI',
        line: 'Run AI models in TEEs and release keys only to attested workloads.',
        href: `${CAI}/overview`,
        links: [
          {label: 'Use cases', href: `${CAI}/use-cases/proprietary-model`},
          {label: 'Deploy and operate', href: `${CAI}/how-to-guides/overview`},
          {label: 'Plan a deployment', href: `${CAI}/how-to-guides/day-0-plan-and-prepare/plan-a-deployment`},
          {label: 'Support matrix', href: `${CAI}/support-matrix`},
        ],
      },
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
    ],
  },
  {
    title: 'Keys and data protection',
    line: 'Keep keys in DSM, and protect the data they guard.',
    sets: [
      {
        icon: 'key',
        title: 'Data Security Manager',
        line: 'Generate, store and control keys.',
        href: '/products/fortanix-armor/data-security-manager/overview',
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
    ],
  },
];

export const reference: DocSet[] = [
  {icon: 'code', title: 'API reference', line: 'No pages yet.'},
  {icon: 'notes', title: 'Release notes', line: 'What changed in each release.', href: '/release-notes'},
  {icon: 'alert', title: 'Advisories', line: 'Security advisories.', href: '/advisories'},
  {icon: 'download', title: 'Downloads', line: 'Software and tools to download.', href: '/downloads'},
];
