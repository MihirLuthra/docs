# Information architecture

One tree; every page has exactly one home in it. Accuracy over marketing. The sidebar shows what exists: pages with content, stubs that something links to, and folders for planned sections ("No pages yet").

## Three layers (D13)

1. **Products** (CCM, Enclave OS, Confidential Containers, EDP, DSM, Key Insight) own their concepts, how-tos, reference and support matrix, versioned with the product. They mention solutions only in a "Used in" link.
2. **Solutions** (Confidential AI, File system encryption, Tokenization, PQC readiness, …) are end-to-end doc sets built on products. They link to or pull in product detail; they never copy it.
3. **Versions** are data in `versions/` (components and tested combinations), owned by release and QA (D14). Pages read versions and support matrices from it, never writing them out.

## Rules

- **One home per page.** Exact fields, config references and limits live in the product docs.
- **DSM sits under Armor**, with a "standalone today" badge.
- **CCM is Armor's verifier.** The node agent belongs to CCM (Compute nodes); the attestation client is workload-side (Workload runtimes).
- **EDP docs live here** (Confidential Computing → SDKs). No ccm.fortanix.com tree.
- **Don't centre the docs on TEE hardware.** TEE pages are background concepts.
- **Folders have no page of their own**; a folder that needs an introduction gets an Overview page.
- Release notes, Advisories and Downloads are header links, not part of the tree.

## Sections

- **Get familiar**: what Fortanix does, the Armor platform, concepts (confidential computing, attestation, key management, TEE technologies), glossary.
- **Solutions**, each shaped like Confidential AI below where it applies.
- **Products**: Fortanix Armor (Platform, Confidential Computing: CCM, workload runtimes, SDKs; Key Insight; Data Security Manager).
- **Learn**: tutorials and examples that span products.

### Confidential AI

```
Overview
Use cases: Proprietary model · In-house model · Open-source model
How-to guides
  By role           Model owner · Infrastructure provider · Model consumer
  End to end        one per deployment, composed from the role tasks
Support matrix    generated from versions/
Integrations: Rafay · NVIDIA GPU Operator
Examples
```

- **End-to-end guides are compositions** of the role tasks; each step is written once and reused.
- **Runtime choice is tabs, not pages** (Confidential Containers or Enclave OS inside each how-to).

## RATS mapping (Concepts → Attestation)

| RATS role | Fortanix |
|---|---|
| Attester | A workload in a TEE plus the attestation client |
| Verifier | CCM |
| Relying party | DSM, or any service that trusts CCM certificates |
| Endorser | Intel, AMD, NVIDIA |
| Reference values | Approved builds in CCM |
