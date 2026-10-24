# UX spec: navigation, home, search, Ask AI

The reference prototype is `docs-meta/prototypes/N5-SearchAI.dc.html`. Its `<script>` holds the tree data, the search ranking, and the kind rules. Treat it as a behaviour reference, not code to copy: it is a design-canvas file, not React.

## Header

- Left: logo, which goes to Home.
- Centre: a search trigger ("Search the docs", ⌘K hint) and an **Ask AI** button.
- Right: Release notes · Advisories · Downloads.

## Sidebar (GitHub-style tree)

- A **Home** row first, separated from the tree like the other sections.
- Then a **"Go to page" filter**, like GitHub's "Go to file", then one collapsible tree (information-architecture.md).
  - It matches against the full path (e.g. `ccm api`, `armor/dsm/pkcs`). Words are separated by spaces or `/` and can come in any order. Each word must match part of a path segment as text, or as the initials of consecutive words in one segment (`dsm` → Data Security Manager).
  - Results are pages only (folders have none), best first: words matched in the page's own title, then at word starts, then shallower pages. Up to 8 are shown; no match shows "No matching pages".
  - Input: a search icon, a **×** clear button when there's text, and a **t** shortcut chip when empty. Pressing **t** when not typing focuses it; **/** stays with the ⌘K search, which is separate and stays in the header.
  - Dropdown: floats over the content, left-aligned with the input, ~640px wide (at most the viewport − 32px); the full drawer width inside the mobile drawer. Radius 12px, soft shadow.
  - Rows: a page icon, then the path with the matched parts in bold. Long paths wrap onto the next line, indented to the text (no ellipsis). The active or hovered row uses the neutral grey of sidebar row hover.
  - ↑ ↓ Enter work in it, and Esc clears it.
- Every tree row is 32px with the same padding; text 14px in the main text colour. Home and top-level sections are semi-bold (600), deeper rows regular. The Home icon sits in the chevron's slot so labels line up.
- Home is a little larger: 40px tall, 15px text, a 16px icon, and 4px of space before its divider.
- Clicking Home, or the logo in the header, goes home and resets the sidebar: every section collapsed, "Go to page" cleared, scrolled to the top.
- All sections are collapsed by default; the tree opens along the current page's path.
- Clicking a section row toggles it. Clicking a page navigates.
- **Full-row highlight** on hover and on the selected row. Selected: background `#F5EDFF`, text `#4B0A80`.
- Indent 16px per level, with thin vertical **indent guides**. The chevron rotates 90° when open (150ms).
- A divider after Home and between top-level sections: a 1px line with its own spacing (6px above, 5px below), so rows keep one height. A small "standalone" pill on DSM.
- The home page content and a doc page's breadcrumbs start the same distance below the header; the sidebar starts 8px lower.
- Uses `role="tree"` / `treeitem` and `aria-expanded`. Keyboard: ↑ ↓ ← → Enter.

## Home

- **Grid:** sidebar | main column (max 1080px) | right rail (260px, from 1280px wide). The rail is reserved for later content such as "Get help / Slack" and is empty for now. The main column and rail are centred together in the space beside the sidebar.
- **Compact top**, so Explore Fortanix is above the fold on a 1080p screen (with 6 recents, at least its first row is fully visible): about 28px between sections.

1. **"New to Fortanix? Get familiar first"**: a prominent purple banner linking to *What Fortanix does*. One row, ~64px tall: icon, then the title and description running together (sharing lines where they fit), then the button. On narrow screens the button wraps below.
2. **Recently viewed** (stored in localStorage, max 12):
   - Cards in a 3-column grid, each with a title and its closest parent section (the full path is in the tooltip).
   - Each card has its own **×** to remove it. There is **no "clear all"**.
   - Cards are ~56px tall.
   - Shows 2 rows (6 cards). A "View more (n)" / "Show less" toggle sits to the right of the "Recently viewed" heading.
   - Empty state: "Pages you open show up here."
3. **Explore Fortanix**: 6 curated cards (Confidential AI, Key management→DSM, Tokenization, Confidential Computing, File system encryption, PQC readiness). Each card has a mono path, a title, one line, and tags. The cards come from one data file (`apps/docs/src/data/featured.ts`).
   - The path is one line (ellipsis if too long, never wraps), so titles in a row line up. Paths say "Armor" for "Fortanix Armor".
   - At most 3 columns (6 cards = 2 rows); fewer on narrow screens.
   - About 6px between path, title, description and tags. Description line-height 1.5.
   - Tags: 11px text, padding 1px 6px, radius 4px, background `#F2F3F6` (a dark grey in dark mode), 4px apart.

## Search bar

- Opens with ⌘K / Ctrl+K or `/`, or by clicking the trigger.
- Closes on Esc, a **click outside**, or the **× button**.
- **Opening grows the header's search bar into the panel** (~260ms): it starts at the bar's position, size and corner radius, expands to the panel, and the results fade in as it does. Closing shrinks it back into the bar (~160ms). No animation with reduced motion.
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
