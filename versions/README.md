# Versions

The single source of truth for component versions and tested combinations. Doc pages never write versions out; they read them from here, so a release updates every page at once.

- `components.json`: every versioned component (ours and third-party ones we pin), with its versions. Each version has a `status`:
  - `pending-qa`: added for a release, not yet published
  - `current`: the version pages show by default (at most one per component)
  - `supported`, `deprecated`, `end-of-life`
  - Optional: `date` (YYYY-MM-DD), `requires` (version ranges of other software), `notes`, `source`.
- `runtimes.json`: each workload runtime and the TEEs it runs on, with a `source`. Rendered by `<SupportedTees runtime="…" />`. This is what the runtime supports, not what QA has tested.
- `tested.json`: combinations QA has checked, rendered as support matrices. Each has a `status`:
  - `verified`: QA ran it (`tested_by` and `date` required)
  - `preview`: works, not yet supported
  - `documented`: taken from existing documentation, not yet checked by QA

## Release flow

1. A product release adds its new version with `pnpm --dir apps/docs versions add <component> <version>` (status `pending-qa`). CI can run the same command when a release is tagged.
2. QA records what they tested in `tested.json` in the same pull request.
3. On release day: `pnpm --dir apps/docs versions promote <component> <version>` makes it `current` (the previous current becomes `supported`). Merging rebuilds the site; every page, command and matrix updates.

The build checks this data and fails on: unknown statuses, more than one `current` per component, duplicate versions, tested combinations that name an unknown component or version, `verified` entries without `tested_by` and `date`, and pages whose `applies_to` names an unknown or end-of-life version.

## In docs

- Text: `<Version of="coco-keyprovider" />` renders the current version (`field="artifact"` for the artifact name).
- Code blocks and inline code: `{{coco-keyprovider.version}}`, `{{coco-keyprovider.artifact}}`, `{{fortanix-kata-deploy.requires.kubernetes}}`.
- Support matrix: `<SupportMatrix solution="confidential-ai" runtime="confidential-containers" />`.
- Front matter: `applies_to: ["coco-chart@0.21.0"]`.
