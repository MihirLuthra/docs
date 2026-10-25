# Decisions

## Now
- **D1 — Docusaurus 3, TypeScript.** Static, fast, versioning and multi-product docs built in.
- **D2 — Layout ready to grow:** _(content layout superseded by D6 and D11)_ site in `apps/docs`, content in `content/<product>`, pnpm workspace. Costs nothing now; avoids a move later.
- **D3 — Product list drives the landing page.** _(superseded by D7)_ One data file; CCM is the only entry.
- **D4 — Fortanix look:** brand colors and logo from fortanix.com, captured as CSS variables. Font: Inter (variable, Latin subset, self-hosted under the OFL), with the system monospace stack for code (changed from Montserrat 2026-10-23).
- **D5 — Hosting serves compressed files.** Any static host is fine if it serves gzip/brotli.
- **D6 — One technically accurate tree.** See information-architecture.md. Solutions link to product pages; DSM sits under Armor with a "standalone" note.
- **D7 — Navigation and home.** GitHub-style sidebar with a Home row; Home = Get familiar banner + Recently viewed + Explore Fortanix. See ux-spec.md.
- **D8 — Search.** A search bar that opens a centred panel over a build-time index (title, path, keywords, kind). Icons by kind. Full-text later. Keywords: none for now (decided 2026-10-23); the index uses titles and paths only. Since 2026-10-24, pages may set `keywords:` in front matter and the index uses them (first: the Confidential AI overview and use cases).
- **D9 — Ask AI.** Side panel, separate from search. Built behind a flag, off until a backend exists.
- **D10 — Only real pages.** _(changed 2026-10-24; was: a stub for every tree node)_ `content/` holds pages with content, plus stubs (`status: stub`) that something links to. Planned sections exist as folders, shown with "No pages yet". Folders have no page of their own.
- **D11 — Three separate parts.** `apps/docs` = UI (TypeScript), `content/` = docs tree (Markdown), `services/` = backend (Rust). Claude writes UI and drafts content. Backend is human-led.
- **D12 — No backend for now.** Static site only. Edits go through Docusaurus `editUrl` to GitHub. A backend (Rust, auth delegated to an OIDC provider) comes only when we need edits without a GitHub account, or real Ask AI answers.
- **D13 — Three layers: products, solutions, versions.** Products are documented independently and versioned with the product; solutions (e.g. Confidential AI) are built on top and link to product docs; versions are data. Confidential AI: use cases, how-tos by role and end to end, runtime choice as tabs. See information-architecture.md (2026-10-24).
- **D14 — Versions as data (built 2026-10-24; see `versions/README.md`).** Per product, a releases file (version, date, status: current / supported / deprecated / end of life) and a tested-combinations file that QA fills in (component versions, TEE, platform, OS, verified or preview, who and when, which solutions it covers). Docs read them: a `<Version product="…" />` component in text, `{{product.version}}` placeholders in code blocks (a small build plugin), support matrices rendered from the combinations, and `applies_to:` ranges in front matter, flagged when they point at removed versions. Release flow: a product tag opens a docs PR adding the version as "pending QA"; QA records results in that PR; merging on release day updates every page; CI validates the data. Latest only at first; per-major snapshots when a product breaks compatibility, each pinning its own copy of the data.
- **D15 — How-tos by day; product steps in product docs (2026-10-24).** Confidential AI how-tos are tasks grouped by day 0 (plan and prepare), day 1 (deploy) and day 2 (operate). The role guides list each role's tasks, and the end-to-end guides order them per deployment. Steps that belong to a product (enrol a node, register an application, approvals, shared workflows in CCM; convert and run in Enclave OS; install, encrypt, measure and deploy in Confidential Containers) are written once in that product's docs, and the solution's tasks link to them, adding only what is specific to the solution. UI steps may carry screenshots in `<Screenshots>`: one at a time, with the steps as tabs, never a tall stack. Example names are realistic but fictional (Northwind AI, `llm-serving`, `chat.northwind.example`), and secrets are masked before capture.

## Later (not now)
Each gets its own decision entry when we start it.
- More products (DSM/KMS, Key Insight, Armor, FSE), each as its own docs section
- Content import from the current site, then rewrite to the style guide
- Downloads and release-notes sections
- Search upgrade
- Translations (e.g. Japanese)
- Backend: sign-in, roles, edit-to-PR workflow. Goal: edit directly on the doc page, with "Edit on GitHub" still offered; if the editor doesn't go the GitHub way, a bot opens the PR on their behalf. Needs the backend (D12), so the GitHub link stays the only edit path until then.
