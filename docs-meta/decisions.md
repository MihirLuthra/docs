# Decisions

## Now
- **D1 — Docusaurus 3, TypeScript.** Static, fast, versioning and multi-product docs built in.
- **D2 — Layout ready to grow:** site in `apps/docs`, content in `content/<product>`, pnpm workspace. Costs nothing now; avoids a move later.
- **D3 — Product list drives the landing page.** One data file; CCM is the only entry.
- **D4 — Fortanix look:** brand colors, fonts and logo from fortanix.com, captured as CSS variables.

## Later (not now)
Each gets its own decision entry when we start it.
- More products (DSM/KMS, Key Insight, Armor, FSE), each as its own docs section
- Content import from the current site, then rewrite to the style guide
- Downloads and release-notes sections
- Search upgrade
- Translations (e.g. Japanese)
- Backend: sign-in, roles, edit-to-PR workflow
