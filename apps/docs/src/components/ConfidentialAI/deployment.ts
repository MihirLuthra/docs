// What happens in a Confidential AI deployment, step by step, for every
// scenario in scenarios.ts and both runtimes. One source for the
// DeploymentFlow diagram and the DeploymentSteps table on the end-to-end guides.
//
// Steps are written against roles. A scenario says which party holds each
// role, and the text, lanes and accounts follow from that. Each element of the
// diagram (a box, an account, an item in an account) names the step that brings
// it in, so the picture fills in as the steps go. Text shown to readers avoids
// colons, semicolons and dashes (style guide).

import { SCENARIOS, type Party, type RoleId, type Scenario } from "./scenarios";

export type Runtime = "cc" | "eos";
export const RUNTIMES: { id: Runtime; label: string; tab: string; summary: string }[] = [
  { id: "cc", label: "Confidential Containers", tab: "Confidential Containers", summary: "Kubernetes pods, one TEE per pod. The whole image is encrypted." },
  { id: "eos", label: "Enclave OS", tab: "Enclave OS", summary: "A converted container that starts its own TEE. The model files are encrypted." },
];

/** Text that differs by runtime. */
type V<T> = T | { cc: T; eos: T };
export const pick = <T,>(v: V<T>, rt: Runtime): T =>
  typeof v === "object" && v !== null && "cc" in (v as object) ? (v as { cc: T; eos: T })[rt] : (v as T);

export type PhaseId = "day0" | "day1" | "day2";
export const PHASES: { id: PhaseId; label: string; day: string }[] = [
  { id: "day0", label: "Day 0 · Plan and prepare", day: "0" },
  { id: "day1", label: "Day 1 · Deploy", day: "1" },
  { id: "day2", label: "Day 2 · Operate", day: "2" },
];

/** Day 2 operations. Add one here, with its steps below, and it appears in the picker. */
export type OperationId = "update-model" | "update-tcb";
export const OPERATIONS: { id: OperationId; label: string }[] = [
  { id: "update-model", label: "Model update" },
  { id: "update-tcb", label: "Workload TCB update" },
];

const GUIDES = "/solutions/confidential-ai/how-to-guides";

/** Who does a step. "builder" is the model owner, or the consumer for an open model. */
type Actor = RoleId | "builder" | "all";

export interface Context {
  scenario: Scenario;
  open: boolean; // open model, public weights, nothing to encrypt
  separate: boolean; // owner and consumer are different parties, linked by a shared workflow
  sameInfra: boolean; // the consumer runs its own infrastructure
  name: (actor: Exclude<Actor, "all">) => string; // "the model vendor"
  Name: (actor: Exclude<Actor, "all">) => string; // "The model vendor"
}

/** Where an arrow starts or ends. Accounts are "ccm:owner", "ccm:consumer", "dsm:owner". */
type End = "hub" | "build" | "registry" | "infra" | "clients" | "ccm:owner" | "ccm:consumer" | "dsm:owner";

interface StepDef {
  id: string;
  phase: PhaseId;
  op?: OperationId;
  actor: Actor;
  title: V<string>;
  from?: V<End | undefined>;
  to?: V<End | undefined>;
  carries?: V<string>;
  text: (c: Context, rt: Runtime) => string;
  task: string;
  runtimes?: Runtime[];
  when?: (c: Context) => boolean;
}

const model = (c: Context) => !c.open;
const separate = (c: Context) => c.separate;
const cc = (rt: Runtime) => rt === "cc";

const STEPS: StepDef[] = [
  // Day 0
  {
    id: "runtime", phase: "day0", actor: "all", title: "Choose the runtime",
    text: (_c, rt) => cc(rt)
      ? "The parties agree on Confidential Containers. The model runs in Kubernetes pods, each in its own TEE, on a cluster with the Confidential Containers runtime. The whole image is encrypted."
      : "The parties agree on Enclave OS. The model's image is converted into an Enclave OS container, which starts its own TEE wherever containers run. The model files are encrypted.",
    task: `${GUIDES}/day-0-plan-and-prepare/plan-a-deployment#choose-the-runtime`,
  },
  {
    id: "ccm-account", phase: "day0", actor: "builder", title: "Create a CCM account",
    to: "ccm:owner",
    text: (c) => c.separate
      ? `${c.Name("owner")} gets a Fortanix CCM account and creates a group in it. The application and its approved builds will belong to this account.`
      : `${c.Name("builder")} gets a Fortanix CCM account and creates a group in it, such as model-serving. The application, the infrastructure and the workload's certificates will belong to this account.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-ccm#create-a-group`,
  },
  {
    id: "register-app", phase: "day0", actor: "builder", title: "Add the application",
    to: "ccm:owner",
    text: (c) => `${c.Name("builder")} adds the application model-server in CCM, with its certificate domain, such as model.northwind.example. CCM gives it an application ID.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-ccm#add-the-application`,
  },
  {
    id: "dsm-account", phase: "day0", actor: "owner", title: "Create a DSM account",
    to: "dsm:owner", when: model,
    text: (c) => `${c.Name("owner")} gets a Fortanix DSM account and creates a group for the model, such as model-keys. The model's key will never leave it.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-dsm`,
  },
  {
    id: "enc-app", phase: "day0", actor: "owner", title: "Create the encryption app",
    to: "dsm:owner", when: model,
    text: (c) => `${c.Name("owner")} creates an app with an API key in the group. It is used to encrypt the model, and its API key stays with the people who do that.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-dsm`,
  },
  {
    id: "ccm-consumer-account", phase: "day0", actor: "consumer", title: "Create a CCM account",
    to: "ccm:consumer", when: separate,
    text: (c) => `${c.Name("consumer")} gets its own Fortanix CCM account and creates a group in it, such as model-serving. The infrastructure and the workload's certificates will belong to this account.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-ccm#create-the-consumers-group`,
  },
  {
    id: "zone-ca", phase: "day0", actor: "consumer", title: "Share the zone CA",
    from: "ccm:consumer", to: "dsm:owner", carries: "Zone CA certificate", when: model,
    text: (c) => `${c.Name("consumer")} downloads the zone CA certificate of its CCM account${c.separate ? ` and sends it to ${c.name("owner")}` : ""}. DSM will trust workload certificates from this CA, and only with the application's fortanix.cloud name.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-ccm#share-the-zone-ca`,
  },
  {
    id: "trust-app", phase: "day0", actor: "owner", title: "Create the Trusted CA app",
    to: "dsm:owner", when: model,
    text: (c) => `${c.Name("owner")} creates the app the workload authenticates as. It trusts the zone CA of ${c.name("consumer")} and expects the DNS name <application ID>.app.fortanix.cloud, from the application model-server. CCM puts that name in a certificate only after verifying the workload's attestation.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-dsm#create-the-trusted-ca-app`,
  },
  {
    id: "weights", phase: "day0", actor: "consumer", title: "Get the public weights",
    from: "hub", to: "build", carries: "Public weights", when: (c) => c.open,
    text: (c) => `${c.Name("consumer")} downloads the open model to its build machine. The weights are public, so there is nothing to encrypt.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#build-and-push-the-image`,
  },
  {
    id: "encrypt", phase: "day0", actor: "owner", title: "Encrypt the model", when: model,
    from: { cc: "build", eos: "dsm:owner" }, to: { cc: "dsm:owner", eos: "build" },
    carries: { cc: "Layer keys to wrap", eos: "Public key" },
    text: (c, rt) => cc(rt)
      ? `On the build machine, ${c.name("owner")} encrypts every layer of the image, model included, with its own key. DSM wraps each layer key with a key encryption key that never leaves DSM.`
      : `${c.Name("owner")} creates the model key in DSM and encrypts the model files with it on the build machine. With sq-dsm, only the public part leaves DSM. Any tool that keeps the key in DSM works.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#encrypt-the-model`,
  },
  {
    id: "push", phase: "day0", actor: "builder", title: { cc: "Push the image", eos: "Convert and push the image" },
    from: "build", to: "registry", carries: { cc: "Encrypted image", eos: "Converted image" },
    text: (c, rt) => cc(rt)
      ? `${c.Name("builder")} pushes the ${c.open ? "image" : "encrypted image"}. ${c.open ? "" : "Only ciphertext of the model leaves the build machine."}`.trim()
      : `${c.Name("builder")} runs the Enclave OS converter, which turns the image into an Enclave OS container, pushes it, and reports its measurements. The converted container is what runs.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#build-and-push-the-image`,
  },
  {
    id: "measure", phase: "day0", actor: "builder", title: "Register the measurements",
    from: "build", to: "ccm:owner", carries: "Measurements",
    text: (c, rt) => `${c.Name("builder")} takes the workload's measurements${cc(rt) ? "" : " from the converter"} and adds them to the application model-server in CCM as build 1.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#add-the-build`,
  },
  {
    id: "approve", phase: "day0", actor: "builder", title: "Approve the build",
    to: "ccm:owner",
    text: (c) => `An administrator of ${c.name("builder")} approves build 1 and its domain on Tasks. Until then, CCM issues no certificate for it.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#approve-the-build-and-the-domain`,
  },
  {
    id: "config", phase: "day0", actor: "builder", title: "Add the application configuration",
    to: "ccm:owner",
    text: (c) => `${c.Name("builder")} adds an application configuration for build 1 in CCM, even with no settings. It holds the workload's runtime configuration, kept in CCM rather than on the host, and the workflow runs the build with it.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#add-an-application-configuration`,
  },
  {
    id: "prepare", phase: "day0", actor: "infra", title: "Prepare the infrastructure",
    to: "infra",
    text: (c) => `${c.Name("infra")} turns on the TEE in each host's BIOS, for example Intel TDX, registers the platform with the CPU vendor, and sets the NVIDIA GPUs up for confidential computing.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-infrastructure#prepare-the-hosts`,
  },
  {
    id: "join-token", phase: "day0", actor: "consumer", title: "Get a join token",
    from: "ccm:consumer", to: "infra", carries: "Join token",
    text: (c) => `${c.Name("consumer")} copies a join token from Enroll Compute Node. ${c.sameInfra ? "It keeps it for its own hosts." : `It sends it to ${c.name("infra")} over a channel it trusts. Anyone with the token can enroll a host in the account.`}`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-infrastructure#get-the-join-token`,
  },
  {
    id: "enroll", phase: "day0", actor: "infra", title: "Enroll the hosts",
    from: "infra", to: "ccm:consumer", carries: "Node attestation",
    text: (c) => `${c.Name("infra")} installs the node agent with the join token. The agent attests each host, and the hosts appear as compute nodes in the CCM account of ${c.name("consumer")}.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-infrastructure#enroll-the-hosts`,
  },
  {
    id: "install", phase: "day0", actor: "infra", title: "Install the runtime",
    to: "infra",
    text: (c, rt) => cc(rt)
      ? `${c.Name("infra")} installs the NVIDIA GPU Operator and the Confidential Containers runtime on the Kubernetes cluster. The runtime brings the guest firmware and kernel that every pod's TEE boots.`
      : `${c.Name("infra")} binds the GPUs to vfio-pci so they can be passed through. Nothing else is installed for Enclave OS, since each converted container brings its own TEE.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-infrastructure#install-the-runtime`,
  },
  // Day 1
  {
    id: "collaborate", phase: "day1", actor: "owner", title: "Link the CCM accounts",
    from: "ccm:owner", to: "ccm:consumer", carries: "Collaboration token", when: separate,
    text: (c) => `${c.Name("owner")} generates a collaboration token and sends it to ${c.name("consumer")}, who accepts it. Their groups become collaborating groups.`,
    task: `${GUIDES}/day-1-deploy/share-the-model`,
  },
  {
    id: "workflow", phase: "day1", actor: "consumer", title: "Approve the shared workflow",
    from: "ccm:consumer", to: "ccm:owner", carries: "Workflow", when: separate,
    text: (c) => `${c.Name("consumer")} creates a workflow with a placeholder for the application of ${c.name("owner")}. The owner fills it in and approves first, then the consumer approves.`,
    task: `${GUIDES}/day-1-deploy/share-the-model`,
  },
  {
    id: "own-workflow", phase: "day1", actor: "consumer", title: "Approve a workflow",
    to: "ccm:consumer", when: (c) => !c.separate,
    text: (c) => `${c.Name("consumer")} creates a workflow that runs build 1 of model-server with its application configuration, and approves it. The workload passes the configuration's ID when it starts.`,
    task: "/products/fortanix-armor/confidential-computing/ccm/workflows/create-a-workflow",
  },
  {
    id: "deploy", phase: "day1", actor: "consumer", title: "Deploy the workload",
    from: "registry", to: "infra", carries: { cc: "Encrypted image", eos: "Converted image" },
    text: (c, rt) => cc(rt)
      ? `${c.Name("consumer")} deploys the pod with the InitData it was measured with. The image is pulled inside the TEE${c.open ? "." : ", still encrypted."}`
      : `${c.Name("consumer")} runs the converted container with the runtime configuration from CCM and the GPUs to pass through. It starts its own TEE.${c.open ? "" : " The model files are still encrypted."}`,
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#deploy-the-workload`,
  },
  {
    id: "evidence", phase: "day1", actor: "consumer", title: "Attest to CCM",
    from: "infra", to: "ccm:consumer", carries: "Evidence",
    text: () => "Inside the TEE, the workload generates a key pair and sends CCM a certificate signing request for it, with composite attestation evidence from the CPU TEE and each GPU. CCM checks the hardware and compares the measurements with the approved build.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "certificate", phase: "day1", actor: "consumer", title: "Get the certificate",
    from: "ccm:consumer", to: "infra", carries: "Certificate",
    text: () => "CCM verifies the composite attestation of the CPU TEE and the GPUs, then issues the workload a TLS certificate for its approved domain. A workload with other measurements gets none.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "key", phase: "day1", actor: "owner", title: "Release the key", when: model,
    from: "dsm:owner", to: "infra", carries: { cc: "Layer keys", eos: "Model key" },
    text: (_c, rt) => cc(rt)
      ? "The workload authenticates to DSM over mutual TLS with its certificate. DSM checks that the trusted zone CA issued it, with the application's fortanix.cloud name, and unwraps the layer keys into the TEE. The layers are decrypted before the container starts."
      : "The workload authenticates to DSM over mutual TLS with its certificate. DSM checks that the trusted zone CA issued it, with the application's fortanix.cloud name, and the workload decrypts the model files inside the TEE as it starts.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "clients", phase: "day1", actor: "user", title: "Connect clients",
    from: "clients", to: "infra", carries: "TLS",
    text: (c) => `End users connect over TLS to model.northwind.example. Only a client that trusts the zone CA of ${c.name("consumer")} can tell from the certificate that it reached the attested workload, for example an application inside that organization. End users outside it can't trust that zone CA, so for them the certificate proves nothing about attestation.`,
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#connect-clients`,
  },

  // Day 2, model update
  {
    id: "new-image", phase: "day2", op: "update-model", actor: "builder", title: "Build the new version",
    from: "build", to: "registry", carries: { cc: "New image", eos: "New converted image" },
    text: (c, rt) => `${c.Name("builder")} ${c.open ? "builds an image with the new weights" : "encrypts the new model version as on day 0"}${cc(rt) ? "" : " and converts it again"}, then pushes it.`,
    task: `${GUIDES}/day-2-operate/update-the-model#build-the-new-version`,
  },
  {
    id: "new-build", phase: "day2", op: "update-model", actor: "builder", title: "Register and approve build 2",
    from: "build", to: "ccm:owner", carries: "New measurements",
    text: (c, rt) => cc(rt)
      ? `The new image changes the pod's InitData, and so its MRCONFIGID on Intel TDX (HOSTDATA on AMD SEV-SNP). ${c.Name("builder")} takes the measurements again, registers them as build 2 and approves it.`
      : `A new converted image has new measurements. ${c.Name("builder")} registers them as build 2 and approves it.`,
    task: `${GUIDES}/day-2-operate/update-the-model#register-and-approve-the-build`,
  },
  {
    id: "new-workflow", phase: "day2", op: "update-model", actor: "owner", title: "Approve a new workflow version",
    from: "ccm:owner", to: "ccm:consumer", carries: "Workflow version", when: separate,
    text: () => "An approved workflow can't be edited. Edit as draft creates a new version, which replaces the old one once both sides approve it.",
    task: `${GUIDES}/day-2-operate/update-the-model#update-the-shared-workflow`,
  },
  {
    id: "redeploy", phase: "day2", op: "update-model", actor: "consumer", title: "Redeploy",
    from: "registry", to: "infra", carries: "New image",
    text: (c) => `${c.Name("consumer")} redeploys. The workload attests again and gets its certificate${c.open ? "" : " and key"} as on day 1.`,
    task: `${GUIDES}/day-2-operate/update-the-model#redeploy`,
  },

  // Day 2, workload TCB update
  {
    id: "release", phase: "day2", op: "update-tcb", actor: "infra", title: "A new runtime release",
    to: { cc: "infra", eos: "build" },
    text: (_c, rt) => cc(rt)
      ? "A new Confidential Containers release, for example with a kernel patch, changes the guest firmware, kernel or root filesystem of every pod. So it changes every workload's measurements."
      : "A new Enclave OS converter brings a new TEE image inside each converted container. Every image is converted again, which changes its measurements.",
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb`,
  },
  {
    id: "remeasure", phase: "day2", op: "update-tcb", actor: "builder", title: "Take measurements again",
    from: "build", to: "ccm:owner", carries: "New measurements",
    text: (c, rt) => cc(rt)
      ? `${c.Name("builder")} takes the measurements again for the new release and registers them as build 2.`
      : `${c.Name("builder")} converts the image with the new converter, pushes it, and registers its measurements as build 2.`,
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#take-measurements-again`,
  },
  {
    id: "reapprove", phase: "day2", op: "update-tcb", actor: "builder", title: "Approve before the upgrade",
    to: "ccm:owner",
    text: () => "Build 2 is approved before anything is upgraded, so no workload is left without a certificate.",
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#approve-before-the-upgrade`,
  },
  {
    id: "upgrade", phase: "day2", op: "update-tcb", actor: "infra", title: { cc: "Upgrade the runtime", eos: "Run the new container" },
    from: { cc: undefined, eos: "registry" }, to: "infra", carries: { cc: "", eos: "Converted image" },
    text: (c, rt) => cc(rt)
      ? `${c.Name("infra")} upgrades the runtime on the cluster and the workloads restart. They attest with the new measurements and get their certificates${c.open ? "" : " and keys"} as before.`
      : `The newly converted container replaces the old one. It attests with the new measurements and gets its certificate${c.open ? "" : " and key"} as before.`,
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#upgrade-the-infrastructure`,
  },
];

// ---------- What the diagram shows ----------

/** A step that brings something in: "step", or "step@rt" when only in one runtime. */
type At = string;

export interface Item {
  id: string;
  label: V<string>;
  at: At[];
  done?: At[]; // steps that approve it (shows a tick)
}

/** An account a party holds in a Fortanix service, drawn in the party's territory. */
export interface Account {
  id: "ccm:owner" | "ccm:consumer" | "dsm:owner";
  service: "ccm" | "dsm";
  at: At[];
  items: Item[];
}

export type AssetKind = "hub" | "build" | "registry" | "infra" | "clients";

/** Something a party runs itself. */
export interface Asset {
  id: AssetKind;
  name: string;
  detail: V<string>;
  at: At[];
  tee?: string; // step that starts the workload in it
}

/** A party and what it holds. */
export interface Territory {
  party: Party;
  roles: RoleId[];
  accounts: Account[];
  assets: Asset[];
}

export interface Step {
  id: string;
  phase: PhaseId;
  op?: OperationId;
  actor: RoleId | "all";
  party?: Party;
  title: string;
  from?: string;
  to?: string;
  carries?: string;
  text: string;
  task: string;
}

export interface Deployment {
  scenario: Scenario;
  context: Context;
  territories: Territory[];
  steps: Record<Runtime, Step[]>;
  accounts: string[];
}

/** Has something brought in at one of these steps happened, in this runtime? */
export const reached = (at: At[], seen: Set<string>, rt: Runtime) =>
  at.some((a) => {
    const [step, only] = a.split("@");
    return seen.has(step) && (!only || only === rt);
  });

const partyOf = (s: Scenario, role: RoleId) => s.parties.find((p) => p.roles.includes(role))!;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function deployment(scenarioId: string): Deployment {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Unknown Confidential AI scenario "${scenarioId}"`);
  const owner = partyOf(scenario, "owner");
  const consumer = partyOf(scenario, "consumer");
  const infra = partyOf(scenario, "infra");
  const open = scenario.useCase === "open-source";
  const builder = open ? consumer : owner;
  const isSeparate = !open && owner !== consumer;
  const actorParty = (a: Exclude<Actor, "all">) => (a === "builder" ? builder : partyOf(scenario, a));
  const context: Context = {
    scenario,
    open,
    separate: isSeparate,
    sameInfra: infra === consumer,
    name: (a) => actorParty(a).phrase,
    Name: (a) => cap(actorParty(a).phrase),
  };

  // The owner's CCM account is the consumer's when one party is both, and the builder's for an open model.
  const ccmOwner = isSeparate ? "ccm:owner" : "ccm:consumer";
  const resolve = (e?: End) => (e === "ccm:owner" ? ccmOwner : e);

  const builds: Item[] = [
    { id: "app", label: "Application model-server", at: ["register-app"] },
    { id: "b1", label: "Build 1", at: ["measure"], done: ["approve"] },
    { id: "b2", label: "Build 2", at: ["new-build", "remeasure"], done: ["new-build", "reapprove"] },
  ];

  const territories: Territory[] = scenario.parties.map((party) => {
    const accounts: Account[] = [];
    const assets: Asset[] = [];
    if (party === owner && !open) {
      accounts.push({
        id: "dsm:owner", service: "dsm", at: ["dsm-account"],
        items: [
          { id: "group", label: "Group model-keys", at: ["dsm-account"] },
          { id: "enc", label: "Encryption app", at: ["enc-app"] },
          { id: "key", label: { cc: "Key encryption key", eos: "Model key" }, at: ["encrypt"] },
          { id: "apps", label: "Trusted CA app", at: ["trust-app"] },
        ],
      });
    }
    if (party === owner && isSeparate) accounts.push({ id: "ccm:owner", service: "ccm", at: ["ccm-account"], items: builds });
    if (party === consumer) {
      const created = isSeparate ? "ccm-consumer-account" : "ccm-account";
      accounts.push({
        id: "ccm:consumer", service: "ccm", at: [created],
        items: [
          { id: "group", label: "Group model-serving", at: [created] },
          { id: "nodes", label: "Compute nodes", at: ["enroll"] },
          ...(isSeparate
            ? [
                { id: "link", label: "Collaborating group", at: ["collaborate"] },
                { id: "wf", label: "Shared workflow", at: ["workflow"], done: ["workflow"] },
              ]
            : builds),
        ],
      });
    }
    if (party === owner && open) assets.push({ id: "hub", name: "Model hub", detail: "Public weights", at: ["weights"] });
    if (party === builder) {
      assets.push({ id: "build", name: "Build machine", detail: { cc: open ? "Docker" : "coco-keyprovider", eos: open ? "The converter" : "sq-dsm, the converter" }, at: [open ? "weights" : "encrypt"] });
      assets.push({ id: "registry", name: "Registry", detail: { cc: open ? "Image" : "Encrypted image", eos: "Converted image" }, at: ["push"] });
    }
    if (party === infra) {
      assets.push({ id: "infra", name: "Infrastructure", detail: { cc: "Kubernetes on TEE hosts", eos: "TEE hosts running containers" }, at: ["prepare"], tee: "deploy" });
    }
    if (party.roles.includes("user")) assets.push({ id: "clients", name: "Clients", detail: "model.northwind.example", at: ["clients"] });
    return { party, roles: party.roles, accounts, assets };
  });

  const build = (rt: Runtime): Step[] =>
    STEPS.filter((d) => (!d.when || d.when(context)) && (!d.runtimes || d.runtimes.includes(rt))).map((d) => {
      const party = d.actor === "all" ? undefined : actorParty(d.actor);
      const carries = d.carries === undefined ? undefined : pick(d.carries, rt) || undefined;
      return {
        id: d.id,
        phase: d.phase,
        op: d.op,
        actor: d.actor === "all" ? "all" : d.actor === "builder" ? (open ? "consumer" : "owner") : d.actor,
        party,
        title: pick(d.title, rt),
        from: resolve(d.from === undefined ? undefined : pick(d.from, rt)),
        to: resolve(d.to === undefined ? undefined : pick(d.to, rt)),
        carries,
        text: d.text(context, rt),
        task: d.task,
      };
    });

  const accounts: string[] = [];
  if (open) {
    accounts.push(`${cap(consumer.phrase)} has one CCM account. It registers the workload there, and its infrastructure is enrolled there too. The weights are public, so no DSM account is needed for the model.`);
  } else if (isSeparate) {
    accounts.push(`${cap(owner.phrase)} has a DSM account for the model key and a CCM account for the application. ${cap(consumer.phrase)} has its own CCM account, where ${infra === consumer ? "its" : `the ${infra.name}'s`} infrastructure is enrolled. A shared workflow links the two CCM accounts.`);
  } else {
    accounts.push(`${cap(owner.phrase)} has a DSM account for the model key and one CCM account for the application${infra === owner ? " and its infrastructure" : `, where the infrastructure of ${infra.phrase} is enrolled`}. No shared workflow is needed.`);
  }

  return { scenario, context, territories, steps: { cc: build("cc"), eos: build("eos") }, accounts };
}
