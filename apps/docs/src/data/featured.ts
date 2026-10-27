/**
 * The home page's directory (ux-spec.md, Home): where to start, each doc set
 * with its main pages, and reference pages. Every href is a page in the docs
 * tree (the build fails on a broken link).
 */
export type DocIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom' | 'compass' | 'notes' | 'alert' | 'download' | 'code';

/** A page in the directory. None while it has no pages yet: shown dimmed, not a link. */
export type DirLink = {label: string; href?: string; icon?: DocIcon};

/** A column of the directory: a heading, then its pages. */
export type DirSection = {icon: DocIcon; title: string; links: DirLink[]};

const CAI = '/solutions/confidential-ai';
const CC = '/products/fortanix-armor/confidential-computing';

export const directory: DirSection[] = [
  {
    icon: 'compass',
    title: 'Start here',
    links: [
      {label: 'What Fortanix does', href: '/fundamentals/what-fortanix-does'},
      {label: 'TEE technologies', href: '/fundamentals/concepts/tee-technologies/intel-sgx'},
    ],
  },
  {
    icon: 'ai',
    title: 'Confidential AI',
    links: [
      {label: 'Overview', href: `${CAI}/overview`},
      {label: 'Use cases', href: `${CAI}/use-cases/proprietary-model`},
      {label: 'Plan a deployment', href: `${CAI}/how-to-guides/day-0-plan-and-prepare/plan-a-deployment`},
      {label: 'Deploy and operate', href: `${CAI}/how-to-guides/overview`},
      {label: 'Support matrix', href: `${CAI}/support-matrix`},
    ],
  },
  {
    icon: 'chip',
    title: 'Confidential Computing',
    links: [
      {label: 'Overview', href: `${CC}/overview`},
      {label: 'CCM concepts', href: `${CC}/ccm/concepts`},
      {label: 'Enroll an Intel TDX node', href: `${CC}/ccm/compute-nodes/enroll-an-intel-tdx-node`},
      {label: 'Confidential Containers', href: `${CC}/workload-runtimes/confidential-containers/overview`},
      {label: 'Enclave OS', href: `${CC}/workload-runtimes/enclave-os/overview`},
    ],
  },
  {
    icon: 'key',
    title: 'Data protection',
    links: [
      {label: 'Data Security Manager', href: '/products/fortanix-armor/data-security-manager/overview'},
      {label: 'Tokenization', href: '/solutions/tokenization/overview'},
      {label: 'File system encryption', href: '/solutions/file-system-encryption/overview'},
      {label: 'PQC readiness', href: '/solutions/pqc-readiness/overview'},
    ],
  },
];

export const reference: DirLink[] = [
  {label: 'Release notes', href: '/release-notes', icon: 'notes'},
  {label: 'Advisories', href: '/advisories', icon: 'alert'},
  {label: 'Downloads', href: '/downloads', icon: 'download'},
  {label: 'API reference', icon: 'code'},
];
