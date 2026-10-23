# Decisions

## Now
- **D1 — Docusaurus 3, TypeScript.** Static, fast, versioning and multi-product docs built in.
- **D2 — Layout ready to grow:** _(content layout superseded by D6 and D11)_ site in `apps/docs`, content in `content/<product>`, pnpm workspace. Costs nothing now; avoids a move later.
- **D3 — Product list drives the landing page.** _(superseded by D7)_ One data file; CCM is the only entry.
- **D4 — Fortanix look:** brand colors, fonts and logo from fortanix.com, captured as CSS variables.
- **D5 — Hosting serves compressed files.** Any static host is fine if it serves gzip/brotli.
- **D6 — One technically accurate tree.** See information-architecture.md. Solutions link to product pages; DSM sits under Armor with a "standalone" note on a DSM Overview page (added to the tree 2026-10-23).
- **D7 — Navigation and home.** GitHub-style sidebar with a Home row; Home = Get familiar banner + Recently viewed + Explore Fortanix. See ux-spec.md.
- **D8 — Search.** A search bar that opens a centred panel over a build-time index (title, path, keywords, kind). Icons by kind. Full-text later. Keywords: none for now (decided 2026-10-23); the index uses titles and paths only.
- **D9 — Ask AI.** Side panel, separate from search. Built behind a flag, off until a backend exists.
- **D10 — Stub pages for the whole tree.** Every tree node exists as a page (`status: stub`), no invented content. CCM gets real content first. Folders have no page of their own; clicking one expands it (decided 2026-10-23).
- **D11 — Three separate parts.** `apps/docs` = UI (TypeScript), `content/` = docs tree (Markdown), `services/` = backend (Rust). Claude writes UI and drafts content. Backend is human-led.
- **D12 — No backend for now.** Static site only. Edits go through Docusaurus `editUrl` to GitHub. A backend (Rust, auth delegated to an OIDC provider) comes only when we need edits without a GitHub account, or real Ask AI answers.

## Later (not now)
Each gets its own decision entry when we start it.
- More products (DSM/KMS, Key Insight, Armor, FSE), each as its own docs section
- Content import from the current site, then rewrite to the style guide
- Downloads and release-notes sections
- Search upgrade
- Translations (e.g. Japanese)
- Backend: sign-in, roles, edit-to-PR workflow
