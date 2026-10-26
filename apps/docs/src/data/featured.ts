/**
 * Explore Fortanix cards on the home page (ux-spec.md, Home).
 */
export type FeaturedIcon = 'ai' | 'key' | 'token' | 'chip' | 'folder' | 'atom';

export type FeaturedCard = {
  /** Shown above the title, on one line; "Armor" abbreviates "Fortanix Armor". */
  path: string;
  /** A solution (built on the products) or a product: the card's colour. */
  kind: 'solution' | 'product';
  icon: FeaturedIcon;
  title: string;
  line: string;
  tags: string[];
  /** A page in the docs tree. */
  href: string;
};

// TODO(verify): card copy and tags come from the N5 prototype; product
// claims (e.g. "HSM-backed", "REST API", "cloud scanning") need review.
export const featured: FeaturedCard[] = [
  {
    path: 'Solutions / Confidential AI',
    kind: 'solution',
    icon: 'ai',
    title: 'Confidential AI',
    line: 'Protect models and data while they run on GPUs.',
    tags: ['GPU attestation', 'model protection', 'Rafay'],
    href: '/solutions/confidential-ai/overview',
  },
  {
    path: 'Products / Armor / Data Security Manager',
    kind: 'product',
    icon: 'key',
    title: 'Key management',
    line: 'Generate, store and control keys with an HSM-backed KMS.',
    tags: ['KMS', 'HSM', 'BYOK', 'PKCS#11'],
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    path: 'Solutions / Tokenization',
    kind: 'solution',
    icon: 'token',
    title: 'Tokenization',
    line: 'Replace sensitive fields with format-preserving tokens.',
    tags: ['format-preserving', 'masking', 'REST API'],
    href: '/solutions/tokenization/overview',
  },
  {
    path: 'Products / Armor / Confidential Computing',
    kind: 'product',
    icon: 'chip',
    title: 'Confidential Computing',
    line: 'Verify workloads in TEEs before they get secrets.',
    tags: ['attestation', 'CoCo', 'Enclave OS'],
    href: '/products/fortanix-armor/confidential-computing/overview',
  },
  {
    path: 'Solutions / File system encryption',
    kind: 'solution',
    icon: 'folder',
    title: 'File system encryption',
    line: 'Encrypt files on Linux and Windows with keys in DSM.',
    tags: ['Linux', 'Windows', 'key rotation'],
    href: '/solutions/file-system-encryption/overview',
  },
  {
    path: 'Solutions / PQC readiness',
    kind: 'solution',
    icon: 'atom',
    title: 'PQC readiness',
    line: 'Find quantum-vulnerable cryptography across your estate.',
    tags: ['crypto inventory', 'cloud scanning'],
    href: '/solutions/pqc-readiness/overview',
  },
];

/** Shortcuts under the home page's search: the pages most people come for. */
export const quickLinks: {label: string; href: string}[] = [
  {label: 'Confidential AI', href: '/solutions/confidential-ai/overview'},
  {label: 'Enrol an Intel TDX node', href: '/products/fortanix-armor/confidential-computing/ccm/compute-nodes/enrol-an-intel-tdx-node'},
  {label: 'Set up DSM', href: '/solutions/confidential-ai/how-to-guides/day-0-plan-and-prepare/set-up-dsm'},
  {label: 'Support matrix', href: '/solutions/confidential-ai/support-matrix'},
];

/** Popular tasks on the home page: how-tos, with the section each is in. */
export const popularTasks: {title: string; section: string; href: string}[] = [
  {title: 'Create a group', section: 'Armor', href: '/products/fortanix-armor/platform/identity-and-access-management/create-a-group'},
  {title: 'Enrol an Intel TDX node', section: 'CCM', href: '/products/fortanix-armor/confidential-computing/ccm/compute-nodes/enrol-an-intel-tdx-node'},
  {title: 'Register an application', section: 'CCM', href: '/products/fortanix-armor/confidential-computing/ccm/applications/register-an-application'},
  {title: 'Encrypt an image with a key in DSM', section: 'Confidential Containers', href: '/products/fortanix-armor/confidential-computing/workload-runtimes/confidential-containers/encrypt-an-image'},
  {title: 'Set up DSM for the model key', section: 'Confidential AI', href: '/solutions/confidential-ai/how-to-guides/day-0-plan-and-prepare/set-up-dsm'},
  {title: 'Deploy and verify', section: 'Confidential AI', href: '/solutions/confidential-ai/how-to-guides/day-1-deploy/deploy-and-verify'},
];
