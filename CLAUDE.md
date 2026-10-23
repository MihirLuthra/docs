# Fortanix Docs

Docs site for Fortanix products. Starting with one product: Confidential Computing Manager (CCM).

## Current scope
- Landing page listing product docs (CCM only for now).
- CCM docs section.
- Fast, responsive, Fortanix look and feel.
Nothing else yet: no backend, auth, editing workflow or translations until `docs-meta/decisions.md` says so.

## Layout
- `apps/docs` — Docusaurus 3 site (TypeScript)
- `content/ccm` — CCM docs (MDX)
- `docs-meta/` — decisions, style guide, audit of the current docs

## Commands
<!-- Fill in as they're created. -->

## Rules
- Products come from one list (`apps/docs/src/data/products.ts`). Adding a product = a content folder + one entry. Never hard-code a product elsewhere.
- Design tokens (colors, fonts, spacing, radius) live only as CSS variables in `apps/docs/src/css/custom.css`. Components use the variables, never raw values.
- Performance budget: Lighthouse ≥ 95 on mobile for the landing page; no layout shift; no client-side JS the page doesn't need; images in SVG or WebP with explicit sizes.
- Every page works from 360 px wide up, and in light and dark mode.
- Never invent technical facts in docs; mark uncertainty with `<!-- TODO(verify): reason -->`.
- Small commits; `pnpm build` passes before each.
