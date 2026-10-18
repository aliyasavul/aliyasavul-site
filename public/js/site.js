// Runtime for the public site. The page arrives pre-rendered (scripts/build.mjs); this
// module adds the camera, the glitch, sound, overlays and the TR/EN switch, and re-renders
// from the same config when the language changes or the admin preview sends a draft.
import { normalize, renderUI, renderGate, themeCSS, fontsHref, enabledSections, t, safeUrl, themeForDate, withTheme, mmss } from './render.js';
import { createStone } from './stone.js';

const $ = (sel, root = document) => root.querySelector(sel);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;

const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

let cfg = normalize(JSON.parse($('#site-data').textContent));
// a saved seasonal theme (for example New Year) takes over between its dates
if (!PREVIEW) cfg = withTheme(cfg, themeForDate(cfg));
let lang = initialLang();
let current = 'intro';
let started = false;
const S = (k) => t(cfg.strings[k], lang);

function initialLang() {
  if (/^\/en(\/|$)/.test(location.pathname)) return 'en';
  const saved = store.get('ay-lang');
  if (saved === 'tr' || saved === 'en') return saved;
  const pref = cfg.site.defaultLang;
  if (pref === 'tr' || pref === 'en') return pref;
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'tr'];
  return langs.some((l) => /^tr\b/i.test(l)) ? 'tr' : 'en';
}

/* ---------------- render ---------------- */

const ui = $('#ui');
const gateRoot = $('#gateRoot');
const overlay = $('#overlay');

function applyTheme() {
  $('#theme-css').textContent = themeCSS(cfg);
  const href = fontsHref(cfg);
  const link = $('#fonts-css');
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cfg.theme.colors.background);
}

function renderAll() {
  document.documentElement.lang = lang;
  ui.innerHTML = renderUI(cfg, lang);
  const gate = $('#gate');
  if (gate && !gate.classList.contains('gone')) { gateRoot.innerHTML = renderGate(cfg, lang); syncGateSound(); }
  const banner = $('.banner', ui);
  if (banner && store.get('ay-banner-x') === banner.dataset.key) banner.classList.add('gone');
  syncSound();
  // a song that is playing carries on in the new language
  recSync(); recShow();
  if (!enabledSections(cfg).some((s) => s.id === current)) current = 'intro';
  igLoaded = false;
  if (scrollMode) {
    applyMode();
    const keep = current;
    requestAnimationFrame(() => { measureSlides(); go(keep, { instant: true }); });
  } else {
    applyMode();
  }
}

function setLang(next) {
  if (next !== 'tr' && next !== 'en') return;
  lang = next;
  store.set('ay-lang', lang);
  if (!PREVIEW) {
    const path = lang === 'en' ? '/en/' : '/';
    try { history.replaceState(null, '', path + location.search + location.hash); } catch (e) { /* ignore */ }
  }
  renderAll();
  const btn = $('.lang', ui);
  if (btn && document.activeElement === document.body) btn.focus({ preventScroll: true });
}

/* ---------------- the amber: an image-based 3D stone, and the camera around it ---------------- */

const stage = $('#stage');
const stone = $('#stone');
const glCanvas = $('#stoneGL');
const video = $('#amberVideo');
const poster = $('#amberPoster');
const glow = $('#amberGlow');
const fx = () => cfg.theme.effects;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

const narrowMQ = window.matchMedia('(max-width: 760px), (max-aspect-ratio: 1/1)');
// every screen scrolls through the sections; narrow screens only lay them out differently
let scrollMode = true;
const isNarrow = () => narrowMQ.matches;
let scrollP = 0;
let slides = [];

// Each section has its own camera: an angle around the stone, a height, a tilt and a distance.
// The camera gets a little closer with every step back in time.
const BASE_DIST = 4.6;   // the distance the views were rendered from
const NEAR_DIST = 3.3;   // the closest the camera comes, in the last section
const FILL = 0.78;       // the stone is drawn at this share of its box, leaving room for close-ups
const YAW_STEP = 1.3;
const PITCH = [0, 0.16, -0.13, 0.21, -0.17, 0.12, -0.1];
const ROLL = [0, -0.04, 0.05, -0.035, 0.045, -0.05, 0.03];

const m = {
  drag: 0, dragVel: 0,
  orbit: 0, orbitVel: 0,
  pitch: 0, pitchVel: 0, tilt: 0,
  roll: 0, rollVel: 0,
  dist: BASE_DIST, distVel: 0,
  cam: { x: 0, y: 0, s: 1 },
};
const pointer = { x: 0, y: 0 }, pointerS = { x: 0, y: 0 };
let raf = 0, lastNow = 0, drag = null;

function spring(key, target, w, dt) {
  if (reduce) { m[key] = target; m[key + 'Vel'] = 0; return; }
  const a = w * w * (target - m[key]) - 2 * w * m[key + 'Vel'];
  m[key + 'Vel'] += a * dt;
  m[key] += m[key + 'Vel'] * dt;
}

function indexOf(id) { return Math.max(0, enabledSections(cfg).findIndex((s) => s.id === id)); }

function poseOf(i, n) {
  const spin = fx().spin / 50;
  const depth = n > 1 ? i / (n - 1) : 0;
  return {
    yaw: i * YAW_STEP * spin,
    pitch: PITCH[i % PITCH.length] * (0.4 + 0.6 * Math.min(1.5, spin)),
    roll: ROLL[i % ROLL.length] * Math.min(1.5, spin),
    dist: BASE_DIST - (BASE_DIST - NEAR_DIST) * depth,
  };
}

// where the stone sits on screen for section i; `mag` is how much the camera distance enlarges it
function camFor(i, mag) {
  const n = enabledSections(cfg).length;
  const W = window.innerWidth, H = window.innerHeight;
  const visH = stone.offsetHeight * 0.62 * mag;   // height of the stone itself, not its box
  if (isNarrow()) {
    if (i === 0) return { x: 0, y: -H * 0.05, s: 1 };
    const top = ($('.top', ui)?.getBoundingClientRect().bottom || 120) + 6;
    const bottom = H * 0.46 - 6;
    const s = clamp((bottom - top) / Math.max(1, visH), 0.3, 1);
    return { x: 0, y: (top + bottom) / 2 - H / 2, s };
  }
  if (i === 0) return { x: 0, y: -H * 0.04, s: 1 };
  const side = i % 2 === 1 ? 1 : -1;
  const half = stone.offsetWidth * 0.26 * FILL * mag;
  return { x: side * Math.min(W * 0.25, W / 2 - half - 24), y: 0, s: 1 };
}

// phones: tilting the phone turns the stone, like moving the mouse does on a computer
const tiltCtl = { on: false, base: null };
function onOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  const portrait = !window.screen.orientation || /portrait/.test(window.screen.orientation.type || 'portrait');
  const b = portrait ? e.beta : e.gamma, g = portrait ? e.gamma : -e.beta;
  if (!tiltCtl.base) tiltCtl.base = { b, g };
  // drift the resting angle slowly so holding the phone differently does not leave the stone turned
  tiltCtl.base.b += (b - tiltCtl.base.b) * 0.004;
  tiltCtl.base.g += (g - tiltCtl.base.g) * 0.004;
  pointer.x = clamp((g - tiltCtl.base.g) / 28, -0.6, 0.6);
  pointer.y = clamp((b - tiltCtl.base.b) / 28, -0.6, 0.6);
  wake();
}
function startTilt() {
  if (tiltCtl.on || PREVIEW || !window.matchMedia('(pointer: coarse)').matches || typeof DeviceOrientationEvent === 'undefined') return;
  const listen = () => { tiltCtl.on = true; window.addEventListener('deviceorientation', onOrientation); };
  // iPhone asks once for permission; this runs inside the tap on the start button
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') listen(); }).catch(() => {});
  } else listen();
}

let stone3d = null, usingVideo = false;
function useVideo() {
  if (usingVideo) return;
  usingVideo = true;
  stone3d = null;
  glCanvas.hidden = true;
  video.hidden = false;
  const st = cfg.media.stone;
  const list = [];
  if (video.canPlayType('video/mp4; codecs="avc1.64001F"')) list.push(safeUrl(st.mp4));
  if (st.webm && video.canPlayType('video/webm; codecs="vp9"')) list.push(safeUrl(st.webm));
  if (!list.length) list.push(safeUrl(st.mp4));
  let k = 0;
  video.muted = true;
  video.addEventListener('loadeddata', () => poster.classList.add('hide'));
  video.addEventListener('error', () => { if (++k < list.length) { video.src = list[k]; if (started) playVideo(); } else { video.hidden = true; poster.classList.remove('hide'); } });
  video.preload = 'auto';
  video.src = list[0];
  if (started) playVideo();
}
function playVideo() { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
try {
  if (typeof createImageBitmap === 'function') {
    stone3d = createStone(glCanvas, {
      maxTextures: (navigator.deviceMemory || 4) >= 4 ? 14 : 9,
      zoom: FILL,
      onFirstFrame() { glCanvas.classList.add('on'); poster.classList.add('hide'); },
      onFail() { useVideo(); },
    });
  }
} catch (e) { stone3d = null; }
if (!stone3d) useVideo();
function applyStoneColor() {
  const st = cfg.theme.stone;
  if (stone3d) stone3d.setGrade(st.hue, st.saturation / 100, st.brightness / 100);
}
applyStoneColor();
// frames arrived but nothing could be drawn (a graphics problem): fall back to the video
setTimeout(() => { if (stone3d && !stone3d.drawn && stone3d.loaded > 3) useVideo(); }, 20000);

// slow devices get a lower drawing resolution instead of a choppy stone
const perf = { n: 0, sum: 0, settled: false };
let startedAt = 0;
function trackFrame(ms) {
  if (perf.settled || !started || !stone3d || !stone3d.drawn || document.hidden || performance.now() - startedAt < 2000) return;
  if (ms > 100) return;
  perf.n++; perf.sum += ms;
  if (perf.n < 45) return;
  const avg = perf.sum / perf.n;
  perf.n = 0; perf.sum = 0;
  if (avg > 24 && stone3d.quality > 0.5) stone3d.setQuality(stone3d.quality * 0.75);
  else perf.settled = true;
}

let skip = false;
function tick(now) {
  raf = 0;
  if (lastNow) trackFrame(now - lastNow);
  let dt = Math.min(0.1, (now - (lastNow || now)) / 1000); lastNow = now;
  const n = enabledSections(cfg).length;
  const p = scrollMode ? clamp(scrollP, 0, n - 1) : indexOf(current);
  const i0 = Math.floor(p), i1 = Math.min(n - 1, i0 + 1), f = ease(p - i0);
  const a = poseOf(i0, n), b = poseOf(i1, n);
  const yawT = lerp(a.yaw, b.yaw, f), pitchT = lerp(a.pitch, b.pitch, f), rollT = lerp(a.roll, b.roll, f), distT = lerp(a.dist, b.dist, f);
  const c0 = camFor(i0, BASE_DIST / a.dist), c1 = camFor(i1, BASE_DIST / b.dist);
  const ct = { x: lerp(c0.x, c1.x, f), y: lerp(c0.y, c1.y, f), s: lerp(c0.s, c1.s, f) };
  // substeps keep the springs stable on slow frames
  const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    spring('orbit', yawT, isNarrow() ? 7 : 5, h);
    spring('pitch', pitchT + m.tilt, drag ? 14 : 3.6, h);
    const bank = clamp(m.orbitVel * 0.05, -0.08, 0.08);
    spring('roll', rollT + bank, 3.6, h);
    spring('dist', distT, isNarrow() ? 6 : 4.5, h);
  }
  if (!drag) {
    m.drag += m.dragVel * dt;
    m.dragVel *= Math.exp(-dt * 2.2);
    m.tilt *= Math.exp(-dt * 2.8);
  }
  const kc = reduce ? 1 : 1 - Math.exp(-dt * (isNarrow() ? 6 : 4.5));
  m.cam.x += (ct.x - m.cam.x) * kc; m.cam.y += (ct.y - m.cam.y) * kc; m.cam.s += (ct.s - m.cam.s) * kc;
  const kp = 1 - Math.exp(-dt * 3.5);
  pointerS.x += (pointer.x - pointerS.x) * kp; pointerS.y += (pointer.y - pointerS.y) * kp;
  const par = reduce ? 0 : fx().parallax / 50;
  // a slow breath instead of a constant spin, so each section keeps its own view of the stone
  const tt = now / 1000;
  const sway = reduce || !started ? 0 : Math.sin(tt * 0.31) * 0.07 + Math.sin(tt * 0.13 + 1.7) * 0.05;
  const bob = reduce || !started ? 0 : Math.sin(tt * 0.27 + 0.6) * 0.022;
  // the camera dips as it swings round, which reads as a move through space
  const swoop = -0.09 * clamp(Math.abs(m.orbitVel) / 1.4, 0, 1);
  const yaw = m.drag + m.orbit + sway + pointerS.x * 0.55 * par;
  const pitch = clamp(m.pitch + swoop + bob + pointerS.y * 0.2 * par, -0.28, 0.28);
  stone.style.transform = 'translate(-50%, -50%) translate3d(' + (m.cam.x + pointerS.x * 10 * par).toFixed(1) + 'px, ' + (m.cam.y + pointerS.y * 6 * par).toFixed(1) + 'px, 0) scale(' + m.cam.s.toFixed(4) + ')';
  const lvl = audio.level();
  const g = fx().glow / 50;
  glow.style.opacity = (0.02 + 0.06 * g + lvl * 0.55 * g).toFixed(3);
  // when nothing but the slow breath is happening, draw every other frame to spare the battery
  const busy = drag || audio.on || recPlaying() || Math.abs(m.orbitVel) + Math.abs(m.pitchVel) + Math.abs(m.rollVel) + Math.abs(m.distVel) > 0.003 || Math.abs(m.dragVel) > 0.02 ||
    Math.abs(ct.x - m.cam.x) + Math.abs(ct.y - m.cam.y) > 0.5 || Math.abs(ct.s - m.cam.s) > 0.002 || Math.abs(pointer.x - pointerS.x) + Math.abs(pointer.y - pointerS.y) > 0.002;
  skip = busy ? false : !skip;
  if (stone3d && !skip) stone3d.render(yaw, pitch, m.roll, lvl * 0.5 * g, false, m.dist);
  // keep the stone alive while the page is open; before the start screen is passed, only until the first frame is up
  if (started || !stone3d || !stone3d.drawn) wake();
}
function wake() { if (!raf) raf = requestAnimationFrame(tick); }
window.addEventListener('resize', () => { if (scrollMode) measureSlides(); wake(); });

function updateIndicators(p) {
  const n = enabledSections(cfg).length;
  const timeline = $('.timeline', ui);
  if (timeline) timeline.style.setProperty('--p', String(n > 1 ? clamp(p / (n - 1), 0, 1) : 0));
  ui.querySelectorAll('.stop').forEach((b) => b.setAttribute('aria-current', b.dataset.go === current ? 'true' : 'false'));
  document.body.classList.toggle('in-section', scrollMode ? p > 0.35 : current !== 'intro');
}

function setHash(id) {
  if (PREVIEW) return;
  try { history.replaceState(null, '', location.pathname + location.search + (id === 'intro' ? '' : '#' + id)); } catch (e) { /* ignore */ }
}

function go(id, { silent = false, fromHash = false, instant = false } = {}) {
  const list = enabledSections(cfg);
  if (!list.some((s) => s.id === id)) return;
  if (scrollMode) {
    const sl = slides.find((x) => x.id === id);
    if (sl) window.scrollTo({ top: sl.top, behavior: instant || reduce || silent ? 'auto' : 'smooth' });
    return;
  }
  const changed = id !== current;
  current = id;
  wake();
  updateIndicators(indexOf(id));
  ui.querySelectorAll('.panel').forEach((p) => {
    const on = p.dataset.id === id;
    p.classList.toggle('is-active', on);
    p.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    if (on && changed) p.scrollTop = 0;
  });
  if (id === 'gallery') loadInstagram();
  if (!fromHash && !silent) setHash(id);
}

function step(d) {
  const ids = enabledSections(cfg).map((s) => s.id);
  const i = ids.indexOf(current);
  const j = clamp(i + d, 0, ids.length - 1);
  if (j !== i) go(ids[j]);
}

/* phones: the sections are slides; scrolling drives the camera */
function measureSlides() {
  slides = [...ui.querySelectorAll('.intro-slide, .panel')].map((el) => ({ id: el.dataset.id, top: el.offsetTop }));
  onScroll();
}
let hashTimer = 0;
function onScroll() {
  if (!scrollMode || !slides.length) return;
  const y = window.scrollY, H = window.innerHeight;
  let p = slides.length - 1;
  for (let k = 0; k < slides.length - 1; k++) {
    const a = slides[k].top, b = slides[k + 1].top;
    if (y < b) { const start = Math.max(a, b - H); p = k + clamp((y - start) / Math.max(1, b - start), 0, 1); break; }
  }
  scrollP = p;
  // each section's text fades in as it rises into view and out as it leaves at the top
  const boxes = [];
  for (const el of ui.querySelectorAll('.panel')) {
    const pin = el.firstElementChild;
    if (!pin) continue;
    const top = el.getBoundingClientRect().top + pin.offsetTop;
    boxes.push([pin, top, top + pin.offsetHeight]);
  }
  for (const [pin, top, bottom] of boxes) {
    const vis = Math.min(clamp((H - top) / (H * 0.35), 0, 1), clamp(bottom / (H * 0.3), 0, 1));
    pin.style.setProperty('--vis', vis.toFixed(3));
  }
  const id = slides[Math.round(p)].id;
  if (id !== current) {
    current = id;
    if (id === 'gallery') loadInstagram();
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => setHash(current), 400);
  }
  updateIndicators(p);
  wake();
}
window.addEventListener('scroll', onScroll, { passive: true });

function applyMode() {
  scrollMode = true;
  document.body.classList.add('scroll-mode');
  ui.querySelectorAll('.panel').forEach((p) => { p.removeAttribute('inert'); p.setAttribute('aria-hidden', 'false'); p.classList.add('is-active'); });
  requestAnimationFrame(measureSlides);
  wake();
}
if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', () => { const keep = current; requestAnimationFrame(() => { measureSlides(); go(keep, { instant: true }); }); });

/* pointer: turn and tilt the stone by dragging; it keeps spinning when let go */
window.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const k = TAU / Math.max(700, stone.offsetWidth * 2.6);
    const dts = Math.max(0.008, (e.timeStamp - drag.t) / 1000);
    m.drag += dx * k;
    m.dragVel = 0.75 * m.dragVel + 0.25 * clamp((dx * k) / dts, -9, 9);
    m.tilt = clamp(m.tilt - dy * 0.0032, -0.22, 0.22);
    drag.x = e.clientX; drag.y = e.clientY; drag.t = e.timeStamp;
    document.body.classList.add('dragged');
    wake();
    return;
  }
  if (e.pointerType === 'mouse') {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
    wake();
  }
});
stage.addEventListener('dragstart', (e) => e.preventDefault());
stage.addEventListener('pointerdown', (e) => {
  if (!started || !stone3d) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.pointerType === 'mouse') e.preventDefault();
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
  m.dragVel = 0;
  stage.classList.add('dragging');
});
const endDrag = (e) => {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  if (e && e.timeStamp - drag.t > 90) m.dragVel = 0;
  drag = null;
  stage.classList.remove('dragging');
  wake();
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

/* ---------------- sound: the riff if one is uploaded, otherwise a low drone ---------------- */

const audio = (() => {
  let ctx = null, master = null, an = null, buf = null, on = false, lvl = 0, el = null, builtFor = null;
  const AC = window.AudioContext || window.webkitAudioContext;
  function teardown() {
    try { if (el) { el.pause(); el.removeAttribute('src'); el.load(); } } catch (e) { /* ignore */ }
    try { if (ctx) ctx.close(); } catch (e) { /* ignore */ }
    ctx = master = an = buf = el = null; on = false; lvl = 0; builtFor = null;
  }
  function build() {
    if (!AC) return false;
    const src = safeUrl(cfg.audio.src, { allowBlob: true });
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    an = ctx.createAnalyser(); an.fftSize = 1024; buf = new Float32Array(an.fftSize);
    if (src) {
      el = new Audio();
      el.loop = true; el.preload = 'auto'; el.src = src;
      ctx.createMediaElementSource(el).connect(master);
    } else {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.8;
      [[41.2, 0.5], [61.74, 0.3], [82.6, 0.2]].forEach(([f, g]) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = g; o.connect(og).connect(lp); o.start();
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = ctx.createGain(); lg.gain.value = 200; lfo.connect(lg).connect(lp.frequency); lfo.start();
      const amp = ctx.createGain(); amp.gain.value = 0.72;
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.28; lfo2.connect(lg2).connect(amp.gain); lfo2.start();
      lp.connect(amp).connect(master);
    }
    master.connect(an); master.connect(ctx.destination);
    builtFor = src;
    return true;
  }
  return {
    set(want) {
      const src = safeUrl(cfg.audio.src, { allowBlob: true });
      if (ctx && builtFor !== src) teardown();
      if (want && !ctx && !build()) return false;
      if (!ctx) return false;
      if (want && ctx.state === 'suspended') ctx.resume();
      on = want;
      const vol = cfg.audio.volume / 100;
      const level = el ? 0.9 * vol : 0.19 * vol;
      if (el) {
        if (want) { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); }
        else setTimeout(() => { if (!on && el) el.pause(); }, 500);
      }
      master.gain.setTargetAtTime(want ? level : 0, ctx.currentTime, want ? 0.6 : 0.25);
      return true;
    },
    reset() { if (ctx) teardown(); },
    // a recording plays through the same graph, so the stone glows with it; false if the element
    // belongs to an earlier graph (it then has to be replaced) or there is no Web Audio at all
    attach(node) {
      if (!ctx && !build()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      if (node.ayCtx === ctx) return true;
      if (node.ayCtx) return false;
      try {
        const srcNode = ctx.createMediaElementSource(node);
        srcNode.connect(an); srcNode.connect(ctx.destination);
        node.ayCtx = ctx;
        return true;
      } catch (e) { return false; }
    },
    get on() { return on; },
    get isFile() { return !!el; },
    level() {
      if (!an) return 0;
      an.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i += 4) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / (buf.length / 4));
      lvl += (Math.min(1, rms * 9) - lvl) * 0.08;
      return lvl;
    },
  };
})();

function syncSound() {
  const btn = $('#soundBtn', ui);
  if (!btn) return;
  const isOn = audio.on;
  btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  btn.title = isOn ? S('soundMute') : S('soundOn');
  const sr = $('.sr-only', btn); if (sr) sr.textContent = btn.title;
  const k = $('#nowK', ui), v = $('#nowV', ui);
  const song = recPlaying() ? recRow(rec.src) : null;
  if (k) k.textContent = isOn || song ? S('nowPlaying') : S('soundOff');
  if (v) v.textContent = song ? song.dataset.title : t(cfg.audio.title, lang);
}
function setSound(want) { if (want) recPause(); audio.set(want); syncSound(); wake(); }

/* ---------------- recordings: Ali's own songs, with their outline as the progress bar ---------------- */

const rec = { el: null, src: '', raf: 0, seeking: null };
const recPlaying = () => !!(rec.el && !rec.el.paused && !rec.el.ended);
function recRow(src) { return src ? [...ui.querySelectorAll('.rec')].find((li) => li.dataset.src === src) || null : null; }
function recElement() {
  if (!rec.el) {
    const node = new Audio();
    node.preload = 'none';
    node.addEventListener('play', recSync);
    node.addEventListener('pause', recSync);
    node.addEventListener('ended', () => { recSync(); recShow(0); });
    node.addEventListener('error', recSync);
    rec.el = node;
  }
  return rec.el;
}
function recDur(li) { return (rec.el && rec.src === li.dataset.src && isFinite(rec.el.duration) && rec.el.duration) || Number(li.dataset.dur) || 0; }
function recShow(frac) {
  const li = recRow(rec.src);
  if (!li) return;
  const dur = recDur(li);
  const cur = frac != null ? frac * dur : rec.el ? rec.el.currentTime : 0;
  li.style.setProperty('--p', dur ? Math.min(1, cur / dur).toFixed(4) : '0');
  const now = $('.rec-now', li);
  if (now) now.textContent = cur >= 1 ? mmss(cur) + ' / ' : '';
  const w = $('.rec-wave', li);
  if (w) { w.setAttribute('aria-valuenow', String(Math.round(cur))); w.setAttribute('aria-valuetext', mmss(cur)); }
}
function recSync() {
  const playing = recPlaying();
  for (const li of ui.querySelectorAll('.rec')) {
    const mine = li.dataset.src === rec.src;
    li.classList.toggle('on', mine && !!rec.el && (playing || rec.el.currentTime > 0));
    const b = $('.rec-play', li);
    if (b) {
      b.setAttribute('aria-pressed', mine && playing ? 'true' : 'false');
      b.setAttribute('aria-label', (mine && playing ? S('pause') : S('play')) + ': ' + li.dataset.title);
    }
  }
  syncSound();
  if (playing && !rec.raf) {
    const loop = () => { rec.raf = recPlaying() ? requestAnimationFrame(loop) : 0; recShow(); };
    rec.raf = requestAnimationFrame(loop);
  }
  wake();
}
function recPlay(li, at) {
  let node = recElement();
  if (rec.src !== li.dataset.src) {
    const old = recRow(rec.src);
    if (old) { old.style.setProperty('--p', '0'); const n0 = $('.rec-now', old); if (n0) n0.textContent = ''; }
    rec.src = li.dataset.src;
    node.src = rec.src;
  }
  // the site's own sound gives way to the song
  if (audio.on) { audio.set(false); syncSound(); }
  if (!audio.attach(node) && node.ayCtx) {
    // tied to an audio graph that has since been rebuilt: carry on with a fresh element
    const was = node.currentTime;
    node.pause();
    rec.el = null;
    node = recElement();
    node.src = rec.src;
    if (was) at = at == null ? was : at;
    audio.attach(node);
  }
  if (at != null) {
    const seek = () => { try { node.currentTime = at; } catch (e) { /* not seekable yet */ } };
    if (node.readyState >= 1) seek(); else node.addEventListener('loadedmetadata', seek, { once: true });
  }
  const pr = node.play();
  if (pr && pr.catch) pr.catch(() => recSync());
  recSync();
}
function recToggle(li) {
  if (!li) return;
  if (rec.src === li.dataset.src && recPlaying()) { rec.el.pause(); return; }
  recPlay(li);
}
function recPause() { if (recPlaying()) rec.el.pause(); }
function recSeek(li, frac, start) {
  if (rec.src === li.dataset.src && rec.el && rec.el.readyState >= 1 && isFinite(rec.el.duration)) {
    rec.el.currentTime = frac * rec.el.duration;
    recShow();
    if (start && rec.el.paused) recPlay(li);
  } else if (start) {
    recPlay(li, frac * (Number(li.dataset.dur) || 0));
    recShow(frac);
  }
}
const waveFrac = (w, x) => { const r = w.getBoundingClientRect(); return clamp((x - r.left) / Math.max(1, r.width), 0, 1); };
document.addEventListener('pointerdown', (e) => {
  const w = e.target.closest && e.target.closest('.rec-wave');
  if (!w || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const li = w.closest('.rec');
  rec.seeking = { w, li, id: e.pointerId };
  try { w.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  recSeek(li, waveFrac(w, e.clientX), true);
});
document.addEventListener('pointermove', (e) => {
  const sk = rec.seeking;
  if (!sk || sk.id !== e.pointerId) return;
  recSeek(sk.li, waveFrac(sk.w, e.clientX), false);
});
const endSeek = (e) => { if (rec.seeking && rec.seeking.id === e.pointerId) rec.seeking = null; };
document.addEventListener('pointerup', endSeek);
document.addEventListener('pointercancel', endSeek);
document.addEventListener('keydown', (e) => {
  const w = e.target.closest && e.target.closest('.rec-wave');
  if (!w) return;
  const li = w.closest('.rec');
  const dur = recDur(li);
  const cur = rec.src === li.dataset.src && rec.el ? rec.el.currentTime : 0;
  const to = { ArrowRight: cur + 5, ArrowUp: cur + 5, ArrowLeft: cur - 5, ArrowDown: cur - 5, Home: 0, End: dur - 1 }[e.key];
  if (to == null || !dur) return;
  e.preventDefault();
  e.stopPropagation();
  recSeek(li, clamp(to / dur, 0, 1), true);
}, true);

/* ---------------- logo: spectral glitch only where the pointer moves ---------------- */

const mark = $('#mark');
const logoFx = (() => {
  const canvas = $('#markFx');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { canvas.hidden = true; return null; }
  const VS = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const FS = `#version 300 es
precision highp float;
uniform sampler2D uLogo;
uniform vec2 uRes;
uniform vec2 uPad;
uniform vec4 uPts[32];
uniform int uCount;
uniform vec3 uTint;
uniform float uTime;
uniform float uAmt;
out vec4 o;
float logoA(vec2 uv){
  vec2 l = (uv - uPad) / (1.0 - 2.0 * uPad);
  float inside = step(0.0, l.x) * step(0.0, l.y) * step(l.x, 1.0) * step(l.y, 1.0);
  return texture(uLogo, vec2(l.x, 1.0 - l.y)).a * inside;
}
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 push = vec2(0.0);
  float s = 0.0;
  for (int i = 0; i < 32; i++){
    if (i >= uCount) break;
    vec4 p = uPts[i];
    vec2 dv = px - p.xy;
    float w = p.z * exp(-dot(dv, dv) / (p.w * p.w));
    push += dv / (length(dv) + p.w * 0.25) * w;
    s += w;
  }
  s = min(s, 1.5);
  vec2 uv = px / uRes;
  vec2 spread = push * uRes.y * 0.032 * uAmt / uRes;
  vec2 warp = -push * uRes.y * 0.012 * uAmt / uRes;
  float band = floor(px.y / (uRes.y * 0.022));
  float flick = fract(sin(band * 91.7 + floor(uTime * 20.0) * 13.13) * 43758.5453) - 0.5;
  warp.x += flick * uRes.y * 0.012 * uAmt * smoothstep(0.8, 1.4, s) / uRes.x;
  vec3 col = vec3(0.0), wsum = vec3(0.0);
  for (int k = 0; k < 8; k++){
    float f = float(k) / 7.0;
    vec3 c = hue(f * 0.82);
    col += c * logoA(uv + warp - spread * (f - 0.5) * 2.0);
    wsum += c;
  }
  col /= wsum;
  float base = logoA(uv);
  col = mix(vec3(base), col, smoothstep(0.0, 0.06, s));
  float a = max(max(col.r, col.g), col.b);
  vec3 tinted = mix(uTint * a, col, smoothstep(0.0, 0.06, s) * 0.85);
  o = vec4(tinted, a);
}`;
  let prog;
  try {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  } catch (e) { canvas.hidden = true; return null; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uLogo', 'uRes', 'uPad', 'uPts', 'uCount', 'uTint', 'uTime', 'uAmt']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uLogo, 0);
  const PADX = 0.08 / 1.16, PADY = 0.10 / 1.20;
  gl.uniform2f(U.uPad, PADX, PADY);
  const tex = gl.createTexture();

  const MAX = 32, pts = [], hover = { x: 0, y: 0, s: 0, target: 0 };
  const t0 = performance.now();
  let ready = false, frameId = 0, last = 0, lastMove = null, loadedSrc = '';

  function amount() { return fx().glitch / 50; }
  function tint() {
    const n = parseInt(cfg.theme.colors.logo.slice(1), 16);
    gl.uniform3f(U.uTint, ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  function draw(now) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const list = pts.slice(-(MAX - 1));
    if (hover.s > 0.01) list.push({ x: hover.x, y: hover.y, s: hover.s });
    const sigma = r.height * 0.15 * dpr;
    const arr = new Float32Array(MAX * 4);
    list.forEach((p, i) => { arr[i * 4] = p.x * dpr; arr[i * 4 + 1] = h - p.y * dpr; arr[i * 4 + 2] = p.s; arr[i * 4 + 3] = sigma; });
    gl.uniform4fv(U.uPts, arr);
    gl.uniform1i(U.uCount, list.length);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uTime, (now - t0) / 1000);
    gl.uniform1f(U.uAmt, amount());
    tint();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    frameId = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const k = Math.exp(-dt / 0.3);
    for (const p of pts) p.s *= k;
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i].s < 0.02) pts.splice(i, 1);
    hover.s += (hover.target - hover.s) * (1 - Math.exp(-dt / 0.12));
    draw(now);
    if (pts.length || hover.s > 0.01 || hover.target > 0) kick(); else last = 0;
  }
  function kick() { if (!frameId && ready) frameId = requestAnimationFrame(frame); }
  function add(x, y, s) { pts.push({ x, y, s }); if (pts.length > MAX - 1) pts.shift(); }

  function load(src) {
    if (!src || src === loadedSrc) return;
    loadedSrc = src;
    const image = new Image();
    image.onload = () => {
      if (loadedSrc !== src) return;
      try {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } catch (e) { canvas.hidden = true; mark.classList.remove('fx'); return; }
      ready = true;
      refresh();
    };
    image.onerror = () => { if (loadedSrc === src) { ready = false; mark.classList.remove('fx'); } };
    image.src = src;
  }
  function refresh() {
    const on = ready && amount() > 0;
    canvas.hidden = !on;
    mark.classList.toggle('fx', on);
    if (on) draw(performance.now());
  }

  window.addEventListener('pointermove', (e) => {
    const gate = $('#gate');
    if (!ready || amount() <= 0 || document.body.classList.contains('in-section') || (gate && !gate.classList.contains('gone')) || !overlay.hidden) {
      if (hover.target) { hover.target = 0; kick(); }
      lastMove = null;
      return;
    }
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const lx = r.width * PADX, ly = r.height * PADY;
    const overLogo = x > lx && x < r.width - lx && y > ly && y < r.height - ly;
    hover.target = overLogo ? 0.35 : 0;
    if (overLogo) { hover.x = x; hover.y = y; }
    if (overLogo && lastMove) {
      const dx = x - lastMove.x, dy = y - lastMove.y, dist = Math.hypot(dx, dy);
      const dts = Math.max(0.008, (e.timeStamp - lastMove.t) / 1000);
      const strength = Math.min(0.75, 0.2 + (dist / dts) / (r.height * 9));
      const n = Math.min(12, Math.ceil(dist / (r.height * 0.05)));
      for (let i = 1; i <= n; i++) add(lastMove.x + dx * i / n, lastMove.y + dy * i / n, strength);
    }
    lastMove = overLogo ? { x, y, t: e.timeStamp } : null;
    kick();
  });
  window.addEventListener('resize', () => { if (ready) draw(performance.now()); });
  load(safeUrl(cfg.media.logo.src, { allowBlob: true }));
  return { load, refresh };
})();

/* ---------------- overlays: video player and photo viewer ---------------- */

const ICON = {
  close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"/></svg>',
};
let ovState = null, lastFocus = null;

function openOverlay(html, state) {
  lastFocus = document.activeElement;
  overlay.innerHTML = html + '<button type="button" class="ov-btn ov-close" aria-label="' + S('close') + '">' + ICON.close + '</button>';
  overlay.hidden = false;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  ui.setAttribute('inert', '');
  document.body.classList.add('ov-open');
  ovState = state;
  $('.ov-close', overlay).focus({ preventScroll: true });
}
function closeOverlay() {
  if (overlay.hidden) return;
  overlay.hidden = true;
  overlay.innerHTML = '';
  ui.removeAttribute('inert');
  document.body.classList.remove('ov-open');
  ovState = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
function openVideo(id, title) {
  recPause();
  const src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
  const wasOn = audio.on;
  if (wasOn) setSound(false);
  openOverlay('<div class="ov-frame"><iframe src="' + src + '" title="' + (title || 'YouTube').replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>', { kind: 'video', resume: wasOn });
}
// Spotify's own player; it only loads when a song is opened, and the site's sound waits meanwhile
function openSpotify(ref, title) {
  recPause();
  const [kind, id] = String(ref || '').split('/');
  if (!/^(track|album|playlist|episode|show|artist)$/.test(kind) || !/^[A-Za-z0-9]{22}$/.test(id || '')) return;
  const wasOn = audio.on;
  if (wasOn) setSound(false);
  const src = 'https://open.spotify.com/embed/' + kind + '/' + id + '?utm_source=generator&theme=0';
  const tall = kind !== 'track' && kind !== 'episode';
  const link = 'https://open.spotify.com/' + kind + '/' + id;
  openOverlay('<div class="ov-spw"><div class="ov-sp' + (tall ? ' tall' : '') + '"><iframe src="' + src + '" title="' + (title || 'Spotify').replace(/"/g, '&quot;') + '" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>' +
    '<a class="ov-sp-open" href="' + link + '" target="_blank" rel="noopener">' + S('openSpotify') + ' ↗</a></div>', { kind: 'spotify', resume: wasOn });
  // the player fades in once it has loaded, so there is no white flash on the dark page
  const fr = $('.ov-sp iframe', overlay);
  if (fr) fr.addEventListener('load', () => fr.classList.add('ready'), { once: true });
}
function galleryImages() {
  const g = cfg.sections.find((s) => s.id === 'gallery');
  return g ? (g.images || []).filter((im) => safeUrl(im.src, { allowBlob: true })) : [];
}
function photoHTML(i) {
  const list = galleryImages();
  const im = list[i];
  if (!im) return '';
  const alt = t(im.alt, lang);
  return '<figure class="ov-fig"><img src="' + safeUrl(im.src, { allowBlob: true }) + '" alt="' + alt.replace(/"/g, '&quot;') + '">' +
    (alt ? '<figcaption>' + alt.replace(/</g, '&lt;') + '</figcaption>' : '') + '</figure>' +
    (list.length > 1 ? '<button type="button" class="ov-btn ov-prev" aria-label="' + S('prev') + '">' + ICON.prev + '</button><button type="button" class="ov-btn ov-next" aria-label="' + S('next') + '">' + ICON.next + '</button>' : '');
}
function openPhoto(i) { openOverlay(photoHTML(i), { kind: 'photo', i }); }
function stepPhoto(d) {
  if (!ovState || ovState.kind !== 'photo') return;
  const n = galleryImages().length;
  if (n < 2) return;
  const i = (ovState.i + d + n) % n;
  closeOverlay();
  openPhoto(i);
}

/* ---------------- Instagram: posts from the feed, drawn in the site's own style ---------------- */

let igLoaded = false;
const igCache = new Map();
function parseFeed(j) {
  const arr = Array.isArray(j) ? j : (j && (j.posts || j.data || j.items || j.media)) || [];
  return arr.map((p) => {
    const sizes = p.sizes || {};
    const img = (sizes.medium && sizes.medium.mediaUrl) || (sizes.small && sizes.small.mediaUrl) || p.thumbnailUrl || p.thumbnail_url || p.mediaUrl || p.media_url || p.image || '';
    return { link: p.permalink || p.url || p.link || '', img, caption: p.prunedCaption || p.caption || '' };
  }).filter((x) => /^https:\/\//.test(x.link) && /^https:\/\//.test(x.img));
}
async function loadInstagram() {
  if (igLoaded) return;
  igLoaded = true;
  for (const box of ui.querySelectorAll('.ig[data-feed]')) {
    const url = box.dataset.feed, count = Number(box.dataset.count) || 6;
    try {
      let posts = igCache.get(url);
      if (!posts) {
        // Behold feeds go through the site, which keeps a copy for a few hours
        const bh = url.match(/^https:\/\/feeds\.behold\.so\/([A-Za-z0-9_-]{6,64})\/?$/);
        let res = null;
        if (bh) { try { res = await fetch('/api/ig?feed=' + bh[1]); } catch (e) { res = null; } }
        if (!res || !res.ok) res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error('feed ' + res.status);
        posts = parseFeed(await res.json());
        igCache.set(url, posts);
      }
      const grid = $('.ig-grid', box);
      if (!grid) continue;
      grid.innerHTML = '';
      for (const p of posts.slice(0, count)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = p.link; a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', (p.caption || 'Instagram').slice(0, 120));
        const img = document.createElement('img');
        img.src = p.img; img.alt = ''; img.loading = 'lazy';
        a.append(img); li.append(a); grid.append(li);
      }
    } catch (e) {
      box.hidden = true;
    }
  }
}

/* ---------------- interactions ---------------- */

function copyText(btn, text) {
  const done = (label) => { const old = S('copy'); btn.textContent = label; setTimeout(() => { btn.textContent = old; }, 1600); };
  const fallback = () => {
    const el = btn.parentElement.querySelector('.mail');
    if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    done(S('selected'));
  };
  try { navigator.clipboard.writeText(text).then(() => done(S('copied')), fallback); } catch (e) { fallback(); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('button, a');
  if (!el) {
    if (e.target === overlay) { const resume = ovState && ovState.resume; closeOverlay(); if (resume) setSound(true); }
    return;
  }
  if (el.id === 'startBtn') return enter(wantSound);
  if (el.id === 'gateSound') { wantSound = !wantSound; syncGateSound(); return; }
  if (el.id === 'soundBtn') return setSound(!audio.on);
  if (el.classList.contains('ov-close')) {
    const resume = ovState && ovState.resume;
    closeOverlay();
    if (resume) setSound(true);
    return;
  }
  if (el.classList.contains('ov-prev')) return stepPhoto(-1);
  if (el.classList.contains('ov-next')) return stepPhoto(1);
  if (el.classList.contains('banner-x')) {
    const b = el.closest('.banner');
    if (b) { b.classList.add('gone'); store.set('ay-banner-x', b.dataset.key); }
    return;
  }
  if (el.dataset.lang) return setLang(el.dataset.lang);
  if (el.dataset.go) { e.preventDefault(); return go(el.dataset.go); }
  if (el.classList.contains('rec-play')) return recToggle(el.closest('.rec'));
  if (el.dataset.yt) return openVideo(el.dataset.yt, el.dataset.title);
  if (el.dataset.sp) return openSpotify(el.dataset.sp, el.dataset.title);
  if (el.dataset.img !== undefined) return openPhoto(Number(el.dataset.img));
  if (el.dataset.copy) return copyText(el, el.dataset.copy);
});

document.addEventListener('keydown', (e) => {
  if (!overlay.hidden) {
    if (e.key === 'Escape') { e.preventDefault(); const resume = ovState && ovState.resume; closeOverlay(); if (resume) setSound(true); }
    else if (e.key === 'ArrowRight') stepPhoto(1);
    else if (e.key === 'ArrowLeft') stepPhoto(-1);
    return;
  }
  const gate = $('#gate');
  if (gate && !gate.classList.contains('gone')) return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'Escape') go('intro');
});

/* ---------------- boot ---------------- */

let wantSound = true;
function syncGateSound() {
  const b = $('#gateSound');
  if (!b) return;
  b.setAttribute('aria-pressed', wantSound ? 'true' : 'false');
  const label = $('span', b);
  if (label) label.textContent = wantSound ? b.dataset.on : b.dataset.off;
}

function enter(withSound) {
  const gate = $('#gate');
  if (gate) {
    gate.classList.add('gone');
    gate.setAttribute('aria-hidden', 'true');
    gate.setAttribute('inert', '');
  }
  document.body.classList.remove('gated');
  if (withSound) setSound(true);
  started = true;
  startedAt = performance.now();
  startTilt();
  stage.classList.add('lit');
  if (!stone3d && !reduce) playVideo();
  wake();
  if (scrollMode) measureSlides();
  const h = (location.hash || '').slice(1);
  if (!PREVIEW && h && h !== 'intro' && enabledSections(cfg).some((s) => s.id === h)) setTimeout(() => go(h, { fromHash: true }), scrollMode ? 300 : 900);
}

function showGate() {
  gateRoot.innerHTML = renderGate(cfg, lang);
  syncGateSound();
  document.body.classList.add('gated');
}

if (!PREVIEW) document.body.classList.add('gated');
if (cfg.activeTheme) applyTheme();
if (lang !== document.documentElement.lang || cfg.activeTheme) renderAll();
else {
  const banner = $('.banner', ui);
  if (banner && store.get('ay-banner-x') === banner.dataset.key) banner.classList.add('gone');
  applyMode();
}
wake();

if (PREVIEW) {
  enter(false);
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'ay:config') return;
    const prevLogo = cfg.media.logo.src;
    const prevAudio = cfg.audio.src;
    cfg = normalize(e.data.cfg);
    // the panel can preview a saved theme without switching to it
    if (e.data.previewTheme) cfg = withTheme(cfg, cfg.themes.list.find((th) => th.id === e.data.previewTheme) || null);
    if (e.data.lang === 'tr' || e.data.lang === 'en') lang = e.data.lang;
    applyTheme();
    applyStoneColor();
    if (cfg.media.logo.src !== prevLogo) logoFx && logoFx.load(safeUrl(cfg.media.logo.src, { allowBlob: true }));
    if (cfg.audio.src !== prevAudio) { audio.reset(); }
    const focus = e.data.focus;
    if (focus === 'gate') { showGate(); }
    else {
      const gate = $('#gate');
      if (gate && !gate.classList.contains('gone')) { gate.classList.add('gone'); gate.setAttribute('inert', ''); }
      document.body.classList.remove('gated');
    }
    if (focus && focus !== 'gate' && enabledSections(cfg).some((s) => s.id === focus)) current = focus;
    renderAll();
    if (logoFx) logoFx.refresh();
  });
  window.parent.postMessage({ type: 'ay:ready' }, location.origin);
}
