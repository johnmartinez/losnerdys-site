// Los Nerdys "Get Into" engine v2: a 2.5D scene (Three.js) plus a crisp DOM overlay.
// renderAt(t) fully defines a frame, so video frames can be stepped exactly.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Vector2, Vector3, Color, BoxGeometry, PlaneGeometry, Mesh,
  ShaderMaterial, CanvasTexture, Points, BufferGeometry, Float32BufferAttribute, AdditiveBlending, Group,
  ColorManagement, LinearSRGBColorSpace, LinearMipmapLinearFilter, LinearFilter,
} from 'three';
import { computeTimeline, PALETTE, DROP_T } from './timeline.js';

// ---------- guide data ----------
// { slug, title, short?, pillars:[{name, desc, color?}], url? }  (3 to 5 pillars)
const G = JSON.parse(document.getElementById('guide').textContent);
const TL = computeTimeline(G);
const PILLARS = TL.pillars, N = TL.n, T = TL.T, DURATION = TL.duration, URL_TEXT = TL.url, CHAPTERS = TL.chapters;
const NUM_WORDS = ['', '1 pilar', '2 pilares', '3 pilares', '4 pilares', '5 pilares'];
const CMD = TL.cmd;
window.TIMELINE = TL.forSound;
window.DURATION = DURATION;

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, s, d) => clamp((t - s) / d);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const rad = d => d * Math.PI / 180;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const typed = (str, t, start, cps) => str.slice(0, Math.floor(clamp((t - start) * cps, 0, str.length)));
const blink = (t, on = true) => '<span class="cursor" style="opacity:' + (on && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0) + '"></span>';
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- world ----------
const SW = 4.2, SH = 0.8, SD = 2.6, GAP = 0.07;     // slab size
const HT = N * SH + (N - 1) * GAP;                    // finished stack height
const EXG = 0.78, EXB = 0.55;                         // title "exploded" spacing and hover
const EXH = HT + EXB + (N - 1) * EXG;
const DROP = 9;
const FOV = 20;
const restY = i => i * (SH + GAP);
const TITLE_FIT = Math.max(1, EXH / (4 * SH + 3 * GAP + EXB + 3 * EXG));

const LAYOUTS = {
  landscape: {
    W: 1280, H: 720, calBase: 400,
    cam: {
      title: { sx: 968, sy: 388, dist: 25.5, az: 37, el: 16 },
      steps: { sx: 372, sy: 420, dist: 20.5, az: 27, el: 22 },
      recap: { sx: 318, sy: 404, dist: 23.5, az: 24, el: 22 },
      outro: { sx: 640, sy: 430, dist: 31, az: 13, el: 20 },
    },
    cal: { title: { x: 80, y: 42, s: 160 }, head: { x: 80, y: 36, s: 70 }, outro: { x: 510, y: 146, s: 260 } },
    card: { x: 700, cy: 392 },
    rows: { x: 592, w: 628 },
    why: { x: 592, y: 632 },
    titleMax: 590, headMax: 600,
  },
  portrait: {
    W: 1080, H: 1920, calBase: 440,
    cam: {
      title: { sx: 590, sy: 1246, dist: 53, az: 36, el: 16 },
      steps: { sx: 508, sy: 712, dist: 42.5, az: 27, el: 22 },
      recap: { sx: 528, sy: 652, dist: 50, az: 24, el: 22 },
      outro: { sx: 540, sy: 1020, dist: 66, az: 13, el: 20 },
    },
    cal: { title: { x: 72, y: 206, s: 176 }, head: { x: 72, y: 208, s: 94 }, outro: { x: 320, y: 570, s: 440 } },
    card: { x: 72, top: 1066 },
    rows: { x: 72, w: 888, y0: 944, h: 520 },
    why: { x: 72, y: 1476 },
    titleMax: 900, headMax: 770,
  },
};

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const EMBED = params.has('embed') || window.GETINTO_EMBED === true;
let fmt = 'landscape', L = LAYOUTS.landscape;

// ---------- three.js scene ----------
ColorManagement.enabled = false;   // work in display-referred sRGB, so hex tokens match the site exactly
const renderer = new WebGLRenderer({ canvas: $('gl'), antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.outputColorSpace = LinearSRGBColorSpace;
renderer.setClearColor(0x0b0814, 1);
const scene = new Scene();
const camera = new PerspectiveCamera(FOV, 16 / 9, 1, 400);

// floor: neon grid, a glow pool under the stack, and a wave that rolls out on each landing
const floorMat = new ShaderMaterial({
  transparent: true, depthWrite: false, blending: AdditiveBlending,
  uniforms: { uGrid: { value: new Color('#9b5cff') }, uPool: { value: new Color('#9b5cff') }, uPoolI: { value: 0.3 },
    uWaveT: { value: 99 }, uWaveC: { value: new Color('#22e3f5') } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    uniform vec3 uGrid, uPool, uWaveC; uniform float uPoolI, uWaveT; varying vec3 vW;
    void main(){
      vec2 c = vW.xz / 1.3;
      vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
      float line = 1.0 - min(min(g.x, g.y), 1.0);
      float r = length(vW.xz);
      float fade = 1.0 - smoothstep(5.0, 30.0, r);
      float wave = exp(-pow((r - 1.5 - uWaveT * 13.0) / 1.3, 2.0)) * exp(-uWaveT * 1.5);
      vec3 col = uGrid * line * 0.34 * fade;
      col += uWaveC * wave * (line * 1.3 + 0.10) * fade;
      col += uPool * uPoolI * exp(-r * r / 20.0) * 0.42;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const floor = new Mesh(new PlaneGeometry(140, 140).rotateX(-Math.PI / 2), floorMat);
scene.add(floor);

function faceMat(color, sx, sy, shade, map, grid) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uSize: { value: new Vector2(sx, sy) }, uShade: { value: shade },
      uLit: { value: 1 }, uPulse: { value: 0 }, uMap: { value: map || null }, uHasMap: { value: map ? 1 : 0 }, uGridOn: { value: grid ? 1 : 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec2 uSize; uniform float uShade, uLit, uPulse, uHasMap, uGridOn; uniform sampler2D uMap; varying vec2 vUv;
      void main(){
        vec2 p = vUv * uSize; vec2 e = min(p, uSize - p); float d = min(e.x, e.y);
        float aa = fwidth(d) * 1.2;
        float line = 1.0 - smoothstep(0.034 - aa, 0.034 + aa, d);
        float glow = exp(-d * 6.5);
        vec3 surf = vec3(0.086, 0.063, 0.161);
        vec3 base = mix(surf, uColor, 0.05 + 0.11 * uLit) * uShade;
        base += uColor * uShade * 0.09 * uLit * (1.0 - vUv.y) * (1.0 - uGridOn);
        float grid = 0.0;
        if (uGridOn > 0.5) { vec2 c = p / 0.26; vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c); grid = (1.0 - min(min(g.x, g.y), 1.0)) * 0.20; }
        vec3 col = base + uColor * grid * (0.35 + 0.65 * uLit) * uShade;
        col += uColor * glow * (0.08 + 0.30 * uLit + 0.9 * uPulse) * uShade;
        col += uColor * line * (0.42 + 0.58 * uLit + uPulse);
        col += vec3(1.0) * uPulse * 0.16 * uShade;
        if (uHasMap > 0.5) { vec4 m = texture2D(uMap, vUv); col = mix(col, m.rgb * (0.5 + 0.5 * uLit) + vec3(uPulse * 0.25), m.a); }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function labelTexture(p) {
  const cw = 2048, ch = Math.round(cw * SH / SW);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  const fs = ch * 0.56, pad = ch * 0.30, gap = fs * 0.42, y = ch / 2 + fs * 0.05;
  x.textBaseline = 'middle';
  x.font = `800 ${fs}px "JetBrains Mono"`;
  const numW = x.measureText(p.num).width;
  x.fillStyle = '#ffb11f'; x.shadowColor = 'rgba(255,177,31,.55)'; x.shadowBlur = 22;
  x.fillText(p.num, pad, y);
  const max = cw - pad * 2 - numW - gap;
  let nfs = fs; const nameW = x.measureText(p.name).width;
  if (nameW > max) nfs = fs * max / nameW;
  x.font = `800 ${nfs}px "JetBrains Mono"`;
  x.fillStyle = p.color; x.shadowColor = p.color; x.shadowBlur = 26;
  x.fillText(p.name, pad + numW + gap, y);
  const tex = new CanvasTexture(c);
  tex.generateMipmaps = true; tex.minFilter = LinearMipmapLinearFilter; tex.magFilter = LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const stack = new Group(); scene.add(stack);
const slabGeo = new BoxGeometry(SW, SH, SD);
const haloGeo = new PlaneGeometry(1, 1);
const slabs = [];
function buildSlabs() {
  PILLARS.forEach((p, i) => {
    const mx = faceMat(p.color, SD, SH, 0.52), my = faceMat(p.color, SW, SD, 1.0, null, true);
    const mzF = faceMat(p.color, SW, SH, 0.80, labelTexture(p)), mzB = faceMat(p.color, SW, SH, 0.5);
    const mesh = new Mesh(slabGeo, [mx, mx, my, my, mzF, mzB]);
    stack.add(mesh);
    const halo = new Mesh(haloGeo, new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color(p.color) }, uI: { value: 0.3 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
        void main(){ vec2 q = (vUv - 0.5) * 2.0; float a = exp(-dot(q, q) * 3.2) * (1.0 - smoothstep(0.75, 1.0, length(q))); gl_FragColor = vec4(uColor * a * uI, 1.0); }`,
    }));
    halo.scale.set(SW * 2.5, SH * 7.5, 1);
    scene.add(halo);
    const ring = new Mesh(new PlaneGeometry(SW + 9, SD + 9).rotateX(-Math.PI / 2), new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color(p.color) }, uGrow: { value: 0 }, uFade: { value: 0 }, uHalf: { value: new Vector2(SW / 2, SD / 2) }, uSize: { value: new Vector2(SW + 9, SD + 9) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uGrow, uFade; uniform vec2 uHalf, uSize; varying vec2 vUv;
        void main(){ vec2 p = (vUv - 0.5) * uSize; vec2 q = abs(p) - (uHalf + uGrow); float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          float a = exp(-abs(d) * 7.0) + 0.25 * exp(-abs(d) * 1.6); gl_FragColor = vec4(uColor * a * uFade, 1.0); }`,
    }));
    ring.visible = false; scene.add(ring);
    slabs.push({ mesh, mats: [mx, my, mzF, mzB], halo, ring, color: new Color(p.color), p });
  });
}

// particles: slow ambient dust plus a burst on every landing
const R = rng(20261112);
const DUST = 240, PB = 34;
const dust = Array.from({ length: DUST }, () => ({ x: lerp(-15, 15, R()), y: R() * 13, z: lerp(-12, 12, R()), sp: lerp(0.12, 0.5, R()), ph: R() * 6.28, size: lerp(0.035, 0.11, R()), c: new Color(PALETTE[Math.floor(R() * 5)]) }));
const bursts = PILLARS.map((p, i) => Array.from({ length: PB }, () => {
  const side = Math.floor(R() * 4), u = R() * 2 - 1;
  const px = side < 2 ? u * SW / 2 : (side === 2 ? -SW / 2 : SW / 2), pz = side < 2 ? (side === 0 ? SD / 2 : -SD / 2) : u * SD / 2;
  const nx = side < 2 ? u * 0.5 : (side === 2 ? -1 : 1), nz = side < 2 ? (side === 0 ? 1 : -1) : u * 0.5;
  const nl = Math.hypot(nx, nz), spd = lerp(1.6, 5.0, R());
  return { x: px, y: restY(i) + 0.04, z: pz, vx: nx / nl * spd, vy: lerp(0.5, 2.8, R()), vz: nz / nl * spd, size: lerp(0.05, 0.13, R()), life: lerp(0.5, 0.95, R()) };
}));
const PN = DUST + N * PB;
const pGeo = new BufferGeometry();
const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pSize = new Float32Array(PN), pAlpha = new Float32Array(PN);
pGeo.setAttribute('position', new Float32BufferAttribute(pPos, 3));
pGeo.setAttribute('aColor', new Float32BufferAttribute(pCol, 3));
pGeo.setAttribute('aSize', new Float32BufferAttribute(pSize, 1));
pGeo.setAttribute('aAlpha', new Float32BufferAttribute(pAlpha, 1));
const pMat = new ShaderMaterial({
  transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uPx: { value: 1000 } },
  vertexShader: `attribute float aSize, aAlpha; attribute vec3 aColor; uniform float uPx; varying float vA; varying vec3 vC;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(aSize * uPx / -mv.z, 1.0); vA = aAlpha; vC = aColor; }`,
  fragmentShader: `varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * a * vA, 1.0); }`,
});
const points = new Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
dust.forEach((d, k) => { pCol.set([d.c.r, d.c.g, d.c.b], k * 3); pSize[k] = d.size; });
PILLARS.forEach((p, i) => { const c = new Color(p.color); bursts[i].forEach((b, k) => { const j = DUST + i * PB + k; pCol.set([lerp(c.r, 1, 0.25), lerp(c.g, 1, 0.25), lerp(c.b, 1, 0.25)], j * 3); pSize[j] = b.size; }); });
pGeo.attributes.aColor.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true;

// ---------- camera ----------
const UP = new Vector3(0, 1, 0), dir = new Vector3(), right = new Vector3(), upc = new Vector3(), target = new Vector3(), focus = new Vector3(), v = new Vector3();
const mixPose = (a, b, k) => ({ sx: lerp(a.sx, b.sx, k), sy: lerp(a.sy, b.sy, k), dist: lerp(a.dist, b.dist, k), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k) });
// Puts world point `f` at stage pixel (sx, sy), seen from azimuth/elevation at distance dist.
function setCam(pose, f) {
  const az = rad(pose.az), el = rad(pose.el);
  dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  right.crossVectors(UP, dir).normalize();
  upc.crossVectors(dir, right).normalize();
  const halfH = pose.dist * Math.tan(rad(FOV / 2)), halfW = halfH * camera.aspect;
  const ox = pose.sx / L.W * 2 - 1, oy = 1 - pose.sy / L.H * 2;
  target.copy(f).addScaledVector(right, -ox * halfW).addScaledVector(upc, -oy * halfH);
  camera.position.copy(target).addScaledVector(dir, pose.dist);
  camera.up.copy(UP); camera.lookAt(target); camera.updateMatrixWorld();
}
function project(x, y, z) { v.set(x, y, z).project(camera); return [(v.x + 1) / 2 * L.W, (1 - v.y) / 2 * L.H]; }

// ---------- DOM ----------
const el = {};
['stage', 'cal', 'titleCard', 'prompt', 'title', 'sub', 'header', 'hTitle', 'pips', 'card', 'rows', 'why', 'outroBg', 'url', 'tag', 'fx', 'conn', 'connDot', 'rconns', 'arrow', 'arrowHead', 'glowA', 'glowB'].forEach(k => { el[k] = $(k); });
const cardEl = { bar: el.card.querySelector('.bar'), num: el.card.querySelector('.num'), name: el.card.querySelector('.name'), count: el.card.querySelector('.count'), desc: el.card.querySelector('.desc') };
let pipEls = [], rowEls = [], rconnEls = [], rowPos = [], cardStep = -1, cardWords = [], cardBox = { top: 0, h: 0 };
const SVGNS = 'http://www.w3.org/2000/svg';

function buildStatic() {
  el.hTitle.textContent = 'GET INTO ' + G.title.toUpperCase();
  el.pips.innerHTML = PILLARS.map(() => '<span class="pip"><i></i></span>').join('') + '<span class="count mono"></span>';
  pipEls = [...el.pips.querySelectorAll('.pip i')];
  el.rows.innerHTML = PILLARS.map(p => `<div class="row" style="border-color:${p.color}"><span class="rnum">${p.num}</span><span class="rname" style="color:${p.color}">${esc(p.name)}</span><span class="rdesc">${esc(p.desc)}</span></div>`).join('');
  rowEls = [...el.rows.children];
  el.rconns.innerHTML = '';
  rconnEls = PILLARS.map(p => { const g = document.createElementNS(SVGNS, 'path'); g.setAttribute('stroke', p.color); g.setAttribute('stroke-width', '2'); el.rconns.appendChild(g); return g; });
  el.why.innerHTML = '// why this order?  <span class="k">it\'s a stack.</span>';
  el.sub.innerHTML = `${NUM_WORDS[N]}. <b>En orden.</b>`;
}

function buildCard(i) {
  const p = PILLARS[i];
  cardStep = i;
  cardEl.bar.style.background = p.color;
  cardEl.num.textContent = p.num;
  cardEl.name.textContent = p.name; cardEl.name.style.color = p.color; cardEl.name.style.fontSize = '';
  cardEl.name.style.textShadow = `0 0 22px ${p.color}66`;
  cardEl.count.textContent = `${p.num}/${String(N).padStart(2, '0')}`;
  cardEl.desc.innerHTML = p.desc.trim().split(/\s+/).map(w => `<span>${esc(w)} </span>`).join('');
  cardWords = [...cardEl.desc.children];
  el.card.style.borderColor = p.color + '55';
  el.card.style.opacity = 0; el.card.style.transform = 'none';
  // long names shrink to fit the card
  const top = el.card.querySelector('.top');
  const over = top.scrollWidth - top.clientWidth;
  if (over > 0) { const fs = parseFloat(getComputedStyle(cardEl.name).fontSize); cardEl.name.style.fontSize = Math.floor(fs * (cardEl.name.offsetWidth - over) / cardEl.name.offsetWidth) + 'px'; }
  const h = el.card.offsetHeight;
  cardBox = fmt === 'landscape' ? { top: L.card.cy - h / 2, h } : { top: L.card.top, h };
  el.card.style.top = cardBox.top + 'px';
}

// Fit text and pin the recap rows to where the finished slabs sit (measured without camera sway).
function layout() {
  const second = (G.short && fmt === 'portrait') ? G.short : G.title;
  el.title.style.fontSize = '';
  const setTitle = s => { el.title.textContent = 'GET INTO\n' + s.toUpperCase(); };
  setTitle(second);
  if (el.title.scrollWidth > L.titleMax && G.short) setTitle(G.short);
  if (el.title.scrollWidth > L.titleMax) el.title.style.fontSize = Math.floor(parseFloat(getComputedStyle(el.title).fontSize) * L.titleMax / el.title.scrollWidth) + 'px';
  el.titleText = el.title.textContent;
  // header title: one line, never under the progress pips or into the right rail
  el.hTitle.style.fontSize = '';
  el.hTitle.textContent = 'GET INTO ' + G.title.toUpperCase();
  if (el.hTitle.scrollWidth > L.headMax && G.short) el.hTitle.textContent = 'GET INTO ' + G.short.toUpperCase();
  if (el.hTitle.scrollWidth > L.headMax) el.hTitle.style.fontSize = Math.floor(parseFloat(getComputedStyle(el.hTitle).fontSize) * L.headMax / el.hTitle.scrollWidth) + 'px';

  focus.set(0, HT / 2, 0); setCam(L.cam.recap, focus);
  rowPos = [];
  const descs = rowEls.map(r => r.querySelector('.rdesc'));
  descs.forEach(d => { d.style.fontSize = ''; });
  rowEls.forEach(r => { r.style.left = L.rows.x + 'px'; r.style.width = L.rows.w + 'px'; });
  const room = L.rows.w - (fmt === 'landscape' ? 52 : 40);
  const widest = Math.max(...descs.map(d => d.scrollWidth));
  if (widest > room) { const fs = parseFloat(getComputedStyle(descs[0]).fontSize) * room / widest; descs.forEach(d => { d.style.fontSize = fs.toFixed(2) + 'px'; }); }
  rowEls.forEach((r, i) => {
    let top;
    if (fmt === 'landscape') { const [, y] = project(SW / 2, restY(i) + SH / 2, 0); top = y - r.offsetHeight / 2 - 6; }
    else { const gap = Math.min(132, L.rows.h / N); top = L.rows.y0 + (N - 1 - i) * gap; }
    r.style.top = top + 'px';
    rowPos[i] = { top, h: r.offsetHeight };
  });
  el.why.style.left = L.why.x + 'px'; el.why.style.top = L.why.y + 'px';
  el.fx.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  cardStep = -1;
}

function polyline(pathEl, pts, k) {
  let d = '', len = 0;
  pts.forEach((p, i) => { d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); });
  pathEl.setAttribute('d', d);
  pathEl.style.strokeDasharray = len.toFixed(1);
  pathEl.style.strokeDashoffset = (len * (1 - k)).toFixed(1);
}

// ---------- the frame ----------
function slabState(i, t, at) {
  const rest = restY(i), ex = rest + EXB + i * EXG;
  let y, visible = true, rotY = 0, x = 0;
  if (t < T.titleHold + (N - 1 - i) * 0.07) {                      // title: hovering, exploded
    y = ex + 0.10 * Math.sin(at * 1.3 + i * 1.4); rotY = 0.05 * Math.sin(at * 0.7 + i * 2.1); x = (i % 2 ? 0.34 : -0.34);
  } else if (t < T.land[i] - DROP_T) {                             // lift off, wait above the frame
    const p = prog(t, T.titleHold + (N - 1 - i) * 0.07, 0.62);
    y = ex + easeIn(p) * 26; x = (i % 2 ? 0.34 : -0.34) * (1 - p); visible = p < 1;
  } else if (t < T.land[i]) {                                      // drop
    const q = prog(t, T.land[i] - DROP_T, DROP_T); y = rest + DROP * (1 - q * q);
  } else {                                                         // landed, small bounce
    const u = t - T.land[i]; y = rest + 0.13 * Math.exp(-6.5 * u) * Math.abs(Math.sin(11 * u));
  }
  let lit = 0.9, pulse = 0;
  if (t >= T.land[i]) {
    lit = lerp(1, 0.36, easeOut(prog(t, T.stepEnd[i], 0.5)));
    lit = lerp(lit, 0.92, easeOut(prog(t, T.recapIn + i * T.rowStagger, 0.4)));
    pulse = Math.exp(-5 * (t - T.land[i]));
    const ru = t - (T.recapIn + 0.2 + i * T.rowStagger); if (ru >= 0) pulse += 0.55 * Math.exp(-6 * ru);
  }
  return { x, y, rotY, visible, lit, pulse };
}

function renderAt(t, opts = {}) {
  const at = opts.ambient ?? t;
  const showOutro = opts.outro ?? true;
  const C = L.cam, k = L.H / 720 * (fmt === 'portrait' ? 0.55 : 1);

  // --- camera ---
  const e1 = easeInOut(prog(t, T.titleHold, 1.05));
  const e2 = easeInOut(prog(t, T.recapIn - 0.15, 1.0));
  const e3 = showOutro ? easeInOut(prog(t, T.outroIn, 1.8)) : 0;
  let pose = mixPose(mixPose(mixPose(C.title, C.steps, e1), C.recap, e2), C.outro, e3);
  const tp = clamp(t / T.titleHold);
  pose.dist *= lerp(TITLE_FIT, 1, e1) * (1 - 0.035 * tp * (1 - e1));   // taller stacks start further back
  pose.az += 4 * tp * (1 - e1) - 4.5 * prog(t, T.land[0], T.recapIn - T.land[0]) * e1 * (1 - e2);
  pose.az += 1.5 * Math.sin(at * 0.5); pose.el += 0.6 * Math.sin(at * 0.37 + 1);
  let squash = 1, latest = -1;
  for (let i = 0; i < N; i++) {
    const u = t - T.land[i]; if (u < 0) continue;
    latest = i;
    pose.sy += 5 * k * Math.exp(-9 * u) * Math.sin(42 * u);
    squash -= 0.035 * Math.exp(-7 * u) * Math.cos(16 * u);
  }
  focus.set(0, lerp(EXH / 2, HT / 2, e1), 0);
  setCam(pose, focus);

  // --- slabs ---
  stack.scale.y = squash;
  const anchors = [];
  slabs.forEach((s, i) => {
    const st = slabState(i, t, at);
    s.mesh.visible = st.visible;
    s.mesh.position.set(st.x, st.y + SH / 2, 0); s.mesh.rotation.y = st.rotY;
    s.mats.forEach(m => { m.uniforms.uLit.value = st.lit; m.uniforms.uPulse.value = st.pulse; });
    s.halo.visible = st.visible;
    s.halo.position.set(st.x, (st.y + SH / 2) * squash, 0).addScaledVector(dir, -3.2);
    s.halo.quaternion.copy(camera.quaternion);
    s.halo.material.uniforms.uI.value = 0.10 + 0.26 * st.lit + 0.55 * st.pulse;
    const u = t - T.land[i];
    s.ring.visible = u >= 0 && u < 0.8;
    if (s.ring.visible) { s.ring.position.y = restY(i) * squash + 0.02; s.ring.material.uniforms.uGrow.value = easeOut(u / 0.8) * 3.4; s.ring.material.uniforms.uFade.value = Math.pow(1 - u / 0.8, 2) * 0.9; }
    anchors[i] = { y: (st.y + SH / 2) * squash, lit: st.lit };
  });

  // --- floor ---
  const fu = floorMat.uniforms;
  if (latest >= 0) { fu.uPool.value.copy(slabs[latest].color); fu.uWaveC.value.copy(slabs[latest].color); fu.uWaveT.value = t - T.land[latest]; fu.uPoolI.value = 0.5 + 0.9 * Math.exp(-4 * (t - T.land[latest])); }
  else { fu.uPool.value.set('#9b5cff'); fu.uWaveT.value = 99; fu.uPoolI.value = 0.32; }

  // --- particles ---
  dust.forEach((d, j) => {
    pPos[j * 3] = d.x + 0.35 * Math.sin(at * 0.3 + d.ph); pPos[j * 3 + 1] = ((d.y + at * d.sp) % 13) - 0.5; pPos[j * 3 + 2] = d.z + 0.35 * Math.cos(at * 0.25 + d.ph);
    pAlpha[j] = 0.30 + 0.25 * Math.sin(at * 1.1 + d.ph * 3);
  });
  for (let i = 0; i < N; i++) {
    const u = t - T.land[i];
    bursts[i].forEach((b, n) => {
      const j = DUST + i * PB + n;
      if (u < 0 || u > b.life) { pAlpha[j] = 0; pPos[j * 3 + 1] = -50; return; }
      pPos[j * 3] = b.x + b.vx * u; pPos[j * 3 + 1] = Math.max(0.02, b.y + b.vy * u - 3.2 * u * u); pPos[j * 3 + 2] = b.z + b.vz * u;
      pAlpha[j] = Math.pow(1 - u / b.life, 1.5) * 1.3;
    });
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aAlpha.needsUpdate = true;

  renderer.render(scene, camera);

  // --- overlay: glows, logo ---
  el.glowA.style.opacity = 0.85 + 0.15 * Math.sin(at * 1.3);
  el.glowB.style.opacity = 0.85 + 0.15 * Math.cos(at * 1.1);
  const outK = showOutro ? prog(t, T.outroIn, 0.5) : 0;
  const co = showOutro ? prog(t, T.outroIn + 0.15, 0.9) : 0;
  const ca = L.cal.title, cb = L.cal.head, cc = L.cal.outro;
  let cx = lerp(ca.x, cb.x, e1), cy = lerp(ca.y, cb.y, e1) + 4 * Math.sin(at * 1.2) * (1 - e1), cs = lerp(ca.s, cb.s, e1);
  if (co > 0) { const m = easeInOut(co); cx = lerp(cx, cc.x, m); cy = lerp(cy, cc.y, m); cs = lerp(cs, cc.s, easeOutBack(co)); }
  el.cal.style.width = el.cal.style.height = L.calBase + 'px';
  el.cal.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${(cs / L.calBase).toFixed(4)})`;

  // --- title frame (finished at t = 0) ---
  const to = prog(t, T.titleHold, 0.45);
  el.titleCard.style.opacity = 1 - easeOut(to);
  el.titleCard.style.transform = `translateY(${(-46 * easeIn(to)).toFixed(1)}px) scale(${(1 - 0.05 * to).toFixed(4)})`;
  if (to < 1) {
    // the one moving part of the title frame: the command types in, then runs
    el.prompt.innerHTML = `<span class="p">~/los-nerdys $</span> <span class="c">${esc(typed(CMD, t, T.typeStart, T.typeCps))}</span>${t < T.typeEnd + 0.3 ? '<span class="cursor"></span>' : ''}`;
    el.title.innerHTML = esc(el.titleText) + blink(at);
  }

  // --- header + progress ---
  const hIn = easeOut(prog(t, T.titleHold + 0.55, 0.5)) * (1 - outK);
  el.header.style.opacity = hIn; el.header.style.transform = `translateY(${((1 - hIn) * -10).toFixed(1)}px)`;
  el.pips.style.opacity = hIn;
  let cur = 0;
  pipEls.forEach((p, i) => {
    const w = t >= T.stepEnd[i] ? 1 : prog(t, T.textDone[i], T.hold[i]);
    p.style.width = (w * 100).toFixed(1) + '%'; p.style.background = PILLARS[i].color;
    p.style.boxShadow = w > 0 && w < 1 ? `0 0 10px ${PILLARS[i].color}` : 'none';
    if (t >= T.land[i]) cur = i + 1;
  });
  el.pips.lastChild.textContent = `${String(cur).padStart(2, '0')}/${String(N).padStart(2, '0')}`;

  // --- focus card: one pillar at a time ---
  let ci = -1;
  for (let i = 0; i < N; i++) if (t >= T.land[i] + 0.05 && t < T.stepEnd[i] + 0.34) ci = i;
  if (ci < 0) { el.card.style.opacity = 0; el.conn.style.opacity = 0; el.connDot.style.opacity = 0; }
  else {
    if (cardStep !== ci) buildCard(ci);
    const a = easeOut(prog(t, T.land[ci] + 0.08, 0.4)), o = prog(t, T.stepEnd[ci], 0.32), vis = a * (1 - o);
    el.card.style.opacity = vis;
    const slide = (1 - a) * 46 - easeIn(o) * 24;
    el.card.style.transform = fmt === 'landscape' ? `translateX(${slide.toFixed(1)}px)` : `translateY(${slide.toFixed(1)}px)`;
    const nw = cardWords.length;
    cardWords.forEach((w, n) => { const wp = easeOut(prog(t, T.land[ci] + 0.18 + n * (0.28 / nw), 0.18)); w.style.opacity = wp; w.style.transform = `translateY(${((1 - wp) * 8).toFixed(1)}px)`; });
    // connector from the slab to its card
    const p = PILLARS[ci], ay = anchors[ci].y, dk = easeOut(prog(t, T.land[ci] + 0.05, 0.4));
    let pts;
    if (fmt === 'landscape') { const s = project(SW / 2, ay, 0), cyy = cardBox.top + cardBox.h / 2, ex = L.card.x - 44; pts = [s, [ex, s[1]], [ex, cyy], [L.card.x, cyy]]; }
    else { const s = project(-SW / 2, ay, SD / 2), lx = 44, cyy = cardBox.top + 84; pts = [s, [lx, s[1]], [lx, cyy], [L.card.x, cyy]]; }
    el.conn.setAttribute('stroke', p.color); polyline(el.conn, pts, dk); el.conn.style.opacity = (1 - o) * 0.9;
    el.connDot.setAttribute('cx', pts[0][0].toFixed(1)); el.connDot.setAttribute('cy', pts[0][1].toFixed(1)); el.connDot.setAttribute('fill', p.color);
    el.connDot.setAttribute('r', (5 + 2 * Math.sin(at * 5)) * (fmt === 'portrait' ? 1.5 : 1)); el.connDot.style.opacity = dk * (1 - o);
    el.conn.setAttribute('stroke-width', fmt === 'portrait' ? 4 : 2.5);
  }

  // --- recap: every pillar, labelled ---
  rowEls.forEach((r, i) => {
    const rk = easeOut(prog(t, T.recapIn + 0.25 + i * T.rowStagger, 0.45)) * (1 - outK);
    r.style.opacity = rk; r.style.transform = `translateX(${((1 - rk) * 30).toFixed(1)}px)`;
    const pth = rconnEls[i];
    if (fmt === 'landscape' && rk > 0) {
      const s = project(SW / 2, anchors[i].y, 0), ry = rowPos[i].top + rowPos[i].h / 2 + 4;
      polyline(pth, [s, [L.rows.x - 34, s[1]], [L.rows.x - 34, ry], [L.rows.x - 10, ry]], rk); pth.style.opacity = 0.7 * rk;
    } else pth.style.opacity = 0;
  });
  const wk = easeOut(prog(t, T.whyIn, 0.5)) * (1 - outK);
  el.why.style.opacity = wk; el.why.style.transform = `translateY(${((1 - wk) * 10).toFixed(1)}px)`;
  const ak = easeInOut(prog(t, T.recapIn + 0.3, N * T.rowStagger + 0.7));
  if (ak > 0 && outK < 1) {
    const ax = -SW / 2 - 0.62, az = SD / 2 + 0.2, a0 = project(ax, 0.05, az), a1 = project(ax, (HT + 0.25) * ak, az);
    const sw = fmt === 'portrait' ? 6 : 4, hs = fmt === 'portrait' ? 16 : 11;
    el.arrow.setAttribute('d', `M${a0[0].toFixed(1)} ${a0[1].toFixed(1)}L${a1[0].toFixed(1)} ${a1[1].toFixed(1)}`); el.arrow.setAttribute('stroke-width', sw);
    $('arrowGrad').setAttribute('y1', a0[1]); $('arrowGrad').setAttribute('y2', project(ax, HT + 0.25, az)[1]);
    el.arrowHead.setAttribute('d', `M${(a1[0] - hs).toFixed(1)} ${(a1[1] + hs).toFixed(1)}L${a1[0].toFixed(1)} ${a1[1].toFixed(1)}L${(a1[0] + hs).toFixed(1)} ${(a1[1] + hs).toFixed(1)}`); el.arrowHead.setAttribute('stroke-width', sw);
    el.arrow.style.opacity = el.arrowHead.style.opacity = (1 - outK) * Math.min(1, ak * 6);
  } else { el.arrow.style.opacity = el.arrowHead.style.opacity = 0; }

  // --- outro (video only) ---
  const op = showOutro ? easeOut(prog(t, T.outroIn, 0.7)) : 0;
  el.outroBg.style.opacity = op;
  el.url.style.opacity = op; el.url.innerHTML = t > T.urlStart ? esc(typed(URL_TEXT, t, T.urlStart, T.urlCps)) + blink(at) : '';
  const tg = showOutro ? easeOut(prog(t, T.tagIn, 0.6)) : 0;
  el.tag.style.opacity = tg; el.tag.style.transform = `translateY(${((1 - tg) * 10).toFixed(1)}px)`;
}

// ---------- format + sizing ----------
let manual = null, fitScale = 1;
if (!RENDER && !EMBED) { try { manual = localStorage.getItem('ln-video-format'); } catch (e) {} }
const autoFormat = () => (window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');
const ctl = RENDER ? null : $('controls');

function fit() {
  if (RENDER) { el.stage.style.transform = 'none'; fitScale = 1; }
  else {
    // standalone page: room for the format switch on top, and in landscape for the player bar underneath
    const top = EMBED ? 0 : 64, bottom = (!EMBED && fmt === 'landscape') ? 100 : 0;
    fitScale = Math.min(window.innerWidth / L.W, (window.innerHeight - top - bottom) / L.H);
    el.stage.style.transform = `translateY(${(top - bottom) / 2}px) scale(${fitScale})`;
  }
  const pr = RENDER ? window.devicePixelRatio : clamp(window.devicePixelRatio * fitScale, 0.6, 2);
  renderer.setPixelRatio(pr); renderer.setSize(L.W, L.H, false);
  camera.aspect = L.W / L.H; camera.updateProjectionMatrix();
  pMat.uniforms.uPx.value = L.H * pr / (2 * Math.tan(rad(FOV / 2)));
  if (ctl) placeControls();
}

function setFormat(f) {
  if (!LAYOUTS[f]) return;
  fmt = f; L = LAYOUTS[f];
  document.body.className = f + (RENDER ? ' rendering' : '') + (EMBED ? ' embedded' : '');
  document.querySelectorAll('#switcher button[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === f)));
  fit(); layout();
}

// ---------- web player: a seekable clock, a control bar, and sound ----------
const END = T.webEnd;                       // the web version holds on the finished stack
const P = { t: 0, playing: false, ended: false, last: 0, amb: 0, drag: false, wasPlaying: false, hiddenPlaying: false };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

// Sound runs on Web Audio so it starts exactly at the playhead and the volume slider works on phones too.
// Browsers only allow sound after a tap or key press, so it starts off until the viewer turns it on.
const AUDIO_SRC = RENDER ? '' : (window.GETINTO_AUDIO || '');
const A = {
  ctx: null, gain: null, buf: null, src: null, on: false, loading: null,
  vol: clamp(parseFloat(store.get('ln-video-volume') ?? '0.8') || 0, 0, 1),
  unlock() {                                 // call inside a user gesture
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC(); this.gain = this.ctx.createGain(); this.gain.gain.value = this.vol; this.gain.connect(this.ctx.destination);
      this.ctx.onstatechange = () => { if (this.audible()) syncAudio(); };
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    return true;
  },
  load() {
    if (!this.loading) {
      // an inlined track is decoded directly (no network call, so it also works on hosts that block fetch)
      const bytes = AUDIO_SRC.startsWith('data:')
        ? Promise.resolve().then(() => Uint8Array.from(atob(AUDIO_SRC.slice(AUDIO_SRC.indexOf(',') + 1)), c => c.charCodeAt(0)).buffer)
        : fetch(AUDIO_SRC).then(r => r.arrayBuffer());
      this.loading = bytes.then(b => new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej))).then(buf => { this.buf = buf; });
    }
    return this.loading;
  },
  audible() { return this.on && !!this.ctx && this.ctx.state === 'running'; },
  start(t) {
    if (!this.buf || !this.audible() || t >= this.buf.duration - 0.05) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf; s.connect(this.gain); s.start(0, Math.max(0, t)); this.src = s;
  },
  stop() { if (this.src) { try { this.src.stop(); } catch (e) {} this.src.disconnect(); this.src = null; } },
};
function syncAudio() { A.stop(); if (P.playing && !P.drag) A.start(P.t); }
let gestureArmed = false, unlockedAt = -1e9;
function armGesture() {                      // sound was on last visit: the next tap or key press brings it back
  if (gestureArmed) return; gestureArmed = true;
  const go = () => { gestureArmed = false; unlockedAt = performance.now(); removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); if (A.on) A.unlock(); };
  addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
}
async function setSound(on, remember = true) {
  if (!AUDIO_SRC) return;
  if (!on) { A.on = false; A.stop(); if (remember) store.set('ln-video-sound', 'off'); return; }
  if (!A.unlock()) return;
  A.on = true; if (remember) store.set('ln-video-sound', 'on');
  try { await A.load(); } catch (e) { A.on = false; A.loading = null; return; }
  if (A.ctx.state !== 'running') armGesture(); else if (A.on) syncAudio();
}
function setVolume(v, fromUser = true) {
  A.vol = clamp(v, 0, 1); if (A.gain) A.gain.gain.value = A.vol;
  store.set('ln-video-volume', String(A.vol));
  if (fromUser && A.vol > 0 && !A.audible()) setSound(true);
}

function play() { if (P.ended || P.t >= END) P.t = 0; P.ended = false; P.playing = true; P.last = performance.now(); syncAudio(); poke(); }
function pause() { P.playing = false; syncAudio(); poke(); }
const toggle = () => (P.playing ? pause() : play());
function seek(t, resume = false) {
  const wasEnded = P.ended;
  P.t = clamp(t, 0, END); P.ended = P.t >= END;
  if (P.ended) P.playing = false; else if (resume || wasEnded) P.playing = true;
  P.last = performance.now(); syncAudio(); poke();
}
const restart = () => seek(0, true);
// back / forward move by step: title, each pillar, the finished stack
function prev() { let c = 0; for (const ch of CHAPTERS) if (ch.t < P.t - 1.0) c = ch.t; seek(c); }
function next() { const ch = CHAPTERS.find(c => c.t > P.t + 0.05); seek(ch ? ch.t : END); }

// ----- control bar -----
const ui = {};
let hideTimer = 0, lastTxt = '', lastState = '', lastAud = null;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function poke() {
  if (!ctl) return;
  ctl.classList.add('show'); clearTimeout(hideTimer);
  hideTimer = setTimeout(function hide() {
    if ((!P.playing && !P.ended) || P.drag || ctl.matches(':hover') || ctl.querySelector(':focus-visible')) { hideTimer = setTimeout(hide, 1500); return; }
    ctl.classList.remove('show');
  }, 2800);
}
function placeControls() {
  const r = el.stage.getBoundingClientRect();
  const w = Math.min(r.width - 16, 760);
  ctl.classList.toggle('compact', w < 440);
  ctl.style.width = w + 'px'; ctl.style.left = (r.left + (r.width - w) / 2) + 'px'; ctl.style.setProperty('--scrub-w', (w - 22) + 'px');
  const below = !EMBED && fmt === 'landscape';              // standalone landscape: under the picture
  const h = ctl.offsetHeight;
  // portrait: in the empty band at the bottom (the social safe zone). Embedded landscape: over the bottom edge, auto-hiding.
  ctl.style.top = (below ? r.bottom + 10 : fmt === 'portrait' ? r.bottom - h - r.height * 0.03 : r.bottom - h - 8) + 'px';
  ctl.classList.toggle('auto', !below && fmt === 'landscape');
}
function updateUI() {
  const k = (P.t / END * 100).toFixed(2) + '%';
  ui.fill.style.width = k; ui.knob.style.left = k;
  const txt = `${fmtTime(P.t)} / ${fmtTime(END)}`;
  if (txt !== lastTxt) { ui.time.textContent = txt; ui.scrub.setAttribute('aria-valuenow', Math.round(P.t)); ui.scrub.setAttribute('aria-valuetext', txt); lastTxt = txt; }
  const state = P.playing ? 'playing' : (P.ended ? 'ended' : 'paused');
  if (state !== lastState) { ctl.dataset.state = state; ui.play.setAttribute('aria-label', P.playing ? 'Pause' : 'Play'); lastState = state; poke(); }
  const aud = A.audible();
  if (aud !== lastAud) { ctl.dataset.sound = aud ? 'on' : 'off'; ui.mute.setAttribute('aria-pressed', String(aud)); ui.mute.setAttribute('aria-label', aud ? 'Turn sound off' : 'Turn sound on'); lastAud = aud; }
}
function buildControls() {
  ['scrub', 'scrubFill', 'scrubKnob', 'scrubTicks', 'cRestart', 'cPrev', 'cPlay', 'cNext', 'cTime', 'cMute', 'cVol'].forEach(k => { ui[k] = $(k); });
  ui.fill = ui.scrubFill; ui.knob = ui.scrubKnob; ui.play = ui.cPlay; ui.time = ui.cTime; ui.mute = ui.cMute; ui.vol = ui.cVol;
  ui.scrubTicks.innerHTML = CHAPTERS.slice(1).map(c => `<i style="left:${(c.t / END * 100).toFixed(2)}%" title="${esc(c.label)}"></i>`).join('');
  ui.scrub.setAttribute('aria-valuemax', Math.round(END));
  ctl.hidden = false;
  if (!AUDIO_SRC) ctl.classList.add('noaudio');
  ui.vol.value = A.vol;

  ui.cRestart.addEventListener('click', restart);
  ui.cPrev.addEventListener('click', prev);
  ui.cNext.addEventListener('click', next);
  ui.cPlay.addEventListener('click', toggle);
  ui.mute.addEventListener('click', () => setSound(!A.audible()));
  ui.vol.addEventListener('input', () => setVolume(parseFloat(ui.vol.value)));

  const scrubTo = e => { const r = ui.scrub.getBoundingClientRect(); P.t = clamp((e.clientX - r.left) / r.width) * END; P.ended = false; };
  ui.scrub.addEventListener('pointerdown', e => { ui.scrub.setPointerCapture(e.pointerId); P.wasPlaying = P.playing || P.ended; P.drag = true; A.stop(); scrubTo(e); poke(); });
  ui.scrub.addEventListener('pointermove', e => { if (P.drag) scrubTo(e); });
  const drop = () => { if (!P.drag) return; P.drag = false; P.playing = false; seek(P.t, P.wasPlaying); };
  ui.scrub.addEventListener('pointerup', drop); ui.scrub.addEventListener('pointercancel', drop);
  ui.scrub.addEventListener('keydown', e => {
    const d = { ArrowLeft: -2, ArrowRight: 2 }[e.key];
    if (d) { seek(P.t + d); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'Home') { seek(0); e.preventDefault(); e.stopPropagation(); } else if (e.key === 'End') { seek(END); e.preventDefault(); e.stopPropagation(); }
  });

  // keyboard: space play/pause, arrows step back/forward, M sound, R restart
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' && e.key.startsWith('Arrow')) return;
    if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') toggle(); else if (k === 'arrowleft') prev(); else if (k === 'arrowright') next();
    else if (k === 'm') setSound(!A.audible()); else if (k === 'r' || k === 'home') restart(); else return;
    e.preventDefault();
  });
  // the picture itself: click to pause/play; on an embedded landscape player a first tap brings the bar back
  el.stage.addEventListener('click', () => {
    if (performance.now() - unlockedAt < 500) return;         // that tap just brought the sound back; don't also pause
    if (ctl.classList.contains('auto') && !ctl.classList.contains('show')) poke(); else toggle();
  });
  document.addEventListener('pointermove', () => { if (ctl.classList.contains('auto')) poke(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (P.playing) { P.hiddenPlaying = true; P.playing = false; A.stop(); } }
    else if (P.hiddenPlaying) { P.hiddenPlaying = false; P.playing = true; P.last = performance.now(); syncAudio(); }
  });
}

async function init() {
  await Promise.all([document.fonts.load('800 64px "JetBrains Mono"'), document.fonts.load('500 32px "Figtree"'), document.fonts.load('700 32px "Figtree"'), document.fonts.load('400 32px "JetBrains Mono"')]).catch(() => {});
  await document.fonts.ready;
  if (el.cal.decode) await el.cal.decode().catch(() => {});
  buildSlabs(); buildStatic();
  if (ctl) buildControls();
  setFormat(params.get('format') || window.GETINTO_FORMAT || manual || autoFormat());
  window.renderAt = renderAt;
  if (RENDER) { renderAt(0); return; }

  document.querySelectorAll('#switcher button[data-fmt]').forEach(b => b.addEventListener('click', () => {
    manual = b.dataset.fmt; store.set('ln-video-format', manual);
    setFormat(manual);
  }));
  window.addEventListener('resize', () => { if (!manual && !params.get('format') && !window.GETINTO_FORMAT) setFormat(autoFormat()); else fit(); });
  // the parent page (iframe embed) can drive the player
  window.addEventListener('message', e => {
    const m = e.data || {}; if (m.type !== 'getinto') return;
    if (m.format) { manual = m.format; setFormat(m.format); }
    if (m.replay || m.cmd === 'restart') restart();
    if (m.cmd === 'play') play(); if (m.cmd === 'pause') pause(); if (m.cmd === 'toggle') toggle();
    if (m.cmd === 'next') next(); if (m.cmd === 'prev') prev();
    if (typeof m.seek === 'number') seek(m.seek);
    if (typeof m.volume === 'number') { setVolume(m.volume, false); ui.vol.value = A.vol; }
    if (typeof m.muted === 'boolean') setSound(!m.muted);
  });
  window.GETINTO = { play, pause, toggle, seek, restart, next, prev, setSound, setVolume, state: () => ({ t: P.t, end: END, playing: P.playing, ended: P.ended, sound: A.audible(), soundWanted: A.on, volume: A.vol, audioLoaded: !!A.buf, ctx: A.ctx ? A.ctx.state : 'none', sounding: !!A.src }) };

  // play once, then hold on the finished stack while the scene keeps breathing
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.amb = P.last = performance.now();
  if (still) { P.t = END; P.ended = true; } else P.playing = true;
  if (store.get('ln-video-sound') === 'on') setSound(true, false);   // comes back on the first tap if the browser needs one
  poke();
  (function frame(now) {
    if (!document.hidden) {
      if (P.playing && !P.drag) { P.t += (now - P.last) / 1000; if (P.t >= END) { P.t = END; P.playing = false; P.ended = true; } }   // on the natural end the last chord rings out
      P.last = now;
      renderAt(P.t, { outro: false, ambient: still ? 0 : (now - P.amb) / 1000 });
      updateUI();
    }
    requestAnimationFrame(frame);
  })(performance.now());
}
window.READY = init();
