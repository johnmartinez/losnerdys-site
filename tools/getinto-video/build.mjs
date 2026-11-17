// Get Into video builder (engine v2, 2.5D).
//   node build.mjs <guide.md|guide.json>                    -> standalone HTML + landscape & portrait MP4s (with sound)
//   node build.mjs <guide> --stills 0,5.2,12 [--only portrait]  -> PNG stills
//   node build.mjs <guide> --html-only                      -> just the standalone HTML (everything inlined)
//   node build.mjs <guide> --site --out getinto/player      -> site player: getinto-<slug>.html + getinto-<slug>.mp3 + shared getinto-engine.js
//   add --no-sound to skip the web sound track
// The guide is a Jekyll .md with front matter (slug, title, short, pillars) or a .json file.
// Needs: Node 18+. For sound: ffmpeg and python3 + numpy. For MP4s also Playwright with Chromium.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const guidePath = resolve(args[0] || 'guides/cyber.json');
const stills = opt('--stills'), only = opt('--only'), site = args.includes('--site');
const htmlOnly = args.includes('--html-only') || site;
const outDir = resolve(opt('--out') || 'out');
mkdirSync(outDir, { recursive: true });

// ---- guide ----
const raw = readFileSync(guidePath, 'utf8');
let guide;
if (guidePath.endsWith('.md')) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) throw new Error('no front matter in ' + guidePath);
  const y = require('js-yaml').load(fm[1]);
  guide = { slug: y.slug || basename(guidePath, '.md'), title: y.title, short: y.short,
    pillars: (y.pillars || []).map(p => ({ name: p.name, desc: p.desc, color: p.color })) };
} else guide = JSON.parse(raw);
if (!guide.pillars || guide.pillars.length < 3 || guide.pillars.length > 5)
  throw new Error(`${guidePath}: needs 3 to 5 pillars (has ${guide.pillars ? guide.pillars.length : 0})`);
const slug = guide.slug;
const { computeTimeline } = await import(resolve(here, 'src/timeline.js'));
const timeline = computeTimeline(guide).forSound;
const tlPath = `${outDir}/.timeline-${slug}.json`;

// ---- sound: the web cut (stops at the finished stack) as an mp3 ----
function webSound() {
  if (args.includes('--no-sound')) return null;
  try {
    const wav = `${outDir}/.web-${slug}.wav`, mp3 = `${outDir}/.web-${slug}.mp3`;
    writeFileSync(tlPath, JSON.stringify(timeline));
    execFileSync('python3', [resolve(here, 'sound.py'), tlPath, wav, 'web'], { stdio: ['ignore', 'ignore', 'inherit'] });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
    const buf = readFileSync(mp3); [wav, mp3, tlPath].forEach(f => rmSync(f, { force: true }));
    return buf;
  } catch (e) { console.warn('sound  skipped (needs python3 + numpy and ffmpeg):', e.message.split('\n')[0]); return null; }
}

// ---- engine bundle (Three.js + engine, tree-shaken) ----
const bundle = require('esbuild').buildSync({
  entryPoints: [resolve(here, 'src/engine.js')], bundle: true, minify: true, format: 'iife', target: 'es2020',
  write: false, legalComments: 'none', absWorkingDir: here,
}).outputFiles[0].text;

// ---- page ----
const b64 = p => readFileSync(p).toString('base64');
const font = (pkg, file) => b64(require.resolve(`@fontsource/${pkg}/files/${file}`));
const face = (fam, w, pkg) => `@font-face { font-family:'${fam}'; font-weight:${w}; src:url(data:font/woff2;base64,${font(pkg, `${pkg}-latin-${w}-normal.woff2`)}) format('woff2'); }`;
const inlineFonts = `<style>\n${[face('Figtree', 500, 'figtree'), face('Figtree', 700, 'figtree'), face('JetBrains Mono', 400, 'jetbrains-mono'), face('JetBrains Mono', 800, 'jetbrains-mono')].join('\n')}\n</style>`;
const siteFonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;700&family=JetBrains+Mono:wght@400;800&display=swap" rel="stylesheet">`;
const calPath = process.env.CALAVERA || [resolve(here, '../../assets/calavera.png'), resolve(here, 'calavera.png')].find(existsSync);
const page = ({ fonts, cal, engine, audio }) => readFileSync(resolve(here, 'template.html'), 'utf8')
  .replace('{{FONTS}}', () => fonts).replace('{{CAL}}', () => cal).replace('{{AUDIO}}', () => JSON.stringify(audio || ''))
  .replace('{{GUIDE}}', () => JSON.stringify(guide).replace(/</g, '\\u003c'))
  .replace('{{ENGINE}}', () => engine);

if (site) {
  writeFileSync(`${outDir}/getinto-engine.js`, bundle);
  const snd = webSound();
  if (snd) writeFileSync(`${outDir}/getinto-${slug}.mp3`, snd);
  writeFileSync(`${outDir}/getinto-${slug}.html`, page({ fonts: siteFonts, cal: '/assets/calavera.png', engine: '<script src="getinto-engine.js"></script>', audio: snd ? `getinto-${slug}.mp3` : '' }));
  console.log('site  ', `${outDir}/getinto-${slug}.html`, snd ? `+ getinto-${slug}.mp3 (${Math.round(snd.length / 1024)} KB)` : '(no sound)', `+ getinto-engine.js (${Math.round(bundle.length / 1024)} KB)`);
  process.exit(0);
}
const htmlPath = `${outDir}/getinto-${slug}.html`;
const snd = (stills || only) ? null : webSound();
writeFileSync(htmlPath, page({ fonts: inlineFonts, cal: 'data:image/png;base64,' + b64(calPath), engine: `<script>${bundle.replace(/<\/script/g, '<\\/script')}</script>`, audio: snd ? 'data:audio/mpeg;base64,' + snd.toString('base64') : '' }));
console.log('html  ', htmlPath);
if (htmlOnly) process.exit(0);

// ---- render ----
const FPS = 30;
const SPECS = {
  landscape: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },  // 1920x1080
  portrait: { viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 },    // 1080x1920
};
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const open = async fmt => {
  const pg = await browser.newPage(SPECS[fmt]);
  pg.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await pg.goto(`file://${htmlPath}?render&format=${fmt}`);
  await pg.evaluate(() => window.READY);
  return pg;
};
const formats = Object.keys(SPECS).filter(f => !only || f === only);

if (stills) {
  for (const fmt of formats) {
    const pg = await open(fmt);
    for (const s of stills.split(',')) { await pg.evaluate(t => window.renderAt(t), Number(s)); await pg.screenshot({ path: `${outDir}/still-${slug}-${fmt}-${s}.png` }); }
    await pg.close();
  }
  await browser.close(); process.exit();
}

let wav = null;
await Promise.all(formats.map(async fmt => {
  const pg = await open(fmt);
  const tl = timeline;
  if (!wav) {
    wav = `${outDir}/sound-${slug}.wav`;
    writeFileSync(tlPath, JSON.stringify(tl));
    execFileSync('python3', [resolve(here, 'sound.py'), tlPath, wav], { stdio: 'inherit' });
    rmSync(tlPath, { force: true });
  }
  const mp4 = `${outDir}/getinto-${slug}-${fmt}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const total = Math.round(tl.duration * FPS);
  for (let f = 0; f < total; f++) {
    await pg.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${fmt} ${f}/${total}`);
  }
  ff.stdin.end(); await done; await pg.close();
  console.log('video ', mp4);
}));
await browser.close();
