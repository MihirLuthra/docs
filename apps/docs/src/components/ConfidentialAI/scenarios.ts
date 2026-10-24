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
    cares: "The model weights are not copied or leaked.",
  },
  consumer: {
    name: "Model consumer",
    short: "Consumer",
    cares: "Their prompts and data stay protected when the model runs on servers or GPUs they do not own.",
  },
  infra: {
    name: "Infrastructure provider",
    short: "Infra",
    cares: "Running the workload without having access to what is inside it.",
  },
  user: {
    name: "End user",
    short: "End user",
    cares: "Their requests to the AI application stay private.",
  },
};

export type UseCaseId = "proprietary" | "in-house" | "open-source";
export type KeyRelease = "required" | "recommended" | "optional";

export interface Party {
  name: string;
  roles: RoleId[]; // must be adjacent in ROLE_ORDER
  note?: string;
}

export interface Scenario {
  id: string;
  useCase: UseCaseId;
  label: string; // short label for the picker
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
    label: "Vendor to customer",
    summary: "A model vendor deploys its model on a customer's own infrastructure.",
    parties: [
      { name: "Model vendor", roles: ["owner"] },
      { name: "Customer", roles: ["consumer", "infra"] },
      { name: "Customer's users", roles: ["user"] },
    ],
    protects: [
      "The model weights, from the customer that runs the infrastructure.",
      "The customer's data, from the host software and its administrators.",
    ],
    keyRelease: "required",
    keyNote: "The vendor keeps the model encryption key in DSM. DSM releases it into the TEE only for the vendor's approved model.",
  },
  {
    id: "vendor-ncp-enterprise",
    useCase: "proprietary",
    label: "Vendor, NCP, enterprise",
    summary: "A model vendor's model runs on an NCP's GPUs and is used by an enterprise.",
    parties: [
      { name: "Model vendor", roles: ["owner"] },
      { name: "Enterprise", roles: ["consumer"] },
      { name: "NCP", roles: ["infra"] },
      { name: "Enterprise's users", roles: ["user"] },
    ],
    protects: [
      "The model weights, from the NCP and from the enterprise.",
      "The enterprise's prompts and data, from the NCP's hosts and administrators.",
    ],
    keyRelease: "required",
    keyNote: "The vendor keeps the model encryption key in DSM. DSM releases it into the TEE only for the approved model, so neither the NCP nor the enterprise can get it.",
  },
  {
    id: "inhouse-own",
    useCase: "in-house",
    label: "Own infrastructure",
    summary: "An enterprise runs its own model on its own GPUs.",
    parties: [
      { name: "Enterprise", roles: ["owner", "consumer", "infra"] },
      { name: "Employees or customers", roles: ["user"] },
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
    label: "Cloud or NCP GPUs",
    summary: "An organization runs its own model on GPUs from a cloud or an NCP. A model vendor serving its own model as a service fits here too.",
    parties: [
      { name: "Enterprise or model vendor", roles: ["owner", "consumer"] },
      { name: "Cloud or NCP", roles: ["infra"] },
      { name: "Users", roles: ["user"] },
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
    summary: "An enterprise runs a public open-source model on an NCP's GPUs.",
    parties: [
      { name: "Open-source project", roles: ["owner"], note: "Weights are public" },
      { name: "Enterprise", roles: ["consumer"] },
      { name: "NCP", roles: ["infra"] },
      { name: "Enterprise's users", roles: ["user"] },
    ],
    protects: [
      "The enterprise's prompts and data, from the NCP's hosts and administrators.",
      "Proof, through attestation, that the expected model and code are running.",
    ],
    keyRelease: "optional",
    keyNote: "The weights are public, so there is no model encryption key. The workload can still get a key from DSM whenever it needs one, for example to open encrypted storage.",
  },
  {
    id: "oss-own",
    useCase: "open-source",
    label: "Open model on own GPUs",
    summary: "An enterprise runs a public open-source model on its own GPUs.",
    parties: [
      { name: "Open-source project", roles: ["owner"], note: "Weights are public" },
      { name: "Enterprise", roles: ["consumer", "infra"] },
      { name: "Employees or customers", roles: ["user"] },
    ],
    protects: [
      "The enterprise's prompts and data, from infrastructure administrators and compromised host software.",
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
