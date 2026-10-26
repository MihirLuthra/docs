// What "Listen" reads on a page, block by block, in reading order. The same
// code runs on the built HTML (scripts/speech.mjs, through jsdom) to make
// the audio, and in the browser to find each block again, so the two always
// agree. Plain TypeScript with no imports, so Node can run it as is.
//
// - Headings, paragraphs, list items, table rows (link-only cells such as a
//   "Docs" column are left out) are blocks.
// - Buttons, menus, navigation, pictures, code and anything marked
//   aria-hidden or data-speech-skip are never read.
// - A diagram marked data-speech="steps" is read one step at a time, from its
//   step panels (data-speech-step, data-speech-variant); while a step is read
//   the diagram shows it.
// - Hidden tab panels and diagram paths are blocks too (the audio has them);
//   the player skips what isn't showing.

/** The page's text: Docusaurus's doc content. */
export const SPEECH_ROOT = '.theme-doc-markdown';

export type SpeechBlock = {
  el: Element;
  text: string;
  heading: boolean;
  /** A diagram step: the diagram, the step's index and the path it belongs to. */
  figure?: Element;
  step?: number;
  variant?: string;
};

const SKIP =
  'button, nav, svg, img, picture, video, audio, canvas, select, input, textarea, script, style, pre, ' +
  '.theme-code-block, [role="tablist"], [aria-hidden="true"], [data-speech-skip], .hash-link';
const LEAF = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'DT', 'DD']);
// Inside a block, these end a phrase: a title above its text gets a full stop
// (a pause), other elements a space.
const PHRASES = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DT', 'DD']);
const SPACES = new Set(['BR', 'SPAN']);

/** Collapses whitespace and tidies spaces before punctuation. */
export const tidy = (t: string): string =>
  t
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?)])/g, '$1')
    .replace(/​/g, '')
    .trim();

/** The text of `el`, without what is never read and, for a list item, without its nested lists. */
function textOf(el: Element, nestedLists = false): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      out += node.nodeValue ?? '';
      return;
    }
    if (node.nodeType !== 1) return;
    const e = node as Element;
    if (e !== el && e.matches(SKIP)) return;
    if (!nestedLists && e !== el && (e.tagName === 'UL' || e.tagName === 'OL')) return;
    for (const child of Array.from(e.childNodes)) walk(child);
    if (e !== el && PHRASES.has(e.tagName)) out = /[.!?:]\s*$/.test(out) || !out.trim() ? `${out} ` : `${out.trimEnd()}. `;
    else if (SPACES.has(e.tagName)) out += ' ';
  };
  walk(el);
  return tidy(out);
}

/** Whether `el` holds nothing but links ("Read the … use case", a "Docs" cell): not read. */
function onlyLinks(el: Element): boolean {
  const text = textOf(el);
  const links = tidy(Array.from(el.querySelectorAll('a')).map((a) => a.textContent ?? '').join(' '));
  return !text || text.replace(/[,.\s]/g, '') === links.replace(/[,.\s]/g, '');
}

/** A table row: its cells, without cells that are only links (a "Docs" column). */
function rowText(tr: Element): string {
  const cells = Array.from(tr.children).filter((c) => !onlyLinks(c));
  return cells
    .map((c) => textOf(c))
    .map((t) => (/[.!?]$/.test(t) ? t : `${t}.`))
    .join(' ');
}

export function speechBlocks(root: Element): SpeechBlock[] {
  const blocks: SpeechBlock[] = [];
  const add = (el: Element, text: string, extra: Partial<SpeechBlock> = {}) => {
    if (text) blocks.push({el, text, heading: /^H\d$/.test(el.tagName), ...extra});
  };
  const walk = (el: Element) => {
    if (el.matches(SKIP)) return;
    if (el.matches('[data-speech="steps"]')) {
      for (const panel of Array.from(el.querySelectorAll('[data-speech-step]'))) {
        add(panel, textOf(panel), {
          figure: el,
          step: Number(panel.getAttribute('data-speech-step')),
          variant: panel.getAttribute('data-speech-variant') ?? undefined,
        });
      }
      return;
    }
    // Row by row, header rows left out.
    if (el.tagName === 'TABLE') {
      for (const tr of Array.from(el.querySelectorAll('tr'))) if (tr.querySelector('td')) add(tr, rowText(tr));
      return;
    }
    if (LEAF.has(el.tagName)) {
      if (!onlyLinks(el)) add(el, textOf(el));
      // A list item's nested lists are read after it, item by item.
      if (el.tagName === 'LI') for (const list of Array.from(el.children)) if (list.tagName === 'UL' || list.tagName === 'OL') walk(list);
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

export type Manifest = {
  version: 1;
  voices: {id: string; label: string; file: string; duration: number}[];
  blocks: {
    text: string;
    /** Per voice: the block's start and end, and its sentences [start, end, first char, last char + 1]. */
    times: Record<string, {start: number; end: number; sentences: [number, number, number, number][]}>;
  }[];
};
