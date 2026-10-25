---
title: Confidential Containers
description: Run Kubernetes pods in Intel TDX TEEs with Confidential Containers, with attestation by CCM and image keys from DSM.
doc_type: concept
keywords: [confidential containers, coco, kata containers, kubernetes, intel tdx, initdata, encrypted image, ccm_kbc]
sidebar_label: Overview
sidebar_position: 1
---

Confidential Containers runs each Kubernetes pod in its own TEE, a confidential VM started by Kata Containers. Fortanix's build of the runtime attests the pod to CCM and gets image keys from DSM.

## How it works

1. You install the runtime on the cluster. It brings the guest firmware, kernel and root filesystem that every pod's TEE boots.
2. You start a pod with a Confidential Containers runtime class and an **InitData** annotation, which holds the attestation and key broker settings for that pod.
3. In the TEE, the attestation module (`ccm_as`) attests to CCM, which issues a certificate if the measurements match an approved build.
4. To pull an encrypted image, the key broker client (`ccm_kbc`) presents that certificate to DSM. DSM holds the key-encryption key and unwraps the image's layer key, and the layers are decrypted inside the TEE.

Everything outside the TEE, including the host, kubelet, containerd and the Kubernetes control plane, is untrusted.

## What the measurements cover

| Measured | Intel TDX register | Comes from |
|---|---|---|
| Guest firmware | MRTD | The runtime install |
| Kernel and its command line | RTMR | The runtime install |
| Root filesystem (dm-verity hash on the kernel command line) | RTMR | The runtime install |
| InitData | MRCONFIGID | The pod's annotation |
| The workload container | Not measured | Sign or encrypt the image |

Every pod on a node boots the same firmware, kernel and root filesystem, so they share those measurements, and upgrading the runtime changes them for every workload. In the measurements, what tells pods apart is their InitData.

## Tasks

- [Install on Kubernetes](install-on-kubernetes.mdx)
- [Encrypt an image](encrypt-an-image.mdx)
- [Take measurements](take-measurements.mdx)
- [Deploy a workload](deploy-a-workload.mdx)

Sources are the [Confidential Containers trust model](https://confidentialcontainers.org/docs/architecture/trust-model/trust-model/), [InitData](https://confidentialcontainers.org/docs/features/initdata/), [Fortanix guide to CoCo on Intel TDX](https://support.fortanix.com/docs/deploy-confidential-container-coco-workloads-on-intel-tdx-platform.md).

## Used in

- [Confidential AI](/solutions/confidential-ai/overview)
