# UX spec: navigation, home, search, Ask AI

The reference prototype is `docs-meta/prototypes/N5-SearchAI.dc.html`. Its `<script>` holds the tree data, the search ranking, and the kind rules. Treat it as a behaviour reference, not code to copy: it is a design-canvas file, not React.

## Header

- Left: logo, which goes to Home.
- Centre: a search trigger ("Search the docs", ⌘K hint) and an **Ask AI** button.
- Right: Release notes · Advisories · Downloads.

## Sidebar (GitHub-style tree)

- A **Home** row first, then one collapsible tree (information-architecture.md).
- All sections are collapsed by default; the tree opens along the current page's path.
- Clicking a section row toggles it. Clicking a page navigates.
- **Full-row highlight** on hover and on the selected row. Selected: background `#F5EDFF`, text `#4B0A80`.
- Indent 16px per level, with thin vertical **indent guides**. The chevron rotates 90° when open (150ms).
- A divider between top-level sections. A small "standalone" pill on DSM.
- Uses `role="tree"` / `treeitem` and `aria-expanded`. Keyboard: ↑ ↓ ← → Enter.

## Home

1. **"New to Fortanix? Get familiar first"**: a prominent purple banner linking to *What Fortanix does*.
2. **Recently viewed** (stored in localStorage, max 12):
   - Cards in a 3-column grid, each with a title and a breadcrumb path.
   - Each card has its own **×** to remove it. There is **no "clear all"**.
   - Shows 2 rows (6 cards), then a "View more (n)" / "Show less" toggle.
   - Empty state: "Pages you open show up here."
3. **Explore Fortanix**: 6 curated cards (Confidential AI, Key management→DSM, Tokenization, Confidential Computing, File system encryption, PQC readiness). Each card has a mono path, a title, one line, and tags. The cards come from one data file.

## Search bar

- Opens with ⌘K / Ctrl+K or `/`, or by clicking the trigger.
- Closes on Esc, a **click outside**, or the **× button**.
- The panel is **slightly translucent**: `rgba(255,255,255,0.80)` with `backdrop-filter: blur(28px) saturate(180%)`, a light backdrop of `rgba(19,19,19,0.14)`, and a solid fallback when backdrop-filter isn't supported. Dark mode uses the same idea on a dark base.
- **No "Top hit".** Every result is one uniform row:
  - kind icon tile
  - title, with the matched part highlighted
  - breadcrumb path
  - kind pill on the right
- Empty query shows "Suggested" (a short curated list).
- Keyboard: ↑ ↓ to move, Enter to open. The active row is tinted.
- Footer: key hints on the left, and **"Ask AI about '<query>'"** on the right, which opens the AI panel with the query.

### Ranking

1. **Match:** every query token must appear in the page's path names, or as a prefix of one of its keywords. Otherwise the page is not a result.
2. **Base score:**
   - exact title: 100
   - exact keyword: 90
   - title prefix: 80
   - word-start in title: 68
   - keyword prefix: 60
   - title contains: 50
   - path only: 20
3. **Adjust:**
   - +8 for Solution or Product
   - −4 for a Section
   - −depth
   - −6 for generic titles (Overview, Troubleshooting, API)
4. **Show:** the top 8.

The index is built at build time from the sidebar plus front matter: title, path, keywords and kind. Keywords come from `keywords:` in front matter. Full-text body search is a later upgrade.

### Kind icons (automatic, no per-topic icons)

The icon comes from the page's kind. The kind comes from `doc_type` in front matter when it is set; otherwise it is derived from the page's position in the tree:

| Kind | Rule | Icon | Colour |
|---|---|---|---|
| Solution | Section directly under Solutions | layers | purple `#7A12CC` |
| Product | Armor service / product sections | 2×2 grid | blue `#1F5FCC` |
| Concept | Under Get familiar or Concepts | lightbulb | amber `#8A5A00` |
| Quickstart | Quickstart / Get started | play | green `#0E7A47` |
| Guide | Any other page | document | grey `#3D4250` |
| Reference | API, CLI, libraries, Reference, Glossary | braces | teal `#00708F` |
| Tutorial | Under Learn / Tutorials / Examples | book | pink `#B4235A` |
| Section | Any other folder | folder | grey `#5B6170` |

Each icon sits on a tinted tile. The kind is also written as text in the pill, so colour is never the only signal.

## Ask AI (right-side panel)

- Opens from the header button or from the search footer. It docks on the right (400px) and slides in over 200ms; the page stays usable. A × closes it.
- Empty state: 3 example questions.
- Each answer shows **Sources**: links to the pages it used, with kind icons.
- Input at the bottom. A note: "AI answers can be wrong; check the sources."
- **For now, UI only, behind a flag that is off by default.** There is no backend yet (D12). With the flag on, the panel shows "Ask AI isn't connected yet" and the matching pages from the search index as "Related pages". It never fakes an answer.

## Everywhere

- Works from 360px wide. On narrow screens the sidebar becomes a drawer and the AI panel goes full width.
- Light and dark modes.
- Respect `prefers-reduced-motion`.
