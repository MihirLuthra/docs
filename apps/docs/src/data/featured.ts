/**
 * Explore Fortanix cards on the home page (ux-spec.md, Home). The path shown
 * on each card comes from the docs tree, so only the link is given here.
 */
export type FeaturedCard = {
  title: string;
  line: string;
  tags: string[];
  /** A page in the docs tree; the card's path is its folder path. */
  href: string;
};

// TODO(verify): card copy and tags come from the N5 prototype; product
// claims (e.g. "HSM-backed", "REST API", "cloud scanning") need review.
export const featured: FeaturedCard[] = [
  {
    title: 'Confidential AI',
    line: 'Protect models and data while they run on GPUs.',
    tags: ['GPU attestation', 'model protection', 'Rafay'],
    href: '/solutions/confidential-ai/overview',
  },
  {
    title: 'Key management',
    line: 'Generate, store and control keys with an HSM-backed KMS.',
    tags: ['KMS', 'HSM', 'BYOK', 'PKCS#11'],
    href: '/products/fortanix-armor/data-security-manager/overview',
  },
  {
    title: 'Tokenization',
    line: 'Replace sensitive fields with format-preserving tokens.',
    tags: ['format-preserving', 'masking', 'REST API'],
    href: '/solutions/tokenization/overview',
  },
  {
    title: 'Confidential Computing',
    line: 'Verify workloads in TEEs before they get secrets.',
    tags: ['attestation', 'CoCo', 'Enclave OS'],
    href: '/products/fortanix-armor/confidential-computing/overview',
  },
  {
    title: 'File system encryption',
    line: 'Encrypt files on Linux and Windows with keys in DSM.',
    tags: ['Linux', 'Windows', 'key rotation'],
    href: '/solutions/file-system-encryption/overview',
  },
  {
    title: 'PQC readiness',
    line: 'Find quantum-vulnerable cryptography across your estate.',
    tags: ['crypto inventory', 'cloud scanning'],
    href: '/solutions/pqc-readiness/overview',
  },
];
