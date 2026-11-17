// The Get Into timeline, derived from a guide's pillars.
// Shared by the engine (in the browser) and build.mjs (in Node, to cut the sound track).
export const PALETTE = ['#22e3f5', '#9b5cff', '#ff2d95', '#39ff88', '#ffb11f'];
export const DROP_T = 0.5;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wordCount = s => s.trim().split(/\s+/).filter(Boolean).length;

export function computeTimeline(G) {
  const pillars = G.pillars.slice(0, 5).map((p, i) => ({
    num: String(i + 1).padStart(2, '0'), name: String(p.name).toUpperCase(), desc: String(p.desc),
    color: p.color || PALETTE[i % PALETTE.length],
  }));
  const n = pillars.length;
  // Frame 0 is the finished title frame. Each step holds long enough to read:
  // about 3.2 words per second plus a beat, never under 3 seconds.
  const T = { titleHold: 2.6, trans: 1.3, land: [], textDone: [], hold: [], stepEnd: [], rowStagger: 0.16, urlCps: 26 };
  // The title frame is finished at frame 0 except for one thing: the command types itself in,
  // then "runs", and that is what sets the slabs moving.
  const cmd = './getinto --campo=' + G.slug;
  T.typeStart = 0.45; T.typeCps = 15;
  T.typeEnd = T.typeStart + cmd.length / T.typeCps;
  T.titleHold = Math.max(2.6, T.typeEnd + 0.75);
  let t = T.titleHold + T.trans;
  pillars.forEach((p, i) => {
    T.land[i] = t;                         // the slab hits the stack
    T.textDone[i] = t + 0.65;              // card text fully on screen
    T.hold[i] = clamp((wordCount(p.name) + wordCount(p.desc)) / 3.2 + 0.9, 3.0, 5.5);
    T.stepEnd[i] = T.textDone[i] + T.hold[i];
    t = T.stepEnd[i] + 0.55;
  });
  T.recapIn = T.stepEnd[n - 1] + 0.35;
  T.whyIn = T.recapIn + 0.5 + n * T.rowStagger;
  T.webEnd = T.whyIn + 1.0;                // web players hold here
  T.outroIn = T.whyIn + 2.6;
  T.urlStart = T.outroIn + 0.9;
  T.tagIn = T.outroIn + 1.9;
  const duration = Math.ceil(T.outroIn + 4.2);
  const url = G.url || 'losnerdys.tech/getinto';
  // where "back" and "forward" land: the title, each pillar's drop, the finished stack
  const chapters = [{ t: 0, label: 'Title' }, ...pillars.map((p, i) => ({ t: T.land[i] - DROP_T - 0.05, label: `${p.num} ${p.name}` })), { t: T.recapIn - 0.1, label: 'The stack' }];
  return { pillars, n, T, duration, url, chapters, cmd,
    forSound: { ...T, duration, n, url, cmd, descs: pillars.map(p => p.desc), webDuration: T.webEnd + 3.2 } };
}
