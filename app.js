'use strict';
/* Screenshot Studio — everything runs client-side; no build step, no dependencies. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEG = Math.PI / 180;
/** Anonymous usage event for Google Analytics. Never sends headlines, images or other content. No-op when analytics is off. */
const track = (name, params = {}) => { try { window.gtag?.('event', name, params); } catch { } };
window.track = track;
const THAI = /[฀-๿]/;

/* ---------- store sizes (portrait; landscape swaps width and height) ---------- */
const S = (family, group, w, h, note = '', rec = 0) => ({ family, group, w, h, note, rec: !!rec, on: !!rec, id: `${family}-${w}x${h}` });
const SIZES = [
  S('iphone', 'iPhone 6.9″', 1320, 2868, 'recommended', 1),
  S('iphone', 'iPhone 6.9″', 1290, 2796),
  S('iphone', 'iPhone 6.9″', 1260, 2736),
  S('iphone', 'iPhone 6.5″', 1284, 2778),
  S('iphone', 'iPhone 6.5″', 1242, 2688),
  S('iphone', 'iPhone 6.3″ / 6.1″', 1206, 2622),
  S('iphone', 'iPhone 6.3″ / 6.1″', 1179, 2556),
  S('iphone', 'iPhone 6.1″ / 5.8″ / 5.4″', 1170, 2532),
  S('iphone', 'iPhone 6.1″ / 5.8″ / 5.4″', 1125, 2436),
  S('iphone', 'iPhone 6.1″ / 5.8″ / 5.4″', 1080, 2340),
  S('iphone', 'iPhone 5.5″ / 4.7″', 1242, 2208),
  S('iphone', 'iPhone 5.5″ / 4.7″', 750, 1334),
  S('duo', 'iPhone Duo', 2007, 2853, 'inner display', 1),
  S('duo', 'iPhone Duo', 1398, 2034, 'outer display', 1),
  S('ipad', 'iPad 13″ / 12.9″', 2064, 2752, 'recommended', 1),
  S('ipad', 'iPad 13″ / 12.9″', 2048, 2732),
  S('ipad', 'iPad 11″', 1668, 2420),
  S('ipad', 'iPad 11″', 1668, 2388),
  S('ipad', 'iPad 11″', 1640, 2360),
  S('ipad', 'iPad 11″', 1512, 2316),
  S('ipad', 'iPad 11″', 1488, 2266),
  S('ipad', 'iPad 10.5″ / 9.7″', 1668, 2224),
  S('ipad', 'iPad 10.5″ / 9.7″', 1536, 2048),
  S('android', 'Android phone (Google Play)', 1080, 1920, 'recommended, 9:16', 1),
  S('android', 'Android phone (Google Play)', 1440, 2560, '9:16'),
  S('android', 'Android phone (Google Play)', 1080, 2160, '1:2, tallest allowed'),
  S('atab', 'Android tablet 7″', 1200, 1920, 'recommended', 1),
  S('atab', 'Android tablet 10″', 1600, 2560, 'recommended', 1),
  S('atab', 'Android tablet 10″', 1800, 2880),
];
// common Android capture sizes that are not store sizes, used only to sort dropped files
const ANDROID_CAPTURES = ['1080x2400', '1080x2408', '1080x2412', '1440x3200', '1440x3120', '1344x2992', '1008x2244', '720x1600', '1220x2712', '1260x2800', '1080x2424'];

const FAMILY = {
  iphone: { name: 'iPhone', short: 'iPhone', store: 'ios', w: 1320, h: 2868, fallback: ['android', 'duo', 'ipad', 'atab'] },
  duo: { name: 'iPhone Duo', short: 'Duo', store: 'ios', w: 2007, h: 2853, fallback: ['ipad', 'atab', 'iphone', 'android'] },
  ipad: { name: 'iPad', short: 'iPad', store: 'ios', w: 2064, h: 2752, fallback: ['atab', 'duo', 'iphone', 'android'] },
  android: { name: 'Android phone', short: 'Android', store: 'android', w: 1080, h: 1920, fallback: ['iphone', 'duo', 'atab', 'ipad'] },
  atab: { name: 'Android tablet', short: 'Tablet', store: 'android', w: 1600, h: 2560, fallback: ['ipad', 'duo', 'android', 'iphone'] },
};
const MAX_SLIDES = 10;        // App Store Connect limit per device size
const MAX_SLIDES_PLAY = 8;    // Google Play limit per device type

/* ---------- fonts ---------- */
const W49 = [400, 500, 600, 700, 800, 900], W48 = [400, 500, 600, 700, 800], W47 = [400, 500, 600, 700];
const gf = (name, w, cat, o = {}) => ({
  name, g: name, w, cat, thai: !!o.thai, ls: o.ls ?? -0.015, k: o.k || 1,
  css: `"${name}", ${o.thai ? '' : '"Noto Sans Thai", '}${o.gen || 'sans-serif'}`,
});
const sysf = (name, css, ls) => ({ name, g: null, w: null, cat: 'System (works offline)', thai: true, ls, k: 1, css });
const FONTS = {
  system: sysf('System Sans', '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Noto Sans Thai", "Thonburi", sans-serif', -0.022),
  rounded: sysf('System Rounded', 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Noto Sans Thai", system-ui, sans-serif', -0.01),
  serif: sysf('System Serif', 'ui-serif, "New York", Georgia, "Times New Roman", "Noto Serif Thai", serif', -0.01),
  mono: sysf('System Mono', 'ui-monospace, "SF Mono", Menlo, Consolas, "Noto Sans Thai", monospace', -0.03),

  notosansthai: gf('Noto Sans Thai', W49, 'Thai + Latin', { thai: 1 }),
  kanit: gf('Kanit', W49, 'Thai + Latin', { thai: 1, ls: -0.005 }),
  prompt: gf('Prompt', W49, 'Thai + Latin', { thai: 1, ls: -0.01 }),
  sarabun: gf('Sarabun', W48, 'Thai + Latin', { thai: 1 }),
  ibmplexsansthai: gf('IBM Plex Sans Thai', W47, 'Thai + Latin', { thai: 1 }),
  mitr: gf('Mitr', W47, 'Thai + Latin', { thai: 1, ls: 0 }),
  anuphan: gf('Anuphan', W47, 'Thai + Latin', { thai: 1 }),
  chakrapetch: gf('Chakra Petch', W47, 'Thai + Latin', { thai: 1, ls: 0 }),
  baijamjuree: gf('Bai Jamjuree', W47, 'Thai + Latin', { thai: 1 }),
  k2d: gf('K2D', W48, 'Thai + Latin', { thai: 1 }),
  krub: gf('Krub', W47, 'Thai + Latin', { thai: 1 }),
  mali: gf('Mali', W47, 'Thai + Latin', { thai: 1, ls: 0 }),
  notoserifthai: gf('Noto Serif Thai', W49, 'Thai + Latin', { thai: 1, gen: 'serif' }),
  pridi: gf('Pridi', W47, 'Thai + Latin', { thai: 1, gen: 'serif', ls: 0 }),
  chonburi: gf('Chonburi', [400], 'Thai + Latin', { thai: 1, gen: 'serif', ls: 0 }),
  itim: gf('Itim', [400], 'Thai + Latin', { thai: 1, ls: 0 }),
  sriracha: gf('Sriracha', [400], 'Thai + Latin', { thai: 1, ls: 0 }),
  charm: gf('Charm', [400, 700], 'Thai + Latin', { thai: 1, ls: 0, k: 1.1 }),

  inter: gf('Inter', W49, 'Sans', { ls: -0.03 }),
  poppins: gf('Poppins', W49, 'Sans', { ls: -0.02 }),
  montserrat: gf('Montserrat', W49, 'Sans', { ls: -0.02 }),
  dmsans: gf('DM Sans', W49, 'Sans', { ls: -0.03 }),
  manrope: gf('Manrope', W48, 'Sans', { ls: -0.03 }),
  plusjakartasans: gf('Plus Jakarta Sans', W48, 'Sans', { ls: -0.03 }),
  outfit: gf('Outfit', W49, 'Sans', { ls: -0.02 }),
  sora: gf('Sora', W48, 'Sans', { ls: -0.03 }),
  lexend: gf('Lexend', W49, 'Sans', { ls: -0.03 }),
  rubik: gf('Rubik', W49, 'Sans', { ls: -0.02 }),
  nunito: gf('Nunito', W49, 'Sans', { ls: -0.015 }),
  spacegrotesk: gf('Space Grotesk', W47, 'Sans', { ls: -0.03 }),

  bricolagegrotesque: gf('Bricolage Grotesque', W48, 'Display', { ls: -0.03 }),
  unbounded: gf('Unbounded', W49, 'Display', { ls: -0.03, k: 0.86 }),
  archivoblack: gf('Archivo Black', [400], 'Display', { ls: -0.02 }),
  bebasneue: gf('Bebas Neue', [400], 'Display', { ls: 0.01, k: 1.3 }),
  anton: gf('Anton', [400], 'Display', { ls: 0, k: 1.2 }),
  oswald: gf('Oswald', W47, 'Display', { ls: -0.01, k: 1.15 }),

  playfairdisplay: gf('Playfair Display', W49, 'Serif', { gen: 'serif', ls: -0.015 }),
  fraunces: gf('Fraunces', W49, 'Serif', { gen: 'serif', ls: -0.025 }),
  dmserifdisplay: gf('DM Serif Display', [400], 'Serif', { gen: 'serif', ls: -0.01 }),
  lora: gf('Lora', W47, 'Serif', { gen: 'serif', ls: -0.01 }),

  caveat: gf('Caveat', W47, 'Script & Mono', { gen: 'cursive', ls: 0, k: 1.25 }),
  pacifico: gf('Pacifico', [400], 'Script & Mono', { gen: 'cursive', ls: 0 }),
  jetbrainsmono: gf('JetBrains Mono', W48, 'Script & Mono', { gen: 'monospace', ls: -0.04, k: 0.9 }),
};
const fontWeight = (f, w) => f.w ? f.w.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a) : w;

/* ---------- look options ---------- */
const FRAMES = {
  black: { name: 'Black', c: ['#3b3b42', '#141417'] },
  titanium: { name: 'Titanium', c: ['#d2cdc4', '#8d8880'] },
  silver: { name: 'Silver', c: ['#ffffff', '#d9dae0'] },
  gold: { name: 'Gold', c: ['#f6e7c8', '#cdb287'] },
  blue: { name: 'Blue', c: ['#62779a', '#2b3950'] },
  pink: { name: 'Pink', c: ['#fbdde5', '#e6afbd'] },
  clayWhite: { name: 'Clay white', c: ['#f6f6f8', '#f6f6f8'], clay: true },
  clayDark: { name: 'Clay dark', c: ['#1b1c20', '#1b1c20'], clay: true },
  none: { name: 'No frame', c: null },
};
const names = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.name]));
const CHIPS = {
  bgType: { linear: 'Linear', radial: 'Radial', mesh: 'Mesh', solid: 'Solid', image: 'Photo' },
  deco: { none: 'None', blobs: 'Blobs', glow: 'Glow', stage: 'Stage', rings: 'Rings', sunburst: 'Sunburst', waves: 'Waves', grid: 'Grid', dots: 'Dots', stripes: 'Stripes', shapes: 'Shapes' },
  weight: { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Heavy', 900: 'Black' },
  align: { auto: 'Auto', left: 'Left', center: 'Centre' },
  hl: { color: 'Colour', marker: 'Marker', underline: 'Underline' },
  badgeStyle: { laurel: 'Laurel', stars: 'Stars', pill: 'Pill' },
  frame: names(FRAMES),
  shadow: { soft: 'Soft', hard: 'Hard', none: 'None' },
};
const PRESETS = [
  ['#4f46e5', '#7c3aed'], ['#0ea5e9', '#2563eb'], ['#34d399', '#047857'], ['#fb923c', '#f43f5e'],
  ['#f472b6', '#9333ea'], ['#1f2937', '#0b0f19'], ['#14532d', '#0f766e'], ['#fde68a', '#fdba74'],
  ['#fce7f3', '#fbcfe8'], ['#e0f2fe', '#c7d2fe'], ['#f8fafc', '#e2e8f0'], ['#fef3c7', '#fde68a'],
  ['#ff5f6d', '#ffc371'], ['#00c6ff', '#0072ff'], ['#0f0c29', '#302b63'], ['#11998e', '#38ef7d'],
  ['#ee0979', '#ff6a00'], ['#000000', '#434343'],
];
const BASE = {
  bgType: 'linear', c1: '#4f46e5', c2: '#7c3aed', c3: '#ec4899', angle: 160, deco: 'blobs', grain: false, rotate: false, rotateStep: 40, bgBlur: 0.3, bgDim: 0.35,
  font: 'system', subFont: '', weight: 800, upper: false, align: 'auto', autoText: true, textColor: '#ffffff', textShadow: false,
  accent: '#ffd60a', hl: 'color', badgeStyle: 'laurel', headScale: 1, subScale: 1,
  frame: 'black', shadow: 'soft', glare: false, devScale: 1,
};
const T = (name, p) => ({ name, p: { bgType: 'linear', deco: 'none', grain: false, subFont: '', weight: 800, upper: false, autoText: true, hl: 'color', frame: 'black', shadow: 'soft', textShadow: false, ...p } });
const THEMES = [
  T('Indigo', { c1: '#4f46e5', c2: '#7c3aed', deco: 'blobs', font: 'system', accent: '#ffd60a' }),
  T('Midnight', { c1: '#111827', c2: '#030712', deco: 'glow', font: 'inter', accent: '#60a5fa', frame: 'titanium' }),
  T('Clean', { bgType: 'solid', c1: '#f5f5f7', c2: '#e5e7eb', font: 'inter', weight: 700, accent: '#2563eb' }),
  T('Pastel', { bgType: 'mesh', c1: '#fdf2f8', c2: '#c7d2fe', c3: '#fbcfe8', font: 'plusjakartasans', accent: '#7c3aed', frame: 'silver' }),
  T('Sunset', { c1: '#ff7a59', c2: '#ff2d75', deco: 'waves', font: 'poppins', accent: '#fff3b0' }),
  T('Neon', { bgType: 'mesh', c1: '#0b0220', c2: '#7c3aed', c3: '#06b6d4', grain: true, font: 'spacegrotesk', weight: 700, accent: '#a3e635' }),
  T('Editorial', { bgType: 'solid', c1: '#f3efe6', c2: '#e7e0d0', font: 'playfairdisplay', weight: 700, accent: '#c2410c', hl: 'underline' }),
  T('Punch', { bgType: 'solid', c1: '#ffdd00', c2: '#ffb700', font: 'archivoblack', upper: true, accent: '#111111', hl: 'marker', frame: 'clayDark', shadow: 'hard' }),
  T('Forest', { c1: '#14532d', c2: '#0f766e', deco: 'rings', font: 'dmsans', accent: '#fde68a' }),
  T('Thai Modern', { bgType: 'mesh', c1: '#fff7ed', c2: '#fed7aa', c3: '#fecdd3', font: 'kanit', weight: 700, accent: '#e11d48', frame: 'silver' }),
  T('Ocean', { bgType: 'radial', c1: '#38bdf8', c2: '#1e3a8a', deco: 'stage', font: 'outfit', accent: '#fef08a' }),
  T('Terminal', { bgType: 'solid', c1: '#0a0a0a', c2: '#171717', deco: 'grid', font: 'jetbrainsmono', weight: 700, accent: '#22c55e' }),
  T('Candy', { c1: '#f472b6', c2: '#9333ea', deco: 'shapes', font: 'mitr', weight: 600, accent: '#fef08a', frame: 'clayWhite' }),
  T('Paper', { c1: '#e0f2fe', c2: '#c7d2fe', deco: 'dots', font: 'fraunces', weight: 700, accent: '#4338ca', hl: 'marker', frame: 'silver' }),
  T('Aurora', { bgType: 'mesh', c1: '#042f2e', c2: '#10b981', c3: '#6366f1', grain: true, font: 'sora', weight: 700, accent: '#fde047', frame: 'titanium' }),
  T('Blush', { c1: '#ffe4e6', c2: '#fecaca', deco: 'stage', font: 'prompt', weight: 700, accent: '#be123c', frame: 'pink' }),
];

const state = {
  slides: [], sel: 0, family: 'iphone', linkTpl: true, landscape: false, pano: false, bgImage: null,
  style: { ...BASE },
};
let uid = 0;
const blankImages = () => Object.fromEntries(Object.keys(FAMILY).map(f => [f, null]));
const newSlide = (headline = 'Your *headline* here') => ({
  id: ++uid, headline, subtitle: '', eyebrow: '', badge: '', template: state.slides[0]?.template || 'top', images: blankImages(),
});
const dims = o => state.landscape ? [o.h, o.w] : [o.w, o.h];

/* ---------- helpers ---------- */
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (hex, a) => `rgba(${rgb(hex)},${a})`;
const lum = hex => { const [r, g, b] = rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function bgIsLight(st) {
  if (st.bgType === 'image') return !state.bgImage ? lum(st.c1) > 0.6 : false;
  if (st.bgType === 'solid') return lum(st.c1) > 0.6;
  if (st.bgType === 'mesh') return (lum(st.c1) * 2 + lum(st.c2) + lum(st.c3)) / 4 > 0.6;
  return (lum(st.c1) + lum(st.c2)) / 2 > 0.6;
}
function hueShift(hex, deg) {
  let [r, g, b] = rgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d || !deg) return hex;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = ((h * 60 + deg) % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
  [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
/** Style for slide i: optionally walks the hue so each slide gets its own colour from one palette. */
const styleFor = i => {
  const st = state.style;
  if (!st.rotate || state.pano || !i) return st;
  const d = i * st.rotateStep;
  return { ...st, c1: hueShift(st.c1, d), c2: hueShift(st.c2, d), c3: hueShift(st.c3, d) };
};
const rnd = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

function classify(w, h) {
  const a = Math.min(w, h), b = Math.max(w, h), n = a / b;
  const exact = SIZES.find(s => s.w === a && s.h === b);
  if (exact) return exact.family;
  if (ANDROID_CAPTURES.includes(`${a}x${b}`)) return 'android';
  const play = FAMILY[state.family].store === 'android';
  if (n < 0.6) return play ? 'android' : 'iphone';
  if (n < 0.66) return 'atab';
  if (n < 0.73) return play ? 'atab' : 'duo';
  return play ? 'atab' : 'ipad';
}

function pickSource(slide, family) {
  if (!slide) return { img: null, family };
  if (slide.images[family]) return { img: slide.images[family], family };
  for (const f of FAMILY[family].fallback) if (slide.images[f]) return { img: slide.images[f], family: f, fallback: true };
  return { img: null, family };
}

/* ---------- text ---------- */
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
/** Word-wraps (Thai-aware via Intl.Segmenter); each line remembers where it starts in `text`. */
function wrap(ctx, text, maxW) {
  const lines = []; let base = 0;
  for (const para of text.split('\n')) {
    const parts = segmenter ? [...segmenter.segment(para)].map(s => s.segment) : para.split(/(\s+)/);
    let line = '', start = base, pos = base;
    for (const p of parts) {
      if (line.trim() && ctx.measureText((line + p).trimEnd()).width > maxW) {
        lines.push({ text: line.trimEnd(), start });
        const t = p.trimStart(); start = pos + p.length - t.length; line = t;
      } else line += p;
      pos += p.length;
    }
    lines.push({ text: line.trimEnd(), start });
    base += para.length + 1;
  }
  return lines;
}
const setLS = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px.toFixed(2) + 'px'; };
/** "*word*" marks a highlighted span. Returns the plain text and a per-character flag. */
function parseHL(s) {
  let text = '', on = false; const flags = [];
  for (const ch of s) { if (ch === '*') { on = !on; continue; } text += ch; for (let i = 0; i < ch.length; i++) flags.push(on); }
  return { text, flags };
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function laurel(ctx, cx, cy, h, dir) {
  const R = h / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(dir, 1); ctx.translate(-R * 0.12, 0);
  for (let i = 0; i < 8; i++) {
    const th = (98 + i * 20) * DEG, len = R * (0.4 - i * 0.012);
    const px = R * 0.5 + R * 0.62 * Math.cos(th), py = R * 0.95 * Math.sin(th);
    const phi = Math.atan2(0.95 * Math.cos(th), -0.62 * Math.sin(th));
    for (const off of i === 7 ? [0] : [-0.75, 0.55]) {
      const a = phi + off, l = off > 0 ? len * 0.8 : len;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * l / 2, py + Math.sin(a) * l / 2, l / 2, l * 0.21, a, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}

function badgeLayout(ctx, text, st, f, H) {
  const lines = text.split(/\s*\|\s*|\n/).filter(Boolean).slice(0, 2);
  const font = (w, s) => `${fontWeight(f, w)} ${s}px ${f.css}`;
  const two = lines.length > 1, style = st.badgeStyle;
  const s1 = H * (style === 'stars' ? 0.3 : style === 'pill' ? 0.3 : two ? 0.4 : 0.34), s2 = H * 0.23;
  const meas = () => { ctx.font = font(800, s1); setLS(ctx, 0); let w = ctx.measureText(lines[0]).width; if (two) { ctx.font = font(600, s2); w = Math.max(w, ctx.measureText(lines[1]).width); } return w; };
  const tw = meas(), ww = H * 0.52, pad = H * 0.32;
  const total = style === 'laurel' ? tw + 2 * ww + H * 0.16 : style === 'pill' ? tw + pad * 2 : Math.max(tw, H * 1.9);
  return {
    w: total,
    draw(x, y, color, accent) {
      ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = color;
      const cx = x + total / 2;
      if (style === 'laurel') {
        laurel(ctx, x + ww / 2, y + H / 2, H * 0.98, 1); laurel(ctx, x + total - ww / 2, y + H / 2, H * 0.98, -1);
        ctx.font = font(800, s1); ctx.fillText(lines[0], cx, y + H * (two ? 0.37 : 0.52));
        if (two) { ctx.font = font(600, s2); ctx.globalAlpha = 0.85; ctx.fillText(lines[1], cx, y + H * 0.74); }
      } else if (style === 'stars') {
        ctx.fillStyle = accent;
        for (let i = 0; i < 5; i++) { starPath(ctx, cx + (i - 2) * H * 0.38, y + H * 0.24, H * 0.17); ctx.fill(); }
        ctx.fillStyle = color; ctx.font = font(700, s1); ctx.fillText(lines.join('  ·  '), cx, y + H * 0.72);
      } else {
        ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.roundRect(x, y + H * 0.14, total, H * 0.72, H); ctx.fill();
        ctx.globalAlpha = 1; ctx.font = font(700, s1); ctx.fillText(lines.join('  ·  '), cx, y + H * 0.52);
      }
      ctx.restore();
    },
  };
}

function layoutText(ctx, slide, U, maxW, st, scale = 1) {
  const f = FONTS[st.font] || FONTS.system, sf = FONTS[st.subFont] || f;
  const raw = st.upper ? slide.headline.trim().toUpperCase() : slide.headline.trim();
  const { text: head, flags } = parseHL(raw);
  const sub = slide.subtitle.trim(), eye = (slide.eyebrow || '').trim(), badge = (slide.badge || '').trim();
  const thai = THAI.test(head), ls = thai ? 0 : f.ls, hw = fontWeight(f, st.weight);
  let size = 0.094 * U * st.headScale * scale * f.k, hl = [];
  const hFont = () => `${hw} ${size}px ${f.css}`;
  if (head) for (;;) {
    ctx.font = hFont(); setLS(ctx, size * ls);
    hl = wrap(ctx, head, maxW);
    const over = hl.some(l => ctx.measureText(l.text).width > maxW);
    if ((hl.length <= 3 && !over) || size < 0.042 * U) break;
    size *= 0.94;
  }
  const ss = 0.044 * U * st.subScale * scale * (sf.k > 1 ? 1.1 : 1), sFont = `${fontWeight(sf, st.weight >= 600 ? 500 : 400)} ${ss}px ${sf.css}`;
  let sl = [];
  if (sub) { ctx.font = sFont; setLS(ctx, 0); sl = wrap(ctx, sub, maxW); }
  const hlh = size * (thai ? 1.36 : 1.12), slh = ss * (THAI.test(sub) ? 1.52 : 1.36);
  const es = 0.034 * U * scale, eh = eye ? es * 2.1 : 0, eGap = eye && (hl.length || sl.length) ? 0.03 * U : 0;
  const gap = hl.length && sl.length ? 0.028 * U : 0;
  const bH = badge ? 0.115 * U * scale : 0, bGap = badge && (hl.length || sl.length || eye) ? 0.045 * U : 0;
  const bl = badge ? badgeLayout(ctx, badge, st, sf, bH) : null;
  const eFont = `${fontWeight(sf, 600)} ${es}px ${sf.css}`;
  return {
    h: eh + eGap + hl.length * hlh + gap + sl.length * slh + bGap + bH,
    draw(x0, y, w, align, color) {
      const ax = align === 'center' ? x0 + w / 2 : x0, lx = lw => align === 'center' ? ax - lw / 2 : ax;
      ctx.save();
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
      if (st.textShadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = size * 0.14; ctx.shadowOffsetY = size * 0.04; }
      if (eye) {
        ctx.font = eFont; setLS(ctx, es * 0.04);
        const tw = ctx.measureText(eye).width, pw = tw + es * 1.9, px = lx(pw);
        ctx.save(); ctx.shadowColor = 'transparent'; ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.roundRect(px, y, pw, eh, eh / 2); ctx.fill(); ctx.restore();
        ctx.textAlign = 'left'; ctx.fillText(eye, px + es * 0.95, y + eh / 2 + es * 0.36);
      }
      let yy = y + eh + eGap;
      ctx.font = hFont(); setLS(ctx, size * ls); ctx.textAlign = 'left';
      const onAccent = lum(st.accent) > 0.6 ? '#0b0c10' : '#ffffff';
      hl.forEach((l, i) => {
        const yb = yy + i * hlh + (hlh - size) / 2 + size * 0.85;
        const runs = []; let x = lx(ctx.measureText(l.text).width);
        for (let k = 0; k < l.text.length;) { // split the line into highlighted / plain runs
          const on = !!flags[l.start + k]; let e = k;
          while (e < l.text.length && !!flags[l.start + e] === on) e++;
          const t = l.text.slice(k, e), rw = ctx.measureText(t).width;
          runs.push({ t, on, x, rw }); x += rw; k = e;
        }
        for (const r of runs) if (r.on && r.t.trim() && st.hl !== 'color') {
          ctx.save(); ctx.shadowColor = 'transparent'; ctx.fillStyle = st.accent; ctx.beginPath();
          if (st.hl === 'marker') ctx.roundRect(r.x - size * 0.09, yb - size * (thai ? 1 : 0.88), r.rw + size * 0.18, size * (thai ? 1.3 : 1.1), size * 0.16);
          else ctx.roundRect(r.x, yb + size * 0.09, r.rw, size * 0.085, size * 0.05);
          ctx.fill(); ctx.restore();
        }
        for (const r of runs) {
          ctx.fillStyle = !r.on ? color : st.hl === 'color' ? st.accent : st.hl === 'marker' ? onAccent : color;
          if (r.on && st.hl === 'marker') { ctx.save(); ctx.shadowColor = 'transparent'; ctx.fillText(r.t, r.x, yb); ctx.restore(); } else ctx.fillText(r.t, r.x, yb);
        }
      });
      yy += hl.length * hlh + gap;
      ctx.fillStyle = color; ctx.font = sFont; setLS(ctx, 0); ctx.textAlign = align; ctx.globalAlpha = 0.84;
      sl.forEach((l, i) => ctx.fillText(l.text, ax, yy + i * slh + (slh - ss) / 2 + ss * 0.85));
      ctx.globalAlpha = 1;
      if (bl) bl.draw(lx(bl.w), yy + sl.length * slh + bGap, color, st.accent);
      ctx.restore();
    },
  };
}

function drawCover(ctx, img, x, y, w, h, ay = 0) {
  const s = Math.max(w / img.w, h / img.h), sw = w / s, sh = h / s;
  ctx.drawImage(img.el, (img.w - sw) / 2, (img.h - sh) * ay, sw, sh, x, y, w, h);
}

function drawPlaceholder(ctx, x, y, w, h) {
  const m = Math.min(w, h), p = m * 0.08, cols = w > h ? 3 : 1, cw = (w - p * (cols + 1)) / cols, chh = m * 0.24;
  ctx.fillStyle = '#f3f4f8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#dfe2ea';
  ctx.beginPath(); ctx.roundRect(x + p, y + m * 0.16, m * 0.5, m * 0.07, m * 0.02); ctx.fill();
  for (let r = 0; r < 8; r++) {
    const cy = y + m * 0.3 + r * (chh + p * 0.75);
    if (cy + chh > y + h) break;
    for (let c = 0; c < cols; c++) { ctx.beginPath(); ctx.roundRect(x + p + c * (cw + p), cy, cw, chh, m * 0.04); ctx.fill(); }
  }
}

/* ---------- device ---------- */
function devSpec(src, st, family, wide) {
  const F = FAMILY[family], fr = FRAMES[st.frame] || FRAMES.black;
  const a = src.img ? src.img.w / src.img.h : wide ? F.h / F.w : F.w / F.h;
  const n = Math.min(a, 1 / a), ios = F.store === 'ios';
  const shape = n < 0.6 ? 'phone' : family === 'duo' ? 'fold' : 'tablet';
  // bezel and corner radius as a fraction of the device's short side
  let [k, rk] = shape === 'phone' ? (ios ? [0.034, n < 0.5 ? 0.155 : 0.1] : [0.026, 0.105]) : shape === 'fold' ? [0.022, 0.075] : ios ? [0.034, 0.055] : [0.032, 0.05];
  if (!fr.c) { k = 0; rk *= 0.62; } else if (fr.clay) k *= 1.5;
  if (a > 1) { k /= a; rk /= a; }
  return { a, k, rk, shape, ios, fr, island: ios && shape === 'phone' && n < 0.5 && a < 1, punch: !ios && shape === 'phone' && a < 1, rr: (1 - 2 * k) / a + 2 * k };
}

function drawDevice(ctx, src, d, st, cx, top, dw, { rot = 0, iso = false } = {}) {
  const dh = dw * d.rr, b = dw * d.k, R = dw * d.rk, cols = d.fr.c, real = cols && !d.fr.clay;
  ctx.save();
  ctx.translate(cx, top + dh / 2); ctx.rotate(rot);
  if (iso) ctx.transform(0.9, 0.27, -0.33, 0.92, 0, 0);
  ctx.translate(-dw / 2, -dh / 2);
  const body = () => { ctx.beginPath(); ctx.roundRect(0, 0, dw, dh, R); };
  if (real && d.shape !== 'tablet' && d.a < 1) { // side buttons
    ctx.fillStyle = cols[1];
    const bw = dw * 0.012;
    ctx.fillRect(dw - bw / 2, dh * 0.27, bw, dh * 0.1);
    ctx.fillRect(-bw / 2, dh * 0.2, bw, dh * 0.06); ctx.fillRect(-bw / 2, dh * 0.28, bw, dh * 0.06);
  }
  if (st.shadow !== 'none') {
    ctx.save();
    if (st.shadow === 'hard') { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowOffsetX = dw * 0.035; ctx.shadowOffsetY = dw * 0.035; }
    else { ctx.shadowColor = 'rgba(0,0,0,.36)'; ctx.shadowBlur = dw * (iso ? 0.16 : 0.1); ctx.shadowOffsetY = dw * 0.045; if (iso) ctx.shadowOffsetX = -dw * 0.06; }
    ctx.fillStyle = cols ? cols[1] : '#000'; body(); ctx.fill();
    ctx.restore();
  }
  if (iso) { // extruded edge so the device reads as a solid object
    ctx.fillStyle = cols ? cols[1] : '#1a1a1e';
    for (let j = 9; j > 0; j--) { ctx.save(); ctx.translate(-j * dw * 0.0035, j * dw * 0.0035); body(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); ctx.restore(); }
  }
  if (cols) {
    if (real) {
      const g = ctx.createLinearGradient(0, 0, dw, 0);
      g.addColorStop(0, cols[0]); g.addColorStop(0.08, cols[1]); g.addColorStop(0.92, cols[1]); g.addColorStop(1, cols[0]);
      ctx.fillStyle = g; body(); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(b * 0.3, b * 0.3, dw - b * 0.6, dh - b * 0.6, Math.max(R - b * 0.3, 0)); ctx.fill();
    } else { ctx.fillStyle = cols[0]; body(); ctx.fill(); }
  }
  const sw = dw - 2 * b, sh = dh - 2 * b;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(b, b, sw, sh, Math.max(R - b, 0)); ctx.clip();
  if (src.img) drawCover(ctx, src.img, b, b, sw, sh); else drawPlaceholder(ctx, b, b, sw, sh);
  if (st.glare) {
    const g = ctx.createLinearGradient(b, b, b + sw * 0.8, b + sh * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b, b); ctx.lineTo(b + sw * 0.82, b); ctx.lineTo(b + sw * 0.18, b + sh * 0.62); ctx.lineTo(b, b + sh * 0.62); ctx.fill();
  }
  ctx.restore();
  if (cols && d.island) {
    const iw = sw * 0.29, ih = sw * 0.083;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(dw / 2 - iw / 2, b + sw * 0.028, iw, ih, ih / 2); ctx.fill();
  } else if (cols && d.punch) {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(dw / 2, b + sw * 0.05, sw * 0.017, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* ---------- background ---------- */
let grainTile;
function drawGrain(ctx, W, H) {
  if (!grainTile) {
    grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 256;
    const g = grainTile.getContext('2d'), im = g.createImageData(256, 256), r = rnd(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }
  const p = ctx.createPattern(grainTile, 'repeat'), s = Math.max(0.5, Math.min(W, H) / 900);
  if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22; ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** Paints a background VW wide; `u` is one slide's width, so a panorama is VW = slides × u. */
function drawBackground(ctx, VW, H, u, st) {
  const n = Math.max(1, Math.round(VW / u)), m = Math.min(u, H);
  ctx.save();
  const blob = (x, y, r, col) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col); rg.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  const img = st.bgType === 'image' && state.bgImage;
  if (st.bgType === 'solid') { ctx.fillStyle = st.c1; ctx.fillRect(0, 0, VW, H); }
  else if (st.bgType === 'radial') {
    const g = ctx.createRadialGradient(VW / 2, H * 0.4, 0, VW / 2, H * 0.4, Math.hypot(VW / 2, H * 0.6));
    g.addColorStop(0, st.c1); g.addColorStop(1, st.c2); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, H);
  } else if (st.bgType === 'mesh') {
    ctx.fillStyle = st.c1; ctx.fillRect(0, 0, VW, H);
    const r = rnd(11), R = Math.max(u, H) * 0.62;
    for (let k = 0; k < n; k++) for (const [fx, fy, col] of [[0.05, 0.08, st.c2], [0.95, 0.3, st.c3], [0.1, 0.72, st.c3], [0.9, 0.98, st.c2]])
      blob((k + fx + (r() - 0.5) * 0.2) * u, (fy + (r() - 0.5) * 0.1) * H, R * (0.85 + r() * 0.3), rgba(col, 0.9));
  } else if (img) {
    const px = st.bgBlur * m * 0.06;
    ctx.save();
    if (px > 0.5 && 'filter' in ctx) ctx.filter = `blur(${px}px)`;
    drawCover(ctx, img, -2 * px, -2 * px, VW + 4 * px, H + 4 * px, 0.5);
    ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${st.bgDim})`; ctx.fillRect(0, 0, VW, H);
  } else {
    const a = st.angle * DEG, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(VW * dx) + Math.abs(H * dy);
    const g = ctx.createLinearGradient(VW / 2 - dx * L / 2, H / 2 - dy * L / 2, VW / 2 + dx * L / 2, H / 2 + dy * L / 2);
    g.addColorStop(0, st.c1); g.addColorStop(1, st.c2); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, H);
  }
  const ink = bgIsLight(st) ? '0,0,0' : '255,255,255', c = a => `rgba(${ink},${a})`;
  for (let k = 0; k < n; k++) {
    const ox = k * u, r = rnd(100 + k);
    switch (st.deco) {
      case 'blobs': blob(ox + u * 0.95, H * 0.05, m * 0.8, c(0.2)); blob(ox, H * 0.5, m * 0.7, c(0.12)); blob(ox + u * 0.85, H, m * 0.9, 'rgba(0,0,0,0.1)'); break;
      case 'glow': blob(ox + u / 2, H * 0.62, m * 0.85, 'rgba(255,255,255,0.36)'); break;
      case 'stage':
        ctx.fillStyle = c(0.1); ctx.beginPath(); ctx.arc(ox + u / 2, H * 0.74, m * 0.5, 0, 7); ctx.fill();
        ctx.strokeStyle = c(0.12); ctx.lineWidth = m * 0.004; ctx.beginPath(); ctx.arc(ox + u / 2, H * 0.74, m * 0.62, 0, 7); ctx.stroke();
        break;
      case 'rings':
        ctx.strokeStyle = c(0.11); ctx.lineWidth = m * 0.004;
        for (let i = 1; i <= 9; i++) { ctx.beginPath(); ctx.arc(ox + u, 0, i * m * 0.17, 0, 7); ctx.stroke(); }
        break;
      case 'sunburst': {
        const px = ox + u / 2, py = H * 0.46, RR = Math.hypot(u, H);
        ctx.fillStyle = c(0.06);
        ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, u, H); ctx.clip();
        for (let i = 0; i < 14; i++) { const a0 = i * Math.PI / 7; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, RR, a0, a0 + Math.PI / 14); ctx.fill(); }
        ctx.restore(); break;
      }
      case 'shapes':
        for (let i = 0; i < 16; i++) {
          const x = ox + r() * u, y = r() * H, s = m * (0.025 + r() * 0.06), kind = i % 4;
          ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.3); ctx.fillStyle = ctx.strokeStyle = c(0.14); ctx.lineWidth = m * 0.008;
          ctx.beginPath();
          if (kind === 0) { ctx.arc(0, 0, s, 0, 7); ctx.fill(); }
          else if (kind === 1) { ctx.arc(0, 0, s, 0, 7); ctx.stroke(); }
          else if (kind === 2) { ctx.roundRect(-s, -s, 2 * s, 2 * s, s * 0.35); ctx.stroke(); }
          else { ctx.roundRect(-s, -s * 0.22, 2 * s, s * 0.44, s); ctx.roundRect(-s * 0.22, -s, s * 0.44, 2 * s, s); ctx.fill(); }
          ctx.restore();
        }
        break;
    }
  }
  switch (st.deco) { // patterns that run straight through a panorama
    case 'grid': {
      ctx.strokeStyle = c(0.07); ctx.lineWidth = Math.max(1, m * 0.002);
      const s = u / 8; ctx.beginPath();
      for (let x = s; x < VW; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(VW, y); }
      ctx.stroke(); break;
    }
    case 'dots': {
      ctx.fillStyle = c(0.14); const s = u / 14;
      for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < VW; x += s) { ctx.beginPath(); ctx.arc(x, y, m * 0.0042, 0, 7); ctx.fill(); }
      break;
    }
    case 'stripes': {
      ctx.strokeStyle = c(0.055); ctx.lineWidth = m * 0.05; ctx.beginPath();
      for (let x = -H; x < VW + H; x += m * 0.16) { ctx.moveTo(x, H); ctx.lineTo(x + H * 0.7, 0); }
      ctx.stroke(); break;
    }
    case 'waves':
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = c(0.06); ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= VW + 1; x += u / 40) ctx.lineTo(x, H * (0.52 + i * 0.11) + Math.sin(x / u * 6.283 + i * 1.7) * m * 0.07);
        ctx.lineTo(VW, H); ctx.fill();
      }
      break;
  }
  ctx.restore();
}

/* ---------- templates ---------- */
const TPL_NAMES = {
  top: 'Classic', bottom: 'Caption below', block: 'Caption block', float: 'Floating', tilt: 'Tilted', left: 'Offset', closeup: 'Close-up', peek: 'Big type',
  pair: 'Pair', fan: 'Trio', iso: 'Isometric', card: 'Card', pano: 'Panorama', full: 'Full bleed', hero: 'Text only',
};
const TEMPLATES = {
  top(c) { c.put(c.area()); },
  bottom(c) { c.put(c.area('bottom')); },
  block(c) { // frameless screenshot with the caption in a rounded block of the background colour
    const { ctx, W, H, U } = c, tw = W * (c.wide ? 0.7 : 0.84), t = c.text(tw), R = 0.07 * U;
    const bh = t.h + H * 0.055 + 0.075 * U, y = H - bh;
    if (c.src.img) drawCover(ctx, c.src.img, 0, 0, W, y + R); else drawPlaceholder(ctx, 0, 0, W, y + R);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 0.06 * U; ctx.shadowOffsetY = -0.01 * U;
    ctx.beginPath(); ctx.roundRect(0, y, W, bh + R, R); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
    if (state.pano && state.slides.length > 1) { ctx.translate(-c.i * W, 0); drawBackground(ctx, W * state.slides.length, H, W, c.st); } else drawBackground(ctx, W, H, W, c.st);
    ctx.restore();
    t.draw((W - tw) / 2, y + 0.075 * U, tw, c.align('center'), c.color);
  },
  float(c) { c.put(c.area(), { wmax: 0.76, vis: 1.053, center: true }); },
  tilt(c) { c.put(c.area(), { wmax: 0.8, vis: 0.78, rot: -7 * DEG, dy: 0.09 }); },
  left(c) { c.put(c.area('top', 'left'), { wmax: 0.88, dx: 0.19 }); },
  closeup(c) { c.put(c.area(), { wmax: 1.16, vis: 0.45 }); },
  peek(c) { c.put(c.area('top', 'center', 1.25), { wmax: 0.9, vis: 0.5, peek: 0.5 }); },
  pair(c) {
    const b = c.area(), next = c.srcOf(c.i + 1);
    c.put(b, { wmax: 0.57, s: next.img ? next : c.src, dx: 0.33, dy: 0.06, rot: 6 * DEG });
    c.put(b, { wmax: 0.62, dx: -0.21, dy: 0.2, rot: -5 * DEG });
  },
  fan(c) {
    const b = c.area(), prev = c.srcOf(c.i - 1), next = c.srcOf(c.i + 1);
    c.put(b, { wmax: 0.5, s: prev.img ? prev : c.src, dx: -0.6, dy: 0.2, rot: -9 * DEG });
    c.put(b, { wmax: 0.5, s: next.img ? next : c.src, dx: 0.6, dy: 0.2, rot: 9 * DEG });
    c.put(b, { wmax: 0.58, dy: 0.04 });
  },
  iso(c) { c.put(c.area('top', 'left'), { wmax: 0.72, vis: 0.86, iso: true, dx: 0.1, dy: 0.2 }); },
  card(c) { c.put(c.area(), { wmax: 0.78, vis: 1.08, center: true, rot: -3 * DEG, st: { ...c.st, frame: 'none' } }); },
  pano(c) { // one device straddles the seam between each pair of slides
    const { W, H, U, i, ctx } = c, sl = state.slides, k = i % 2, j = k ? i - 1 : i + 1;
    if (j >= sl.length || c.side) return TEMPLATES.top(c);
    const tw = W * 0.84, t = c.text(tw), o = c.text(tw, sl[j]);
    t.draw(W * 0.08, H * 0.06, tw, c.align('left'), c.color);
    const top = H * 0.06 + Math.max(t.h, o.h) + 0.07 * U;
    const seam = k ? c.srcOf(j) : c.src, d = devSpec(seam, c.st, c.family, c.wide);
    const dw = Math.min(0.84 * W, (H - top) / 0.8 / d.rr) * c.st.devScale;
    if (k) c.put({ x: W * 0.47, w: W * 0.53, y: top + dw * 0.32, h: H - top - dw * 0.32 }, { wmax: 0.84 });
    drawDevice(ctx, seam, d, c.st, k ? 0 : W, top + dw * 0.08, dw, { rot: -8 * DEG });
  },
  full(c) {
    const { ctx, W, H } = c;
    if (c.src.img) drawCover(ctx, c.src.img, 0, 0, W, H); else drawPlaceholder(ctx, 0, 0, W, H);
    const tw = W * (c.wide ? 0.6 : 0.84), t = c.text(tw), ty = H * 0.94 - t.h;
    const g = ctx.createLinearGradient(0, ty - H * 0.22, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,.72)'); g.addColorStop(1, 'rgba(0,0,0,.9)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    t.draw(W * 0.08, ty, tw, c.align('left'), '#ffffff');
  },
  hero(c) {
    const { W, H } = c, tw = W * (c.wide ? 0.7 : 0.84), t = c.text(tw, c.slide, 1.35);
    t.draw((W - tw) / 2, (H - t.h) / 2, tw, c.align('center'), c.color);
  },
};

function render(ctx, W, H, i, family, tplOverride) {
  const st = styleFor(i), slides = state.slides, slide = slides[i], wide = W > H;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (state.pano && slides.length > 1) { ctx.save(); ctx.translate(-i * W, 0); drawBackground(ctx, W * slides.length, H, W, st); ctx.restore(); }
  else drawBackground(ctx, W, H, W, st);
  const src = pickSource(slide, family), d = devSpec(src, st, family, wide);
  const side = W > H * 1.05 && d.rr > 1;                       // landscape slide, portrait device: text beside it
  const U = side ? Math.min(W * 0.45, H * 0.8) : wide ? Math.min(W * 0.5, H * 0.72) : Math.min(W, H * 0.52);
  const color = st.autoText ? (bgIsLight(st) ? '#0b0c10' : '#ffffff') : st.textColor;
  const c = {
    ctx, W, H, U, st, i, slide, src, d, side, wide, family, color,
    srcOf: j => pickSource(slides[j], family),
    text: (maxW, sl = slide, scale = 1) => layoutText(ctx, sl, U, maxW, st, scale),
    align: def => st.align === 'auto' ? def : st.align,
    /** Draws the text block and returns the box that is left for the device. */
    area(pos = 'top', def = 'center', scale = 1) {
      if (side) {
        const cw = W * 0.4, t = this.text(cw, slide, scale);
        t.draw(W * 0.07, (H - t.h) / 2, cw, this.align('left'), color);
        return { x: W * 0.5, w: W * 0.46, y: pos === 'bottom' ? 0 : H * 0.1, h: H * 0.9, bottom: pos === 'bottom' };
      }
      const tw = W * 0.84, t = this.text(tw, slide, scale), al = this.align(def), g = t.h ? 0.06 * U : 0;
      if (pos === 'bottom') { const ty = H * 0.945 - t.h; t.draw(W * 0.08, ty, tw, al, color); return { x: 0, w: W, y: 0, h: ty - g, bottom: true }; }
      const y0 = H * (wide ? 0.08 : 0.06); t.draw(W * 0.08, y0, tw, al, color);
      return { x: 0, w: W, y: y0 + t.h + g, h: H - y0 - t.h - g };
    },
    /** Places a device in a box. `vis` is how much of its height must fit; the rest bleeds off the slide. */
    put(box, { wmax = 0.82, vis = 0.8, dx = 0, dy = 0, s = src, center, peek, ...o } = {}) {
      const st2 = o.st || st, dd = devSpec(s, st2, family, wide);
      const dw = Math.min(wmax * box.w, box.h / vis / dd.rr) * st.devScale, dh = dw * dd.rr;
      let top = box.bottom ? box.y + box.h - dh : center ? box.y + Math.max(0, (box.h / vis - dh) / 2) : box.y;
      if (peek) top = Math.max(top, box.y + box.h - dh * peek);
      drawDevice(ctx, s, dd, st2, box.x + box.w / 2 + dx * dw, top + dy * dw, dw, o);
    },
  };
  (TEMPLATES[tplOverride || slide.template] || TEMPLATES.top)(c);
  if (st.grain) drawGrain(ctx, W, H);
  ctx.restore();
}

/* ---------- fonts on demand ---------- */
const fontLinks = new Map();
function loadFont(f, weights, text) {
  if (!f?.g) return Promise.resolve();
  if (!fontLinks.has(f.g)) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.g.replace(/ /g, '+')}:wght@${f.w.join(';')}&display=swap`;
    document.head.append(l);
    fontLinks.set(f.g, new Promise(r => { l.onload = l.onerror = r; }));
  }
  return fontLinks.get(f.g).then(() => Promise.all([...new Set(weights.map(w => fontWeight(f, w)))].map(w => document.fonts.load(`${w} 40px "${f.g}"`, text).catch(() => { }))));
}
const allText = () => state.slides.map(s => [s.headline, s.subtitle, s.eyebrow, s.badge].join(' ')).join(' ') + ' Ag';
async function ensureFonts() {
  const st = state.style, all = allText();
  const need = new Set([FONTS[st.font], FONTS[st.subFont] || FONTS[st.font]]);
  if (THAI.test(all)) need.add(FONTS.notosansthai);
  await Promise.all([...need].map(f => loadFont(f, [st.weight, 400, 500, 600, 800], all)));
}
let fontT;
const fontsSoon = () => { clearTimeout(fontT); fontT = setTimeout(() => ensureFonts().then(schedule), 120); };

/* ---------- persistence (IndexedDB, stays on this device) ---------- */
const db = (() => {
  let p;
  const open = () => p ||= new Promise((res, rej) => {
    const r = indexedDB.open('screenshot-studio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = (mode, fn) => open().then(d => new Promise((res, rej) => {
    const t = d.transaction('kv', mode), rq = fn(t.objectStore('kv'));
    t.oncomplete = () => res(rq?.result); t.onerror = t.onabort = () => rej(t.error);
  })).catch(() => undefined);
  return { get: k => tx('readonly', s => s.get(k)), set: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)), clear: () => tx('readwrite', s => s.clear()) };
})();
let saveT;
const saveSoon = () => {
  clearTimeout(saveT);
  saveT = setTimeout(() => db.set('meta', {
    style: state.style, sel: state.sel, family: state.family, linkTpl: state.linkTpl, landscape: state.landscape, pano: state.pano,
    sizes: SIZES.filter(s => s.on).map(s => s.id), slides: state.slides.map(({ images, ...s }) => s),
  }), 500);
};
function setImage(slide, fam, im) {
  const old = slide.images[fam]; if (old) URL.revokeObjectURL(old.url);
  slide.images[fam] = im;
  const key = `img:${slide.id}:${fam}`;
  if (im) db.set(key, im.blob); else db.del(key);
}
async function restore() {
  const m = await db.get('meta');
  if (!m?.slides?.length) return;
  Object.assign(state.style, m.style);
  if (!FONTS[state.style.font]) state.style.font = 'system';
  Object.assign(state, { family: FAMILY[m.family] ? m.family : 'iphone', linkTpl: !!m.linkTpl, landscape: !!m.landscape, pano: !!m.pano });
  if (m.sizes) SIZES.forEach(s => s.on = m.sizes.includes(s.id));
  const slides = [];   // built aside so a repaint during the awaits never sees a half-restored project
  for (const s of m.slides.slice(0, MAX_SLIDES)) {
    const sl = { ...newSlide(), ...s, images: blankImages() };
    for (const fam of Object.keys(FAMILY)) {
      const blob = await db.get(`img:${s.id}:${fam}`);
      if (blob) sl.images[fam] = await loadImage(blob).catch(() => null);
    }
    slides.push(sl);
  }
  state.slides = slides;
  uid = Math.max(...state.slides.map(s => s.id));
  state.sel = Math.min(m.sel || 0, state.slides.length - 1);
  const bg = await db.get('bg');
  if (bg) state.bgImage = await loadImage(bg).catch(() => null);
}

/* ---------- starter ideas, randomize, undo ---------- */
const DEFAULT_HEAD = 'Your *headline* here';
const RESET = { rotate: false, rotateStep: 40, align: 'auto', badgeStyle: 'laurel', devScale: 1, headScale: 1, subScale: 1, glare: false, textColor: '#ffffff' };
// each slide: t = template, h = headline, s = subtitle, e = label, b = badge
const STARTERS = [
  { name: 'Classic launch', theme: 'Indigo', slides: [
    { t: 'top', h: 'Plan your *whole week* in seconds', s: 'Tasks, habits and calendar in one place', b: '4.9 ★ | 120K ratings' },
    { t: 'top', h: 'Everything in *one place*' }, { t: 'top', h: 'Reminders that *actually* help' }, { t: 'top', h: 'Syncs across *all your devices*' }] },
  { name: 'Award hero', theme: 'Midnight', st: { badgeStyle: 'laurel' }, slides: [
    { t: 'hero', h: 'Sleep better. *Stress less.*', s: 'The calm you need, every day', b: 'App of the Day | App Store' },
    { t: 'float', h: 'Wind down in *minutes*' }, { t: 'float', h: 'Sessions for *every mood*' }, { t: 'float', h: 'Track your *progress*' }] },
  { name: 'Panorama story', theme: 'Sunset', pano: true, slides: [
    { t: 'pano', h: 'Go *anywhere*', s: 'Book a ride in two taps' }, { t: 'pano', h: 'See your driver *live*' },
    { t: 'tilt', h: 'Pay your *way*' }, { t: 'top', h: 'Rated *4.9* by riders', b: '4.9 ★ | 2M ratings' }] },
  { name: 'Caption blocks', theme: 'Candy', st: { bgType: 'solid', c1: '#58cc02', deco: 'none', rotate: true, rotateStep: 60, font: 'nunito', weight: 900, accent: '#ffffff', hl: 'underline' }, slides: [
    { t: 'block', h: 'learn a language *for free*' }, { t: 'block', h: 'fun lessons, *5 minutes* a day' },
    { t: 'block', h: 'keep your *streak* alive' }, { t: 'block', h: 'compete with *friends*' }] },
  { name: 'Frameless cards', theme: 'Clean', st: { align: 'left', font: 'inter', weight: 800, accent: '#16a34a' }, slides: [
    { t: 'card', h: 'Send money *instantly*', s: 'Free, fast and secure' }, { t: 'card', h: 'Get paid *2 days early*' },
    { t: 'card', h: 'Save on *every purchase*' }, { t: 'card', h: 'Invest from *$1*' }] },
  { name: 'Bold caps', theme: 'Punch', slides: [
    { t: 'peek', h: 'FIND *MUSIC* YOU LOVE' }, { t: 'closeup', h: 'MADE *FOR YOU*' },
    { t: 'closeup', h: 'LISTEN *OFFLINE*' }, { t: 'peek', h: 'SHARE *EVERYTHING*' }] },
  { name: 'ไทยโมเดิร์น', theme: 'Thai Modern', slides: [
    { t: 'tilt', h: 'สั่งง่าย *ส่งไว*', s: 'อาหารร้านโปรดส่งถึงมือคุณ', b: '700,000 ร้าน | ทั่วประเทศ' },
    { t: 'top', h: 'โปรเด็ด*ทุกวัน*', s: 'ส่วนลดสูงสุด 50%' }, { t: 'top', h: 'ติดตามออเดอร์*แบบเรียลไทม์*' }, { t: 'top', h: 'จ่ายสะดวก *ทุกช่องทาง*' }] },
  { name: 'Editorial', theme: 'Editorial', st: { subFont: 'inter' }, slides: [
    { t: 'float', h: 'Read *smarter*, not longer', s: 'The best stories, picked for you', e: "EDITORS' CHOICE" },
    { t: 'left', h: 'Save it *for later*' }, { t: 'float', h: 'Listen on the *go*' }, { t: 'left', h: 'Yours, *ad-free*' }] },
  { name: 'Neon tech', theme: 'Neon', st: { align: 'left' }, slides: [
    { t: 'iso', h: 'Ship *faster* with AI', s: 'Your whole workflow in one app', e: 'NEW · 2.0' },
    { t: 'left', h: 'Ask *anything*' }, { t: 'left', h: 'Automate the *boring parts*' }, { t: 'pair', h: 'Works with *your tools*' }] },
  { name: 'Soft trio', theme: 'Pastel', slides: [
    { t: 'fan', h: 'All your photos, *beautifully* organised', b: '4.8 ★ | Loved by 5M' },
    { t: 'top', h: 'Edit in *one tap*' }, { t: 'pair', h: 'Albums that *build themselves*' }, { t: 'top', h: 'Share with *family*' }] },
  { name: 'Game, landscape', theme: 'Aurora', land: true, st: { font: 'bebasneue', upper: true, textShadow: true }, slides: [
    { t: 'full', h: 'BUILD YOUR *KINGDOM*' }, { t: 'full', h: 'BATTLE *REAL PLAYERS*' }, { t: 'full', h: 'COLLECT *100+ HEROES*' }, { t: 'full', h: 'JOIN A *CLAN*' }] },
  { name: 'Ocean stage', theme: 'Ocean', slides: [
    { t: 'bottom', h: 'Your money, *under control*', s: 'Budgets that update themselves' },
    { t: 'bottom', h: 'See where it *goes*' }, { t: 'bottom', h: 'Hit your *goals* sooner' }, { t: 'bottom', h: 'Bank-level *security*' }] },
];
const hasImages = s => Object.values(s.images).some(Boolean);
const untouched = s => s.auto || (!s.subtitle && !s.eyebrow && !s.badge && (!s.headline || s.headline === DEFAULT_HEAD));

/** Applies a starter in place. Screenshots stay, and so does any text the user has typed. */
function applyStarter(sp) {
  const have = state.slides, fresh = !have.some(hasImages), n = fresh ? sp.slides.length : have.length;
  state.slides = Array.from({ length: n }, (_, i) => {
    const d = sp.slides[i % sp.slides.length], base = have[i] || newSlide('');
    const out = { ...base, template: d.t === 'hero' && !fresh ? sp.slides[1].t : d.t };
    if (!have[i] || untouched(base)) Object.assign(out, i < sp.slides.length ? { headline: d.h, subtitle: d.s || '', eyebrow: d.e || '', badge: d.b || '' } : { headline: '', subtitle: '', eyebrow: '', badge: '' }, { auto: true });
    return out;
  });
  Object.assign(state.style, RESET, THEMES.find(t => t.name === sp.theme).p, sp.st);
  Object.assign(state, { pano: !!sp.pano, landscape: !!sp.land, linkTpl: new Set(state.slides.map(s => s.template)).size === 1, sel: Math.min(state.sel, n - 1) });
}

let undoSnap = null;
const takeSnap = () => ({ style: { ...state.style }, pano: state.pano, landscape: state.landscape, linkTpl: state.linkTpl, sel: state.sel, slides: state.slides.map(s => ({ ...s })) });
function putSnap(k) { Object.assign(state.style, k.style); Object.assign(state, { pano: k.pano, landscape: k.landscape, linkTpl: k.linkTpl, sel: k.sel, slides: k.slides }); }
const remember = () => { undoSnap = takeSnap(); $('#undo').disabled = false; };

/** Draws the first two slides of a starter without touching the project. */
let scratch;
function previewStarter(cv, sp) {
  const keep = takeSnap(), u = uid;
  try {
    applyStarter(sp);
    const [fw, fh] = dims(FAMILY[state.family]), k = (state.landscape ? 110 : 210) / fh, W = Math.round(fw * k), H = Math.round(fh * k), g = state.pano ? 0 : 4;
    const n = state.landscape ? 1 : 2;
    scratch ||= document.createElement('canvas'); scratch.width = W; scratch.height = H;
    cv.width = n * W + (n - 1) * g; cv.height = H;
    const x = cv.getContext('2d');
    for (let i = 0; i < Math.min(n, state.slides.length); i++) { render(scratch.getContext('2d'), W, H, i, state.family); x.drawImage(scratch, i * (W + g), 0); }
  } finally { putSnap(keep); uid = u; }
}

function randomize() {
  const st = state.style, pick = a => a[Math.random() * a.length | 0], chance = p => Math.random() < p;
  const thai = THAI.test(allText());
  Object.assign(st, RESET, pick(THEMES).p);
  const fonts = Object.keys(FONTS).filter(k => FONTS[k].g && (!thai || FONTS[k].thai) && !['caveat', 'pacifico', 'charm', 'sriracha', 'itim', 'chonburi', 'mali'].includes(k));
  st.font = pick(fonts); st.weight = pick([600, 700, 800, 800, 900]); st.upper = !thai && chance(0.2);
  if (chance(0.6)) {
    const [a, b] = pick(PRESETS);
    Object.assign(st, { c1: a, c2: b, c3: hueShift(b, 70), bgType: pick(['linear', 'linear', 'mesh', 'radial', 'solid']) });
    st.accent = bgIsLight(st) ? pick(['#2563eb', '#e11d48', '#7c3aed', '#c2410c', '#047857']) : pick(['#ffd60a', '#a3e635', '#fde68a', '#67e8f9', '#f9a8d4']);
  }
  st.deco = pick(Object.keys(CHIPS.deco)); st.grain = chance(0.2); st.angle = 100 + (Math.random() * 16 | 0) * 10;
  st.hl = pick(['color', 'color', 'marker', 'underline']); st.align = pick(['auto', 'auto', 'left', 'center']);
  st.frame = pick(Object.keys(FRAMES)); st.shadow = st.frame === 'none' ? 'soft' : pick(['soft', 'soft', 'soft', 'hard', 'none']);
  st.badgeStyle = pick(Object.keys(CHIPS.badgeStyle)); st.glare = chance(0.2);
  st.rotate = chance(0.25); st.rotateStep = pick([25, 40, 60, 90]);
  state.pano = !st.rotate && state.slides.length > 1 && chance(0.3);
  const tpls = Object.keys(TEMPLATES).filter(t => t !== 'hero' && t !== 'pano'), one = pick(tpls), mixed = chance(0.4);
  state.slides.forEach((s, i) => s.template = state.pano && chance(0.6) ? 'pano' : mixed ? pick(tpls) : one);
  if (!hasImages(state.slides[0]) && state.slides.length > 1 && chance(0.25)) state.slides[0].template = 'hero';
  state.linkTpl = new Set(state.slides.map(s => s.template)).size === 1;
}

/* ---------- UI ---------- */
const cur = () => state.slides[state.sel];
let raf = 0;
const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };

function paintInto(canvas, i, long, tpl) {
  const [fw, fh] = dims(FAMILY[state.family]), s = long / Math.max(fw, fh);
  const W = Math.round(fw * s), H = Math.round(fh * s);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  render(canvas.getContext('2d'), W, H, i, state.family, tpl);
}

function paint() {
  const [fw, fh] = dims(FAMILY[state.family]);
  paintInto($('#preview'), state.sel, Math.min(Math.max(fw, fh), innerWidth < 820 ? 1200 : 1600));
  $$('#film .thumb canvas').forEach((cv, i) => paintInto(cv, i, 300));
  if ($('#tpls').offsetParent) $$('#tpls canvas').forEach(cv => paintInto(cv, state.sel, 240, cv.dataset.tpl));
  if ($('#starters').offsetParent) $$('#starters canvas').forEach((cv, i) => previewStarter(cv, STARTERS[i]));
  saveSoon();
}

function buildStatic() {
  const st = state.style;
  for (const [fam, F] of Object.entries(FAMILY)) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.family = fam; b.textContent = F.name;
    b.onclick = () => { state.family = fam; track('change_device', { device: fam }); sync(); };
    $('#familyTabs').append(b);
    const slot = document.createElement('div');
    slot.className = 'slot'; slot.dataset.family = fam;
    slot.innerHTML = `<button type="button" class="pick"><span>${F.short}</span></button><button type="button" class="clear" title="Remove">×</button>`;
    $('#slots').append(slot);
  }
  for (const el of $$('.chips[data-k]')) {
    const k = el.dataset.k;
    for (const [val, label] of Object.entries(CHIPS[k])) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.val = val;
      b.onclick = () => { st[k] = /^\d+$/.test(val) ? +val : val; track('set_option', { option: k, value: String(val) }); sync(); };
      el.append(b);
    }
  }
  for (const sel of $$('select[data-k]')) {
    if (sel.dataset.k === 'subFont') sel.append(new Option('Same as headline', ''));
    const groups = {};
    for (const [id, f] of Object.entries(FONTS)) {
      const g = groups[f.cat] ||= sel.appendChild(Object.assign(document.createElement('optgroup'), { label: f.cat }));
      g.append(new Option(f.name, id));
    }
  }
  for (const [a, b] of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.style.background = `linear-gradient(160deg, ${a}, ${b})`; btn.title = `${a} → ${b}`;
    btn.onclick = () => { st.c1 = a; st.c2 = b; if (st.bgType === 'image') st.bgType = 'linear'; sync(); };
    $('#swatches').append(btn);
  }
  for (const th of THEMES) {
    const p = th.p, btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'theme';
    const bg = p.bgType === 'solid' ? p.c1 : p.bgType === 'mesh' ? `radial-gradient(at 0 0, ${p.c2}, transparent 70%), radial-gradient(at 100% 100%, ${p.c3}, transparent 70%), ${p.c1}` : `linear-gradient(160deg, ${p.c1}, ${p.c2})`;
    const light = lum(p.c1) > 0.6;
    btn.innerHTML = `<i style="background:${bg};color:${light ? '#0b0c10' : '#fff'}">A<b style="color:${p.accent === '#111111' ? '#111' : p.accent}">a</b></i>${th.name}`;
    btn.onclick = () => { Object.assign(st, p); track('select_theme', { theme: th.name }); sync(); };
    $('#themes').append(btn);
  }
  for (const id of Object.keys(TEMPLATES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tpl'; b.dataset.tpl = id;
    b.innerHTML = `<canvas data-tpl="${id}"></canvas>${TPL_NAMES[id]}`;
    b.onclick = () => {
      if (state.linkTpl) state.slides.forEach(s => s.template = id); else cur().template = id;
      track('select_template', { template: id });
      sync();
    };
    $('#tpls').append(b);
  }
  for (const sp of STARTERS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'starter'; b.innerHTML = '<canvas></canvas>';
    b.append(sp.name);
    b.onclick = () => { remember(); applyStarter(sp); track('apply_starter', { starter: sp.name }); sync(true); toast(`Applied “${sp.name}”. Your screenshots and your own text are kept.`); };
    $('#starters').append(b);
  }
  let group = '';
  for (const s of SIZES) {
    if (s.group !== group) { group = s.group; const h = document.createElement('h3'); h.textContent = group; $('#sizes').append(h); }
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" data-size="${s.id}"> <span data-dim="${s.id}"></span> <small>${s.note}</small>`;
    $('#sizes').append(l);
  }
}

function buildFilm() {
  const film = $('#film'); film.innerHTML = '';
  state.slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb' + (i === state.sel ? ' on' : '');
    b.innerHTML = `<canvas></canvas><div class="tools"><span data-act="left" title="Move left">‹</span><span data-act="dup" title="Duplicate">⧉</span><span data-act="del" title="Delete slide">×</span><span data-act="right" title="Move right">›</span></div>`;
    b.onclick = e => {
      const act = e.target.dataset.act, sl = state.slides;
      if (act === 'del') {
        Object.keys(FAMILY).forEach(f => setImage(s, f, null));
        if (sl.length === 1) sl[0] = newSlide(); else sl.splice(i, 1);
        state.sel = Math.min(state.sel, sl.length - 1);
      } else if (act === 'dup') {
        if (sl.length >= MAX_SLIDES) return toast(`A set can hold at most ${MAX_SLIDES} screenshots.`);
        const copy = { ...newSlide(), headline: s.headline, subtitle: s.subtitle, eyebrow: s.eyebrow, badge: s.badge, template: s.template };
        sl.splice(i + 1, 0, copy); state.sel = i + 1;
      } else if (act === 'left' && i > 0) { [sl[i - 1], sl[i]] = [sl[i], sl[i - 1]]; state.sel = i - 1; }
      else if (act === 'right' && i < sl.length - 1) { [sl[i + 1], sl[i]] = [sl[i], sl[i + 1]]; state.sel = i + 1; }
      else state.sel = i;
      sync(true);
    };
    film.append(b);
  });
  if (state.slides.length < MAX_SLIDES) {
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'add'; add.textContent = '+'; add.title = 'Add slide';
    add.onclick = () => { state.slides.push(newSlide('')); state.sel = state.slides.length - 1; track('add_slide', { slides: state.slides.length }); sync(true); };
    film.append(add);
  }
}

/** Push state into the controls and repaint. `structure` rebuilds the filmstrip. */
function sync(structure) {
  const st = state.style, s = cur();
  if (structure) buildFilm();
  $$('#film .thumb').forEach((b, i) => b.classList.toggle('on', i === state.sel));
  $('#slideNo').textContent = `${state.sel + 1} of ${state.slides.length}`;
  for (const el of $$('[data-s]')) if (document.activeElement !== el) el.value = s[el.dataset.s] || '';
  $$('#slots .slot').forEach(el => {
    const im = s.images[el.dataset.family];
    el.classList.toggle('has', !!im);
    $('.pick', el).style.backgroundImage = im ? `url(${im.url})` : '';
  });
  $$('#tpls .tpl').forEach(b => b.classList.toggle('on', b.dataset.tpl === s.template));
  for (const el of $$('[data-k]')) {
    const v = st[el.dataset.k];
    if (el.matches('.chips')) $$('button', el).forEach(b => b.classList.toggle('on', b.dataset.val === String(v)));
    else if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  }
  $$('[data-show]').forEach(el => { const [k, vals] = el.dataset.show.split('='); el.hidden = !vals.split(',').includes(String(st[k])); });
  $$('#familyTabs button').forEach(b => b.classList.toggle('on', b.dataset.family === state.family));
  $('#orient').classList.toggle('on', state.landscape);
  $('#orient').textContent = state.landscape ? 'Landscape' : 'Portrait';
  $('#linkTpl').checked = state.linkTpl; $('#pano').checked = state.pano;
  $('#bgPick').textContent = state.bgImage ? 'Change photo…' : 'Choose photo…';
  fontsSoon(); schedule();
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3800);
}

/* ---------- adding images ---------- */
function loadImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob), el = new Image();
    el.onload = () => res({ el, url, blob, w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Not an image')); };
    el.src = url;
  });
}

async function addFiles(files, forcedFamily, forcedSlide) {
  const list = [...files].filter(f => f.type.startsWith('image/'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!list.length) return;
  let first = null, skipped = 0;
  for (const file of list) {
    let im; try { im = await loadImage(file); } catch { skipped++; continue; }
    const fam = forcedFamily || classify(im.w, im.h);
    let slide = forcedSlide || state.slides.find(s => !s.images[fam]);
    if (!slide) {
      if (state.slides.length >= MAX_SLIDES) { skipped++; URL.revokeObjectURL(im.url); continue; }
      slide = newSlide(''); state.slides.push(slide);
    }
    setImage(slide, fam, im);
    first ??= slide;
  }
  if (first) {
    state.sel = state.slides.indexOf(first);
    if (!forcedFamily && !first.images[state.family]) state.family = Object.keys(FAMILY).find(f => first.images[f]);
    if (!forcedFamily && list.length === 1 && first.images[state.family]) { const im = first.images[state.family]; if (im.w > im.h !== state.landscape && state.slides.every(s => s === first || !Object.values(s.images).some(Boolean))) state.landscape = im.w > im.h; }
  }
  if (first) track('add_screenshots', { count: list.length - skipped, device: state.family, method: forcedFamily ? 'slot' : 'auto' });
  if (skipped) toast(`${skipped} file${skipped > 1 ? 's' : ''} skipped — a set holds at most ${MAX_SLIDES} screenshots.`);
  sync(true);
}

/* ---------- export: PNG (RGB, no alpha) + ZIP (stored) ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf, crc = 0) {
  crc = ~crc;
  for (let i = 0; i < buf.length; i++) crc = CRC_T[(crc ^ buf[i]) & 255] ^ (crc >>> 8);
  return ~crc >>> 0;
}

async function encodePNG(canvas) {
  if (typeof CompressionStream === 'undefined') return new Uint8Array(await (await new Promise(r => canvas.toBlob(r, 'image/png'))).arrayBuffer());
  const w = canvas.width, h = canvas.height, px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const stride = w * 3 + 1, raw = new Uint8Array(stride * h);
  for (let y = 0, i = 0, o = 0; y < h; y++) {
    raw[o++] = 1; // Sub filter
    let pr = 0, pg = 0, pb = 0;
    for (let x = 0; x < w; x++, i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      raw[o++] = r - pr; raw[o++] = g - pg; raw[o++] = b - pb;
      pr = r; pg = g; pb = b;
    }
  }
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolour, no alpha
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function renderFile(i, size, fmt) {
  const [w, h] = dims(size), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  render(cv.getContext('2d'), w, h, i, size.family);
  if (fmt === 'jpg') return new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.95))).arrayBuffer());
  return encodePNG(cv);
}

function zip(files) { // [{name, data: Uint8Array}] → Blob, stored (images are already compressed)
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  const d = new Date(), time = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1,
    date = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, n, true); lh.setUint32(22, n, true); lh.setUint16(26, name.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, n, true); ch.setUint32(24, n, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    parts.push(lh, name, f.data); central.push(ch, name);
    off += 30 + name.length + n;
  }
  const cdSize = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

const slidesFor = size => FAMILY[size.family].store === 'android' ? Math.min(state.slides.length, MAX_SLIDES_PLAY) : state.slides.length;
async function buildExport(fmt, onProgress) {
  await ensureFonts();
  const sizes = SIZES.filter(s => s.on), files = [], total = sizes.reduce((n, s) => n + slidesFor(s), 0);
  for (const size of sizes) {
    const [w, h] = dims(size), folder = `${FAMILY[size.family].name.replace(/ /g, '-')}_${w}x${h}`;
    for (let i = 0; i < slidesFor(size); i++) {
      onProgress?.(files.length + 1, total);
      files.push({ name: `${folder}/${String(i + 1).padStart(2, '0')}.${fmt}`, data: await renderFile(i, size, fmt) });
      await new Promise(r => setTimeout(r)); // let the UI breathe
    }
  }
  return zip(files);
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

function syncExport() {
  $$('#sizes input').forEach(cb => cb.checked = SIZES.find(s => s.id === cb.dataset.size).on);
  $$('#sizes [data-dim]').forEach(el => { const [w, h] = dims(SIZES.find(s => s.id === el.dataset.dim)); el.textContent = `${w} × ${h}`; });
  const on = SIZES.filter(s => s.on), n = on.reduce((t, s) => t + slidesFor(s), 0);
  $('#exportCount').textContent = `${state.slides.length} slide${state.slides.length > 1 ? 's' : ''}, ${on.length} size${on.length === 1 ? '' : 's'}, ${n} image${n === 1 ? '' : 's'} · ${state.landscape ? 'landscape' : 'portrait'}`;
  $('#doExport').disabled = !n;
  const warn = [];
  for (const fam of new Set(on.map(s => s.family))) {
    const subs = state.slides.filter(s => pickSource(s, fam).fallback).length;
    const none = state.slides.filter(s => !pickSource(s, fam).img).length;
    if (subs) warn.push(`${subs} slide${subs > 1 ? 's have' : ' has'} no ${FAMILY[fam].name} screenshot — another device's screenshot will be used.`);
    if (none) warn.push(`${none} slide${none > 1 ? 's have' : ' has'} no screenshot at all and will export with a placeholder.`);
  }
  if (state.slides.length > MAX_SLIDES_PLAY && on.some(s => FAMILY[s.family].store === 'android')) warn.push(`Google Play takes at most ${MAX_SLIDES_PLAY} screenshots per device, so only the first ${MAX_SLIDES_PLAY} slides are exported for Android.`);
  $('#exportWarn').textContent = [...new Set(warn)].join(' ');
}

/* ---------- wiring ---------- */
function showTab(name) {
  $$('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === name));
  $$('.tab').forEach(t => t.hidden = t.dataset.tab !== name);
  $('.panel-body').scrollTop = 0; schedule();
  track('view_tab', { tab: name });
  if (name === 'about') import('./about3d.js').then(m => m.show($('#stage3d'))).catch(() => { $('#stage3d').hidden = true; }); // Easter egg
}

function wire() {
  const st = state.style;
  for (const el of $$('[data-s]')) el.oninput = () => { cur()[el.dataset.s] = el.value; delete cur().auto; fontsSoon(); schedule(); };
  for (const el of $$('[data-k]')) {
    if (el.matches('.chips')) continue;
    const k = el.dataset.k;
    el.oninput = el.onchange = ev => {
      st[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      if (k === 'textColor') st.autoText = false;
      if (ev.type === 'change' && (el.tagName === 'SELECT' || el.type === 'checkbox')) track('set_option', { option: k, value: String(st[k]) });
      if (el.type === 'range' || el.type === 'color') { fontsSoon(); schedule(); } else sync();
    };
  }
  $('#linkTpl').onchange = e => { state.linkTpl = e.target.checked; if (state.linkTpl) { const t = cur().template; state.slides.forEach(s => s.template = t); } sync(); };
  $('#pano').onchange = e => { state.pano = e.target.checked; track('set_option', { option: 'pano', value: String(state.pano) }); sync(); };
  $('#orient').onclick = () => { state.landscape = !state.landscape; track('change_orientation', { orientation: state.landscape ? 'landscape' : 'portrait' }); sync(); };
  $('#shuffle').onclick = () => {
    const th = THEMES[Math.random() * THEMES.length | 0], decos = Object.keys(CHIPS.deco);
    Object.assign(st, th.p, { deco: decos[Math.random() * decos.length | 0], angle: 100 + (Math.random() * 16 | 0) * 10 });
    sync();
  };
  $$('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  for (const id of ['#random', '#random2']) $(id).onclick = () => { remember(); randomize(); track('randomize', { source: id === '#random' ? 'ideas_tab' : 'toolbar' }); sync(true); };
  $('#undo').onclick = () => { if (!undoSnap) return; const now = takeSnap(); putSnap(undoSnap); undoSnap = now; track('undo'); sync(true); };

  const file = $('#file'); let pickFor = null;
  $$('#slots .slot').forEach(el => {
    $('.pick', el).onclick = () => { pickFor = { family: el.dataset.family, slide: cur() }; file.multiple = false; file.click(); };
    $('.clear', el).onclick = () => { setImage(cur(), el.dataset.family, null); sync(); };
  });
  $('#addMany').onclick = () => { pickFor = null; file.multiple = true; file.click(); };
  $('#bgPick').onclick = () => { pickFor = 'bg'; file.multiple = false; file.click(); };
  file.onchange = async () => {
    const files = [...file.files], target = pickFor; file.value = ''; pickFor = null;
    if (target === 'bg') {
      const im = files[0] && await loadImage(files[0]).catch(() => null);
      if (!im) return;
      if (state.bgImage) URL.revokeObjectURL(state.bgImage.url);
      state.bgImage = im; st.bgType = 'image'; db.set('bg', im.blob); track('set_background_photo'); sync();
    } else addFiles(files, target?.family, target?.slide);
  };

  let depth = 0; const veil = $('#dropveil');
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; veil.classList.add('on'); } });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; veil.classList.remove('on'); } });
  addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('drop', e => { e.preventDefault(); depth = 0; veil.classList.remove('on'); addFiles(e.dataTransfer.files); });
  addEventListener('paste', e => { if (e.clipboardData?.files.length) addFiles(e.clipboardData.files); });
  addEventListener('resize', schedule);
  addEventListener('click', e => { const a = e.target.closest?.('a[href*="apps.apple.com"]'); if (a) track('support_click', { placement: a.classList.contains('credit') ? 'header' : a.classList.contains('cta') ? 'about_button' : 'footer' }); });

  $('#reset').onclick = async () => {
    if (!confirm('Start a new project? This clears every slide and screenshot saved on this device.')) return;
    await db.clear(); track('new_project');
    state.slides.forEach(s => Object.values(s.images).forEach(im => im && URL.revokeObjectURL(im.url)));
    Object.assign(state, { slides: [], sel: 0, bgImage: null, pano: false, landscape: false, linkTpl: true });
    Object.assign(st, BASE); state.slides.push(newSlide()); sync(true);
  };
  $('#savePng').onclick = async () => {
    const btn = $('#savePng'); btn.disabled = true;
    try {
      await ensureFonts();
      const size = SIZES.find(s => s.family === state.family), [w, h] = dims(size);
      download(new Blob([await renderFile(state.sel, size, 'png')], { type: 'image/png' }), `screenshot-${String(state.sel + 1).padStart(2, '0')}-${w}x${h}.png`);
      toast(`Saved slide ${state.sel + 1} at ${w} × ${h}.`);
      track('save_png', { device: state.family, size: `${w}x${h}`, template: cur().template });
    } catch (err) { console.error(err); toast('Could not save: ' + err.message); }
    btn.disabled = false;
  };

  const dlg = $('#exportDlg');
  $('#openExport').onclick = () => { syncExport(); dlg.showModal(); track('export_open', { slides: state.slides.length }); };
  $('#sizes').onchange = e => { SIZES.find(s => s.id === e.target.dataset.size).on = e.target.checked; syncExport(); saveSoon(); };
  $$('[data-quick]').forEach(b => b.onclick = () => {
    const q = b.dataset.quick;
    SIZES.forEach(s => s.on = q === 'all' || (q === 'required' && s.rec) || (q === FAMILY[s.family].store && s.rec));
    syncExport(); saveSoon();
  });
  $('#doExport').onclick = async () => {
    const btn = $('#doExport'), fmt = $('input[name=fmt]:checked').value;
    btn.disabled = true;
    try {
      download(await buildExport(fmt, (i, n) => btn.textContent = `Rendering ${i} / ${n}…`), 'store-screenshots.zip');
      const on = SIZES.filter(s => s.on), stores = [...new Set(on.map(s => FAMILY[s.family].store))].sort().join('+');
      track('export_zip', {
        format: fmt, sizes: on.length, images: on.reduce((n, s) => n + slidesFor(s), 0), slides: state.slides.length, stores,
        devices: [...new Set(on.map(s => s.family))].join(','), orientation: state.landscape ? 'landscape' : 'portrait',
        with_screenshots: state.slides.filter(hasImages).length, templates: [...new Set(state.slides.map(s => s.template))].join(','),
      });
      dlg.close(); toast('Exported — unzip and upload each folder to App Store Connect or Google Play Console.');
    } catch (err) { console.error(err); toast('Export failed: ' + err.message); track('export_failed', { message: String(err.message).slice(0, 80) }); }
    btn.textContent = 'Download ZIP'; btn.disabled = false;
  };
}

buildStatic(); wire();
state.slides.push(newSlide());
sync(true);
restore().then(() => { if (state.slides.some(hasImages)) showTab('content'); sync(true); });
// fonts for the starter thumbnails
Promise.all(STARTERS.map(sp => { const p = { ...THEMES.find(t => t.name === sp.theme).p, ...sp.st }; return loadFont(FONTS[p.font], [p.weight, 500], sp.slides.map(d => d.h + (d.s || '') + (d.b || '')).join(' ')); })).then(schedule);
window.studio = { state, STARTERS, applyStarter, randomize, renderFile, dims, FAMILY, hasImages, addFiles, buildExport, encodePNG, render, SIZES, FONTS, THEMES, sync, ensureFonts }; // handy for debugging
