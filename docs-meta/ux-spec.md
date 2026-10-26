# UX spec: navigation, home, search, Ask AI

The reference prototype is `docs-meta/prototypes/N5-SearchAI.dc.html`. Its `<script>` holds the tree data, the search ranking, and the kind rules. Treat it as a behaviour reference, not code to copy: it is a design-canvas file, not React.

## Header

- Left: the Fortanix mark (no wordmark) and "Documentation" in purple, centred on the mark; goes to Home.
- No back and forward buttons of its own: the browser's are enough.
- Centre: a search trigger ("Search the docs", with **/** and ⌘K hints) and an **Ask AI** button.
- Right: Release notes · Advisories · Downloads.

## Sidebar (GitHub-style tree)

- A **Home** row first, separated from the tree like the other sections.
- Then a **"Go to page" filter**, like GitHub's "Go to file", then one collapsible tree (information-architecture.md).
  - It matches against the full path (e.g. `ccm api`, `armor/dsm/pkcs`). Words are separated by spaces or `/` and can come in any order. Each word must match part of a path segment as text, or as the initials of consecutive words in one segment (`dsm` → Data Security Manager).
  - Results are pages only (folders have none), best first: words matched in the page's own title, then at word starts, then shallower pages. Up to 8 are shown; no match shows "No matching pages".
  - Input: a search icon, a **×** clear button when there's text, and a **t** shortcut chip when empty. Pressing **t** when not typing focuses it; **/** opens the ⌘K search (also from the empty filter; once there's text, "/" is a path separator). The ⌘K search is separate and stays in the header.
  - It stays visible at the top of the sidebar while the tree scrolls, with the "Smart index" and "Collapse all" buttons beside it.
- The sidebar scrolls on its own: it sits under the header and ends above the footer when the footer is on screen, so the page scrolling never takes "Go to page" off screen, and a long tree never makes a short page scroll.
  - Dropdown: floats over the content, left-aligned with the input, ~640px wide (at most the viewport − 32px); the full drawer width inside the mobile drawer. Radius 12px, soft shadow.
  - Rows: a page icon, then the path with the matched parts in bold. Long paths wrap onto the next line, indented to the text (no ellipsis). The active or hovered row uses the neutral grey of sidebar row hover.
  - ↑ ↓ Enter work in it. Esc clears it and leaves the box (in the mobile drawer, Esc on an empty box closes the drawer).
- Every tree row is 32px with the same padding; text 14px in the main text colour. Home and top-level sections are semi-bold (600), deeper rows regular. The Home icon sits in the chevron's slot so labels line up.
- Home is a little larger: 40px tall, 15px text, a 16px icon, and 4px of space before its divider.
- Clicking Home, the logo in the header, or pressing **h** (when not typing; on any page, also on phones) goes home and resets the sidebar: every section collapsed, "Go to page" cleared, scrolled to the top. The Home row shows an **h** key chip on the right, lined up with the **c** chip below.
- All sections are collapsed by default; the tree opens along the current page's path.
- Folders without pages yet still show (the planned structure); opened, they show a muted, italic "No pages yet" row. The path menus show the same.
- Clicking a section row toggles it. Clicking a page navigates.
- **Sliding:** sections slide open and shut. Their rows grow from, or shrink to, no height (`--fx-duration-slide`, 200ms). No motion with reduced motion.
- **Smart index** (on by default, the button with the list icon next to "Go to page"; the choice is kept in localStorage): only the sections in use stay open. A section is in use while the mouse is on it or on a row inside it, while the keyboard focus is in it, or while it holds the current page. On touch screens, the section last tapped counts as in use. About 1 second after a section stops being in use, it closes, however it was opened (hover, click, keyboard, or the page it held being left). A section above the row the mouse or keyboard focus is on waits until they leave the tree, so closing it never pulls the rows being looked at upwards; sections below close right away. Only keyboard focus counts, not the focus a click leaves. Resting the mouse on a section (~200ms) opens it. If a click lands on a section the hover has just opened, while the pointer is still on it, it keeps it open (the user meant to open it); a second click closes it. Off, sections open and close only when clicked, as in a plain tree.
- **Collapse all:** a button next to "Go to page", or the **c** key when not typing, closes every section (the button is disabled when none is open).
- The Collapse all button shows its **c** shortcut as a key chip, like the **t** chip in the filter. Both buttons also show a small tooltip on hover or keyboard focus: "Smart index: on/off" and "Collapse all".
- **Full-row highlight** on hover and on the selected row. Selected: background `#F5EDFF`, text `#4B0A80`.
- Indent 16px per level, with thin vertical **indent guides**. The chevron rotates 90° when open (150ms).
- A divider after Home and between top-level sections: a 1px line with its own spacing (6px above, 5px below), so rows keep one height. A small "standalone" pill on DSM.
- The home page content and a doc page's breadcrumbs start the same distance below the header; the sidebar starts 8px lower.
- Uses `role="tree"` / `treeitem` and `aria-expanded`. Keyboard: ↑ ↓ ← → Enter.

## Home

D17: a landing page without the docs tree beside it. Full-width bands, each with its content centred (max 1200px, 48px gutters, 16px below 997px).

- **Header on Home:** the menu button shows at every width and opens the tree in the drawer (wide screens: without the header links, which the header already shows).
- **One search box at a time.** The header's search is hidden while the hero's search box is in view, and fades in once it scrolls under the header. Hidden, not removed, so the header never shifts. **/** and **Ctrl K** work as everywhere.
- **Colours:** the brand's only (dark grey, purple, blue and their gradient). No colour per card or per section.
- No one solution or product gets more weight than the others: they are all equal cards.
- Everything is static CSS and inline SVG: no images to load, no layout shift (recents reserve their height before hydration, below).

1. **Hero**, dark in both themes (#0e0b14 with a purple glow top left, a blue glow right, a fine grid fading out, a hairline of the brand gradient along the bottom).
   - A slim **proof-of-concept notice** pill at its top (amber on dark).
   - The title, "Fortanix Documentation", up to 52px, white with "Fortanix" in the brand gradient; one lead line under it.
   - A **large white search box** (56px tall, up to 576px wide, a soft purple ring) that opens the site's search panel, with its `/` key chip.
   - Under it, **"New to Fortanix? Start here"**, an outlined pill to *What Fortanix does*.
   - On the right, a decorative picture (340px): a chip with a lock inside a dashed TEE outline, a slowly turning orbit with a search and a check badge. Hidden below 900px. Nothing moves with reduced motion.
   - Phones: tighter padding, 32px title.
2. **Recently viewed** (stored in localStorage, max 12):
   - Cards in a 3-column grid (2 below 768px, 1 below 576px), each with a page icon, a title and its closest parent section (the full path is in the tooltip).
   - Each card has its own **×** to remove it. There is **no "clear all"**.
   - Cards are 56px tall and lift slightly on hover.
   - Shows 2 rows (6 cards). A "View more (n)" / "Show less" toggle sits below the cards.
   - Empty state: "Pages you open show up here."
   - Stored pages that no longer exist (moved or removed) are dropped when the home page loads, so the reserved height matches what shows.
3. **Explore Fortanix**: 6 cards, one per solution or product (Confidential AI, Key management→DSM, Tokenization, Confidential Computing, File system encryption, PQC readiness), all the same. The cards come from one data file (`apps/docs/src/data/featured.ts`).
   - Each card: a 48px icon tile in the brand gradient with a white icon, the title, one line, and "Explore →" in purple.
   - On hover the card lifts, its border turns purple, the brand gradient shows along its top and the arrow nudges right.
   - At most 3 columns (6 cards = 2 rows); fewer on narrow screens.
4. **Browse all docs**: a band in a faint grey with the whole docs tree as a directory, built from the tree. One column per top-level section with pages (small capitals title); in it, its pages and folders, each folder with its own pages and folders listed under it. A folder links to its first page; a folder whose only content is one page shows as that page; folders with no pages yet are left out.

## Search bar

A search bar in the header. Clicking it (or ⌘K / Ctrl+K or `/`) opens a larger search panel near the top of the page, over a dimmed page.

- Opens with ⌘K / Ctrl+K or `/`, or by clicking the trigger.
- Closes on Esc, a **click outside**, or the **× button**.
- The trigger looks like a text box and shows the text cursor on hover (on narrow screens it is an icon button).
- **Opens instantly**, also on the first click: the modal ships with the page (~3KB gzipped) and the index is fetched when the page is idle.
- **Motion:** the panel fades in while settling 8px down from a 97% scale (200ms, fast-settling ease-out); its height glides to fit the results as you type (180ms); closing is a 120ms fade. None with reduced motion.
- The panel is **slightly translucent**: `rgba(255,255,255,0.80)` with `backdrop-filter: blur(28px) saturate(180%)`, a light backdrop of `rgba(19,19,19,0.14)`, and a solid fallback when backdrop-filter isn't supported. Dark mode uses the same idea on a dark base.
- **No "Top hit".** Every result is one uniform row:
  - kind icon tile
  - title, with the matched part highlighted
  - breadcrumb path
  - kind pill on the right
- Empty query shows just the input; results and the footer appear once something is typed.
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

## Doc pages

- **Path** above the title: Home, then each folder, then the page. Folders have no page (D10), so each folder opens a small menu of what's inside it:
  - pages open directly; the page you're on is marked;
  - sub-folders (with ›) open inside the same menu, with a "‹ parent" row to go back (→ and ← from the keyboard), as far up as the folder clicked;
  - **Show in sidebar** (wide screens) opens that folder in the sidebar tree, scrolls it into view, focuses it and highlights it briefly.
- **Walkthroughs** (D16): a UI task as numbered steps under a large screenshot. The screenshot shows the step chosen, with the controls it uses ringed and the step's number beside the first. Click a step, use the arrows on the screenshot, drag or swipe it, or ← → when it has focus; it slides, never moving the page (fixed frame, at most 62% of the screen tall). Click the screenshot or its corner button for full screen: zoom with the wheel, a pinch, + and −, or a double click, drag to pan, ← → between steps, Esc to close. On phones a whole-page screenshot zooms in around its ringed control. Screenshots load only near the screen; the full-screen view loads only when opened.
- **Copy link**: a small link button (two chain links) right after the page's name in the path, and in each section heading in place of Docusaurus's "#" link (shown while the heading is pointed at or the button is focused; faintly always on touch screens). It copies a link to the page, or to the section (`…#who-is-involved`). Where the paste takes plain text it is the full address; where it takes rich text (Slack, docs, email) it is a link whose text is the path, starting with "fortanix-docs" instead of "/" and without the site's base path (`fortanix-docs/solutions/confidential-ai/use-cases/proprietary-model`). Copying never changes the address bar. Its tooltip says "Copy link", then "Link copied" with a tick for 1.5s.
- **Listen** (pages with `listen: true` in front matter; for now only the Confidential AI overview): a "Listen" button at the right end of the path, with its **L** key chip. It reads the page aloud with voices made at build time (`pnpm speech` after `pnpm build`, Kokoro, open-source, on the build machine; no backend, nothing extra loads until it is used).
  - What it reads: the page's own text, top to bottom. Headings, paragraphs, list items and table rows (link-only cells and lines such as "Read the … use case" are left out). Never buttons, menus, navigation or pictures. Hidden tabs and the diagram path not chosen are skipped.
  - Spoken lines say what comes, said but not shown: "A table follows, with 4 rows and 3 columns: …", then "Row 1. …"; "A code block in Bash follows. It isn't read aloud." (or what the code does, when the page gives it); "The Proprietary model tab."; for a diagram, what it shows (its `data-speech-intro`) and, for a step diagram, how many steps.
  - Step diagrams: "Step 1. …", "Next, step 2. …", … "That was the last step." The deployment diagram says the day at each day's first step ("Day 1, Deploy. Step 1."), and screenshot steps read their captions. The diagram moves to each step as it is read, at the listener's speed.
  - Highlights: the block being read gets a soft tint, the word being read sits on a rounded marker that slides from word to word (straight to a new line, without sliding; no slide with reduced motion), with the word's text in a strong purple (CSS Custom Highlights for the colour; the words' times come from the build, from the pauses in each sentence's audio and the words' syllables). Reading a selection tints only the selected text.
  - The player is a bar floating over the bottom of the page: previous block, a word back, play and pause, a word forward, next block (holding a word button keeps going, word by word), the progress over what is read (drag or click), a speed menu, and close (a voice menu too, once there is more than one voice). Each control's tooltip names it and shows its key. On phones it has three rows: what's playing and the time, the progress, then larger buttons (the voice button shows an icon; the menu has the names).
  - Keys, while the player is open and not typing: **Space** play and pause, **←** **→** a word back or forward (held, it keeps going), **Shift ←** **Shift →** the previous or next block, **↑** **↓** faster or slower, **Esc** close (a menu first). **L** opens it, and plays and pauses. The OS media keys work too.
  - Speed (0.75× to 2×) is kept in localStorage. One voice for now (Heart, US English).
  - Selecting text in the page shows a small pill centred above the selection: "Listen" plays from the first selected word to the last, then stops; "From here" reads on from the first selected word.
  - Each section heading has "Listen from here" (headphones), beside its copy button, shown as the copy button is.
  - Pointing at a paragraph or a list item shows "Listen from here" (a small round headphones button) in the margin to its left, level with its first line; it stays while the pointer moves onto it. Mouse only, and only where the margin has room.
  - A block whose text changed since the audio was made is skipped rather than read wrong.
- **Contributors**: at the end of the page, on the same line as "Edit this page" and "Page history" (the file's commits on GitHub; those two on the left, contributors on the right), on every screen size. Both are about editing the page, so they sit together and keep the right-hand column for the table of contents. Collapsed by default to a "Contributors" heading with a count pill and a chevron. Opened, it shows the first 5 avatars (28px, overlapping in one row, each to the person's GitHub profile; initials when the commit email isn't linked to a GitHub account; name, login and commit count on hover), a "+N" chip when there are more, and "Page history on GitHub" (the file's commits). Avatars load only once it is opened. No "last updated" line. `[bot]` accounts aren't counted; history follows renames.
  - Counts commit authors and `Co-authored-by` trailers (one commit each, even if someone is both), so co-authors such as Claude (GitHub account `claude`) appear.
  - Worked out when the site is built (plugins/contributors.ts): `git log --follow` per page, and GitHub accounts and avatars from the public API (commits matched by email; 100 per request; emails it doesn't cover, e.g. co-authors, through the commit search, one request each; no token while the repo is public). If GitHub can't be reached, the build still passes and shows names with initials.
  - The build needs the full git history: in CI, check out with `fetch-depth: 0` (a shallow clone shows one contributor and the build warns).
- **Diagrams** (Confidential AI): purple means secure (the TEE, its protections, verified checks, certificates, keys), red means untrusted (the host), the parties (who holds which role) use the Fortanix blue, and everything else is neutral (white with a grey outline). The controls (Play, the switch, step dots, the selected scenario) use the accent colour. Workloads authenticate to DSM over mutual TLS with their CCM certificate; the diagram shows that handshake rather than handing the certificate over.

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
