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
//   build/speech/<page>/manifest.json each block's and sentence's times
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
import {SPEECH_ROOT, speechBlocks, speechDir} from '../src/lib/speech/blocks.ts';

const APP = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = path.join(APP, 'build');
const CACHE = path.join(APP, '..', '..', '.cache', 'speech');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'fp32'; // the full model: the best voices

/** The voices readers can choose from; the first is the default. */
const VOICES = [
  {id: 'af_heart', label: 'Heart (US English)'},
  {id: 'am_michael', label: 'Michael (US English)'},
];

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
  if (!pages.length) return console.log('speech: no page has `listen: true`');

  fs.mkdirSync(path.join(CACHE, 'clips'), {recursive: true});
  let tts;
  const clip = async (voice, text) => {
    const key = createHash('sha256').update(`${MODEL}|${DTYPE}|${voice}|${text}`).digest('hex').slice(0, 32);
    const file = path.join(CACHE, 'clips', `${key}.f32`);
    if (fs.existsSync(file)) {
      const b = fs.readFileSync(file);
      return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    }
    tts ??= await loadTTS();
    const audio = await tts.generate(text, {voice});
    fs.writeFileSync(file, Buffer.from(audio.audio.buffer, audio.audio.byteOffset, audio.audio.byteLength));
    return audio.audio;
  };

  for (const permalink of pages) {
    const dir = speechDir(permalink, baseUrl);
    const html = fs.readFileSync(path.join(BUILD, dir, 'index.html'), 'utf8');
    const {document} = new JSDOM(html).window;
    const root = document.querySelector(SPEECH_ROOT);
    if (!root) throw new Error(`speech: no page content in ${dir}`);
    const blocks = speechBlocks(root).map((b) => ({text: b.text, heading: b.heading, parts: sentences(b.text)}));
    const manifest = {version: 1, voices: [], blocks: blocks.map((b) => ({text: b.text, times: {}}))};
    const outDir = path.join(BUILD, 'speech', dir);
    fs.mkdirSync(outDir, {recursive: true});

    for (const voice of VOICES) {
      const pieces = [];
      let t = 0;
      const t0 = Date.now();
      for (const [i, block] of blocks.entries()) {
        const start = t;
        const times = [];
        for (const part of block.parts) {
          const samples = await clip(voice.id, spoken(part.text));
          const s = t;
          pieces.push(samples);
          t += samples.length / RATE;
          times.push([round(s), round(t), part.from, part.to]);
          pieces.push(silence(PAUSE.sentence));
          t += PAUSE.sentence;
        }
        const extra = (block.heading ? PAUSE.heading : PAUSE.block) - PAUSE.sentence;
        pieces.push(silence(extra));
        t += extra;
        manifest.blocks[i].times[voice.id] = {start: round(start), end: round(t), sentences: times};
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
