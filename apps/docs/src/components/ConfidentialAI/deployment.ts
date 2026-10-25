// What happens in a Confidential AI deployment, step by step, for every
// scenario in scenarios.ts. One source for the DeploymentFlow diagram and the
// DeploymentSteps table on the end-to-end guides.
//
// Steps are written against roles. A scenario says which party holds each
// role, and the text and lanes follow from that. Text shown to readers avoids
// colons, semicolons and dashes (style guide).

import { SCENARIOS, type Party, type RoleId, type Scenario } from "./scenarios";

export type EnvId = "weights" | "build" | "registry" | "dsm" | "ccm" | "ccmOwner" | "ccmConsumer" | "servers" | "clients";
export type PhaseId = "day0" | "day1" | "update-model" | "update-tcb";

export const PHASES: { id: PhaseId; label: string; day: string }[] = [
  { id: "day0", label: "Day 0 · Prepare", day: "0" },
  { id: "day1", label: "Day 1 · Deploy", day: "1" },
  { id: "update-model", label: "Day 2 · Model update", day: "2" },
  { id: "update-tcb", label: "Day 2 · Workload TCB update", day: "2" },
];

const GUIDES = "/solutions/confidential-ai/how-to-guides";

/** Who does a step. "builder" is the model owner, or the consumer for an open model. */
type Actor = RoleId | "builder";

export interface Context {
  scenario: Scenario;
  open: boolean; // open model: public weights, nothing to encrypt
  separate: boolean; // owner and consumer are different parties, so a shared workflow links them
  sameInfra: boolean; // the consumer runs its own servers
  name: (actor: Actor) => string; // "the model vendor"
  Name: (actor: Actor) => string; // "The model vendor"
}

interface StepDef {
  id: string;
  phase: PhaseId;
  actor: Actor;
  title: string;
  from?: EnvId;
  to?: EnvId;
  carries?: string; // what moves along the arrow
  text: (c: Context) => string;
  task: string; // the how-to that does it
  when?: (c: Context) => boolean;
}

export interface Step {
  id: string;
  phase: PhaseId;
  actor: RoleId;
  party: Party;
  title: string;
  from?: string; // box ids, after ccmOwner and ccmConsumer resolve
  to?: string;
  carries?: string;
  text: string;
  task: string;
}

const model = (c: Context) => !c.open;
const separate = (c: Context) => c.separate;

const STEPS: StepDef[] = [
  // Day 0
  {
    id: "join-token", phase: "day0", actor: "consumer", title: "Get a join token",
    from: "ccmConsumer", to: "servers", carries: "Join token",
    text: (c) => `In its CCM account, ${c.name("consumer")} creates a group, such as llm-serving, and copies a join token from Enroll Compute Node. ${c.sameInfra ? "It keeps the token for its own servers." : `It sends the token to ${c.name("infra")} over a channel it trusts. Anyone with the token can enrol a server in the account.`}`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-servers#set-up-ccm`,
  },
  {
    id: "zone-ca", phase: "day0", actor: "consumer", title: "Share the zone CA",
    from: "ccmConsumer", to: "dsm", carries: "Zone CA certificate", when: model,
    text: (c) => `${c.Name("consumer")} downloads the zone CA certificate of its CCM account${c.separate ? ` and sends it to ${c.name("owner")}` : ""}. DSM will trust workload certificates signed by this CA, and no others.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-servers#set-up-ccm`,
  },
  {
    id: "prepare", phase: "day0", actor: "infra", title: "Prepare the servers",
    to: "servers",
    text: (c) => `${c.Name("infra")} enables Intel TDX in the BIOS, turns SMT off, registers each platform with Intel, and sets the NVIDIA GPUs up for confidential computing.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-servers#prepare-the-servers`,
  },
  {
    id: "enrol", phase: "day0", actor: "infra", title: "Enrol the servers",
    from: "servers", to: "ccmConsumer", carries: "Node attestation",
    text: (c) => `${c.Name("infra")} installs the node agent with the join token. The agent attests each server to CCM, and the servers appear under Compute nodes in the CCM account of ${c.name("consumer")}.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-servers#enrol-the-servers`,
  },
  {
    id: "runtime", phase: "day0", actor: "infra", title: "Install the runtime",
    to: "servers",
    text: (c) => `For Confidential Containers, ${c.name("infra")} installs the NVIDIA GPU Operator and the Confidential Containers runtime on the Kubernetes cluster. For Enclave OS, it binds the GPUs to vfio-pci.`,
    task: `${GUIDES}/day-0-plan-and-prepare/prepare-the-servers#install-the-runtime`,
  },
  {
    id: "dsm-apps", phase: "day0", actor: "owner", title: "Set up DSM",
    to: "dsm", when: model,
    text: (c) => `${c.Name("owner")} creates two apps in its DSM group. One authenticates with an API key and is used to encrypt. The other is the app the workload authenticates as. It trusts the zone CA and expects the workload's certificate domain, such as chat.northwind.example.`,
    task: `${GUIDES}/day-0-plan-and-prepare/set-up-dsm`,
  },
  {
    id: "weights", phase: "day0", actor: "consumer", title: "Get the public weights",
    from: "weights", to: "build", carries: "Public weights", when: (c) => c.open,
    text: (c) => `${c.Name("consumer")} downloads the open model's weights to its build machine. They are public, so there is nothing to encrypt.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#build-and-push-the-image`,
  },
  {
    id: "encrypt", phase: "day0", actor: "owner", title: "Encrypt the model",
    from: "build", to: "dsm", carries: "Wrap request", when: model,
    text: (c) => `On the build machine, ${c.name("owner")} encrypts the model with a key that stays in DSM. With Confidential Containers, every image layer is encrypted and DSM wraps each layer key with a key encryption key that never leaves DSM. With Enclave OS, the model files are encrypted with a key stored in DSM.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#encrypt-the-model`,
  },
  {
    id: "push", phase: "day0", actor: "builder", title: "Push the image",
    from: "build", to: "registry", carries: "Encrypted image",
    text: (c) => c.open
      ? `${c.Name("builder")} builds the inference image with the model and pushes it. For Enclave OS, it converts the image first, and the converted image is what runs.`
      : `${c.Name("builder")} pushes the image. The model inside it is ciphertext. For Enclave OS, the image is converted first, and the converted image is what runs.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#build-and-push-the-image`,
  },
  {
    id: "measure", phase: "day0", actor: "builder", title: "Register the measurements",
    from: "build", to: "ccmOwner", carries: "Measurements",
    text: (c) => `${c.Name("builder")} takes the workload's measurements and adds them as a build of the application in CCM, with its certificate domain. For Confidential Containers, measurements are taken for the shape of server the model runs on.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#take-measurements`,
  },
  {
    id: "approve", phase: "day0", actor: "builder", title: "Approve the build",
    to: "ccmOwner",
    text: (c) => `An administrator of ${c.name("builder")} approves the build and the certificate domain on Tasks. Until then, CCM issues no certificate for it.`,
    task: `${GUIDES}/day-0-plan-and-prepare/protect-the-model#register-and-approve-in-ccm`,
  },

  // Day 1
  {
    id: "collaborate", phase: "day1", actor: "owner", title: "Link the CCM accounts",
    from: "ccmOwner", to: "ccmConsumer", carries: "Collaboration token", when: separate,
    text: (c) => `${c.Name("owner")} generates a collaboration token and sends it to ${c.name("consumer")}, who accepts it. Their groups become collaborating groups.`,
    task: `${GUIDES}/day-1-deploy/share-the-model`,
  },
  {
    id: "workflow", phase: "day1", actor: "consumer", title: "Approve the shared workflow",
    from: "ccmConsumer", to: "ccmOwner", carries: "Workflow", when: separate,
    text: (c) => `${c.Name("consumer")} creates a workflow with a placeholder for the application of ${c.name("owner")}. The owner fills it in and approves first, then the consumer approves.`,
    task: `${GUIDES}/day-1-deploy/share-the-model`,
  },
  {
    id: "deploy", phase: "day1", actor: "consumer", title: "Deploy the workload",
    from: "registry", to: "servers", carries: "Encrypted image",
    text: (c) => `${c.Name("consumer")} deploys the workload on the servers. With Confidential Containers, the pod uses the InitData it was measured with, and the image is pulled inside the TEE. ${c.open ? "" : "The model is still encrypted."}`.trim(),
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#deploy-the-workload`,
  },
  {
    id: "evidence", phase: "day1", actor: "consumer", title: "Attest to CCM",
    from: "servers", to: "ccmConsumer", carries: "Evidence",
    text: () => "Inside the TEE, the attestation agent sends signed evidence from the CPU and the GPU to CCM. CCM checks the hardware and compares the measurements with the approved build.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "certificate", phase: "day1", actor: "consumer", title: "Get the certificate",
    from: "ccmConsumer", to: "servers", carries: "Certificate",
    text: () => "CCM issues the workload a TLS certificate for its approved domain, signed by the zone CA. A workload with other measurements gets none.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "key", phase: "day1", actor: "owner", title: "Release the key",
    from: "dsm", to: "servers", carries: "Model key", when: model,
    text: () => "The workload connects to DSM over mutual TLS with its certificate. DSM checks it against the zone CA and the domain, then releases the key into the TEE. With Confidential Containers it unwraps the layer keys, and the layers are decrypted before the container starts. With Enclave OS the workload decrypts the model files when it starts.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#verify-attestation`,
  },
  {
    id: "clients", phase: "day1", actor: "user", title: "Connect clients",
    from: "clients", to: "servers", carries: "TLS",
    text: () => "End users connect over TLS to chat.northwind.example. A client that trusts the zone CA knows it reached the attested workload.",
    task: `${GUIDES}/day-1-deploy/deploy-and-verify#connect-clients`,
  },

  // Day 2, model update
  {
    id: "new-image", phase: "update-model", actor: "builder", title: "Build the new version",
    from: "build", to: "registry", carries: "New image",
    text: (c) => `${c.Name("builder")} ${c.open ? "builds an image with the new weights" : "encrypts the new model version as on day 0"} and pushes the new image.`,
    task: `${GUIDES}/day-2-operate/update-the-model#build-the-new-version`,
  },
  {
    id: "new-build", phase: "update-model", actor: "builder", title: "Register and approve the build",
    from: "build", to: "ccmOwner", carries: "New measurements",
    text: (c) => `If the measurements changed, ${c.name("builder")} adds a build with a new build version and approves it. With Enclave OS they always change. With Confidential Containers the container image is not measured, so they change only with the InitData.`,
    task: `${GUIDES}/day-2-operate/update-the-model#register-and-approve-the-build`,
  },
  {
    id: "new-workflow", phase: "update-model", actor: "owner", title: "Approve a new workflow version",
    from: "ccmOwner", to: "ccmConsumer", carries: "Workflow version", when: separate,
    text: () => "An approved workflow can't be edited. Edit workflow creates a new version, which replaces the old one once both sides approve it.",
    task: `${GUIDES}/day-2-operate/update-the-model#update-the-shared-workflow`,
  },
  {
    id: "redeploy", phase: "update-model", actor: "consumer", title: "Redeploy",
    from: "registry", to: "servers", carries: "New image",
    text: (c) => `${c.Name("consumer")} redeploys. The workload attests again and gets its certificate${c.open ? "" : " and key"} as on day 1.`,
    task: `${GUIDES}/day-2-operate/update-the-model#redeploy`,
  },

  // Day 2, workload TCB update
  {
    id: "release", phase: "update-tcb", actor: "infra", title: "A new runtime release",
    to: "servers",
    text: () => "A new Confidential Containers release, for example with a kernel patch, changes the guest firmware, kernel or root filesystem of every pod on the servers that run it. For Enclave OS the same comes with a new converter, and the image is converted again.",
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb`,
  },
  {
    id: "remeasure", phase: "update-tcb", actor: "builder", title: "Take measurements again",
    from: "build", to: "ccmOwner", carries: "New measurements",
    text: (c) => `${c.Name("builder")} takes the measurements again with the new release, and adds them as a new build.`,
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#take-measurements-again`,
  },
  {
    id: "reapprove", phase: "update-tcb", actor: "builder", title: "Approve before the upgrade",
    to: "ccmOwner",
    text: () => "The new build is approved before any server is upgraded, so no workload is left without a certificate.",
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#approve-before-the-upgrade`,
  },
  {
    id: "upgrade", phase: "update-tcb", actor: "infra", title: "Upgrade the servers",
    to: "servers",
    text: (c) => `${c.Name("infra")} upgrades the runtime and the workloads restart. They attest with the new measurements and get their certificates${c.open ? "" : " and keys"} as before.`,
    task: `${GUIDES}/day-2-operate/update-the-workload-tcb#upgrade-the-servers`,
  },
];

export interface Box {
  id: string;
  name: string;
  detail: string;
  tee?: boolean;
}

export interface Lane {
  party: Party;
  roles: RoleId[];
  boxes: Box[];
}

export interface Deployment {
  scenario: Scenario;
  context: Context;
  lanes: Lane[];
  steps: Step[];
  accounts: string[]; // sentences on who holds which account
}

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
  const separate = !open && owner !== consumer;
  const actorParty = (a: Actor) => (a === "builder" ? builder : partyOf(scenario, a));
  const context: Context = {
    scenario,
    open,
    separate,
    sameInfra: infra === consumer,
    name: (a) => actorParty(a).phrase,
    Name: (a) => cap(actorParty(a).phrase),
  };

  // Which party holds which box. CCM is one box when one party is both owner and consumer.
  const ccmOwner = separate ? "ccm-owner" : "ccm";
  const ccmConsumer = separate ? "ccm-consumer" : "ccm";
  const resolve = (e?: EnvId) => (e === "ccmOwner" ? ccmOwner : e === "ccmConsumer" ? ccmConsumer : e);

  const lanes: Lane[] = scenario.parties.map((party) => {
    const boxes: Box[] = [];
    if (party === owner && open) boxes.push({ id: "weights", name: "Model hub", detail: "Public weights" });
    if (party === builder) {
      boxes.push({ id: "build", name: "Build machine", detail: open ? "Docker" : "Docker and the encryption tool" });
      boxes.push({ id: "registry", name: "Container registry", detail: open ? "Inference image" : "Encrypted image" });
    }
    if (party === owner && !open) boxes.push({ id: "dsm", name: "Fortanix DSM", detail: "Model key and the Trusted CA app" });
    if (party === owner && separate) boxes.push({ id: "ccm-owner", name: "Fortanix CCM", detail: "Application, builds and approvals" });
    if (party === consumer) {
      boxes.push({ id: ccmConsumer, name: "Fortanix CCM", detail: separate ? "Compute nodes, workflow and zone CA" : "Application, builds, compute nodes and zone CA" });
    }
    if (party === infra) boxes.push({ id: "servers", name: "Servers", detail: "Intel TDX and NVIDIA GPUs", tee: true });
    if (party.roles.includes("user")) boxes.push({ id: "clients", name: "Clients", detail: "Apps calling the model" });
    return { party, roles: party.roles, boxes };
  });

  const steps: Step[] = STEPS.filter((d) => !d.when || d.when(context)).map((d) => {
    const party = actorParty(d.actor);
    return {
      id: d.id,
      phase: d.phase,
      actor: d.actor === "builder" ? (open ? "consumer" : "owner") : d.actor,
      party,
      title: d.title,
      from: resolve(d.from),
      to: resolve(d.to),
      carries: d.carries,
      text: d.text(context),
      task: d.task,
    };
  });

  const accounts: string[] = [];
  if (open) {
    accounts.push(`${cap(consumer.phrase)} has one CCM account. It registers the workload there, and the servers are enrolled there too.`);
    accounts.push("The weights are public, so no DSM account is needed for the model. Add one if the workload needs keys for other data.");
  } else if (separate) {
    accounts.push(`${cap(owner.phrase)} has a DSM account, which holds the model key, and a CCM account, where it registers and approves the application.`);
    accounts.push(`${cap(consumer.phrase)} has its own CCM account. ${infra === consumer ? "Its servers" : `The servers of ${infra.phrase}`} are enrolled there.`);
    accounts.push("A shared workflow links the two CCM accounts. The owner approves it first.");
  } else {
    accounts.push(`${cap(owner.phrase)} has a DSM account for the model key and one CCM account for the application. ${infra === owner ? "Its servers" : `The servers of ${infra.phrase}`} are enrolled in that CCM account. No shared workflow is needed.`);
  }

  return { scenario, context, lanes, steps, accounts };
}
