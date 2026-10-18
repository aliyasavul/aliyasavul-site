// Runtime for the public site. The page arrives pre-rendered (scripts/build.mjs); this
// module adds the camera, the glitch, sound, overlays and the TR/EN switch, and re-renders
// from the same config when the language changes or the admin preview sends a draft.
import { normalize, renderUI, renderGate, themeCSS, fontsHref, enabledSections, t, safeUrl } from './render.js';

const $ = (sel, root = document) => root.querySelector(sel);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;

const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

let cfg = normalize(JSON.parse($('#site-data').textContent));
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
  if (gate && !gate.classList.contains('gone')) gateRoot.innerHTML = renderGate(cfg, lang);
  const banner = $('.banner', ui);
  if (banner && store.get('ay-banner-x') === banner.dataset.key) banner.classList.add('gone');
  syncSound();
  if (!enabledSections(cfg).some((s) => s.id === current)) current = 'intro';
  igLoaded = false;
  go(current, { silent: true });
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

/* ---------------- the amber: a pre-rendered turntable, moved like a camera ---------------- */

const stage = $('#stage');
const stone = $('#stone');
const video = $('#amberVideo');
const poster = $('#amberPoster');
const glow = $('#amberGlow');
const cam = { x: 0, y: 0, s: 1 };
const pointer = { x: 0, y: 0 }, pointerS = { x: 0, y: 0 };
let boost = 0, raf = 0, lastNow = 0, lastRate = 1, drag = null, wasPlaying = false, pendingSeek = null;
const fx = () => cfg.theme.effects;

function viewOf(id) {
  const list = enabledSections(cfg);
  const i = Math.max(0, list.findIndex((s) => s.id === id));
  if (i === 0) return { scale: 1, side: 0 };
  const depth = list.length > 2 ? (i - 1) / (list.length - 2) : 0;
  return { scale: 1.06 + 0.16 * depth, side: i % 2 === 1 ? 1 : -1 };
}

function isNarrow() { return window.innerWidth / window.innerHeight < 1 || window.innerWidth <= 760; }

function target() {
  const v = viewOf(current);
  const W = window.innerWidth, H = window.innerHeight;
  if (isNarrow()) {
    if (v.side === 0) return { x: 0, y: -H * 0.05, s: 1 };
    const top = ($('.top', ui)?.getBoundingClientRect().bottom || 120) + 10;
    const panel = $('.panel.is-active', ui);
    const bottom = panel ? panel.getBoundingClientRect().top - 10 : H * 0.55;
    const avail = Math.max(90, bottom - top);
    const s = Math.min(0.92, Math.max(0.3, avail / (stone.offsetHeight * 0.8)));
    return { x: 0, y: (top + bottom) / 2 - H / 2, s };
  }
  if (v.side === 0) return { x: 0, y: -H * 0.04, s: 1 };
  const half = stone.offsetWidth * 0.26 * v.scale;
  return { x: v.side * Math.min(W * 0.25, W / 2 - half - 24), y: 0, s: v.scale };
}

function tick(now) {
  raf = 0;
  const dt = Math.min(0.1, (now - (lastNow || now)) / 1000); lastNow = now;
  const tg = target();
  const k = reduce ? 1 : 1 - Math.exp(-dt * 2.2);
  cam.x += (tg.x - cam.x) * k; cam.y += (tg.y - cam.y) * k; cam.s += (tg.s - cam.s) * k;
  const kp = 1 - Math.exp(-dt * 3.5);
  pointerS.x += (pointer.x - pointerS.x) * kp; pointerS.y += (pointer.y - pointerS.y) * kp;
  const par = reduce ? 0 : fx().parallax / 50;
  const px = pointerS.x * 16 * par, py = pointerS.y * 10 * par, rot = pointerS.x * 1.4 * par;
  stone.style.transform = 'translate(-50%, -50%) translate3d(' + (cam.x + px).toFixed(1) + 'px, ' + (cam.y + py).toFixed(1) + 'px, 0) rotate(' + rot.toFixed(2) + 'deg) scale(' + cam.s.toFixed(4) + ')';
  boost *= Math.exp(-dt * 1.6);
  if (!reduce && !drag && started) {
    const rate = 1 + Math.min(2.2, boost);
    if (Math.abs(rate - lastRate) > 0.04) { try { video.playbackRate = rate; } catch (e) { /* ignore */ } lastRate = rate; }
  }
  const lvl = audio.level();
  const base = 0.02 + 0.06 * (fx().glow / 50);
  glow.style.opacity = (base + lvl * 0.55 * (fx().glow / 50)).toFixed(3);
  const moving = Math.abs(tg.x - cam.x) + Math.abs(tg.y - cam.y) > 0.5 || Math.abs(tg.s - cam.s) > 0.002 ||
    Math.abs(pointer.x - pointerS.x) + Math.abs(pointer.y - pointerS.y) > 0.002 || boost > 0.03 || audio.on || lvl > 0.005;
  if (moving) wake();
  else if (lastRate !== 1 && !drag && started) { try { video.playbackRate = 1; } catch (e) { /* ignore */ } lastRate = 1; }
}
function wake() { if (!raf) raf = requestAnimationFrame(tick); }
window.addEventListener('resize', wake);

function go(id, { silent = false, fromHash = false } = {}) {
  const list = enabledSections(cfg);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const changed = id !== current;
  current = id;
  if (changed && !reduce && started && !silent) boost = 1.8 * (fx().spin / 50);
  wake();
  const timeline = $('.timeline', ui);
  if (timeline) timeline.style.setProperty('--p', String(list.length > 1 ? idx / (list.length - 1) : 0));
  ui.querySelectorAll('.stop').forEach((b) => b.setAttribute('aria-current', b.dataset.go === id ? 'true' : 'false'));
  ui.querySelectorAll('.panel').forEach((p) => {
    const on = p.dataset.id === id;
    p.classList.toggle('is-active', on);
    p.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    if (on && changed) p.scrollTop = 0;
  });
  document.body.classList.toggle('in-section', id !== 'intro');
  if (id === 'gallery') loadInstagram();
  if (!fromHash && !silent && !PREVIEW) {
    try { history.replaceState(null, '', location.pathname + location.search + (id === 'intro' ? '' : '#' + id)); } catch (e) { /* ignore */ }
  }
}

/* pointer: parallax on move, scrub the turntable on drag */
function seek(tm) {
  if (video.seeking) { pendingSeek = tm; return; }
  try { video.currentTime = tm; } catch (e) { /* ignore */ }
}
video.addEventListener('seeked', () => {
  if (pendingSeek !== null) { const tm = pendingSeek; pendingSeek = null; try { video.currentTime = tm; } catch (e) { /* ignore */ } }
});
window.addEventListener('pointermove', (e) => {
  if (drag) {
    const dur = video.duration || 20;
    const perPx = dur / Math.max(300, stone.offsetWidth * 2.4);
    let tm = drag.t + (e.clientX - drag.x) * perPx;
    tm = ((tm % dur) + dur) % dur;
    seek(tm);
    document.body.classList.add('dragged');
    return;
  }
  if (e.pointerType === 'mouse') {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
    wake();
  }
});
stage.addEventListener('pointerdown', (e) => {
  if (!started) return;
  drag = { x: e.clientX, t: video.currentTime || 0 };
  wasPlaying = !video.paused;
  video.pause();
  stage.classList.add('dragging');
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  stage.classList.remove('dragging');
  if (wasPlaying && !reduce) playVideo();
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

function playVideo() { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }

const sources = (() => {
  const st = cfg.media.stone;
  const c = navigator.connection || {};
  const slow = !!c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
  const list = [];
  if (video.canPlayType('video/mp4; codecs="avc1.64001F"')) list.push(safeUrl(slow && st.mp4Small ? st.mp4Small : st.mp4));
  if (st.webm && video.canPlayType('video/webm; codecs="vp9"')) list.push(safeUrl(st.webm));
  if (!list.length) list.push(safeUrl(st.mp4));
  return list.filter(Boolean);
})();
let srcIndex = 0;
video.muted = true;
video.addEventListener('loadeddata', () => poster.classList.add('hide'));
video.addEventListener('error', () => {
  if (++srcIndex < sources.length) { video.src = sources[srcIndex]; if (started && !reduce) playVideo(); return; }
  video.hidden = true; poster.classList.remove('hide');
});
if (sources.length) video.src = sources[0];

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
  if (k) k.textContent = isOn ? S('nowPlaying') : S('soundOff');
  if (v) v.textContent = t(cfg.audio.title, lang);
}
function setSound(want) { audio.set(want); syncSound(); wake(); }

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
  ovState = state;
  $('.ov-close', overlay).focus({ preventScroll: true });
}
function closeOverlay() {
  if (overlay.hidden) return;
  overlay.hidden = true;
  overlay.innerHTML = '';
  ui.removeAttribute('inert');
  ovState = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
function openVideo(id, title) {
  const src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
  const wasOn = audio.on;
  if (wasOn) setSound(false);
  openOverlay('<div class="ov-frame"><iframe src="' + src + '" title="' + (title || 'YouTube').replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>', { kind: 'video', resume: wasOn });
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
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
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
  if (!el) { if (e.target === overlay) closeOverlay(); return; }
  if (el.id === 'startSound') return enter(true);
  if (el.id === 'startQuiet') return enter(false);
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
  if (el.dataset.yt) return openVideo(el.dataset.yt, el.dataset.title);
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
  const ids = enabledSections(cfg).map((s) => s.id);
  const i = ids.indexOf(current);
  if (e.key === 'ArrowRight' && i < ids.length - 1) go(ids[i + 1]);
  else if (e.key === 'ArrowLeft' && i > 0) go(ids[i - 1]);
  else if (e.key === 'Escape') go('intro');
});

/* ---------------- boot ---------------- */

function enter(withSound) {
  const gate = $('#gate');
  if (gate) {
    gate.classList.add('gone');
    gate.setAttribute('aria-hidden', 'true');
    gate.setAttribute('inert', '');
  }
  if (withSound) setSound(true);
  started = true;
  stage.classList.add('lit');
  if (!reduce) playVideo();
  wake();
  const h = (location.hash || '').slice(1);
  if (!PREVIEW && h && h !== 'intro' && enabledSections(cfg).some((s) => s.id === h)) setTimeout(() => go(h, { fromHash: true }), 900);
}

function showGate() {
  gateRoot.innerHTML = renderGate(cfg, lang);
}

if (lang !== document.documentElement.lang) renderAll();
else {
  const banner = $('.banner', ui);
  if (banner && store.get('ay-banner-x') === banner.dataset.key) banner.classList.add('gone');
  go('intro', { silent: true });
}

if (PREVIEW) {
  enter(false);
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'ay:config') return;
    const prevLogo = cfg.media.logo.src;
    const prevAudio = cfg.audio.src;
    cfg = normalize(e.data.cfg);
    if (e.data.lang === 'tr' || e.data.lang === 'en') lang = e.data.lang;
    applyTheme();
    if (cfg.media.logo.src !== prevLogo) logoFx && logoFx.load(safeUrl(cfg.media.logo.src, { allowBlob: true }));
    if (cfg.audio.src !== prevAudio) { audio.reset(); }
    const focus = e.data.focus;
    if (focus === 'gate') { showGate(); }
    else {
      const gate = $('#gate');
      if (gate && !gate.classList.contains('gone')) { gate.classList.add('gone'); gate.setAttribute('inert', ''); }
    }
    if (focus && focus !== 'gate' && enabledSections(cfg).some((s) => s.id === focus)) current = focus;
    renderAll();
    if (logoFx) logoFx.refresh();
  });
  window.parent.postMessage({ type: 'ay:ready' }, location.origin);
}
