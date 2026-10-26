// Makes the "Listen" audio for pages with `listen: true` in front matter.
// Run after `docusaurus build`, with the same DOCS_BASE_URL:
//
//   pnpm build && pnpm speech
//
// For each page it reads the built HTML (jsdom parses it as a browser does)
// with the same block extractor the browser uses (src/lib/speech/blocks.ts), voices every sentence with Kokoro
// (open-source, runs on the CPU), and writes, next to the page:
//
//   build/speech/<page>/<voice>.mp3   the whole page, one file per voice
//   build/speech/<page>/manifest.json each block's and each word's times
//
// Every sentence's audio is cached by voice and text in .cache/speech/clips,
// so a rebuild only voices what changed. The Kokoro model (~330 MB) is
// downloaded once into .cache/speech/models. Nothing here ships to the browser.

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
import {Mp3Encoder} from '@breezystack/lamejs';
import {KokoroTTS} from 'kokoro-js';
import {SPEECH_ROOT, speechBlocks, speechDir, speechKey} from '../src/lib/speech/blocks.ts';

const APP = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = path.join(APP, 'build');
const CACHE = path.join(APP, '..', '..', '.cache', 'speech');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'fp32'; // the full model: the best voices

/** The voices readers can choose from; the first is the default. One for now. */
const VOICES = [{id: 'af_heart', label: 'Heart (US English)'}];

const RATE = 24000; // Kokoro's sample rate
const KBPS = 48; // mono MP3, plenty for speech (~360 KB a minute)
const PAUSE = {sentence: 0.25, block: 0.5, heading: 0.7}; // seconds after each

// Read letter by letter rather than as a word ("TEE" is not "tee").
const SPELLED = ['TEE', 'TEEs', 'CCM', 'DSM', 'NCP', 'NCPs', 'SMT', 'TDX', 'SGX', 'SNP', 'SEV', 'TLS', 'mTLS', 'CA', 'CSR', 'TCB', 'CoCo', 'CPU', 'GPU', 'API', 'PKI', 'OCI', 'CVM', 'LLM'];
const SAY = {
  CoCo: 'Coco',
  mTLS: 'M T L S',
  TEEs: 'T E Es',
  NCPs: 'N C Ps',
};

/** The words Kokoro is given for a sentence, as it should be said. */
function spoken(text) {
  let t = text.replace(/·/g, ',').replace(/\s+/g, ' ');
  t = t.replace(/\bSEV-SNP\b/g, 'S E V S N P');
  for (const word of SPELLED) {
    const say = SAY[word] ?? word.split('').join(' ');
    t = t.replace(new RegExp(`\\b${word}\\b`, 'g'), say);
  }
  return t.trim();
}

/** Sentences of a block, with where each starts and ends in its text. */
function sentences(text) {
  const out = [];
  let start = 0;
  // Split after . ! ? followed by a space and a capital or a digit; keep "e.g." and "v1.2" together.
  const cuts = [];
  for (const m of text.matchAll(/[.!?](?=\s+[A-Z0-9"“(])/g)) {
    const before = text.slice(Math.max(0, m.index - 4), m.index + 1);
    if (/\b(e\.g|i\.e|vs|etc)\.$/i.test(before)) continue;
    cuts.push(m.index + 1);
  }
  for (const cut of [...cuts, text.length]) {
    const raw = text.slice(start, cut);
    const lead = raw.length - raw.trimStart().length;
    const s = raw.trim();
    if (s) out.push({text: s, from: start + lead, to: start + lead + s.length});
    start = cut;
  }
  return out;
}

const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** About how long a word takes to say: its syllables, as it is said ("TEE" is three letters). */
function weight(word) {
  const said = spoken(word.replace(/[^\p{L}\p{N}-]+/gu, ' ')).split(/[\s-]+/).filter(Boolean);
  return 0.3 + said.reduce((n, w) => n + (w.length === 1 ? 1 : Math.max(1, (w.match(/[aeiouy]+/gi) ?? []).length)), 0);
}

// Pauses in a clip: 10 ms frames quieter than this share of its loudest
// frame, for at least this many frames.
const FRAME = 240;
const QUIET = 0.08;
const PAUSE_FRAMES = 7;

/**
 * When each word of a sentence is said, from its clip. Kokoro gives no
 * timings, so: find the pauses in the audio, give each run of words between
 * commas and full stops its own stretch of speech, and share each stretch
 * among its words by their syllables.
 */
function wordTimes(samples, text, offset, t0) {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({
    from: offset + m.index,
    to: offset + m.index + m[0].length,
    w: weight(m[0]),
    stop: /[,;:.!?)]$/.test(m[0]),
  }));
  if (!words.length) return [];
  const n = Math.ceil(samples.length / FRAME);
  const rms = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * FRAME);
    for (let i = f * FRAME; i < end; i++) sum += samples[i] * samples[i];
    rms[f] = Math.sqrt(sum / Math.max(1, end - f * FRAME));
  }
  const peak = rms.reduce((a, b) => Math.max(a, b), 0);
  const loud = (f) => rms[f] > Math.max(0.004, peak * QUIET);
  let first = 0;
  while (first < n - 1 && !loud(first)) first++;
  let last = n - 1;
  while (last > first && !loud(last)) last--;
  // Stretches of speech between pauses.
  const stretches = [];
  let a = first;
  for (let f = first; f <= last; f++) {
    if (loud(f)) continue;
    let g = f;
    while (g <= last && !loud(g)) g++;
    if (g - f >= PAUSE_FRAMES) {
      stretches.push([a, f]);
      a = g;
    }
    f = g - 1;
  }
  stretches.push([a, last + 1]);
  // Runs of words, split after commas and full stops.
  const runs = [[]];
  words.forEach((w, i) => {
    runs[runs.length - 1].push(w);
    if (w.stop && i < words.length - 1) runs.push([]);
  });
  const sec = (f) => round(t0 + (f * FRAME) / RATE);
  const out = [];
  const share = (list, [from, to]) => {
    const total = list.reduce((x, w) => x + w.w, 0);
    let at = from;
    for (const w of list) {
      const len = ((to - from) * w.w) / total;
      out.push([sec(at), sec(at + len), w.from, w.to]);
      at += len;
    }
  };
  // Make them line up: more pauses than commas (a breath) joins the stretches
  // closest together; fewer (a comma said without a pause) joins the runs
  // with the fewest syllables.
  while (stretches.length > runs.length) {
    let k = 0;
    for (let j = 1; j < stretches.length - 1; j++) if (stretches[j + 1][0] - stretches[j][1] < stretches[k + 1][0] - stretches[k][1]) k = j;
    stretches.splice(k, 2, [stretches[k][0], stretches[k + 1][1]]);
  }
  const weightOf = (run) => run.reduce((x, w) => x + w.w, 0);
  while (runs.length > stretches.length) {
    let k = 0;
    for (let j = 1; j < runs.length - 1; j++) if (weightOf(runs[j]) + weightOf(runs[j + 1]) < weightOf(runs[k]) + weightOf(runs[k + 1])) k = j;
    runs.splice(k, 2, [...runs[k], ...runs[k + 1]]);
  }
  runs.forEach((run, k) => share(run, stretches[k]));
  return out;
}

function mp3(samples) {
  const enc = new Mp3Encoder(1, RATE, KBPS);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

async function loadTTS() {
  // kokoro-js downloads the model through Hugging Face's transformers.js;
  // point its cache at .cache/speech/models instead of node_modules.
  // Its ES module build: the instance kokoro-js imports (the CommonJS one is another).
  const fromKokoro = createRequire(createRequire(import.meta.url).resolve('kokoro-js'));
  const cjs = fromKokoro.resolve('@huggingface/transformers'); // dist/transformers.node.cjs
  const transformers = await import(pathToFileURL(cjs.replace(/\.cjs$/, '.mjs')).href);
  transformers.env.cacheDir = path.join(CACHE, 'models');
  return KokoroTTS.from_pretrained(MODEL, {dtype: DTYPE, device: 'cpu'});
}

async function main() {
  const listFile = path.join(APP, '.docusaurus', 'speech-pages.json');
  if (!fs.existsSync(listFile)) throw new Error('speech: run `pnpm build` first (no .docusaurus/speech-pages.json)');
  const {baseUrl, pages} = JSON.parse(fs.readFileSync(listFile, 'utf8'));
  if (!pages.length) return console.log('speech: no pages to voice');

  fs.mkdirSync(path.join(CACHE, 'clips'), {recursive: true});
  let tts;
  const clip = async (voice, text) => {
    const key = createHash('sha256').update(`${MODEL}|${DTYPE}|${voice}|${text}`).digest('hex').slice(0, 32);
    // 16-bit, as it ends up in the MP3 anyway: half the size of the model's floats.
    const file = path.join(CACHE, 'clips', `${key}.i16`);
    if (fs.existsSync(file)) {
      const b = fs.readFileSync(file);
      const pcm = new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2);
      return Float32Array.from(pcm, (v) => v / 0x7fff);
    }
    tts ??= await loadTTS();
    const {audio} = await tts.generate(text, {voice});
    const pcm = Int16Array.from(audio, (v) => Math.max(-1, Math.min(1, v)) * 0x7fff);
    fs.writeFileSync(file, Buffer.from(pcm.buffer));
    return audio;
  };

  for (const permalink of pages) {
    const dir = speechDir(permalink, baseUrl);
    const html = fs.readFileSync(path.join(BUILD, dir, 'index.html'), 'utf8');
    const {document} = new JSDOM(html).window;
    const root = document.querySelector(SPEECH_ROOT);
    if (!root) throw new Error(`speech: no page content in ${dir}`);
    // Each block's sentences: shown ones with where they are in its text, narration without.
    const blocks = speechBlocks(root).map((b) => ({
      key: speechKey(b),
      heading: b.heading,
      sentences: b.parts.flatMap((p) =>
        p.from === undefined ? [{text: p.say}] : sentences(p.say).map((x) => ({...x, from: x.from + p.from, to: x.to + p.from})),
      ),
    }));
    const manifest = {version: 2, voices: [], blocks: blocks.map((b) => ({key: b.key, times: {}}))};
    const outDir = path.join(BUILD, 'speech', dir);
    fs.mkdirSync(outDir, {recursive: true});

    for (const voice of VOICES) {
      const pieces = [];
      let t = 0;
      const t0 = Date.now();
      for (const [i, block] of blocks.entries()) {
        const start = t;
        const words = [];
        for (const sentence of block.sentences) {
          const samples = await clip(voice.id, spoken(sentence.text));
          if (sentence.from !== undefined) words.push(...wordTimes(samples, sentence.text, sentence.from, t));
          pieces.push(samples);
          t += samples.length / RATE;
          pieces.push(silence(PAUSE.sentence));
          t += PAUSE.sentence;
        }
        const extra = (block.heading ? PAUSE.heading : PAUSE.block) - PAUSE.sentence;
        pieces.push(silence(extra));
        t += extra;
        manifest.blocks[i].times[voice.id] = {start: round(start), end: round(t), words};
      }
      const all = new Float32Array(pieces.reduce((n, p) => n + p.length, 0));
      let at = 0;
      for (const p of pieces) {
        all.set(p, at);
        at += p.length;
      }
      const file = `${voice.id}.mp3`;
      fs.writeFileSync(path.join(outDir, file), mp3(all));
      manifest.voices.push({id: voice.id, label: voice.label, file, duration: round(t)});
      console.log(`speech: ${dir} ${voice.id} ${Math.round(t)}s of audio in ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest));
  }
}

const round = (n) => Math.round(n * 1000) / 1000;

await main();
