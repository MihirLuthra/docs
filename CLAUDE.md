# Fortanix Docs

Docs site for Fortanix products. Static site, no backend yet.

## Layout — three parts, kept separate

| Folder | What | Language | Who writes it |
|---|---|---|---|
| `apps/docs/` | UI: Docusaurus config, theme, components, home, sidebar, search, styling | TypeScript, CSS | Claude |
| `content/` | Docs tree: one folder per section, Markdown/MDX + images only | Markdown | Claude drafts, humans review |
| `services/` | Backend (later): edit-to-PR, sign-in, roles, AI proxy | Rust | Humans. Does not exist yet. |
| `docs-meta/` | Decisions, specs, style guide | Markdown | Both |

- `apps/docs` holds no doc pages. `content/` holds no code (no React in MDX beyond components exported from `apps/docs`).
- Do not create `services/` or any server code. If a feature needs a backend, stop and say so.
- Never handle secrets, keys or tokens.

## Specs

- Tree: `docs-meta/information-architecture.md`
- Navigation, home, search, Ask AI: `docs-meta/ux-spec.md`
- Writing: `docs-meta/style-guide.md`
- Decisions: `docs-meta/decisions.md` — follow it; propose changes there before acting on them.

## Rules

- Everything is static: search index built at build time, recents in localStorage (wrapped in try/catch).
- Editing = Docusaurus `editUrl` → GitHub's edit page. No custom edit flow.
- Ask AI panel exists behind a flag, off by default.
- Design tokens only as CSS variables in `apps/docs/src/css/custom.css`.
- Lighthouse mobile: median of 5 runs ≥ 95. No layout shift, minimal JS. Works from 360px, light and dark, keyboard-only.
- Never invent technical facts. Unknown → `<!-- TODO(verify): reason -->`. Stub pages carry `status: stub`.
- Ask before adding a dependency.
- Small commits; `pnpm build` passes before each.
