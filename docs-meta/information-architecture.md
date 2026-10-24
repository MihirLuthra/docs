# Information architecture

One tree. Every page has exactly one home in it. Accuracy over marketing.

**What exists now (2026-10-24):** `content/` only has pages with content, and the stub pages something links to (the header pages, the home banner and Explore cards, links in the Confidential AI pages). Undecided stubs were removed. Get familiar, Products and Learn keep their folder tree (empty folders show "No pages yet"); Solutions has only Confidential AI (Overview and Use cases). The tree below is the plan.

## Rules

- **One home per page.** Solutions link to canonical product pages; they don't copy them.
- **Solutions** are end-to-end doc sets (overview, architecture, get started, deploy, integrations, examples). They are not products.
- **DSM sits under Armor** in the docs, with a "standalone today" badge and a one-line note on its overview page.
- **CCM is Armor's verifier.** Node Agent belongs to CCM (Compute nodes). The attestation client is a workload-side component, so it lives under Workload runtimes.
- **No ccm.fortanix.com tree.** The new docs cover Armor CCM only.
- **EDP docs live on this site** (Confidential Computing → SDKs).
- **Don't centre the docs on TEE hardware.** The TEE pages are background concepts.

## RATS mapping (for Concepts → Attestation)

| RATS role | Fortanix |
|---|---|
| Attester | A workload in a TEE plus the attestation client (Enclave OS, Confidential Containers, a custom CVM) |
| Verifier | CCM |
| Relying party | DSM, or any service that trusts CCM-issued certificates |
| Endorser | Intel, AMD, NVIDIA |
| Reference values | Approved builds in CCM |

## Tree

Top-level sections are separated by a divider in the sidebar. `(kw: …)` lists search keywords, which go in the page's front matter.

```
Get familiar
  What Fortanix does
  The Armor platform
  Concepts
    Confidential computing basics
    Attestation, the RATS model
    Key management basics
    TEE technologies
      Intel SGX · Intel TDX · AMD SEV-SNP · AWS Nitro Enclaves · NVIDIA Confidential Computing
    Glossary

Solutions
  Confidential AI            (kw: ai, gpu, model, llm, inference)
    Overview
    Use cases: Proprietary model · In-house model · Open-source model
    Architecture · Get started
    Deploy: Kubernetes with CoCo · Confidential VMs
    Integrations: Rafay · NVIDIA GPU Operator
    Examples · Troubleshooting
  File system encryption     (kw: fse, gocryptfs)
    Overview · Linux quickstart · Windows quickstart · Key rotation · Troubleshooting
  Database encryption        (kw: tde)
    Overview · Oracle TDE · SQL Server TDE · MongoDB · MySQL
  Tokenization               (kw: fpe, masking)
    Overview · Quickstart · Examples · Best practices
  Cloud key control          (kw: byok)
    Overview · AWS KMS · Azure Key Vault · Google Cloud KMS · Oracle Cloud
  PQC readiness              (kw: pqc, post-quantum)
    Overview · Get started · PQC Central

Products
  Fortanix Armor
    Platform
      Architecture · Deploy (SaaS, Customer-managed) · Administration · API
    Confidential Computing
      Overview
      CCM                    (kw: verifier, attestation)
        Concepts · Quickstart · Applications & builds · Approvals
        Compute nodes: Node Agent · Enroll an SGX / TDX / SEV-SNP / Nitro node
        Workflows & datasets · Policy · API · Troubleshooting
      Workload runtimes
        Enclave OS           (kw: salmiac)
          Overview · Convert an image · Configuration · Tutorials
        Confidential Containers (kw: coco, kata)
          Overview · Install · Encrypt an image · Deploy on Intel TDX · Deploy on AMD SEV-SNP · Troubleshooting
        Build your custom CVM
          Attestation client
      SDKs
        Enclave Development Platform (kw: edp, rust, rust-sgx)
          Install the toolchain · Build and run · Attesting with CCM · Reference
    Key Insight              (kw: ki, posture, pqc)
      Concepts · Get started
      Connections: AWS · Azure · Google Cloud · Oracle Cloud · On-premises
      Policy center · PQC Central · API
    Data Security Manager    [badge: standalone]  (kw: dsm, kms, hsm)
      Service: Concepts · Deploy · Administration · Key management · Cloud Data Control · Tokenization · Plugins · API
      Client libraries & tools: PKCS#11 library · CNG provider · JCE provider · CLI · Terraform provider
      Client-side components: DSM Accelerator · File System Encryption agents
      Integrations: Databases · Storage & backup · Cloud KMS & BYOK · Secrets managers · PKI & certificates

Learn
  Tutorials: Deploy Confidential AI with Fortanix and Rafay · Tokenization quickstart · Run HashiCorp Vault in Enclave OS
  Examples: Nginx in Enclave OS · PostgreSQL in Enclave OS · Rust server with EDP
  Videos
```

Release notes, Advisories and Downloads are header links, not part of the tree.
