// Confidential AI deployment scenarios.
// One source of truth for the RolesExplorer diagram and for the use-case pages.
//
// A scenario says which real-world party holds which roles. One party can hold several
// roles. Roles are drawn left to right in ROLE_ORDER, so a party may only hold roles
// that sit next to each other in that order.

export type RoleId = "owner" | "consumer" | "infra" | "user";

export const ROLE_ORDER: RoleId[] = ["owner", "consumer", "infra", "user"];

export const ROLES: Record<RoleId, { name: string; short: string; cares: string }> = {
  owner: {
    name: "Model owner",
    short: "Owner",
    cares: "Wants the model weights never copied or leaked.",
  },
  consumer: {
    name: "Model consumer",
    short: "Consumer",
    cares: "Wants its prompts and data private, even on infrastructure it does not own.",
  },
  infra: {
    name: "Infrastructure provider",
    short: "Infra",
    cares: "Runs the workload without seeing what is inside it.",
  },
  user: {
    name: "End user",
    short: "End user",
    cares: "Wants its requests to stay private.",
  },
};

export type UseCaseId = "proprietary" | "in-house" | "open-source";
export type KeyRelease = "required" | "recommended" | "optional";

export interface Party {
  name: string;
  phrase: string; // the party inside a sentence: "the model vendor"
  roles: RoleId[]; // must be adjacent in ROLE_ORDER
  note?: string;
}

export interface Scenario {
  id: string;
  useCase: UseCaseId;
  label: string; // short label for the picker
  guide: string; // the end-to-end guide's slug
  summary: string; // one sentence
  parties: Party[];
  protects: string[]; // what confidential computing protects, and from whom
  keyRelease: KeyRelease;
  keyNote: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "vendor-direct",
    useCase: "proprietary",
    label: "Vendor to its customer",
    guide: "vendor-to-customer",
    summary: "A model vendor deploys its model on the servers of one of its customers.",
    parties: [
      { name: "Model vendor", phrase: "the model vendor", roles: ["owner"] },
      { name: "Vendor's customer", phrase: "the vendor's customer", roles: ["consumer", "infra"] },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "The model weights, from the vendor's customer, who runs the servers.",
      "The customer's data, from the host software and its administrators.",
    ],
    keyRelease: "required",
    keyNote: "The vendor keeps the model encryption key in DSM. DSM releases it into the TEE only for the vendor's approved model.",
  },
  {
    id: "vendor-ncp-enterprise",
    useCase: "proprietary",
    label: "Vendor to its customer, on an NCP",
    guide: "vendor-ncp-enterprise",
    summary: "A model vendor's customer runs the vendor's model on servers rented from an NCP.",
    parties: [
      { name: "Model vendor", phrase: "the model vendor", roles: ["owner"] },
      { name: "Vendor's customer", phrase: "the vendor's customer", roles: ["consumer"] },
      { name: "NCP", phrase: "the NCP", roles: ["infra"], note: "GPU cloud provider" },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "The model weights, from the NCP and from the vendor's customer.",
      "The customer's prompts and data, from the NCP's hosts and administrators.",
    ],
    keyRelease: "required",
    keyNote: "The vendor keeps the model encryption key in DSM. DSM releases it into the TEE only for the approved model, so neither the NCP nor the enterprise can get it.",
  },
  {
    id: "inhouse-own",
    useCase: "in-house",
    label: "Own infrastructure",
    guide: "in-house-own-infrastructure",
    summary: "Your organization runs its own model on its own servers.",
    parties: [
      { name: "Your organization", phrase: "your organization", roles: ["owner", "consumer", "infra"] },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "The model weights and the data, from infrastructure administrators and compromised host software.",
    ],
    keyRelease: "recommended",
    keyNote: "Keeping the weights encrypted means only the approved model workload can ever read them. Storage, backups and other hosts hold only ciphertext.",
  },
  {
    id: "inhouse-cloud",
    useCase: "in-house",
    label: "Cloud or NCP servers",
    guide: "in-house-cloud-or-ncp",
    summary: "Your organization runs its own model on servers from a cloud or an NCP. A model vendor serving its own model as a service fits here too.",
    parties: [
      { name: "Your organization", phrase: "your organization", roles: ["owner", "consumer"] },
      { name: "Cloud or NCP", phrase: "the cloud or NCP", roles: ["infra"] },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "The model weights and the data, from the cloud or NCP's hosts and administrators.",
    ],
    keyRelease: "required",
    keyNote: "The weights stay encrypted, so the cloud or NCP only ever stores ciphertext. DSM releases the key into the TEE only for the approved model.",
  },
  {
    id: "oss-ncp",
    useCase: "open-source",
    label: "Open model on an NCP",
    guide: "open-model-on-ncp",
    summary: "Your organization runs a public open-source model on servers rented from an NCP.",
    parties: [
      { name: "Open-source project", phrase: "the open-source project", roles: ["owner"], note: "Weights are public" },
      { name: "Your organization", phrase: "your organization", roles: ["consumer"] },
      { name: "NCP", phrase: "the NCP", roles: ["infra"], note: "GPU cloud provider" },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "Your prompts and data, from the NCP's hosts and administrators.",
      "Proof, through attestation, that the expected model and code are running.",
    ],
    keyRelease: "optional",
    keyNote: "The weights are public, so there is no model encryption key. The workload can still get a key from DSM whenever it needs one, for example to open encrypted storage.",
  },
  {
    id: "oss-own",
    useCase: "open-source",
    label: "Open model on own servers",
    guide: "open-model-on-own-gpus",
    summary: "Your organization runs a public open-source model on its own servers.",
    parties: [
      { name: "Open-source project", phrase: "the open-source project", roles: ["owner"], note: "Weights are public" },
      { name: "Your organization", phrase: "your organization", roles: ["consumer", "infra"] },
      { name: "End users", phrase: "the end users", roles: ["user"] },
    ],
    protects: [
      "Your prompts and data, from infrastructure administrators and compromised host software.",
      "Proof, through attestation, that the expected model and code are running.",
    ],
    keyRelease: "optional",
    keyNote: "The weights are public, so there is no model encryption key. The workload can still get a key from DSM whenever it needs one, for example to open encrypted storage.",
  },
];

export const USE_CASE_NAMES: Record<UseCaseId, string> = {
  proprietary: "Proprietary model",
  "in-house": "In-house model",
  "open-source": "Open-source model",
};

export const KEY_RELEASE_LABEL: Record<KeyRelease, string> = {
  required: "Required",
  recommended: "Recommended",
  optional: "Optional",
};
