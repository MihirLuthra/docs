---
title: Enclave OS
description: Run an unmodified container image in an Intel TDX TEE by converting it to an Enclave OS image, with attestation by CCM.
doc_type: concept
keywords: [enclave os, salmiac, tdx converter, converted image, intel tdx, gpu passthrough, open source]
sidebar_label: Overview
sidebar_position: 1
---

Enclave OS runs an existing container image in a TEE without changes to the application. The Fortanix TDX Converter turns the image into an Enclave OS image; when it runs, it starts its own TEE.

## How it works

1. The converter takes your image and produces a converted image, and reports the measurements that identify it.
2. You register those measurements as a build in CCM.
3. You run the converted image with Docker on an Intel TDX host. A parent process on the host launches the TEE with QEMU and carries its network and storage.
4. Inside the TEE, the workload attests to CCM and gets its certificate. Persistent storage is encrypted with a key from DSM.

The converter reports MRTD and RTMR0 to RTMR3. Unlike Confidential Containers, where every pod boots the firmware and kernel of the runtime install, each converted image carries its own.

## Things to know

- Environment variables set in the converter's `env_vars` can be overridden when the image runs. Variables set in the input image can't: put the ones that must not change there.
- With `ENCLAVEOS_DEBUG`, CCM issues no certificate, except to debug builds in test-only accounts.
- Enclave OS is open source: [fortanix/salmiac](https://github.com/fortanix/salmiac). Its run-time variables are in [ENV_VARS.md](https://github.com/fortanix/salmiac/blob/beta/ENV_VARS.md).

## Tasks

- [Prepare a host](prepare-a-host.mdx)
- [Convert an image](convert-an-image.mdx)
- [Run a converted image](run-a-converted-image.mdx)

## Used in

- [Confidential AI](/solutions/confidential-ai/overview)
