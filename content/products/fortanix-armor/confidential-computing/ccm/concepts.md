---
title: "Concepts"
description: "The objects in Confidential Computing Manager (CCM), and how they fit together. Applications and builds, approvals, certificates, workflows, application configurations, and collaborating groups."
doc_type: concept
keywords: [ccm, application, build, measurements, approval, tasks, certificate, application id, fortanix.cloud, workflow, application configuration, runtime configuration hash, collaborating groups]
sidebar_position: 1
---

Confidential Computing Manager (CCM) is Armor's attestation service. A workload in a TEE sends CCM attestation evidence. If the evidence matches what CCM was told to expect, CCM issues the workload a certificate. Everything below decides what CCM expects, and who agreed to it.

## Applications and builds

- An **application** is the workload, such as a model server. It belongs to a group, and has a type (for example Confidential Container with Enclave OS or with Confidential Containers) and a platform (for example Intel TDX or AMD SEV-SNP).
- A **build** is one version of the application, identified by its measurements. CCM certifies a workload only when its measurements match an approved build.
- Each application has an **application ID**, the UUID at the end of the application's address in CCM.

## Approvals

A new build, and a new certificate domain, are requests on the **Tasks** page. CCM issues no certificate for a build or domain until it is approved. See [Approve builds and domains](applications/approve-builds-and-domains.mdx).

## Certificates

The certificate CCM issues carries the domains you gave the application, such as `chat.northwind.example`. CCM also adds names of its own, under `fortanix.cloud`.

- `<APPLICATION_ID>.app.fortanix.cloud` names the application.
- A name under `id.fortanix.cloud` is derived from the workload's measurements, in the form `<HASH>.<PLATFORM>.id.fortanix.cloud`. For example, an AMD SEV-SNP workload's name ends in `.sev-snp.id.fortanix.cloud`.

Only CCM puts these names in a certificate, and only after verifying the workload's attestation. Nobody can add an application whose domain ends in `.fortanix.cloud`. That makes `<APPLICATION_ID>.app.fortanix.cloud` the name to trust when a relying party, such as a DSM app, must accept only one application.

{/* TODO(verify): which measurements <HASH> is derived from, and the platform label for each TEE. Seen in a real certificate: a 96-hex-character hash with the label sev-snp. */}

## Workflows

A **workflow** sets the runtime of confidential computing applications. It says which build of an application runs, with which configuration, and how it connects to other components, including applications of another account through collaboration. A workflow is a graph you draw in CCM, and it must be approved before it takes effect. An approved workflow can't be edited. Editing creates a new version, which needs approval again.

See [Create a workflow](workflows/create-a-workflow.mdx).

## Application configurations

An **application configuration** holds an application's runtime configuration, such as key and value settings. CCM stores and manages it, not the host. When the application starts, it fetches its configuration from CCM over an API call.

If the configuration came from the host instead, a host administrator could change it without changing the application's measurements, and attestation would not notice. Keeping it in CCM means the configuration can change without rebuilding the image, and the host can't tamper with it.

Each configuration has an **application configuration ID**, also called the runtime configuration hash. CCM also uses it to find the exact workflow an application runs in. So an application passes it even when it has no configuration items.

## Collaborating groups

Two CCM accounts can link groups, so that one account (the **consumer**) runs an application that the other (the **publisher**) owns, without the publisher handing it over. Both approve the workflow that does it. See [Run another account's application in a shared workflow](workflows/shared-workflows.mdx).
