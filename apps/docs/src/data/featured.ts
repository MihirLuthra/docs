/**
 * Explore Fortanix cards on the home page (ux-spec.md, Home).
 */
export type FeaturedCard = {
  /** Shown above the title, on one line; "Armor" abbreviates "Fortanix Armor". */
  path: string;
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
    title: 'Confidential AI',
    line: 'Protect models and data while they run on GPUs.',
    tags: ['GPU attestation', 'model protection', 'Rafay'],
    href: '/solutions/confidential-ai/overview',
  },
  {
    path: 'Products / Armor / Data Security Manager',
    title: 'Key management',
    line: 'Generate, store and control keys with an HSM-backed KMS.',
    tags: ['KMS', 'HSM', 'BYOK', 'PKCS#11'],
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    path: 'Products / Armor / Confidential Computing',
    title: 'Confidential Computing',
    line: 'Verify workloads in TEEs before they get secrets.',
    tags: ['attestation', 'CoCo', 'Enclave OS'],
    href: '/products/fortanix-armor/confidential-computing/overview',
  },
];
