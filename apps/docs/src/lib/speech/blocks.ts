// What "Listen" reads on a page, block by block, in reading order. The same
// code runs on the built HTML (scripts/speech.mjs, through jsdom) to make
// the audio, and in the browser to find each block again, so the two always
// agree. Plain TypeScript with no imports, so Node can run it as is.
//
// - Headings, paragraphs, list items and table rows are blocks. Link-only
//   lines and cells ("Read the … use case", a "Docs" column) are left out.
// - Buttons, menus, navigation, pictures and anything aria-hidden or
//   data-speech-skip are never read.
// - Before a table, a code block (never read out), a tab or a diagram, a
//   short spoken line says what comes: "narration", said but not shown. A
//   diagram marked data-speech-intro says what it shows.
// - A diagram marked data-speech="steps" is read step by step from its step
//   panels (data-speech-step, data-speech-variant): "Step 1. …", "Next,
//   step 2. …", then "That was the last step." The diagram shows each step
//   as it is read. A panel can say its own lead (data-speech-lead, "Day 1.
//   Step 1.") and, when its words aren't in it (a screenshot's caption is
//   on its tab), what it says (data-speech-text).
// - A figure's caption with no paragraphs of its own is read as text.
// - Hidden tab panels and diagram paths are blocks too (the audio has them);
//   the player skips what isn't showing.

/** What a block says: shown text (with where it sits in the block's text), or narration only. */
export type Part = {say: string; from?: number; to?: number};

export type SpeechBlock = {
  el: Element;
  /** The block's shown text; for narration, what is said. */
  text: string;
  parts: Part[];
  /** Said, not shown: a line before a table, a diagram, a tab. */
  narration?: boolean;
  heading: boolean;
  /** A diagram step, or a diagram's narration: the diagram, the step, the path it belongs to. */
  figure?: Element;
  step?: number;
  variant?: string;
};

/** The page's text: Docusaurus's doc content. */
export const SPEECH_ROOT = '.theme-doc-markdown';

const SKIP =
  'button, nav, svg, img, picture, video, audio, canvas, select, input, textarea, script, style, ' +
  '[role="tablist"], [aria-hidden="true"], [data-speech-skip], .hash-link';
const CODE = '.theme-code-block, pre';
const LEAF = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'DT', 'DD']);
// Inside a block, these end a phrase: a title above its text gets a full stop
// (a pause), other elements a space.
const PHRASES = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DT', 'DD']);
const SPACES = new Set(['BR', 'SPAN']);

/** Where each character of a block's text came from in the page (null: added, such as a full stop). */
export type Origin = [Node, number] | null;

/** The text of `el` as read, and where each of its characters is in the page. */
export function textMap(el: Element, nestedLists = false): {text: string; origins: Origin[]} {
  const chars: string[] = [];
  const from: Origin[] = [];
  const push = (s: string, node?: Node) => {
    for (let i = 0; i < s.length; i++) {
      chars.push(s[i]);
      from.push(node ? [node, i] : null);
    }
  };
  const walk = (node: Node) => {
    if (node.nodeType === 3) return push(node.nodeValue ?? '', node);
    if (node.nodeType !== 1) return;
    const e = node as Element;
    if (e !== el && (e.matches(SKIP) || e.matches(CODE))) return;
    if (!nestedLists && e !== el && (e.tagName === 'UL' || e.tagName === 'OL')) return;
    for (const child of Array.from(e.childNodes)) walk(child);
    if (e !== el && PHRASES.has(e.tagName)) {
      const sofar = chars.join('');
      if (/[.!?:]\s*$/.test(sofar) || !sofar.trim()) push(' ');
      else {
        while (chars.length && /\s/.test(chars[chars.length - 1])) {
          chars.pop();
          from.pop();
        }
        push('. ');
      }
    } else if (SPACES.has(e.tagName)) push(' ');
  };
  walk(el);
  // Tidy: one space between words, none before punctuation, no zero-width spaces.
  const text: string[] = [];
  const origins: Origin[] = [];
  chars.forEach((c, i) => {
    if (c === '​') return;
    if (/\s/.test(c)) {
      if (text.length && text[text.length - 1] !== ' ') {
        text.push(' ');
        origins.push(from[i]);
      }
      return;
    }
    if (/[.,;:!?)]/.test(c) && text[text.length - 1] === ' ') {
      text.pop();
      origins.pop();
    }
    text.push(c);
    origins.push(from[i]);
  });
  if (text[text.length - 1] === ' ') {
    text.pop();
    origins.pop();
  }
  return {text: text.join(''), origins};
}

export const textOf = (el: Element, nestedLists = false): string => textMap(el, nestedLists).text;

/** Whether `el` holds nothing but links ("Read the … use case", a "Docs" cell): not read. */
function onlyLinks(el: Element): boolean {
  const text = textOf(el);
  const links = Array.from(el.querySelectorAll('a'))
    .map((a) => a.textContent ?? '')
    .join(' ');
  return !text || text.replace(/[,.\s]/g, '') === links.replace(/[,.\s]/g, '');
}

/** "a", "a and b", "a, b and c". */
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const LANGUAGES: Record<string, string> = {
  bash: 'Bash', sh: 'shell', shell: 'shell', console: 'shell', yaml: 'YAML', yml: 'YAML', json: 'JSON',
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', python: 'Python', py: 'Python',
  go: 'Go', rust: 'Rust', toml: 'TOML', ini: 'INI', text: 'plain text', powershell: 'PowerShell', dockerfile: 'Dockerfile',
};

/** The key a block's audio is stored under: everything it says. */
export const speechKey = (b: {parts: Part[]}): string => b.parts.map((p) => p.say).join(' ');

export function speechBlocks(root: Element): SpeechBlock[] {
  const blocks: SpeechBlock[] = [];
  const shown = (el: Element, text: string, lead?: string, extra: Partial<SpeechBlock> = {}) => {
    if (!text) return;
    const parts: Part[] = [...(lead ? [{say: lead}] : []), {say: text, from: 0, to: text.length}];
    blocks.push({el, text, parts, heading: /^H\d$/.test(el.tagName), ...extra});
  };
  const narrate = (el: Element, say: string, extra: Partial<SpeechBlock> = {}) =>
    blocks.push({el, text: say, parts: [{say}], narration: true, heading: false, ...extra});

  const walk = (el: Element) => {
    if (el.matches(CODE)) {
      const inner = el.querySelector('[class*="language-"]');
      const lang = /language-([\w-]+)/.exec(el.className)?.[1] ?? /language-([\w-]+)/.exec(inner?.className ?? '')?.[1];
      const about = el.closest('[data-speech]')?.getAttribute('data-speech');
      const name = lang ? (LANGUAGES[lang] ?? lang) : '';
      narrate(el, about ? `A code block follows. ${about}` : `A code block${name ? ` in ${name}` : ''} follows. It isn't read aloud.`);
      return;
    }
    if (el.matches(SKIP)) return;

    if (el.matches('[data-speech="steps"]')) {
      const panels = Array.from(el.querySelectorAll('[data-speech-step]'));
      const variants = [...new Set(panels.map((p) => p.getAttribute('data-speech-variant') ?? ''))];
      const intro = el.getAttribute('data-speech-intro') ?? 'A diagram follows';
      for (const variant of variants) {
        const steps = panels.filter((p) => (p.getAttribute('data-speech-variant') ?? '') === variant);
        const v = variant || undefined;
        narrate(el, `${intro}, in ${plural(steps.length, 'step')}.`, {figure: el, variant: v});
        for (const panel of steps) {
          const n = Number(panel.getAttribute('data-speech-step'));
          const lead = panel.getAttribute('data-speech-lead') ?? (n === 0 ? 'Step 1.' : `Next, step ${n + 1}.`);
          const said = panel.getAttribute('data-speech-text');
          if (said) narrate(panel, `${lead} ${said}`, {figure: el, step: n, variant: v});
          else shown(panel, textOf(panel), lead, {figure: el, step: n, variant: v});
        }
        narrate(el, 'That was the last step.', {figure: el, variant: v});
      }
      return;
    }

    const intro = el.getAttribute('data-speech-intro');
    if (intro) narrate(el, `${intro}.`);

    if (el.tagName === 'TABLE') {
      const all = Array.from(el.querySelectorAll('tr'));
      const head = all.find((tr) => tr.querySelector('th') && !tr.querySelector('td'));
      const columns = head ? Array.from(head.children).map((c) => textOf(c)).filter(Boolean) : [];
      const rows = all.filter((tr) => tr.querySelector('td'));
      const cols = columns.length || Math.max(0, ...rows.map((r) => r.children.length));
      narrate(el, `A table follows, with ${plural(rows.length, 'row')} and ${plural(cols, 'column')}${columns.length ? `: ${list(columns)}` : ''}.`);
      rows.forEach((tr, k) => {
        const cells = Array.from(tr.children).filter((c) => !onlyLinks(c));
        const text = cells
          .map((c) => textOf(c))
          .map((t) => (/[.!?]$/.test(t) ? t : `${t}.`))
          .join(' ');
        shown(tr, text, `Row ${k + 1}.`);
      });
      return;
    }

    // A tab: say which one, as the tab strip above it shows.
    if (el.getAttribute('role') === 'tabpanel') {
      // The tab set's own tabs and panels, not those of a carousel inside it.
      const container = el.closest('.tabs-container');
      const panels = container ? Array.from(container.querySelectorAll(':scope > div > [role="tabpanel"]')) : [];
      const tabs = container ? Array.from(container.querySelectorAll(':scope > [role="tablist"] > [role="tab"]')) : [];
      const label = tabs[panels.indexOf(el)]?.textContent?.trim();
      if (label) narrate(el, `The ${label} tab.`);
    }

    if (LEAF.has(el.tagName) || (el.tagName === 'FIGCAPTION' && !el.querySelector('p, ul, ol, div'))) {
      if (!onlyLinks(el)) shown(el, textOf(el));
      // A list item's nested lists are read after it, item by item.
      if (el.tagName === 'LI') for (const child of Array.from(el.children)) if (child.tagName === 'UL' || child.tagName === 'OL') walk(child);
      return;
    }
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(root);
  return blocks;
}

/** Where a page's audio lives: speech/<page path>/, the path without the site's base. */
export const speechDir = (permalink: string, baseUrl: string): string =>
  (permalink.startsWith(baseUrl) ? permalink.slice(baseUrl.length) : permalink).replace(/^\/+|\/+$/g, '');

/** A word's timing: [start, end] in seconds, and [from, to] in its block's text. */
export type WordTime = [number, number, number, number];

export type Manifest = {
  version: 2;
  voices: {id: string; label: string; file: string; duration: number}[];
  blocks: {
    key: string;
    /** Per voice: the block's start and end, and the shown words' times. */
    times: Record<string, {start: number; end: number; words: WordTime[]}>;
  }[];
};
