'use strict';
/* Screenshot Studio — everything runs client-side; no build step, no dependencies. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- App Store Connect sizes (portrait), from Apple's screenshot specifications ---------- */
// [family, group, width, height, note, recommended]
const SIZES = [
  ['iphone', 'iPhone 6.9″ — Dynamic Island, large', 1320, 2868, '', 1],
  ['iphone', 'iPhone 6.9″ — Dynamic Island, large', 1290, 2796, '', 0],
  ['iphone', 'iPhone 6.9″ — Dynamic Island, large', 1260, 2736, '', 0],
  ['iphone', 'iPhone 6.5″ — Face ID, large', 1284, 2778, '', 0],
  ['iphone', 'iPhone 6.5″ — Face ID, large', 1242, 2688, '', 0],
  ['iphone', 'iPhone 6.3″ / 6.1″ — Dynamic Island, medium', 1206, 2622, 'required', 1],
  ['iphone', 'iPhone 6.3″ / 6.1″ — Dynamic Island, medium', 1179, 2556, '', 0],
  ['iphone', 'iPhone 6.1″ / 5.8″ / 5.4″ — Face ID, medium', 1170, 2532, '', 0],
  ['iphone', 'iPhone 6.1″ / 5.8″ / 5.4″ — Face ID, medium', 1125, 2436, '', 0],
  ['iphone', 'iPhone 6.1″ / 5.8″ / 5.4″ — Face ID, medium', 1080, 2340, '', 0],
  ['iphone', 'iPhone 5.5″ / 4.7″ — Home button', 1242, 2208, '', 0],
  ['iphone', 'iPhone 5.5″ / 4.7″ — Home button', 750, 1334, '', 0],
  ['duo', 'iPhone Duo', 2007, 2853, 'inner display', 1],
  ['duo', 'iPhone Duo', 1398, 2034, 'outer display', 1],
  ['ipad', 'iPad 13″ / 12.9″', 2064, 2752, 'required for iPad apps', 1],
  ['ipad', 'iPad 13″ / 12.9″', 2048, 2732, '', 0],
  ['ipad', 'iPad 11″', 1668, 2420, '', 0],
  ['ipad', 'iPad 11″', 1668, 2388, '', 0],
  ['ipad', 'iPad 11″', 1640, 2360, '', 0],
  ['ipad', 'iPad 11″', 1512, 2316, '', 0],
  ['ipad', 'iPad 11″', 1488, 2266, '', 0],
  ['ipad', 'iPad 10.5″ / 9.7″', 1668, 2224, '', 0],
  ['ipad', 'iPad 10.5″ / 9.7″', 1536, 2048, '', 0],
].map(([family, group, w, h, note, rec]) => ({ family, group, w, h, note, rec: !!rec, on: !!rec, id: `${w}x${h}` }));

const FAMILY = {
  iphone: { name: 'iPhone', w: 1320, h: 2868, fallback: ['duo', 'ipad'] },
  duo: { name: 'iPhone Duo', w: 2007, h: 2853, fallback: ['ipad', 'iphone'] },
  ipad: { name: 'iPad', w: 2064, h: 2752, fallback: ['duo', 'iphone'] },
};
const MAX_SLIDES = 10; // App Store Connect limit per device size

const PRESETS = [
  ['#4f46e5', '#7c3aed'], ['#0ea5e9', '#2563eb'], ['#34d399', '#047857'], ['#fb923c', '#f43f5e'],
  ['#f472b6', '#9333ea'], ['#1f2937', '#0b0f19'], ['#14532d', '#0f766e'], ['#fde68a', '#fdba74'],
  ['#fce7f3', '#fbcfe8'], ['#e0f2fe', '#c7d2fe'], ['#f8fafc', '#e2e8f0'], ['#fef3c7', '#fde68a'],
];
const DECOS = ['none', 'blobs', 'glow', 'rings', 'grid', 'dots', 'waves'];
const FONTS = {
  system: { name: 'Sans', css: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Noto Sans Thai", sans-serif', hw: 800, sw: 500, ls: -0.022 },
  rounded: { name: 'Rounded', css: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif', hw: 800, sw: 500, ls: -0.01 },
  serif: { name: 'Serif', css: 'ui-serif, "New York", Georgia, "Times New Roman", serif', hw: 700, sw: 400, ls: -0.01 },
  condensed: { name: 'Condensed', css: '"Avenir Next Condensed", "Arial Narrow", "Roboto Condensed", system-ui, sans-serif', hw: 800, sw: 500, ls: 0 },
  mono: { name: 'Mono', css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', hw: 700, sw: 400, ls: -0.03 },
};
const FRAMES = { black: ['#3b3b42', '#141417'], titanium: ['#d2cdc4', '#8d8880'], silver: ['#ffffff', '#d9dae0'], none: null };

const state = {
  slides: [], sel: 0, family: 'iphone', linkTpl: true,
  style: { c1: '#4f46e5', c2: '#7c3aed', angle: 160, deco: 'blobs', font: 'system', autoText: true, textColor: '#ffffff', headScale: 1, frame: 'black' },
};
let uid = 0;
const newSlide = (headline = 'Your headline here') => ({
  id: ++uid, headline, subtitle: '', template: state.slides[0]?.template || 'top', images: { iphone: null, duo: null, ipad: null },
});

/* ---------- helpers ---------- */
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
};
const bgIsLight = st => (lum(st.c1) + lum(st.c2)) / 2 > 0.6;

function classify(w, h) {
  const a = Math.min(w, h), b = Math.max(w, h);
  const exact = SIZES.find(s => s.w === a && s.h === b);
  if (exact) return exact.family;
  return a / b < 0.6 ? 'iphone' : 'ipad';
}

function pickSource(slide, family) {
  if (!slide) return { img: null, family };
  if (slide.images[family]) return { img: slide.images[family], family };
  for (const f of FAMILY[family].fallback) if (slide.images[f]) return { img: slide.images[f], family: f, fallback: true };
  return { img: null, family };
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of text.split('\n')) {
    const parts = segmenter ? [...segmenter.segment(para)].map(s => s.segment) : para.split(/(\s+)/);
    let line = '';
    for (const p of parts) {
      if (line && ctx.measureText((line + p).trimEnd()).width > maxW) { lines.push(line.trimEnd()); line = p.trimStart(); }
      else line += p;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
const setLS = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px.toFixed(2) + 'px'; };

function layoutText(ctx, slide, U, maxW, st) {
  const f = FONTS[st.font];
  const head = slide.headline.trim(), sub = slide.subtitle.trim();
  let size = 0.094 * U * st.headScale, hl = [], sl = [];
  const hFont = () => `${f.hw} ${size}px ${f.css}`;
  if (head) for (;;) {
    ctx.font = hFont(); setLS(ctx, size * f.ls);
    hl = wrap(ctx, head, maxW);
    if (hl.length <= 3 || size < 0.05 * U) break;
    size *= 0.93;
  }
  const ss = 0.044 * U * st.headScale, sFont = `${f.sw} ${ss}px ${f.css}`;
  if (sub) { ctx.font = sFont; setLS(ctx, 0); sl = wrap(ctx, sub, maxW); }
  const hlh = size * 1.14, slh = ss * 1.34, gap = hl.length && sl.length ? 0.028 * U : 0;
  return {
    h: hl.length * hlh + gap + sl.length * slh,
    draw(x, y, align, color) {
      ctx.save();
      ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
      ctx.font = hFont(); setLS(ctx, size * f.ls);
      hl.forEach((l, i) => ctx.fillText(l, x, y + i * hlh + size * 0.92));
      ctx.font = sFont; setLS(ctx, 0); ctx.globalAlpha = 0.82;
      sl.forEach((l, i) => ctx.fillText(l, x, y + hl.length * hlh + gap + i * slh + ss * 0.98));
      ctx.restore();
    },
  };
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.w, h / img.h), sw = w / s, sh = h / s;
  ctx.drawImage(img.el, (img.w - sw) / 2, 0, sw, sh, x, y, w, h); // top-aligned crop
}

function drawPlaceholder(ctx, x, y, w, h) {
  ctx.fillStyle = '#f3f4f8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#dfe2ea';
  const p = w * 0.08;
  ctx.beginPath(); ctx.roundRect(x + p, y + h * 0.09, w * 0.5, w * 0.07, w * 0.02); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const cy = y + h * 0.17 + i * w * 0.3;
    if (cy + w * 0.24 > y + h) break;
    ctx.beginPath(); ctx.roundRect(x + p, cy, w - 2 * p, w * 0.24, w * 0.04); ctx.fill();
  }
}

/* ---------- device ---------- */
function devSpec(src, st) {
  const fam = src.family;
  const a = src.img ? src.img.w / src.img.h : FAMILY[fam].w / FAMILY[fam].h;
  const modern = fam === 'iphone' && a < 0.5;
  let k = fam === 'iphone' ? 0.034 : fam === 'duo' ? 0.022 : 0.034;       // bezel / width
  let rk = fam === 'iphone' ? (modern ? 0.155 : 0.1) : fam === 'duo' ? 0.075 : 0.055; // corner radius / width
  if (a > 1) rk *= 1 / a;
  if (st.frame === 'none') { k = 0; rk *= 0.6; }
  return { fam, a, k, rk, modern, rr: (1 - 2 * k) / a + 2 * k };
}

function drawDevice(ctx, src, st, cx, top, dw, rot = 0) {
  const d = devSpec(src, st), dh = dw * d.rr, b = dw * d.k, R = dw * d.rk;
  const cols = FRAMES[st.frame];
  ctx.save();
  ctx.translate(cx, top + dh / 2); ctx.rotate(rot); ctx.translate(-dw / 2, -dh / 2);
  if (cols && d.fam !== 'ipad' && d.a < 1) { // side buttons
    ctx.fillStyle = cols[1];
    const bw = dw * 0.012;
    ctx.fillRect(dw - bw / 2, dh * 0.27, bw, dh * 0.1);
    ctx.fillRect(-bw / 2, dh * 0.2, bw, dh * 0.06); ctx.fillRect(-bw / 2, dh * 0.28, bw, dh * 0.06);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.34)'; ctx.shadowBlur = dw * 0.1; ctx.shadowOffsetY = dw * 0.045;
  ctx.fillStyle = cols ? cols[1] : '#000';
  ctx.beginPath(); ctx.roundRect(0, 0, dw, dh, R); ctx.fill();
  ctx.restore();
  if (cols) {
    const g = ctx.createLinearGradient(0, 0, dw, 0);
    g.addColorStop(0, cols[0]); g.addColorStop(0.08, cols[1]); g.addColorStop(0.92, cols[1]); g.addColorStop(1, cols[0]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(0, 0, dw, dh, R); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(b * 0.3, b * 0.3, dw - b * 0.6, dh - b * 0.6, R - b * 0.3); ctx.fill();
  }
  const sw = dw - 2 * b, sh = dh - 2 * b;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(b, b, sw, sh, Math.max(R - b, 0)); ctx.clip();
  if (src.img) drawCover(ctx, src.img, b, b, sw, sh); else drawPlaceholder(ctx, b, b, sw, sh);
  ctx.restore();
  if (cols && d.modern) { // Dynamic Island
    const iw = sw * 0.29, ih = sw * 0.083;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(dw / 2 - iw / 2, b + sw * 0.028, iw, ih, ih / 2); ctx.fill();
  }
  ctx.restore();
}

/* ---------- background ---------- */
function drawBackground(ctx, W, H, st) {
  const a = st.angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const L = Math.abs(W * dx) + Math.abs(H * dy);
  const g = ctx.createLinearGradient(W / 2 - dx * L / 2, H / 2 - dy * L / 2, W / 2 + dx * L / 2, H / 2 + dy * L / 2);
  g.addColorStop(0, st.c1); g.addColorStop(1, st.c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const ink = bgIsLight(st) ? '0,0,0' : '255,255,255';
  const blob = (x, y, r, al, c = ink) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${c},${al})`); rg.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  };
  ctx.save();
  switch (st.deco) {
    case 'blobs': blob(W * 0.95, H * 0.05, W * 0.8, 0.2); blob(0, H * 0.5, W * 0.7, 0.12); blob(W * 0.85, H, W * 0.9, 0.1, '0,0,0'); break;
    case 'glow': blob(W / 2, H * 0.62, W * 0.85, 0.38, '255,255,255'); break;
    case 'rings':
      ctx.strokeStyle = `rgba(${ink},.11)`; ctx.lineWidth = W * 0.004;
      for (let i = 1; i <= 9; i++) { ctx.beginPath(); ctx.arc(W, 0, i * W * 0.17, 0, 7); ctx.stroke(); }
      break;
    case 'grid': {
      ctx.strokeStyle = `rgba(${ink},.07)`; ctx.lineWidth = Math.max(1, W * 0.002);
      const s = W / 8; ctx.beginPath();
      for (let x = s; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); break;
    }
    case 'dots': {
      ctx.fillStyle = `rgba(${ink},.14)`; const s = W / 14;
      for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) { ctx.beginPath(); ctx.arc(x, y, W * 0.0042, 0, 7); ctx.fill(); }
      break;
    }
    case 'waves':
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(${ink},.06)`; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * (0.52 + i * 0.11) + Math.sin(x / W * 6.3 + i * 1.7) * W * 0.07);
        ctx.lineTo(W, H); ctx.fill();
      }
      break;
  }
  ctx.restore();
}

/* ---------- templates ---------- */
const TPL_NAMES = { top: 'Classic', bottom: 'Caption below', float: 'Floating', tilt: 'Tilted', left: 'Offset', pair: 'Stacked pair', full: 'Full bleed' };
const TEMPLATES = {
  top(c) {
    const { W, H } = c, top = c.textTop('center');
    const dw = Math.min(0.82 * W, (H - top) / 0.8 / c.d.rr);
    c.device(c.src, W / 2, top, dw);
  },
  bottom(c) {
    const { W, H, U } = c, t = c.text(W * 0.84), ty = H * 0.945 - t.h;
    t.draw(W / 2, ty, 'center', c.color);
    const bottom = ty - (t.h ? 0.06 * U : 0);
    const dw = Math.min(0.82 * W, bottom / 0.8 / c.d.rr);
    c.device(c.src, W / 2, bottom - dw * c.d.rr, dw);
  },
  float(c) {
    const { W, H } = c, top = c.textTop('center'), avail = H * 0.95 - top;
    const dw = Math.min(0.76 * W, avail / c.d.rr);
    c.device(c.src, W / 2, top + (avail - dw * c.d.rr) / 2, dw);
  },
  tilt(c) {
    const { W, H } = c, top = c.textTop('center') + W * 0.07;
    const dw = Math.min(0.8 * W, (H - top) / 0.78 / c.d.rr);
    c.device(c.src, W / 2, top, dw, -7 * Math.PI / 180);
  },
  left(c) {
    const { W, H } = c, top = c.textTop('left');
    const dw = Math.min(0.88 * W, (H - top) / 0.8 / c.d.rr);
    c.device(c.src, W - dw * 0.38, top, dw);
  },
  pair(c) {
    const { W, H } = c, top = c.textTop('center') + W * 0.03;
    const dw = Math.min(0.62 * W, (H - top) / 0.8 / c.d.rr);
    const back = c.next.img ? c.next : c.src;
    const dwB = Math.min(dw * 0.92, dw * c.d.rr * 0.92 / devSpec(back, c.st).rr);
    c.device(back, W * 0.68, top, dwB, 6 * Math.PI / 180);
    c.device(c.src, W * 0.37, top + dw * 0.14, dw, -5 * Math.PI / 180);
  },
  full(c) {
    const { ctx, W, H } = c;
    if (c.src.img) drawCover(ctx, c.src.img, 0, 0, W, H); else drawPlaceholder(ctx, 0, 0, W, H);
    const t = c.text(W * 0.84), ty = H * 0.94 - t.h;
    const g = ctx.createLinearGradient(0, ty - H * 0.22, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,.72)'); g.addColorStop(1, 'rgba(0,0,0,.9)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    t.draw(W * 0.08, ty, 'left', '#ffffff');
  },
};

function render(ctx, W, H, slide, family, nextSlide) {
  const st = state.style, U = Math.min(W, H * 0.52);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, st);
  const src = pickSource(slide, family);
  const c = {
    ctx, W, H, U, st, src, d: devSpec(src, st), next: pickSource(nextSlide, family),
    color: st.autoText ? (bgIsLight(st) ? '#0b0c10' : '#ffffff') : st.textColor,
    text: maxW => layoutText(ctx, slide, U, maxW, st),
    textTop(align) { // draws the text block at the top, returns where the device may start
      const t = this.text(W * 0.84), y0 = H * 0.06;
      t.draw(align === 'left' ? W * 0.08 : W / 2, y0, align, this.color);
      return y0 + t.h + (t.h ? 0.062 * U : 0);
    },
    device: (s, cx, top, dw, rot) => drawDevice(ctx, s, st, cx, top, dw, rot),
  };
  (TEMPLATES[slide.template] || TEMPLATES.top)(c);
  ctx.restore();
}

/* ---------- UI ---------- */
const cur = () => state.slides[state.sel];
const nextOf = i => state.slides[(i + 1) % state.slides.length];
let raf = 0;
const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };

function paintInto(canvas, slide, i, targetH) {
  const f = FAMILY[state.family], s = targetH / f.h;
  const W = Math.round(f.w * s), H = Math.round(f.h * s);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  render(canvas.getContext('2d'), W, H, slide, state.family, nextOf(i));
}

function paint() {
  paintInto($('#preview'), cur(), state.sel, Math.min(FAMILY[state.family].h, 1500));
  $$('#film .thumb canvas').forEach((cv, i) => paintInto(cv, state.slides[i], i, 240));
  $$('#tpls canvas').forEach(cv => paintInto(cv, { ...cur(), template: cv.dataset.tpl }, state.sel, 200));
}

function chips(el, items, get, set) {
  el.innerHTML = '';
  for (const [val, label] of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.val = val;
    b.onclick = () => { set(val); sync(); };
    el.append(b);
  }
  el._get = get;
}

function buildStatic() {
  const st = state.style;
  chips($('#decos'), DECOS.map(d => [d, d[0].toUpperCase() + d.slice(1)]), () => st.deco, v => st.deco = v);
  chips($('#fonts'), Object.entries(FONTS).map(([k, f]) => [k, f.name]), () => st.font, v => st.font = v);
  chips($('#frames'), Object.keys(FRAMES).map(k => [k, k === 'none' ? 'No frame' : k[0].toUpperCase() + k.slice(1)]), () => st.frame, v => st.frame = v);
  for (const [a, b] of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.style.background = `linear-gradient(160deg, ${a}, ${b})`; btn.title = `${a} → ${b}`;
    btn.onclick = () => { st.c1 = a; st.c2 = b; sync(); };
    $('#swatches').append(btn);
  }
  for (const id of Object.keys(TEMPLATES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tpl'; b.dataset.tpl = id;
    b.innerHTML = `<canvas data-tpl="${id}"></canvas>${TPL_NAMES[id]}`;
    b.onclick = () => {
      if (state.linkTpl) state.slides.forEach(s => s.template = id); else cur().template = id;
      sync();
    };
    $('#tpls').append(b);
  }
  // export size list
  let group = '';
  for (const s of SIZES) {
    if (s.group !== group) { group = s.group; const h = document.createElement('h3'); h.textContent = group; $('#sizes').append(h); }
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" data-size="${s.id}"> ${s.w} × ${s.h} <small>${s.note}</small>`;
    $('#sizes').append(l);
  }
}

function buildFilm() {
  const film = $('#film'); film.innerHTML = '';
  state.slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb' + (i === state.sel ? ' on' : '');
    b.innerHTML = `<canvas></canvas><div class="tools"><span data-act="left" title="Move left">‹</span><span data-act="del" title="Delete slide">×</span><span data-act="right" title="Move right">›</span></div>`;
    b.onclick = e => {
      const act = e.target.dataset.act, sl = state.slides;
      if (act === 'del') {
        if (sl.length === 1) sl[0] = newSlide(); else sl.splice(i, 1);
        state.sel = Math.min(state.sel, sl.length - 1);
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
    add.onclick = () => { state.slides.push(newSlide()); state.sel = state.slides.length - 1; sync(true); };
    film.append(add);
  }
}

/** Push state into the controls and repaint. `structure` rebuilds the filmstrip. */
function sync(structure) {
  const st = state.style, s = cur();
  if (structure) buildFilm();
  $$('#film .thumb').forEach((b, i) => b.classList.toggle('on', i === state.sel));
  $('#slideNo').textContent = `${state.sel + 1} of ${state.slides.length}`;
  if (document.activeElement !== $('#headline')) $('#headline').value = s.headline;
  if (document.activeElement !== $('#subtitle')) $('#subtitle').value = s.subtitle;
  $$('#slots .slot').forEach(el => {
    const im = s.images[el.dataset.family];
    el.classList.toggle('has', !!im);
    $('.pick', el).style.backgroundImage = im ? `url(${im.url})` : '';
  });
  $$('#tpls .tpl').forEach(b => b.classList.toggle('on', b.dataset.tpl === s.template));
  for (const el of [$('#decos'), $('#fonts'), $('#frames')]) $$('button', el).forEach(b => b.classList.toggle('on', b.dataset.val === el._get()));
  $$('#familyTabs button').forEach(b => b.classList.toggle('on', b.dataset.family === state.family));
  $('#c1').value = st.c1; $('#c2').value = st.c2; $('#angle').value = st.angle;
  $('#autoText').checked = st.autoText; $('#textColor').value = st.textColor; $('#headScale').value = st.headScale;
  $('#linkTpl').checked = state.linkTpl;
  schedule();
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3500);
}

/* ---------- adding images ---------- */
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), el = new Image();
    el.onload = () => res({ el, url, w: el.naturalWidth, h: el.naturalHeight });
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
      if (state.slides.length >= MAX_SLIDES) { skipped++; continue; }
      slide = newSlide(); state.slides.push(slide);
    }
    slide.images[fam] = im;
    first ??= slide;
  }
  if (first) { state.sel = state.slides.indexOf(first); if (!forcedFamily && !first.images[state.family]) state.family = Object.keys(FAMILY).find(f => first.images[f]); }
  if (skipped) toast(`${skipped} file${skipped > 1 ? 's' : ''} skipped — App Store Connect allows ${MAX_SLIDES} screenshots per size.`);
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

async function renderFile(slide, i, size, fmt) {
  const cv = document.createElement('canvas'); cv.width = size.w; cv.height = size.h;
  render(cv.getContext('2d'), size.w, size.h, slide, size.family, nextOf(i));
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

async function buildExport(fmt, onProgress) {
  const sizes = SIZES.filter(s => s.on), files = [], total = sizes.length * state.slides.length;
  for (const size of sizes) {
    const folder = `${FAMILY[size.family].name.replace(' ', '-')}_${size.w}x${size.h}`;
    for (let i = 0; i < state.slides.length; i++) {
      onProgress?.(files.length + 1, total);
      files.push({ name: `${folder}/${String(i + 1).padStart(2, '0')}.${fmt}`, data: await renderFile(state.slides[i], i, size, fmt) });
      await new Promise(r => setTimeout(r)); // let the UI breathe
    }
  }
  return zip(files);
}

function syncExport() {
  $$('#sizes input').forEach(cb => cb.checked = SIZES.find(s => s.id === cb.dataset.size).on);
  const on = SIZES.filter(s => s.on), n = on.length * state.slides.length;
  $('#exportCount').textContent = `${state.slides.length} slide${state.slides.length > 1 ? 's' : ''} × ${on.length} size${on.length === 1 ? '' : 's'} = ${n} image${n === 1 ? '' : 's'}`;
  $('#doExport').disabled = !n;
  const warn = [];
  for (const fam of new Set(on.map(s => s.family))) {
    const subs = state.slides.filter(s => pickSource(s, fam).fallback).length;
    const none = state.slides.filter(s => !pickSource(s, fam).img).length;
    if (subs) warn.push(`${subs} slide${subs > 1 ? 's have' : ' has'} no ${FAMILY[fam].name} screenshot — another device's screenshot will be used at ${FAMILY[fam].name} size.`);
    if (none) warn.push(`${none} slide${none > 1 ? 's have' : ' has'} no screenshot at all and will export with a placeholder.`);
  }
  $('#exportWarn').textContent = [...new Set(warn)].join(' ');
}

/* ---------- wiring ---------- */
function wire() {
  const st = state.style;
  $('#headline').oninput = e => { cur().headline = e.target.value; schedule(); };
  $('#subtitle').oninput = e => { cur().subtitle = e.target.value; schedule(); };
  $('#c1').oninput = e => { st.c1 = e.target.value; schedule(); };
  $('#c2').oninput = e => { st.c2 = e.target.value; schedule(); };
  $('#angle').oninput = e => { st.angle = +e.target.value; schedule(); };
  $('#headScale').oninput = e => { st.headScale = +e.target.value; schedule(); };
  $('#autoText').onchange = e => { st.autoText = e.target.checked; schedule(); };
  $('#textColor').oninput = e => { st.textColor = e.target.value; st.autoText = false; sync(); };
  $('#linkTpl').onchange = e => { state.linkTpl = e.target.checked; if (state.linkTpl) { const t = cur().template; state.slides.forEach(s => s.template = t); } sync(); };
  $$('#familyTabs button').forEach(b => b.onclick = () => { state.family = b.dataset.family; sync(); });

  const file = $('#file'); let pickFor = null;
  $$('#slots .slot').forEach(el => {
    $('.pick', el).onclick = () => { pickFor = { family: el.dataset.family, slide: cur() }; file.multiple = false; file.click(); };
    $('.clear', el).onclick = () => { const im = cur().images[el.dataset.family]; if (im) URL.revokeObjectURL(im.url); cur().images[el.dataset.family] = null; sync(); };
  });
  file.onchange = () => { addFiles(file.files, pickFor?.family, pickFor?.slide); file.value = ''; pickFor = null; };

  let depth = 0; const veil = $('#dropveil');
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; veil.classList.add('on'); } });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; veil.classList.remove('on'); } });
  addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('drop', e => { e.preventDefault(); depth = 0; veil.classList.remove('on'); addFiles(e.dataTransfer.files); });
  addEventListener('paste', e => { if (e.clipboardData?.files.length) addFiles(e.clipboardData.files); });
  addEventListener('resize', schedule);

  const dlg = $('#exportDlg');
  $('#openExport').onclick = () => { syncExport(); dlg.showModal(); };
  $('#sizes').onchange = e => { SIZES.find(s => s.id === e.target.dataset.size).on = e.target.checked; syncExport(); };
  $$('[data-quick]').forEach(b => b.onclick = () => { const q = b.dataset.quick; SIZES.forEach(s => s.on = q === 'all' || (q === 'required' && s.rec)); syncExport(); });
  $('#doExport').onclick = async () => {
    const btn = $('#doExport'), fmt = $('input[name=fmt]:checked').value;
    btn.disabled = true;
    try {
      const blob = await buildExport(fmt, (i, n) => btn.textContent = `Rendering ${i} / ${n}…`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'app-store-screenshots.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      dlg.close(); toast('Exported — unzip and drag each folder into App Store Connect.');
    } catch (err) { console.error(err); toast('Export failed: ' + err.message); }
    btn.textContent = 'Download ZIP'; btn.disabled = false;
  };
}

state.slides.push(newSlide());
buildStatic(); wire(); sync(true);
window.studio = { state, addFiles, buildExport, encodePNG, SIZES, sync }; // handy for debugging
