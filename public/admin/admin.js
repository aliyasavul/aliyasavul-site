// Site panel for aliyasavul.com.
// Everything editable lives in content/site.json. The panel loads it from GitHub, edits a
// draft with a live preview, and publishes the draft (plus any new files) as one commit;
// Cloudflare rebuilds the site from that commit within about a minute.
import { normalize, clone, FONT_CATALOG, PRESETS, COLOR_KEYS, DEFAULTS, STONE_PRESETS, ROLES, youtubeId, spotifyRef, t, themeForDate } from '/js/render.js';

/* ======================= small helpers ======================= */

const $ = (s, r = document) => r.querySelector(s);
const bi = (tr = '', en = '') => ({ tr, en });

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  if (value !== undefined) el.value = value;
  return el;
}

const ICONS = {
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  desk: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-11"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'i');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name];
  return s;
}

let toastTimer = 0;
// `action` adds a button to the message, for example { label: 'Geri al', fn }
function toast(msg, { error = false, ms = 3600, action = null } = {}) {
  const el = $('#toast');
  el.textContent = msg;
  if (action) el.append(h('button', { type: 'button', class: 'toast-act', onclick: () => { el.classList.remove('show'); action.fn(); } }, action.label));
  el.classList.toggle('err', error);
  el.classList.toggle('has-act', !!action);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// A small modal. Resolves to true / false, or to the typed text (possibly '') when `input` is given.
function dialog({ title, body, ok = 'Tamam', cancel = 'Vazgeç', danger = false, input = null, extra = null }) {
  return new Promise((resolve) => {
    const d = h('dialog');
    const inp = input ? h('input', { type: 'text', placeholder: input.placeholder || '', value: input.value || '', maxlength: 120 }) : null;
    const done = (v) => { d.close(); d.remove(); resolve(v); };
    const form = h('form', { method: 'dialog' },
      h('h2', { text: title }),
      body ? (typeof body === 'string' ? h('p', { text: body }) : body) : null,
      inp ? h('label', { class: 'f' }, h('span', { class: 'f-l', text: input.label }), inp) : null,
      extra,
      h('div', { class: 'actions' },
        cancel ? h('button', { type: 'button', class: 'btn ghost', onclick: () => done(false) }, cancel) : null,
        h('button', { type: 'submit', class: 'btn ' + (danger ? 'danger' : 'primary') }, ok)));
    form.addEventListener('submit', (e) => { e.preventDefault(); done(inp ? inp.value.trim() : true); });
    d.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    d.append(form);
    document.body.append(d);
    d.showModal();
    (inp || form.querySelector('[type="submit"]')).focus();
  });
}

const ls = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ======================= server ======================= */

class ApiError extends Error { constructor(status, msg) { super(msg || 'HTTP ' + status); this.status = status; } }
class UserError extends Error {}
class Cancelled extends Error {}

async function api(path, { method = 'GET', body, accept, text = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-AY': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accept ? { Accept: accept } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) { throw new ApiError(0, 'network'); }
  if (res.status === 401) { onSessionLost(); throw new ApiError(401, 'unauthorized'); }
  if (!res.ok) {
    let m = '';
    try { const j = await res.json(); m = j.message || j.error || ''; } catch (e) { /* ignore */ }
    throw new ApiError(res.status, m);
  }
  return text ? res.text() : res.json();
}
const gh = (path, opts) => api('/api/gh/' + path, opts);
const RAW = 'application/vnd.github.raw+json';

function errorText(e) {
  if (e instanceof UserError) return e.message;
  const s = e && e.status;
  if (s === 0) return 'İnternet bağlantısı yok gibi görünüyor. Bağlantını kontrol edip tekrar dene.';
  if (s === 401) return 'Oturumun kapanmış. Tekrar giriş yapman gerekiyor.';
  if (s === 403) return 'Bu işlem için yetki yok.';
  if (s === 409 || s === 422) return 'Aynı anda başka bir değişiklik oldu. Sayfayı yenileyip tekrar dene.';
  if (s === 413) return 'Dosya çok büyük.';
  return 'Bir hata oldu' + (s ? ' (' + s + ')' : '') + '. Biraz sonra tekrar dene.';
}

/* ======================= state ======================= */

const S = {
  user: null, published: null, baseSha: '', draft: null, uploads: new Map(),
  tab: 'design', pvLang: 'tr', device: window.matchMedia('(max-width: 900px)').matches ? 'phone' : 'desktop',
  pvReady: false, publishing: false, lost: false,
};
const DRAFT_KEY = 'ay-admin-draft-v1';

function step(obj, key) {
  if (obj == null) return undefined;
  if (key[0] === '@') return Array.isArray(obj) ? obj.find((x) => x && x.id === key.slice(1)) : undefined;
  return obj[key];
}
function get(path) { return path.split('.').reduce(step, S.draft); }
function set(path, value, opts) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce(step, S.draft);
  if (parent == null) return;
  parent[last] = value;
  changed(opts);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isDirty = () => !!S.draft && !same(S.draft, S.published);

let pvTimer = 0, draftTimer = 0;
function changed({ rerender = false } = {}) {
  updateStatus();
  if (!rerender) refreshResets();
  clearTimeout(pvTimer); pvTimer = setTimeout(() => postPreview(), 90);
  clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 700);
  if (rerender) renderTab();
}

function saveDraft() {
  if (!S.draft) return;
  if (!isDirty()) { ls.del(DRAFT_KEY); return; }
  const pending = [...S.uploads.entries()].filter(([, u]) => !u.committed).map(([p]) => p);
  ls.set(DRAFT_KEY, JSON.stringify({ base: S.baseSha, at: Date.now(), cfg: S.draft, pending }));
}

/* ======================= files ======================= */

const MAX_FILE = 24 * 1024 * 1024;
const TR_CHARS = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function slug(name) {
  return String(name || 'dosya').replace(/\.[^.]+$/, '').replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR_CHARS[c])
    .toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'dosya';
}
async function hash8(blob) {
  const d = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function addUpload(blob, kind, name, ext) {
  const path = '/uploads/' + kind + '-' + slug(name) + '-' + (await hash8(blob)) + '.' + ext;
  if (!S.uploads.has(path)) S.uploads.set(path, { blob, url: URL.createObjectURL(blob), committed: false });
  return path;
}
function checkSize(file) {
  if (file.size > MAX_FILE) throw new UserError('Bu dosya çok büyük (' + (file.size / 1048576).toFixed(1) + ' MB). En fazla 24 MB olabilir.');
}
const extOf = (type) => ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg' }[type] || 'bin');
function canvasBlob(c, type, q) { return new Promise((res) => c.toBlob(res, type, q)); }
async function encode(c, prefer, q, fallback) {
  let b = await canvasBlob(c, prefer, q);
  if (!b || b.type !== prefer) b = await canvasBlob(c, fallback, q);
  if (!b) throw new UserError('Görsel işlenemedi.');
  return b;
}
async function decode(file) {
  try { return await createImageBitmap(file); } catch (e) { /* try the slower path */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch (e) {
    throw new UserError('Bu görsel açılamadı. JPG, PNG ya da WebP olarak tekrar dene.');
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
const dims = (src) => ({ w: src.naturalWidth || src.width, h: src.naturalHeight || src.height });
async function resized(src, maxSide, prefer, q, fallback) {
  const { w, h: ht } = dims(src);
  const k = Math.min(1, maxSide / Math.max(w, ht));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(ht * k));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return { blob: await encode(c, prefer, q, fallback), width: c.width, height: c.height };
}
async function uploadPhoto(file) {
  checkSize(file);
  const img = await decode(file);
  const big = await resized(img, 2000, 'image/webp', 0.84, 'image/jpeg');
  const small = await resized(img, 640, 'image/webp', 0.8, 'image/jpeg');
  return {
    src: await addUpload(big.blob, 'foto', file.name, extOf(big.blob.type)),
    thumb: await addUpload(small.blob, 'foto-kucuk', file.name, extOf(small.blob.type)),
  };
}
async function uploadShare(file) {
  checkSize(file);
  const img = await decode(file);
  const { w, h: ht } = dims(img);
  const W = 1200, H = 630;
  const k = Math.max(W / w, H / ht);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - w * k) / 2, (H - ht * k) / 2, w * k, ht * k);
  const blob = await encode(c, 'image/jpeg', 0.86, 'image/jpeg');
  return addUpload(blob, 'paylasim', file.name, 'jpg');
}
async function uploadLogo(file) {
  checkSize(file);
  if (!/^image\/(png|webp|svg\+xml)$/.test(file.type)) throw new UserError('Logo, arka planı şeffaf bir PNG, WebP ya da SVG olmalı.');
  const img = await decode(file);
  let { w, h: ht } = dims(img);
  if (file.type !== 'image/svg+xml') {
    const c = document.createElement('canvas');
    c.width = 96; c.height = Math.max(1, Math.round(96 * ht / w));
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 200) clear++;
    if (clear < (d.length / 4) * 0.05) throw new UserError('Bu logonun arka planı şeffaf değil; sitede düz bir dikdörtgen gibi görünür. Arka planı silinmiş bir PNG yükle.');
  }
  let blob = file, ext = extOf(file.type);
  if (file.type !== 'image/svg+xml' && (file.size > 1500000 || Math.max(w, ht) > 2400)) {
    const r = await resized(img, 2400, 'image/webp', 0.92, 'image/png');
    blob = r.blob; ext = extOf(blob.type); w = r.width; ht = r.height;
  }
  return { src: await addUpload(blob, 'logo', file.name, ext), width: Math.round(w) || 1926, height: Math.round(ht) || 816 };
}
async function uploadAudio(file) {
  checkSize(file);
  const m = file.name.match(/\.([a-z0-9]{2,4})$/i);
  const ext = (m ? m[1] : 'mp3').toLowerCase();
  if (!/^audio\//.test(file.type) && !['mp3', 'm4a', 'aac', 'ogg', 'wav'].includes(ext)) throw new UserError('Ses dosyası MP3, M4A, OGG ya da WAV olmalı.');
  if (file.size > 10 * 1048576) toast('Dosya büyük; sitenin hızlı açılması için MP3 öneririm.', { ms: 5000 });
  return addUpload(file, 'riff', file.name, ext);
}
const previewSrc = (v) => (S.uploads.has(v) ? S.uploads.get(v).url : v || '');
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
function mapDeep(v, fn) {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapDeep(x, fn));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = mapDeep(v[k], fn); return o; }
  return v;
}
function pendingUsed(cfg) {
  const out = new Set();
  mapDeep(cfg, (s) => { const u = S.uploads.get(s); if (u && !u.committed) out.add(s); return s; });
  return [...out];
}

/* ======================= fields ======================= */

let uid = 0;
const nid = () => 'f' + (++uid);
const lbl = (id, text, extra) => h('label', { class: 'f-l', for: id }, text, extra || null);
const help = (text) => (text ? h('div', { class: 'f-h', text }) : null);
function group(title, gh_, ...kids) {
  return h('section', { class: 'group' }, title ? h('h3', { text: title }) : null, gh_ ? h('p', { class: 'gh', text: gh_ }) : null, ...kids);
}
// a group with a small button next to its title (an "İlk haline döndür" button)
function groupA(title, gh_, action, ...kids) {
  return h('section', { class: 'group' }, h('div', { class: 'g-top' }, h('h3', { text: title }), action), gh_ ? h('p', { class: 'gh', text: gh_ }) : null, ...kids);
}

function fText(path, label, { type = 'text', placeholder = '', hint = '', onCommit, inputmode } = {}) {
  const id = nid();
  const inp = h('input', { id, type, placeholder, inputmode, autocomplete: 'off', spellcheck: type === 'text' ? 'true' : 'false', value: get(path) ?? '' });
  inp.addEventListener('input', () => set(path, inp.value));
  if (onCommit) inp.addEventListener('change', () => onCommit(inp.value));
  return h('div', { class: 'f' }, lbl(id, label), inp, help(hint));
}

function fBi(path, label, { multiline = false, hint = '', rows = 4, max = 0, placeholder } = {}) {
  const box = h('div', { class: 'bi' });
  let first = '';
  for (const lg of ['tr', 'en']) {
    const id = nid();
    if (!first) first = id;
    const common = { id, placeholder: placeholder ? placeholder[lg] : '', 'aria-label': label + (lg === 'tr' ? ' (Türkçe)' : ' (İngilizce)'), lang: lg, value: get(path + '.' + lg) ?? '' };
    const ctl = multiline ? h('textarea', { ...common, rows }) : h('input', { ...common, type: 'text', autocomplete: 'off' });
    const counter = max ? h('div', { class: 'count' }) : null;
    const count = () => { if (counter) { counter.textContent = ctl.value.length + ' / ' + max; counter.classList.toggle('over', ctl.value.length > max); } };
    ctl.addEventListener('input', () => { set(path + '.' + lg, ctl.value); count(); });
    count();
    box.append(h('div', { class: 'lng' }, h('span', { text: lg.toUpperCase() }), ctl, counter));
  }
  return h('div', { class: 'f' }, lbl(first, label), box, help(hint));
}

function fToggle(path, label, hint, { rerender = false } = {}) {
  const inp = h('input', { type: 'checkbox', checked: !!get(path) });
  inp.addEventListener('change', () => set(path, inp.checked, { rerender }));
  return h('label', { class: 'switch' }, h('span', null, h('b', { text: label }), hint ? h('small', { text: hint }) : null), inp, h('span', { class: 'track', 'aria-hidden': 'true' }));
}

function fSelect(path, label, options, { hint = '', rerender = false } = {}) {
  const id = nid();
  const sel = h('select', { id }, options.map((o) => h('option', { value: o.value, text: o.label })));
  sel.value = get(path) ?? '';
  sel.addEventListener('change', () => set(path, sel.value, { rerender }));
  return h('div', { class: 'f' }, lbl(id, label), sel, help(hint));
}

function fRange(path, label, { min = 0, max = 100, step: st = 1, hint = '', fmt = (v) => String(v) } = {}) {
  const id = nid();
  const v0 = Number(get(path)) || 0;
  const inp = h('input', { id, type: 'range', min, max, step: st, value: v0 });
  const out = h('output', { for: id, text: fmt(v0) });
  inp.addEventListener('input', () => { const v = Number(inp.value); out.textContent = fmt(v); set(path, v); });
  return h('div', { class: 'f' }, lbl(id, label), h('div', { class: 'range' }, inp, out), help(hint));
}

function fColor(path, label, hint) {
  const id = nid();
  const v = get(path) || '#000000';
  const pick = h('input', { id, type: 'color', value: v });
  const hex = h('input', { type: 'text', value: v, maxlength: 7, spellcheck: 'false', autocomplete: 'off', 'aria-label': label + ' renk kodu' });
  const apply = (val) => { S.draft.theme.preset = 'custom'; set(path, val.toLowerCase()); };
  pick.addEventListener('input', () => { hex.value = pick.value; apply(pick.value); });
  hex.addEventListener('input', () => { const s = hex.value.trim(); if (/^#[0-9a-f]{6}$/i.test(s)) { pick.value = s.toLowerCase(); apply(s); } });
  return h('div', { class: 'f' }, lbl(id, label), h('div', { class: 'color' }, pick, hex), help(hint));
}

const loadedFonts = new Set();
function loadAdminFont(name) {
  if (loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const entry = [...FONT_CATALOG.display, ...FONT_CATALOG.body, ...FONT_CATALOG.mono].find((f) => f.name === name);
  const ws = entry ? entry.weights : [400];
  const fam = name.trim().replace(/ +/g, '+') + (ws.length > 1 || ws[0] !== 400 ? ':wght@' + ws.join(';') : '');
  document.head.append(h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=' + fam + '&display=swap' }));
}
function fFont(role, label, hint) {
  const path = 'theme.fonts.' + role;
  const cur = get(path);
  const known = FONT_CATALOG[role].some((f) => f.name === cur);
  const id = nid();
  const sel = h('select', { id }, FONT_CATALOG[role].map((f) => h('option', { value: f.name, text: f.name })), h('option', { value: '__custom', text: 'Başka bir Google yazı tipi…' }));
  sel.value = known ? cur : '__custom';
  const custom = h('input', { type: 'text', placeholder: 'Google Fonts’taki adı, örneğin: Rubik', value: known ? '' : cur, hidden: known, 'aria-label': label + ' (özel yazı tipi adı)' });
  const sample = h('div', { class: 'font-sample', text: role === 'mono' ? '23 MA · Miyosen · 0123456789' : 'Ali Yasavul · Gitar dersleri · ĞÜŞİÖÇ ğüşıöç' });
  const show = (name) => {
    loadAdminFont(name);
    sample.style.fontFamily = "'" + name + "', sans-serif";
    sample.style.fontWeight = role === 'display' ? '600' : '400';
    sample.style.textTransform = role === 'display' ? 'uppercase' : 'none';
    sample.style.letterSpacing = role === 'display' ? '0.06em' : 'normal';
  };
  sel.addEventListener('change', () => {
    if (sel.value === '__custom') { custom.hidden = false; custom.focus(); return; }
    custom.hidden = true;
    set(path, sel.value);
    show(sel.value);
  });
  custom.addEventListener('change', () => {
    const v = custom.value.trim();
    if (!/^[A-Za-z0-9 ]{1,40}$/.test(v)) { toast('Yazı tipi adı sadece harf, rakam ve boşluk içerebilir.', { error: true }); return; }
    set(path, v);
    show(v);
  });
  show(cur);
  return h('div', { class: 'f' }, lbl(id, label), sel, custom, sample, help(hint));
}

async function withBusy(label, fn) {
  toast(label, { ms: 60000 });
  try {
    const r = await fn();
    return r;
  } catch (e) {
    toast(errorText(e), { error: true, ms: 7000 });
    return undefined;
  }
}

function fileButton(text, accept, multiple, onFiles, iconName = 'img') {
  const input = h('input', { type: 'file', accept, multiple, hidden: true });
  input.addEventListener('change', () => { const files = [...input.files]; input.value = ''; if (files.length) onFiles(files); });
  return [h('button', { type: 'button', class: 'btn small', onclick: () => input.click() }, icon(iconName), text), input];
}

// `adds` puts several add buttons under the list, each with its own kind of new item
function listEditor({ path, itemTitle, fields, newItem, addLabel, empty, off, adds }) {
  const arr = get(path) || [];
  const wrap = h('div', { class: 'list' });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; changed({ rerender: true }); };
  const drop = async (i) => {
    const ok = await dialog({ title: 'Silinsin mi?', body: '“' + (itemTitle(arr[i], i) || 'Bu öğe') + '” listeden çıkarılacak. Yayınlamadan önce “Değişiklikleri at” ile geri alabilirsin.', ok: 'Sil', danger: true });
    if (!ok) return;
    arr.splice(i, 1);
    changed({ rerender: true });
  };
  arr.forEach((item, i) => {
    wrap.append(h('div', { class: 'card' + (off && off(item) ? ' off' : '') },
      h('div', { class: 'card-h' },
        h('b', { text: itemTitle(item, i) || '—' }),
        h('div', { class: 'tools' },
          h('button', { type: 'button', class: 'icon-btn', title: 'Yukarı taşı', 'aria-label': 'Yukarı taşı', disabled: i === 0, onclick: () => move(i, -1) }, icon('up')),
          h('button', { type: 'button', class: 'icon-btn', title: 'Aşağı taşı', 'aria-label': 'Aşağı taşı', disabled: i === arr.length - 1, onclick: () => move(i, 1) }, icon('down')),
          h('button', { type: 'button', class: 'icon-btn danger', title: 'Sil', 'aria-label': 'Sil', onclick: () => drop(i) }, icon('trash')))),
      h('div', { class: 'card-b' }, fields(path + '.' + i, item, i))));
  });
  if (!arr.length && empty) wrap.append(h('p', { class: 'empty', text: empty }));
  if (newItem) wrap.append(h('button', { type: 'button', class: 'btn small add', onclick: () => { arr.push(newItem()); changed({ rerender: true }); } }, icon('plus'), addLabel));
  if (adds) wrap.append(h('div', { class: 'row adds' }, adds.map((a) => h('button', { type: 'button', class: 'btn small add', onclick: () => { arr.push(a.newItem()); changed({ rerender: true }); } }, icon('plus'), a.label))));
  return wrap;
}

/* ---- rows of his own: on the start screen under the logo's line, and at the end of every section ---- */

const EXTRA_KINDS = [
  { value: 'text', label: 'Yazı satırı' },
  { value: 'small', label: 'Küçük açıklama' },
  { value: 'heading', label: 'Ara başlık' },
  { value: 'pair', label: 'İki sütunlu satır' },
  { value: 'button', label: 'Düğme' },
];
const newExtra = (kind) => () => ({ kind, text: bi(), value: bi(), url: '', target: 'link', style: 'ghost' });
function extraFields(ip, item) {
  const out = [fSelect(ip + '.kind', 'Türü', EXTRA_KINDS, { rerender: true })];
  if (item.kind === 'pair') {
    out.push(fBi(ip + '.text', 'Sol taraf (etiket)'), fBi(ip + '.value', 'Sağ taraf (değer)'));
  } else if (item.kind === 'button') {
    out.push(fBi(ip + '.text', 'Düğme yazısı'),
      fSelect(ip + '.target', 'Tıklayınca', [{ value: 'link', label: 'Bir linke git' }, ...targetOptions()], { rerender: true }));
    if (!item.target || item.target === 'link') out.push(fText(ip + '.url', 'Link', { type: 'url', placeholder: 'https://', hint: 'Başka bir siteye giden linkler yeni sekmede açılır.' }));
    out.push(fSelect(ip + '.style', 'Görünümü', [{ value: 'ghost', label: 'Çerçeveli' }, { value: 'solid', label: 'Dolu (vurgu renginde)' }]));
  } else {
    out.push(fBi(ip + '.text', item.kind === 'heading' ? 'Başlık' : 'Yazı', item.kind === 'heading' ? {} : { multiline: true, rows: 2, hint: 'Bir kelimeyi kalın yazmak için **iki yıldız** arasına al.' }));
  }
  return out;
}
const extraTitle = (it) => {
  const kind = (EXTRA_KINDS.find((k) => k.value === it.kind) || { label: 'Satır' }).label;
  const text = t(it.text, 'tr');
  return text ? kind + ': ' + text : kind;
};
function extrasGroup(path, title, hint) {
  return group(title, hint, listEditor({
    path, itemTitle: extraTitle, fields: extraFields, empty: 'Henüz eklenmiş satır yok.',
    adds: [{ label: 'Satır ekle', newItem: newExtra('text') }, { label: 'Düğme ekle', newItem: newExtra('button') }],
  }));
}
const SECTION_EXTRAS_HINT = 'Bölümün en altına kendi satırlarını ve düğmelerini ekle. Türünü seçebilirsin: yazı, küçük açıklama, ara başlık, iki sütunlu satır ya da bir linke veya bölüme giden düğme. Sırasını oklarla değiştirirsin.';
const sectionExtras = (p) => extrasGroup(p + '.extras', 'Ek satırlar ve düğmeler', SECTION_EXTRAS_HINT);

/* ======================= labels ======================= */

const COLOR_LABELS = {
  background: ['Arka plan', 'Bütün sitenin zemini'],
  text: ['Ana yazı', 'Başlıklar ve metinler'],
  muted: ['İkincil yazı', 'Etiketler ve küçük yazılar'],
  accent: ['Vurgu rengi', 'Butonlar, zaman çizelgesindeki ışık, tarih yazıları'],
  accentText: ['Vurgulu buton yazısı', 'Renkli butonların üstündeki yazı'],
  line: ['Çizgiler', 'Ayırıcı çizgiler ve çerçeveler (şeffaf kullanılır)'],
  panel: ['Telefonda panel zemini', 'Telefonda yazıların arkasındaki koyu kutu'],
  bannerBackground: ['Duyuru bandı zemini', ''],
  bannerText: ['Duyuru bandı yazısı', ''],
  logo: ['Logo rengi', 'Logo tek renk gösterilir'],
  glow: ['Taşın ışıltısı', 'Kehribarın etrafındaki parlama'],
  timeline: ['Zaman çizelgesindeki ışık', 'Üstteki çizgide bölümler arasında ilerleyen ışık'],
};
const PRESET_NAMES = { amber: 'Kehribar', bone: 'Kemik', blood: 'Kan', ash: 'Kül', toxic: 'Zehir' };
const STONE_NAMES = { natural: 'Doğal', honey: 'Bal', cherry: 'Kiraz', cognac: 'Konyak', lemon: 'Limon', green: 'Yeşil kehribar' };
const STRING_LABELS = {
  soundOff: 'Alt köşe: ses kapalıyken', nowPlaying: 'Alt köşe: ses açıkken / şarkı çalarken', paused: 'Alt köşe: şarkı duraklatılınca', recording: 'Alt köşe: kendi kaydın çalarken', player: 'Alt köşedeki çalan şarkı (sesli okuyucu)', soundOn: 'Ses düğmesi: aç', soundMute: 'Ses düğmesi: kapat',
  dragHint: 'Alttaki ipucu (bilgisayar)', scrollHint: 'Kaydır ipucu (telefon)', copy: 'Kopyala düğmesi', copied: 'Kopyalandı mesajı', selected: 'Seçildi mesajı', email: 'E-posta etiketi',
  whatsapp: 'WhatsApp düğmesi', watch: 'Video izle etiketi', listen: 'Şarkı dinle etiketi (sesli okuyucu)', onSpotify: 'Spotify listesinin başlığı', recordings: 'Kayıtlar listesinin başlığı', play: 'Çal düğmesi (sesli okuyucu)', pause: 'Duraklat düğmesi (sesli okuyucu)', seek: 'Şarkıda ilerleme çubuğu (sesli okuyucu)', close: 'Kapat', prev: 'Önceki', next: 'Sonraki',
  backToStart: 'Logo düğmesi (sesli okuyucu)', sections: 'Menü açıklaması (sesli okuyucu)', stoneLabel: 'Taş videosu açıklaması (sesli okuyucu)',
  language: 'Dil', switchTo: 'Dil düğmesi açıklaması', instagram: 'Instagram başlığı', dismiss: 'Duyuruyu kapat (sesli okuyucu)',
};
const SECTION_NAMES = { about: 'Hakkımda', lessons: 'Dersler', work: 'Portfolyo', gallery: 'Galeri', contact: 'İletişim' };

function targetOptions() {
  return [
    { value: 'lessons', label: 'Dersler bölümüne git' },
    { value: 'contact', label: 'İletişim bölümüne git' },
    { value: 'about', label: 'Hakkımda bölümüne git' },
    { value: 'work', label: 'Portfolyo bölümüne git' },
    { value: 'gallery', label: 'Galeri bölümüne git' },
    { value: 'booking', label: 'Takvim (randevu) linkini aç' },
    { value: 'whatsapp', label: 'WhatsApp’ta mesaj aç' },
  ];
}

/* ======================= back to how it was first published ======================= */

// The site as it was first published. Every "İlk haline döndür" puts values back from here.
const ORIGINAL = normalize({});
const getIn = (obj, path) => path.split('.').reduce(step, obj);
function setIn(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce(step, obj);
  if (parent != null) parent[last] = value;
}
const MENU_KEYS = ['enabled', 'nav', 'stamp', 'era'];
const contentPaths = (id) => Object.keys(DEFAULTS.sections.find((s) => s.id === id) || {}).filter((k) => k !== 'id' && !MENU_KEYS.includes(k)).map((k) => 'sections.@' + id + '.' + k);
const RESETS = [
  { id: 'colors', look: true, label: 'Renkler', hint: 'Bütün renkler ilk tema olan “Kehribar”a döner.', paths: ['theme.colors', 'theme.preset'] },
  { id: 'stone', look: true, label: 'Taşın rengi', hint: 'Doğal kehribar rengi.', paths: ['theme.stone'] },
  { id: 'fonts', look: true, label: 'Yazı tipleri', paths: ['theme.fonts'] },
  { id: 'effects', look: true, label: 'Efektler', hint: 'Logo glitch, ışıltı, kameranın dönüşü ve mouse ile kayma.', paths: ['theme.effects'] },
  { id: 'sound', look: true, label: 'Ses seviyesi ve parça adı', hint: 'Yüklediğin riff silinmez.', paths: ['audio.volume', 'audio.title'] },
  { id: 'logo', look: true, label: 'Logo', hint: 'İlk logo geri gelir.', paths: ['media.logo'] },
  { id: 'gate', label: 'Giriş ekranı ve sağ üst düğme', paths: ['gate', 'header'] },
  {
    id: 'menu', label: 'Menü ve bölümler', hint: 'Bölümlerin sırası, görünürlüğü, menüdeki adları ve rakamları. Bölümlerin içerikleri değişmez.',
    pick: (d) => ({ intro: d.intro, list: d.sections.map((s) => [s.id, ...MENU_KEYS.map((k) => s[k])]) }),
    apply: (d) => {
      d.intro = clone(ORIGINAL.intro);
      const byId = new Map(d.sections.map((s) => [s.id, s]));
      d.sections = ORIGINAL.sections.map((o) => { const s = byId.get(o.id) || clone(o); for (const k of MENU_KEYS) s[k] = clone(o[k]); return s; });
    },
  },
  { id: 'about', label: 'Hakkımda', hint: 'Başlık, yazı ve bilgi satırları örnek haline döner.', paths: contentPaths('about') },
  { id: 'lessons', label: 'Dersler', hint: 'Paketler ve fiyatlar da örnek haline döner.', paths: contentPaths('lessons') },
  { id: 'work', label: 'Portfolyo', hint: 'Eklediğin YouTube videoları, kayıtlar ve Spotify şarkıları listeden çıkar.', paths: contentPaths('work') },
  { id: 'gallery', label: 'Galeri ve Instagram', hint: 'Eklediğin fotoğraflar listeden çıkar.', paths: contentPaths('gallery') },
  { id: 'contact', label: 'İletişim', hint: 'E-posta, WhatsApp, takvim ve sosyal medya linkleri.', paths: contentPaths('contact') },
  { id: 'banner', label: 'Duyuru bandı', paths: ['banner'] },
  { id: 'seo', label: 'Google ve paylaşım', paths: ['site.title', 'site.description', 'site.shareImage', 'site.defaultLang'] },
  { id: 'strings', label: 'Küçük yazılar', paths: ['strings'] },
];
const areaOf = (x) => (typeof x === 'string' ? RESETS.find((r) => r.id === x) || { paths: [x] } : x);
// compare only what the original has: leftovers from older versions of the site (like the old “Sessiz gir” text) do not count as a change
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const project = (v, o) => (isPlain(v) && isPlain(o) ? Object.fromEntries(Object.keys(o).map((k) => [k, project(v[k], o[k])])) : v);
const pickArea = (a, d) => (a.pick ? a.pick(d) : a.paths.map((p) => project(getIn(d, p), getIn(ORIGINAL, p))));
function applyArea(a, d) { if (a.apply) a.apply(d); else for (const p of a.paths) setIn(d, p, clone(getIn(ORIGINAL, p))); }
const atOriginal = (a) => same(pickArea(a, S.draft), pickArea(a, ORIGINAL));

// Puts areas (or single settings) back to how the site was first published, with an undo.
function resetToOriginal(list, what) {
  const before = clone(S.draft);
  for (const a of list) applyArea(a, S.draft);
  changed({ rerender: true });
  toast(what + ' ilk haline döndü. Yayınla’ya basana kadar sitede değişmez.', {
    ms: 9000, action: { label: 'Geri al', fn: () => { S.draft = before; changed({ rerender: true }); toast('Geri alındı.'); } },
  });
}
// reset buttons on the open tab follow the edits as they happen
let liveResets = [];
function refreshResets() { for (const paint of liveResets) paint(); }
// the small button beside a group title; shows "İlk halinde" when there is nothing to undo
function resetBtn(targets, what) {
  const list = [].concat(targets).map(areaOf);
  const btn = h('button', { type: 'button', class: 'btn small ghost reset', onclick: () => resetToOriginal(list, what) });
  const paint = () => {
    const done = list.every(atOriginal);
    btn.disabled = done;
    btn.title = done ? 'Bu ayarlar zaten en baştaki halinde' : 'En baştaki haline döndür';
    btn.replaceChildren(icon(done ? 'check' : 'undo'), done ? 'İlk halinde' : 'İlk haline döndür');
  };
  paint();
  liveResets.push(paint);
  return btn;
}

function hiddenNote(id) {
  const s = get('sections.@' + id);
  if (!s || s.enabled) return null;
  return h('p', { class: 'note warn' }, 'Bu bölüm şu an sitede gizli. ',
    h('button', { type: 'button', class: 'btn small', onclick: () => set('sections.@' + id + '.enabled', true, { rerender: true }) }, 'Göster'));
}

/* ======================= tabs ======================= */

function presetsBox() {
  const cur = get('theme.preset');
  return h('div', { class: 'presets' }, Object.keys(PRESETS).map((k) => {
    const p = PRESETS[k];
    return h('button', {
      type: 'button', class: 'preset', 'aria-pressed': cur === k ? 'true' : 'false',
      onclick: () => { S.draft.theme.colors = { ...p }; S.draft.theme.preset = k; changed({ rerender: true }); },
    }, h('span', { class: 'sw', 'aria-hidden': 'true' }, [p.background, p.accent, p.text, p.glow].map((c) => h('i', { style: 'background:' + c }))), h('span', { text: PRESET_NAMES[k] || k }));
  }));
}

const stoneFilter = (st) => 'hue-rotate(' + st.hue + 'deg) saturate(' + st.saturation / 100 + ') brightness(' + st.brightness / 100 + ')';
function stoneBox() {
  const st = get('theme.stone');
  const sample = (v) => h('i', { class: 'amber-sw', style: 'filter:' + stoneFilter(v), 'aria-hidden': 'true' });
  const pick = h('div', { class: 'presets' }, Object.keys(STONE_PRESETS).map((k) => h('button', {
    type: 'button', class: 'preset', 'aria-pressed': st.preset === k ? 'true' : 'false',
    onclick: () => { S.draft.theme.stone = { preset: k, ...STONE_PRESETS[k] }; changed({ rerender: true }); },
  }, sample(STONE_PRESETS[k]), h('span', { text: STONE_NAMES[k] || k }))));
  const custom = (path, label, opts) => {
    const el = fRange(path, label, opts);
    el.querySelector('input').addEventListener('input', () => { S.draft.theme.stone.preset = 'custom'; });
    return el;
  };
  return [pick,
    custom('theme.stone.hue', 'Renk tonu', { min: -60, max: 60, fmt: (v) => (v === 0 ? 'doğal' : v < 0 ? 'kırmızıya ' + -v : 'sarıya ' + v) }),
    custom('theme.stone.saturation', 'Renk canlılığı', { min: 40, max: 160, fmt: (v) => '%' + v }),
    custom('theme.stone.brightness', 'Parlaklık', { min: 70, max: 130, fmt: (v) => '%' + v })];
}

function tabDesign() {
  const look = ['colors', 'stone', 'fonts', 'effects'].map(areaOf);
  const all = h('button', {
    type: 'button', class: 'btn', onclick: async () => {
      if (!(await dialog({ title: 'Bütün görünüm ilk haline dönsün mü?', body: 'Renkler, taşın rengi, yazı tipleri ve efektler en baştaki haline döner. Yazıların ve fotoğrafların değişmez. Sonra “Geri al” ile vazgeçebilirsin.', ok: 'İlk haline döndür' }))) return;
      resetToOriginal(look, 'Bütün görünüm');
    },
  });
  const paintAll = () => {
    const done = look.every(atOriginal);
    all.disabled = done;
    all.replaceChildren(icon('undo'), done ? 'Görünüm zaten ilk halinde' : 'Bütün görünümü ilk haline döndür');
  };
  paintAll();
  liveResets.push(paintAll);
  return [
    group('Hazır renk temaları', 'Tek tıkla bütün renkleri değiştirir. Sonra tek tek renkleri de değiştirebilirsin. Sitenin ilk renkleri “Kehribar”.', presetsBox()),
    groupA('Renkler', 'Kutucuğa tıklayıp renk seç ya da renk kodunu yaz (örneğin #e9a14b).', resetBtn('colors', 'Renkler'),
      h('div', { class: 'colors' }, COLOR_KEYS.map((k) => fColor('theme.colors.' + k, COLOR_LABELS[k][0], COLOR_LABELS[k][1])))),
    groupA('Taşın rengi', 'Gerçek kehribar türlerinden biri seç ya da kaydırıcılarla ayarla. Taş her durumda doğal görünecek şekilde sınırlandı.', resetBtn('stone', 'Taşın rengi'), stoneBox()),
    groupA('Yazı tipleri', 'Google Fonts’tan gelir. Listedekilerin hepsi Türkçe karakterleri destekliyor.', resetBtn('fonts', 'Yazı tipleri'),
      fFont('display', 'Başlıklar, menü ve düğmeler'), fFont('body', 'Metinler'), fFont('mono', 'Küçük etiketler ve tarihler')),
    h('div', { class: 'row' }, all),
    h('p', { class: 'f-h', style: 'margin-top:10px', text: 'Yazılar ve diğer bölümler için “Diğer › İlk hale döndür” sekmesine bak.' }),
  ];
}

function audioBox() {
  const src = get('audio.src');
  const [btn, input] = fileButton(src ? 'Başka bir riff yükle' : 'Riff yükle (MP3)', 'audio/*,.mp3,.m4a,.ogg,.wav', false, (files) => withBusy('Ses dosyası hazırlanıyor…', async () => {
    const p = await uploadAudio(files[0]);
    set('audio.src', p, { rerender: true });
    if (!t(get('audio.title'), 'tr') || t(get('audio.title'), 'tr') === 'Ambiyans') set('audio.title', bi(files[0].name.replace(/\.[^.]+$/, ''), files[0].name.replace(/\.[^.]+$/, '')), { rerender: true });
    toast('Riff eklendi. Önizlemede ses düğmesiyle dinleyebilirsin.');
  }), 'music');
  return h('div', { class: 'f' },
    h('span', { class: 'f-l', text: 'Çalan ses' }),
    src ? h('audio', { controls: true, preload: 'none', src: previewSrc(src), style: 'width:100%' }) : h('p', { class: 'f-h', text: 'Şu an kendi riffin yok; alçak bir ambiyans sesi çalıyor.' }),
    h('div', { class: 'row' }, btn, input, src ? h('button', { type: 'button', class: 'btn small danger', onclick: () => set('audio.src', '', { rerender: true }) }, 'Riffi kaldır') : null));
}

function tabEffects() {
  return [
    groupA('Logo glitch', 'Mouse logonun üzerinde gezerken sadece o bölgede oluşan bozulma. Telefonda mouse olmadığı için görünmez. 0 yaparsan tamamen kapanır.',
      resetBtn('theme.effects.glitch', 'Logo glitch'),
      fRange('theme.effects.glitch', 'Şiddet', { fmt: (v) => (v === 0 ? 'Kapalı' : String(v)) })),
    groupA('Kehribar', null, resetBtn(['theme.effects.glow', 'theme.effects.spin', 'theme.effects.parallax'], 'Kehribar ayarları'),
      fRange('theme.effects.glow', 'Işıltı', { hint: 'Taşın etrafındaki parlama; ses açıkken müzikle birlikte nabız atar.' }),
      fRange('theme.effects.spin', 'Bölüm geçişlerinde kameranın taşın etrafında dönmesi', { fmt: (v) => (v === 0 ? 'Yok' : String(v)) }),
      fRange('theme.effects.parallax', 'Mouse ile hafif kayma', { fmt: (v) => (v === 0 ? 'Yok' : String(v)) })),
    groupA('Ses', 'Ziyaretçi “Başlamak için tıkla” deyince bu ses döngü halinde çalar.', resetBtn('sound', 'Ses ayarları'),
      audioBox(), fBi('audio.title', 'Alt köşede görünen parça adı'), fRange('audio.volume', 'Ses seviyesi', { fmt: (v) => '%' + v })),
  ];
}

function tabMedia() {
  const logo = get('media.logo');
  const [btn, input] = fileButton('Yeni logo yükle', 'image/png,image/webp,image/svg+xml', false, (files) => withBusy('Logo hazırlanıyor…', async () => {
    const r = await uploadLogo(files[0]);
    S.draft.media.logo = { src: r.src, width: r.width, height: r.height };
    changed({ rerender: true });
    toast('Logo değişti. Yayınla’ya basınca sitede görünür.');
  }));
  const preview = h('span', { class: 'logo mask', style: '-webkit-mask-image:url("' + previewSrc(logo.src) + '");mask-image:url("' + previewSrc(logo.src) + '");aspect-ratio:' + logo.width + ' / ' + logo.height + ';background:' + get('theme.colors.logo') });
  return [
    group('Logo', 'Arka planı şeffaf (PNG, WebP ya da SVG) bir logo yükle. Sitede tek renk gösterilir; rengini “Renk ve yazı tipi” sekmesinden seçersin.',
      h('div', { class: 'imgbox' }, h('div', { class: 'prev' }, preview), h('div', { class: 'row' }, btn, input,
        logo.src !== DEFAULTS.media.logo.src ? h('button', { type: 'button', class: 'btn small', onclick: () => { S.draft.media.logo = clone(DEFAULTS.media.logo); changed({ rerender: true }); } }, 'İlk logoya dön') : null))),
    group('Kehribar', null, h('p', { class: 'f-h', text: 'Kehribar 120 farklı açıdan özel olarak render edildi; site bunlarla taşı gerçek zamanlı 3D olarak çeviriyor. Farklı bir taş istersen bana yazman yeterli.' })),
  ];
}

function tabGate() {
  return [
    group('Giriş ekranı', 'Siteye girince ilk görünen ekran. Bu sekme açıkken önizlemede giriş ekranı görünür.',
      fBi('gate.tagline', 'Logonun altındaki satır'), fBi('gate.start', 'Ana düğme'), fBi('gate.note', 'Ses düğmesi: açıkken'), fBi('gate.noteOff', 'Ses düğmesi: kapalıyken', { hint: 'Ziyaretçi bu yazıya tıklayarak sesi açıp kapatır, sonra ana düğmeyle girer.' })),
    extrasGroup('gate.extras', 'Logonun altına ek satırlar', 'Logonun altındaki satırın altına istediğin kadar satır ekle: yeteneklerin, kısa bir açıklama, bir düğme… “Küçük açıklama” türü daha küçük ve sade yazılır.'),
    group('Sağ üstteki düğme', 'Her ekranda sağ üstte duran düğme.', fBi('header.cta.label', 'Düğme yazısı'), fSelect('header.cta.target', 'Tıklayınca', targetOptions())),
  ];
}

function tabSections() {
  const arr = S.draft.sections;
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; changed({ rerender: true }); };
  return [
    h('p', { class: 'note', text: 'Bölümleri gizleyebilir, sırasını değiştirebilir, menüdeki adını ve zaman çizelgesindeki rakamı düzenleyebilirsin. Sıra değişirse rakamları da sırayla büyüyecek şekilde ayarlamanı öneririm.' }),
    group('Giriş', 'Her zaman ilk sırada durur.', fBi('intro.nav', 'Menüdeki adı'), fText('intro.stamp', 'Zaman çizelgesindeki rakam'), fBi('intro.era', 'Üzerine gelince çıkan alt yazı')),
    h('div', { class: 'list' }, arr.map((s, i) => h('div', { class: 'card' + (s.enabled ? '' : ' off') },
      h('div', { class: 'card-h' },
        h('b', { text: (SECTION_NAMES[s.id] || s.id) + (s.enabled ? '' : ' · gizli') }),
        h('div', { class: 'tools' },
          h('button', { type: 'button', class: 'icon-btn', title: 'Yukarı taşı', 'aria-label': 'Yukarı taşı', disabled: i === 0, onclick: () => move(i, -1) }, icon('up')),
          h('button', { type: 'button', class: 'icon-btn', title: 'Aşağı taşı', 'aria-label': 'Aşağı taşı', disabled: i === arr.length - 1, onclick: () => move(i, 1) }, icon('down')))),
      h('div', { class: 'card-b' },
        fToggle('sections.' + i + '.enabled', 'Sitede göster', null, { rerender: true }),
        fBi('sections.' + i + '.nav', 'Menüdeki adı'),
        fText('sections.' + i + '.stamp', 'Zaman çizelgesindeki rakam'),
        fBi('sections.' + i + '.era', 'Tarih satırı', { hint: 'Panelde başlığın üstünde ve menüde üzerine gelince görünür. “ · ” ile iki parçaya ayırabilirsin.' }))))),
  ];
}

const factsList = (path, label, hint) => group(label, hint, listEditor({
  path, itemTitle: (it) => t(it.k, 'tr') || 'Yeni satır',
  fields: (ip) => [fBi(ip + '.k', 'Sol taraf (etiket)'), fBi(ip + '.v', 'Sağ taraf (değer)')],
  newItem: () => ({ k: bi(), v: bi() }), addLabel: 'Satır ekle', empty: 'Henüz satır yok.',
}));
const bodyHint = 'Boş bir satır bırakarak paragraf ayırabilirsin. Bir kelimeyi kalın yazmak için **iki yıldız** arasına al.';

function tabAbout() {
  const p = 'sections.@about';
  return [hiddenNote('about'),
    group('Başlık ve yazı', null, fBi(p + '.title', 'Başlık'), fBi(p + '.body', 'Yazı', { multiline: true, rows: 7, hint: bodyHint })),
    factsList(p + '.facts', 'Bilgi satırları', 'Yazının altında iki sütunlu satırlar (örneğin Enstrüman · Elektro gitar).'),
    sectionExtras(p)];
}

function tabLessons() {
  const p = 'sections.@lessons';
  return [hiddenNote('lessons'),
    group('Başlık ve yazı', null, fBi(p + '.title', 'Başlık'), fBi(p + '.body', 'Yazı', { multiline: true, rows: 5, hint: bodyHint })),
    factsList(p + '.facts', 'Bilgi satırları', 'Ders yeri, seviye gibi kısa bilgiler.'),
    group('Ders paketleri ve fiyatlar', 'Her paket ayrı bir kutu olarak görünür. Fiyatı boş bırakırsan sadece adı görünür.', listEditor({
      path: p + '.packages', itemTitle: (it) => t(it.name, 'tr') || 'Yeni paket',
      fields: (ip) => [fBi(ip + '.name', 'Paket adı'), fBi(ip + '.price', 'Fiyat', { placeholder: { tr: 'Örneğin: 1.500 TL', en: 'e.g. 1,500 TRY' } }), fBi(ip + '.details', 'Açıklama')],
      newItem: () => ({ name: bi(), price: bi(), details: bi() }), addLabel: 'Paket ekle', empty: 'Henüz paket yok.',
    })),
    group('Düğme', null, fBi(p + '.cta.label', 'Düğme yazısı'), fSelect(p + '.cta.target', 'Tıklayınca', targetOptions())),
    sectionExtras(p),
  ];
}

function videoFields(ip, item) {
  const id = youtubeId(item.url);
  const thumb = h('img', { class: 'thumb', alt: '', src: id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '' });
  if (!id) thumb.style.visibility = 'hidden';
  const fid = nid();
  const url = h('input', { id: fid, type: 'url', placeholder: 'https://www.youtube.com/watch?v=…', value: item.url || '', autocomplete: 'off' });
  url.addEventListener('input', () => {
    set(ip + '.url', url.value.trim());
    const v = youtubeId(url.value);
    thumb.style.visibility = v ? 'visible' : 'hidden';
    if (v) thumb.src = 'https://i.ytimg.com/vi/' + v + '/hqdefault.jpg';
  });
  url.addEventListener('change', async () => {
    const v = youtubeId(url.value);
    if (!url.value.trim()) return;
    if (!v) { toast('Bu bir YouTube video linki gibi görünmüyor.', { error: true }); return; }
    const it = get(ip);
    if (t(it.title, 'tr') || t(it.title, 'en')) return;
    try {
      const r = await api('/api/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + v));
      if (r && r.title) { it.title = bi(r.title, r.title); changed({ rerender: true }); }
    } catch (e) { /* the title can be typed by hand */ }
  });
  return [h('div', { class: 'thumb-row' }, thumb, h('div', null, h('div', { class: 'f' }, lbl(fid, 'YouTube linki'), url))),
    fBi(ip + '.title', 'Video başlığı', { hint: 'Linki yapıştırınca başlık kendiliğinden gelir; istersen değiştir.' })];
}

const ROLE_NAMES = { arrangement: 'Aranje', recording: 'Kayıt', composition: 'Beste', guitar: 'Gitar' };
function trackFields(ip, item) {
  const cover = h('img', { class: 'thumb sq', alt: '', src: item.cover || '' });
  if (!item.cover) cover.style.visibility = 'hidden';
  const fid = nid();
  const url = h('input', { id: fid, type: 'url', placeholder: 'https://open.spotify.com/track/…', value: item.url || '', autocomplete: 'off' });
  url.addEventListener('input', () => set(ip + '.url', url.value.trim()));
  url.addEventListener('change', async () => {
    const raw = url.value.trim();
    if (!raw) return;
    const ref = spotifyRef(raw);
    if (!ref && !/^https:\/\/spotify\.link\/\w+/i.test(raw)) {
      toast('Bu bir Spotify şarkı linki gibi görünmüyor. Spotify’da şarkının yanındaki üç nokta › Paylaş › Şarkı bağlantısını kopyala.', { error: true });
      return;
    }
    const it = get(ip);
    // keep a tidy link without the ?si= part Spotify adds when sharing
    if (ref) it.url = 'https://open.spotify.com/' + ref.kind + '/' + ref.id;
    try {
      const r = await api('/api/oembed?url=' + encodeURIComponent(raw));
      if (r && r.url) it.url = r.url;
      if (r && r.thumbnail) it.cover = r.thumbnail;
      if (r && r.title && !t(it.title, 'tr') && !t(it.title, 'en')) it.title = bi(r.title, r.title);
    } catch (e) { /* the title can be typed by hand */ }
    changed({ rerender: true });
  });
  return [h('div', { class: 'thumb-row' }, cover, h('div', null, h('div', { class: 'f' }, lbl(fid, 'Spotify linki'), url))),
    fBi(ip + '.title', 'Şarkı adı', { hint: 'Linki yapıştırınca kendiliğinden gelir; istersen değiştir.' }),
    fText(ip + '.artist', 'Sanatçı ya da grup', { placeholder: 'İsteğe bağlı' }),
    rolesField(ip, item)];
}

// toggles for the parts Ali played in a song (Spotify songs and his own recordings)
function rolesField(ip, item) {
  const chips = h('div', { class: 'chips' }, Object.keys(ROLES).map((k) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': (item.roles || []).includes(k) ? 'true' : 'false',
    onclick: () => {
      const it = get(ip);
      const on = new Set(Array.isArray(it.roles) ? it.roles : []);
      if (on.has(k)) on.delete(k); else on.add(k);
      it.roles = Object.keys(ROLES).filter((r) => on.has(r));
      changed({ rerender: true });
    },
  }, ROLE_NAMES[k] || k)));
  return h('div', { class: 'f' }, h('span', { class: 'f-l', text: 'Bu şarkıdaki rolün' }), chips, help('Birden fazlasını seçebilirsin. Sitede şarkı adının altında yazar.'));
}

/* ---- recordings: WAV, AIFF or FLAC masters become 320 kbps MP3s in the browser ---- */

const REC_MAX_IN = 1536 * 1048576;   // what a browser can still open: well over an hour of WAV
const mmss = (sec) => { const s = Math.max(0, Math.round(sec || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
async function decodeAudio(file) {
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC) throw new UserError('Bu tarayıcı ses dosyasını açamıyor. Chrome, Edge ya da Safari ile dene.');
  const data = await file.arrayBuffer();
  // 44.1 kHz, the rate MP3 players expect; higher-rate masters are resampled by the browser
  const ctx = new AC(2, 1, 44100);
  try {
    return await ctx.decodeAudioData(data);
  } catch (e) {
    throw new UserError('“' + file.name + '” açılamadı. WAV, AIFF, FLAC ya da MP3 olarak dene.');
  }
}
function mp3Encode(audio, kbps, onProgress) {
  return new Promise((resolve, reject) => {
    const w = new Worker('/admin/mp3-worker.js');
    const left = audio.getChannelData(0).slice();
    const right = audio.numberOfChannels > 1 ? audio.getChannelData(1).slice() : null;
    w.onmessage = (e) => {
      const m = e.data || {};
      if (m.progress != null) { if (onProgress) onProgress(m.progress); return; }
      w.terminate();
      if (m.done) resolve(m.blob);
      else reject(new UserError('MP3’e çevrilemedi' + (m.error ? ': ' + m.error : '.')));
    };
    w.onerror = () => { w.terminate(); reject(new UserError('MP3’e çevrilemedi. Sayfayı yenileyip tekrar dene.')); };
    w.postMessage({ left, right, sampleRate: audio.sampleRate, kbps }, right ? [left.buffer, right.buffer] : [left.buffer]);
  });
}
// the outline of the song for the player on the site: 160 bars, one byte each
function peaksOf(audio, n = 160) {
  const chans = [];
  for (let c = 0; c < audio.numberOfChannels; c++) chans.push(audio.getChannelData(c));
  const len = audio.length, raw = new Float32Array(n);
  let top = 0;
  for (let b = 0; b < n; b++) {
    const from = Math.floor((b * len) / n), to = Math.floor(((b + 1) * len) / n);
    let peak = 0, sum = 0, cnt = 0;
    for (const ch of chans) for (let i = from; i < to; i += 3) { const v = Math.abs(ch[i]); if (v > peak) peak = v; sum += v * v; cnt++; }
    raw[b] = 0.55 * peak + 0.45 * Math.sqrt(sum / Math.max(1, cnt)) * 1.6;
    if (raw[b] > top) top = raw[b];
  }
  let bin = '';
  for (let b = 0; b < n; b++) bin += String.fromCharCode(Math.round(255 * Math.pow(raw[b] / (top || 1), 0.85)));
  return btoa(bin);
}
async function uploadRecording(file, onProgress) {
  if (file.size > REC_MAX_IN) throw new UserError('“' + file.name + '” çok büyük (' + (file.size / 1073741824).toFixed(1) + ' GB).');
  const m = file.name.match(/\.([a-z0-9]{2,5})$/i);
  const ext = (m ? m[1] : '').toLowerCase();
  if (!/^audio\//.test(file.type) && !['wav', 'wave', 'aif', 'aiff', 'flac', 'mp3', 'm4a', 'aac', 'ogg'].includes(ext)) throw new UserError('“' + file.name + '” bir ses dosyası gibi görünmüyor.');
  const audio = await decodeAudio(file);
  const secs = audio.duration;
  const base = { duration: Math.round(secs * 10) / 10, peaks: peaksOf(audio) };
  // an MP3 or AAC file that is already small enough goes up as it is: encoding it again would only lose quality
  const lossy = ext === 'mp3' || ext === 'm4a' || ext === 'aac' || /audio\/(mpeg|mp3|mp4|aac|x-m4a)/.test(file.type);
  if (lossy && file.size <= MAX_FILE) return { ...base, src: await addUpload(file, 'kayit', file.name, ext === 'm4a' || ext === 'aac' ? 'm4a' : 'mp3'), kbps: Math.round((file.size * 8) / Math.max(1, secs) / 1000) };
  // the site can hold files up to 24 MB: long pieces get a slightly lower (still high) bitrate
  let kbps = audio.numberOfChannels > 1 ? 320 : 192;
  for (const k of [320, 256, 224, 192, 160]) { if (k <= kbps && (secs * k * 1000) / 8 <= MAX_FILE * 0.97) { kbps = k; break; } }
  if ((secs * kbps * 1000) / 8 > MAX_FILE * 0.97) throw new UserError('“' + file.name + '” çok uzun (' + mmss(secs) + '). Sitede en fazla yaklaşık 20 dakikalık kayıt olabilir.');
  const blob = await mp3Encode(audio, kbps, onProgress);
  return { ...base, src: await addUpload(blob, 'kayit', file.name, 'mp3'), kbps };
}
const niceName = (n) => String(n || 'Kayıt').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Kayıt';
let recBusy = false;
async function addRecordings(files) {
  if (recBusy) { toast('Önceki kayıt hâlâ çevriliyor, bitince tekrar dene.'); return; }
  recBusy = true;
  try {
    for (const [n, file] of files.entries()) {
      const label = '“' + niceName(file.name) + '”' + (files.length > 1 ? ' (' + (n + 1) + '/' + files.length + ')' : '');
      toast(label + ' açılıyor…', { ms: 600000 });
      try {
        const r = await uploadRecording(file, (p) => toast(label + ' MP3’e çevriliyor… %' + Math.round(p * 100), { ms: 600000 }));
        const list = get('sections.@work.recordings');
        const name = niceName(file.name);
        list.push({ src: r.src, title: bi(name, name), artist: '', roles: [], duration: r.duration, peaks: r.peaks, kbps: r.kbps });
        changed({ rerender: true });
      } catch (e) {
        toast(errorText(e), { error: true, ms: 9000 });
        return;
      }
    }
    toast((files.length > 1 ? files.length + ' kayıt' : 'Kayıt') + ' eklendi. Önizlemede Portfolyo’da dinleyebilirsin; Yayınla’ya basınca sitede görünür.', { ms: 7000 });
  } finally {
    recBusy = false;
  }
}
function recFields(ip, item) {
  const size = S.uploads.has(item.src) ? S.uploads.get(item.src).blob.size : 0;
  return [
    item.src ? h('audio', { class: 'rec-audio', controls: true, preload: 'none', src: previewSrc(item.src) }) : null,
    help([mmss(item.duration), item.kbps ? item.kbps + ' kbps MP3' : '', size ? (size / 1048576).toFixed(1).replace('.', ',') + ' MB' : ''].filter(Boolean).join(' · ')),
    fBi(ip + '.title', 'Kayıt adı'),
    fText(ip + '.artist', 'Sanatçı ya da grup', { placeholder: 'İsteğe bağlı' }),
    rolesField(ip, item),
  ];
}
function recordingsBox(p) {
  const [btn, input] = fileButton('Kayıt yükle', 'audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3,.m4a', true, (files) => addRecordings(files), 'music');
  const box = h('div', { class: 'drop' },
    h('div', { class: 'row' }, btn, input, h('span', { class: 'f-h', text: 'ya da dosyaları buraya sürükleyip bırak' })),
    listEditor({
      path: p + '.recordings', itemTitle: (it) => t(it.title, 'tr') || 'Kayıt',
      fields: recFields, empty: 'Henüz kayıt yok.',
    }));
  box.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) { e.preventDefault(); box.classList.add('over'); } });
  box.addEventListener('dragleave', (e) => { if (!box.contains(e.relatedTarget)) box.classList.remove('over'); });
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('over');
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) addRecordings(files);
  });
  return box;
}

function tabWork() {
  const p = 'sections.@work';
  return [hiddenNote('work'),
    group('Başlık ve yazı', null, fBi(p + '.title', 'Başlık'), fBi(p + '.body', 'Yazı', { multiline: true, rows: 4, hint: bodyHint })),
    group('Hizmetler', 'Session, kayıt, aranje gibi verdiğin hizmetler.', listEditor({
      path: p + '.services', itemTitle: (it) => t(it.name, 'tr') || 'Yeni hizmet',
      fields: (ip) => [fBi(ip + '.name', 'Hizmet'), fBi(ip + '.desc', 'Kısa açıklama')],
      newItem: () => ({ name: bi(), desc: bi() }), addLabel: 'Hizmet ekle', empty: 'Henüz hizmet yok.',
    })),
    group('YouTube videoları', 'Linki yapıştırman yeterli; kapak resmi ve başlık kendiliğinden gelir. Sitede kapak resmine tıklayınca video açılır.', listEditor({
      path: p + '.videos', itemTitle: (it) => t(it.title, 'tr') || (youtubeId(it.url) ? 'Video' : 'Yeni video'),
      fields: videoFields, newItem: () => ({ url: '', title: bi() }), addLabel: 'Video ekle', empty: 'Henüz video yok.',
    })),
    group('Kayıtlar', 'Kendi kayıtların: WAV, AIFF, FLAC ya da MP3 yükle. WAV dosyası senin tarayıcında 320 kbps MP3’e çevrilir; dinleyen kalite farkı duymaz, sitede de beklemeden çalar. WAV’ın bilgisayarında kalır, sadece MP3 yüklenir. Sitede Portfolyo’da, şarkının dalga formunu gösteren bir oynatıcıyla çıkar; çalarken adı sol alt köşede görünür, oradan durdurulabilir.', recordingsBox(p)),
    group('Spotify şarkıları', 'Aranjesini, kaydını ya da bestesini yaptığın şarkılar. Spotify’da şarkının yanındaki üç nokta › Paylaş › Şarkı bağlantısını kopyala, buraya yapıştır; adı ve kapağı kendiliğinden gelir. Albüm ya da çalma listesi linki de olur. Sitede tıklayınca sol alt köşede Spotify’ın küçük oynatıcısında çalar; ziyaretçi siteyi gezerken de çalmaya devam eder.', listEditor({
      path: p + '.tracks', itemTitle: (it) => t(it.title, 'tr') || (spotifyRef(it.url) ? 'Şarkı' : 'Yeni şarkı'),
      fields: trackFields, newItem: () => ({ url: '', title: bi(), artist: '', cover: '', roles: [] }), addLabel: 'Şarkı ekle', empty: 'Henüz şarkı yok.',
    })),
    sectionExtras(p),
  ];
}

function tabGallery() {
  const p = 'sections.@gallery';
  const [btn, input] = fileButton('Fotoğraf ekle', 'image/*', true, (files) => withBusy(files.length + ' fotoğraf hazırlanıyor…', async () => {
    const list = get(p + '.images');
    let n = 0;
    for (const f of files) {
      try {
        const r = await uploadPhoto(f);
        list.push({ src: r.src, thumb: r.thumb, alt: bi() });
        n++;
        toast(n + ' / ' + files.length + ' fotoğraf hazır…', { ms: 60000 });
      } catch (e) { toast(f.name + ': ' + errorText(e), { error: true, ms: 6000 }); }
    }
    changed({ rerender: true });
    if (n) toast(n + ' fotoğraf eklendi. Yayınla’ya basınca sitede görünür.');
  }));
  const ig = p + '.instagram';
  return [hiddenNote('gallery'),
    group('Başlık ve yazı', null, fBi(p + '.title', 'Başlık'), fBi(p + '.body', 'Kısa yazı (isteğe bağlı)', { multiline: true, rows: 3 })),
    group('Fotoğraflar', 'Yüklerken otomatik küçültülür; telefondan çektiğin fotoğrafları direkt yükleyebilirsin. Birden fazla fotoğrafı aynı anda seçebilirsin.',
      h('div', { class: 'row', style: 'margin-bottom:12px' }, btn, input),
      listEditor({
        path: p + '.images', itemTitle: (it, i) => t(it.alt, 'tr') || 'Fotoğraf ' + (i + 1),
        fields: (ip, it) => [h('div', { class: 'thumb-row' }, h('img', { class: 'thumb sq', alt: '', src: previewSrc(it.thumb || it.src) }),
          h('div', null, fBi(ip + '.alt', 'Kısa açıklama', { hint: 'Görme engelli ziyaretçiler ve Google için. Örneğin: Sahnede, 2026.' })))],
        newItem: null, empty: 'Henüz fotoğraf yok.',
      })),
    group('Instagram', 'Son paylaşımların sitenin kendi tasarımında görünür.',
      fToggle(ig + '.enabled', 'Instagram bölümünü göster', null, { rerender: true }),
      fText(ig + '.profile', 'Instagram profil linkin', { type: 'url', placeholder: 'https://www.instagram.com/kullaniciadin' }),
      fText(ig + '.feedUrl', 'Otomatik akış adresi', { type: 'url', placeholder: 'https://feeds.behold.so/…', hint: 'behold.so’da oluşturduğun JSON akışın adresi. Son paylaşımların burada, sitenin tasarımında görünür ve günde bir yenilenir.' }),
      fRange(ig + '.count', 'Kaç paylaşım görünsün', { min: 3, max: 12, step: 3 }),
      fBi(ig + '.label', 'Takip düğmesi yazısı')),
    sectionExtras(p),
  ];
}

function tabContact() {
  const p = 'sections.@contact';
  return [hiddenNote('contact'),
    group('Başlık ve yazı', null, fBi(p + '.title', 'Başlık'), fBi(p + '.body', 'Yazı', { multiline: true, rows: 4, hint: bodyHint })),
    group('E-posta', 'Yanında “Kopyala” düğmesi olur.', fText(p + '.email', 'E-posta adresin', { type: 'email', placeholder: 'info@aliyasavul.com' })),
    group('WhatsApp', 'Numara yazarsan “WhatsApp’tan yaz” düğmesi çıkar ve hazır mesajla açılır.',
      fText(p + '.whatsapp.number', 'Telefon numaran', { type: 'tel', inputmode: 'tel', placeholder: '0532 123 45 67', hint: 'Başında 0 ile ya da 90 ile yazabilirsin.' }),
      fBi(p + '.whatsapp.message', 'Hazır mesaj', { multiline: true, rows: 2 })),
    group('Randevu takvimi', 'Calendly, Cal.com ya da Google Takvim randevu linkin varsa ekle; bir düğme olarak görünür.',
      fText(p + '.booking.url', 'Takvim linki', { type: 'url', placeholder: 'https://cal.com/…' }), fBi(p + '.booking.label', 'Düğme yazısı')),
    group('Sosyal medya linkleri', 'Boş bıraktıkların sitede görünmez.', listEditor({
      path: p + '.links', itemTitle: (it) => it.label || 'Yeni link',
      fields: (ip) => [fText(ip + '.label', 'Adı', { placeholder: 'Instagram' }), fText(ip + '.url', 'Link', { type: 'url', placeholder: 'https://' })],
      newItem: () => ({ label: '', url: '' }), addLabel: 'Link ekle', empty: 'Henüz link yok.',
    })),
    sectionExtras(p),
  ];
}

function tabBanner() {
  return [
    group('Duyuru bandı', 'En üstte ince bir şerit olarak görünür. Ziyaretçi kapatırsa, yazıyı değiştirene kadar ona tekrar gösterilmez.',
      fToggle('banner.enabled', 'Duyuru bandını göster', null, { rerender: false }),
      fBi('banner.text', 'Duyuru', { max: 90 }),
      fText('banner.link', 'Link (isteğe bağlı)', { type: 'url', placeholder: 'https://' }),
      fBi('banner.linkLabel', 'Link yazısı')),
    h('p', { class: 'note', text: 'Bandın renklerini “Renk ve yazı tipi” sekmesinden değiştirebilirsin.' }),
  ];
}

function tabSeo() {
  const share = get('site.shareImage');
  const [btn, input] = fileButton('Paylaşım görseli yükle', 'image/*', false, (files) => withBusy('Görsel hazırlanıyor…', async () => {
    set('site.shareImage', await uploadShare(files[0]), { rerender: true });
    toast('Görsel 1200×630 olarak hazırlandı.');
  }));
  const tr = (k) => t(get(k), 'tr');
  return [
    group('Dil', null, fSelect('site.defaultLang', 'Site ilk açıldığında hangi dilde olsun?', [
      { value: 'auto', label: 'Ziyaretçinin telefon/tarayıcı diline göre (önerilen)' },
      { value: 'tr', label: 'Her zaman Türkçe' },
      { value: 'en', label: 'Her zaman İngilizce' },
    ], { hint: 'Ziyaretçi sağ üstteki TR/EN düğmesiyle her zaman değiştirebilir.' })),
    group('Google’da görünüm', 'Google arama sonuçlarında ve tarayıcı sekmesinde görünen başlık ve açıklama.',
      fBi('site.title', 'Sayfa başlığı', { max: 60 }), fBi('site.description', 'Açıklama', { multiline: true, rows: 3, max: 160 }),
      h('div', { class: 'serp', 'aria-hidden': 'true' }, h('div', { class: 'u', text: 'aliyasavul.com' }), h('div', { class: 't', text: tr('site.title') }), h('div', { class: 'd', text: tr('site.description') }))),
    group('WhatsApp ve Instagram’da paylaşılınca', 'Siteni bir yerde paylaştığında çıkan önizleme kartı. Görsel otomatik 1200×630 boyutuna getirilir.',
      h('div', { class: 'share-card' }, h('img', { src: previewSrc(share), alt: '' }), h('div', null, h('b', { text: tr('site.title') }), h('span', { text: 'aliyasavul.com' }))),
      h('div', { class: 'row', style: 'margin-top:12px' }, btn, input,
        share !== DEFAULTS.site.shareImage ? h('button', { type: 'button', class: 'btn small', onclick: () => set('site.shareImage', DEFAULTS.site.shareImage, { rerender: true }) }, 'İlk görsele dön') : null),
      h('p', { class: 'f-h', text: 'Not: WhatsApp ve Instagram eski önizlemeyi bir süre hatırlayabilir; yeni görsel birkaç gün içinde görünür.' })),
  ];
}

function tabStrings() {
  return [h('p', { class: 'note', text: 'Sitede küçük yerlerde geçen yazılar. “Sesli okuyucu” yazanlar ekranda görünmez; görme engelli ziyaretçilerin ekran okuyucusu okur.' }),
    group(null, null, Object.keys(STRING_LABELS).map((k) => fBi('strings.' + k, STRING_LABELS[k])))];
}

function tabHistory() {
  const box = h('div', { class: 'hist' }, h('p', { class: 'muted', text: 'Yükleniyor…' }));
  (async () => {
    try {
      const list = await gh('commits?path=content/site.json&per_page=30&sha=' + encodeURIComponent(S.user.repo.branch));
      box.innerHTML = '';
      if (!list.length) box.append(h('p', { class: 'empty', text: 'Henüz kayıtlı sürüm yok.' }));
      list.forEach((c, i) => {
        const date = new Date(c.commit.author.date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
        box.append(h('div', { class: 'hist-item' },
          h('div', null, h('b', { text: c.commit.message.split('\n')[0] }), h('br'), h('small', { text: date }), i === 0 ? h('small', { class: 'live', text: ' · şu an yayında' }) : null),
          i === 0 ? null : h('button', { type: 'button', class: 'btn small', onclick: () => loadVersion(c.sha, date) }, 'Bu sürümü aç')));
      });
    } catch (e) {
      box.innerHTML = '';
      box.append(h('p', { class: 'note warn', text: 'Geçmiş yüklenemedi. ' + errorText(e) }));
    }
  })();
  return [h('p', { class: 'note', text: 'Her yayın burada saklanır. Bir sürümü açınca taslak olarak yüklenir ve önizlemede görürsün; beğenirsen Yayınla’ya bas, beğenmezsen “Değişiklikleri at”.' }), box];
}

async function loadVersion(sha, date) {
  if (isDirty() && !(await dialog({ title: 'Taslağın değişecek', body: 'Yayınlanmamış değişikliklerin bu sürümle değişecek.', ok: 'Devam et' }))) return;
  try {
    const text = await gh('contents/content/site.json?ref=' + sha, { accept: RAW, text: true });
    S.draft = normalize(JSON.parse(text));
    S.draft.meta = clone(S.published.meta);
    changed();
    toast(date + ' sürümü taslağa yüklendi. Önizlemede bak; beğenirsen Yayınla.', { ms: 6000 });
  } catch (e) { toast(errorText(e), { error: true }); }
}

const toDM = (md) => (md ? md.slice(3) + '.' + md.slice(0, 2) : '');
function fromDM(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function tabThemes() {
  const T = S.draft.themes;
  const live = themeForDate(S.draft);
  const save = async () => {
    const name = await dialog({ title: 'Yeni tema', body: 'Şu anki renkler, yazı tipleri, efektler ve taşın rengi bu temaya kaydedilir.', input: { label: 'Temanın adı', placeholder: 'Örneğin: Yılbaşı' }, ok: 'Kaydet' });
    if (name === false) return;
    T.list.push({ id: 't' + Date.now().toString(36), name: name || 'Yeni tema', from: '', to: '', theme: clone(S.draft.theme), banner: null });
    changed({ rerender: true });
    toast('Tema kaydedildi. Yayınla’ya basınca saklanır.');
  };
  const dateField = (th, key, label) => {
    const inp = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'GG.AA', value: toDM(th[key]), 'aria-label': label, style: 'max-width:110px' });
    inp.addEventListener('change', () => {
      if (!inp.value.trim()) { th[key] = ''; changed(); return; }
      const md = fromDM(inp.value);
      if (!md) { toast('Tarihi gün.ay olarak yaz, örneğin 15.12', { error: true }); return; }
      th[key] = md; changed({ rerender: true });
    });
    return h('label', { class: 'f', style: 'margin:0' }, h('span', { class: 'f-l', text: label }), inp);
  };
  const card = (th, i) => h('div', { class: 'card' },
    h('div', { class: 'card-h' },
      h('b', { text: th.name + (live && live.id === th.id ? ' · bugün açık' : '') }),
      h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'icon-btn danger', title: 'Sil', 'aria-label': 'Temayı sil', onclick: async () => {
          if (!(await dialog({ title: 'Tema silinsin mi?', body: '“' + th.name + '” silinecek.', ok: 'Sil', danger: true }))) return;
          T.list.splice(i, 1); if (S.previewTheme === th.id) S.previewTheme = null; changed({ rerender: true });
        } }, icon('trash')))),
    h('div', { class: 'card-b' },
      fText('themes.list.' + i + '.name', 'Adı'),
      h('div', { class: 'row', style: 'gap:12px;margin-bottom:12px' }, dateField(th, 'from', 'Başlangıç'), dateField(th, 'to', 'Bitiş')),
      h('p', { class: 'f-h', style: 'margin:0 0 12px', text: th.from && th.to ? toDM(th.from) + ' ile ' + toDM(th.to) + ' arasında kendiliğinden açılır.' : 'Tarih girmezsen kendiliğinden açılmaz; istediğinde ana görünüm yapabilirsin.' }),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small', 'aria-pressed': S.previewTheme === th.id ? 'true' : 'false', onclick: () => { S.previewTheme = S.previewTheme === th.id ? null : th.id; postPreview(); renderTab(); } }, icon('eye'), S.previewTheme === th.id ? 'Önizlemeyi kapat' : 'Önizle'),
        h('button', { type: 'button', class: 'btn small', onclick: () => { th.theme = clone(S.draft.theme); changed({ rerender: true }); toast('Tema, şu anki görünümle güncellendi.'); } }, 'Şu anki görünümü buna kaydet'),
        h('button', { type: 'button', class: 'btn small', onclick: () => { S.draft.theme = clone(th.theme); changed({ rerender: true }); toast('“' + th.name + '” ana görünüm yapıldı.'); } }, 'Ana görünüm yap'),
        th.banner
          ? h('button', { type: 'button', class: 'btn small', onclick: () => { th.banner = null; changed({ rerender: true }); } }, 'Duyuru bandını temadan çıkar')
          : h('button', { type: 'button', class: 'btn small', onclick: () => { th.banner = clone(S.draft.banner); changed({ rerender: true }); toast('Şu anki duyuru bandı bu temaya eklendi.'); } }, 'Şu anki duyuru bandını ekle'))));
  return [
    h('p', { class: 'note', text: 'Tema; renkler, yazı tipleri, efektler ve taşın renginden oluşan kayıtlı bir görünüm. Bir temaya tarih verirsen o günler arasında site kendiliğinden o temaya geçer, sonra eski haline döner. Örneğin yılbaşı için 15.12 – 02.01.' }),
    group('Otomatik geçiş', null, fToggle('themes.auto', 'Tarihi gelince temayı kendiliğinden aç', 'Kapalıysa temalar sadece sen “Ana görünüm yap” dediğinde kullanılır.')),
    group('Kayıtlı temalar', T.list.length ? null : 'Henüz kayıtlı tema yok. Önce istediğin renkleri ve taş rengini ayarla, sonra buradan tema olarak kaydet.',
      h('div', { class: 'list' }, T.list.map(card)),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { type: 'button', class: 'btn small', onclick: save }, icon('plus'), 'Şu anki görünümü yeni tema olarak kaydet'))),
    h('p', { class: 'f-h', text: 'Kar, ışıklar gibi temaya özel süslemeleri Kasım’da yılbaşı temasıyla birlikte ekleriz.' }),
  ];
}

function tabReset() {
  const picked = new Set();
  const doBtn = h('button', { type: 'button', class: 'btn primary', disabled: true }, icon('undo'), 'Seçilenleri ilk haline döndür');
  const sync = () => { doBtn.disabled = !picked.size; };
  const row = (a) => {
    const done = atOriginal(a);
    const inp = h('input', { type: 'checkbox', disabled: done });
    inp.addEventListener('change', () => { if (inp.checked) picked.add(a); else picked.delete(a); sync(); });
    return h('label', { class: 'pick' + (done ? ' done' : '') }, inp,
      h('span', null, h('b', { text: a.label }), a.hint ? h('small', { text: a.hint }) : null),
      h('em', { text: done ? 'ilk halinde' : 'değişmiş' }));
  };
  const lookList = RESETS.filter((a) => a.look), textList = RESETS.filter((a) => !a.look);
  const allBtn = (list) => h('button', {
    type: 'button', class: 'btn small ghost', disabled: list.every(atOriginal), onclick: (e) => {
      const btn = e.currentTarget;
      const boxes = [...btn.closest('.group').querySelectorAll('input[type="checkbox"]:not(:disabled)')];
      const on = boxes.some((b) => !b.checked);
      boxes.forEach((b) => { b.checked = on; });
      list.filter((a) => !atOriginal(a)).forEach((a) => (on ? picked.add(a) : picked.delete(a)));
      btn.textContent = on ? 'Seçimi kaldır' : 'Hepsini seç';
      sync();
    },
  }, 'Hepsini seç');
  doBtn.addEventListener('click', async () => {
    const list = RESETS.filter((a) => picked.has(a));
    if (!list.length) return;
    const body = h('div', null, h('p', { text: 'Şunlar en baştaki haline dönecek:' }), h('ul', { class: 'plain' }, list.map((a) => h('li', { text: a.label }))),
      list.some((a) => !a.look) ? h('p', { class: 'note warn', text: 'Seçtiğin bölümlerdeki kendi yazdıkların yerine örnek yazılar gelir.' }) : null,
      h('p', { text: 'Yayınla’ya basana kadar sitede hiçbir şey değişmez; “Geri al” ya da “Değişiklikleri at” ile vazgeçebilirsin.' }));
    if (!(await dialog({ title: 'İlk haline dönsün mü?', body, ok: 'İlk haline döndür', danger: list.some((a) => !a.look) }))) return;
    resetToOriginal(list, list.length === 1 ? list[0].label : 'Seçtiğin ' + list.length + ' alan');
  });
  return [
    h('p', { class: 'note', text: 'Burada sitenin en baştaki, ilk yayınlandığı haline dönebilirsin. Değiştirdiğin alanların yanında “değişmiş” yazar. Seçip düğmeye basınca önce taslakta değişir, önizlemede görürsün; beğenirsen Yayınla’ya bas.' }),
    groupA('Görünüm', 'Renkler, taş, yazı tipleri, efektler, ses ve logo.', allBtn(lookList), h('div', { class: 'picks' }, lookList.map(row))),
    groupA('Yazılar ve içerik', 'Senin yazdıkların, fotoğrafların ve videoların yerine en baştaki örnek içerik gelir.', allBtn(textList), h('div', { class: 'picks' }, textList.map(row))),
    h('div', { class: 'row' }, doBtn),
    h('p', { class: 'f-h', style: 'margin-top:12px', text: 'Daha önce yayınladığın bir sürüme dönmek istersen: “Geçmiş sürümler”.' }),
  ];
}

const TABS = [
  { id: 'design', group: 'Görünüm', label: 'Renk ve yazı tipi', focus: 'intro', render: tabDesign, lead: 'Sitenin renkleri, yazı tipleri ve taşın rengi. Değiştirdikçe sağda önizlemede görürsün.' },
  { id: 'themes', group: 'Görünüm', label: 'Temalar', focus: 'intro', render: tabThemes },
  { id: 'effects', group: 'Görünüm', label: 'Efektler ve ses', focus: 'intro', render: tabEffects },
  { id: 'media', group: 'Görünüm', label: 'Logo', focus: 'intro', render: tabMedia },
  { id: 'gate', group: 'İçerik', label: 'Giriş ve üst düğme', focus: 'gate', render: tabGate },
  { id: 'sections', group: 'İçerik', label: 'Menü ve bölümler', focus: null, render: tabSections },
  { id: 'about', group: 'İçerik', label: 'Hakkımda', focus: 'about', render: tabAbout },
  { id: 'lessons', group: 'İçerik', label: 'Dersler', focus: 'lessons', render: tabLessons },
  { id: 'work', group: 'İçerik', label: 'Portfolyo, YouTube, Spotify', focus: 'work', render: tabWork },
  { id: 'gallery', group: 'İçerik', label: 'Galeri ve Instagram', focus: 'gallery', render: tabGallery },
  { id: 'contact', group: 'İçerik', label: 'İletişim', focus: 'contact', render: tabContact },
  { id: 'banner', group: 'İçerik', label: 'Duyuru bandı', focus: 'intro', render: tabBanner },
  { id: 'seo', group: 'Diğer', label: 'Google ve paylaşım', focus: null, render: tabSeo },
  { id: 'strings', group: 'Diğer', label: 'Küçük yazılar', focus: null, render: tabStrings },
  { id: 'history', group: 'Diğer', label: 'Geçmiş sürümler', focus: null, render: tabHistory },
  { id: 'reset', group: 'Diğer', label: 'İlk hale döndür', focus: 'intro', render: tabReset, lead: 'Renkleri, ayarları ya da yazıları sitenin en baştaki haline döndür.' },
];

/* ======================= shell ======================= */

function renderTab() {
  const ed = $('#editor');
  if (!ed) return;
  const top = ed.scrollTop;
  const tab = TABS.find((x) => x.id === S.tab) || TABS[0];
  ed.innerHTML = '';
  liveResets = [];
  ed.append(...[h('h1', { text: tab.label }), tab.lead ? h('p', { class: 'lead', text: tab.lead }) : null, ...[].concat(tab.render())].filter(Boolean));
  ed.scrollTop = top;
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === S.tab ? 'true' : 'false'));
}

function openTab(id) {
  S.tab = id;
  if (id !== 'themes') S.previewTheme = null;
  renderTab();
  $('#editor').scrollTop = 0;
  const tab = TABS.find((x) => x.id === id);
  if (tab && tab.focus) postPreview(tab.focus);
  else postPreview(null);
  try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
}

function updateStatus() {
  const dirty = isDirty();
  const st = $('#status');
  if (st) { st.textContent = dirty ? '● Yayınlanmamış değişiklikler var' : 'Yayındaki sürümle aynı'; st.classList.toggle('dirty', dirty); }
  const pb = $('#publishBtn'); if (pb) pb.disabled = !dirty || S.publishing;
  const db = $('#discardBtn'); if (db) db.disabled = !dirty || S.publishing;
}

function seg(options, current, onPick) {
  const box = h('div', { class: 'seg', role: 'group' });
  for (const [value, ...label] of options) {
    box.append(h('button', {
      type: 'button', 'aria-pressed': value === current ? 'true' : 'false',
      onclick: (e) => { box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); onPick(value); },
    }, ...label));
  }
  return box;
}

function userMenu() {
  const pop = h('div', { class: 'menu-pop', hidden: true },
    h('p', { text: 'Giriş: @' + S.user.login }),
    h('a', { href: '/', target: '_blank', rel: 'noopener' }, icon('ext'), 'Siteyi aç'),
    h('a', { href: 'https://github.com/' + S.user.repo.owner + '/' + S.user.repo.name + '/commits/' + S.user.repo.branch, target: '_blank', rel: 'noopener' }, icon('ext'), 'GitHub’da kayıtlar'),
    h('button', { type: 'button', onclick: logout }, icon('out'), 'Çıkış yap'));
  const btn = h('button', { type: 'button', class: 'icon-btn', style: 'width:36px;height:36px;border-radius:50%;padding:0', 'aria-label': 'Hesap menüsü', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); } },
    S.user.avatar ? h('img', { class: 'avatar', src: S.user.avatar, alt: '' }) : icon('eye'));
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  return h('div', { class: 'menu' }, btn, pop);
}

function renderShell() {
  const app = $('#app');
  app.innerHTML = '';
  const bar = h('header', { class: 'bar' },
    h('span', { class: 'logo', 'aria-hidden': 'true' }),
    h('div', { class: 'bar-title' }, h('b', { text: 'Site paneli' }), h('span', { class: 'status', id: 'status' })),
    h('div', { class: 'bar-mid' },
      h('button', { type: 'button', class: 'btn small only-mobile', onclick: () => { document.body.classList.add('show-preview'); requestAnimationFrame(fitPreview); } }, icon('eye'), 'Önizle'),
      seg([['tr', 'TR'], ['en', 'EN']], S.pvLang, (v) => { S.pvLang = v; postPreview(); }),
      seg([['desktop', icon('desk'), h('span', { class: 'sr-only', text: 'Masaüstü' })], ['phone', icon('phone'), h('span', { class: 'sr-only', text: 'Telefon' })]], S.device, (v) => { S.device = v; fitPreview(); })),
    h('div', { class: 'bar-end' },
      h('button', { type: 'button', class: 'btn small ghost', id: 'discardBtn', onclick: discard }, 'Değişiklikleri at'),
      h('button', { type: 'button', class: 'btn primary', id: 'publishBtn', onclick: startPublish }, 'Yayınla'),
      userMenu()));
  const nav = h('nav', { class: 'tabs', 'aria-label': 'Panel bölümleri' });
  let lastGroup = '';
  for (const tb of TABS) {
    if (tb.group !== lastGroup) { nav.append(h('h2', { text: tb.group })); lastGroup = tb.group; }
    nav.append(h('button', { type: 'button', 'data-tab': tb.id, onclick: () => openTab(tb.id) }, tb.label));
  }
  const preview = h('section', { class: 'preview', 'aria-label': 'Önizleme' },
    h('div', { class: 'pv-head' }, h('span', { text: 'Önizleme · yayınlamadan önce sadece sen görürsün' }),
      h('button', { type: 'button', class: 'btn small close-pv', onclick: () => document.body.classList.remove('show-preview') }, icon('x'), 'Kapat')),
    h('div', { class: 'pv-box' }, h('div', { class: 'pv-frame', id: 'pvFrame' }, h('iframe', { id: 'pv', title: 'Site önizlemesi', src: '/?preview=1' }))));
  app.append(bar, h('div', { class: 'main' }, nav, h('main', { class: 'editor', id: 'editor' }), preview));
  renderTab();
  updateStatus();
  setupPreview();
}

/* ======================= preview ======================= */

function previewCfg() { return mapDeep(S.draft, (s) => (S.uploads.has(s) ? S.uploads.get(s).url : s)); }

function postPreview(focus) {
  const f = $('#pv');
  if (!f || !S.pvReady || !f.contentWindow) return;
  const tab = TABS.find((x) => x.id === S.tab);
  let fc = focus;
  if (fc === undefined) fc = tab && tab.focus === 'gate' ? 'gate' : undefined;
  if (fc === null) fc = undefined;
  f.contentWindow.postMessage({ type: 'ay:config', cfg: previewCfg(), lang: S.pvLang, focus: fc, previewTheme: S.tab === 'themes' ? S.previewTheme : null }, location.origin);
}

function fitPreview() {
  const box = $('.pv-box'), frame = $('#pvFrame'), f = $('#pv');
  if (!box || !frame || !f) return;
  const W = S.device === 'phone' ? 390 : 1440, H = S.device === 'phone' ? 844 : 900;
  const bw = box.clientWidth - 24, bh = box.clientHeight - 24;
  if (bw <= 0 || bh <= 0) return;
  const sc = Math.min(1, bw / W, bh / H);
  f.style.width = W + 'px';
  f.style.height = H + 'px';
  f.style.transform = 'scale(' + sc + ')';
  frame.style.width = Math.round(W * sc) + 'px';
  frame.style.height = Math.round(H * sc) + 'px';
}

function setupPreview() {
  window.addEventListener('message', (e) => {
    const f = $('#pv');
    if (e.origin !== location.origin || !f || e.source !== f.contentWindow || !e.data || e.data.type !== 'ay:ready') return;
    S.pvReady = true;
    const tab = TABS.find((x) => x.id === S.tab);
    postPreview(tab && tab.focus ? tab.focus : undefined);
  });
  const box = $('.pv-box');
  if (window.ResizeObserver) new ResizeObserver(fitPreview).observe(box);
  window.addEventListener('resize', fitPreview);
  fitPreview();
}

/* ======================= publish ======================= */

function progress(title, steps) {
  const items = steps.map((s) => h('li', null, icon('check'), h('span', { text: s })));
  const msg = h('p', { style: 'margin:14px 0 0' });
  const actions = h('div', { class: 'actions' });
  const d = h('dialog', null, h('h2', { text: title }), h('ul', { class: 'steps' }, items), msg, actions);
  d.addEventListener('cancel', (e) => e.preventDefault());
  document.body.append(d);
  d.showModal();
  const api_ = {
    step(i) { items.forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('on', k === i); }); },
    label(i, text) { items[i].querySelector('span').textContent = text; },
    hide() { d.close(); },
    show() { if (!d.open) d.showModal(); },
    close() { d.close(); d.remove(); },
    done(text) {
      items.forEach((li) => { li.classList.add('done'); li.classList.remove('on'); });
      msg.textContent = text;
      actions.append(h('a', { class: 'btn', href: '/', target: '_blank', rel: 'noopener' }, icon('ext'), 'Siteyi aç'), h('button', { type: 'button', class: 'btn primary', onclick: () => api_.close() }, 'Tamam'));
      actions.querySelector('.btn.primary').focus();
    },
    fail(text) {
      msg.textContent = text;
      msg.style.color = 'var(--danger)';
      actions.append(h('button', { type: 'button', class: 'btn primary', onclick: () => api_.close() }, 'Kapat'));
      actions.querySelector('.btn.primary').focus();
    },
  };
  return api_;
}

const newRev = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

async function startPublish() {
  if (!isDirty() || S.publishing) return;
  const note = await dialog({
    title: 'Değişiklikleri yayınla',
    body: 'Site yaklaşık bir dakika içinde güncellenir. Her yayın bir sürüm olarak saklanır; istersen “Geçmiş sürümler”den geri dönebilirsin.',
    input: { label: 'Ne değişti? (isteğe bağlı, geçmişte görünür)', placeholder: 'Örneğin: ders fiyatları güncellendi' },
    ok: 'Yayınla',
  });
  if (note === false) return;
  await publish(note);
}

async function publish(note) {
  S.publishing = true;
  updateStatus();
  const ui = progress('Yayınlanıyor…', ['Hazırlanıyor', 'Dosyalar yükleniyor', 'Kaydediliyor', 'Yayına gönderiliyor']);
  try {
    ui.step(0);
    const branch = S.user.repo.branch;
    const ref = await gh('git/ref/heads/' + branch);
    const head = ref.object.sha;
    if (head !== S.baseSha) {
      let latest = null;
      try { latest = normalize(JSON.parse(await gh('contents/content/site.json?ref=' + head, { accept: RAW, text: true }))); } catch (e) { /* treat as changed */ }
      if (!latest || !same(latest, S.published)) {
        ui.hide();
        const go = await dialog({ title: 'Sitede başka bir değişiklik var', body: 'Bu paneli açtıktan sonra site içeriği başka bir yerden (başka bir cihaz ya da sekme) değişmiş. Yayınlarsan oradaki içerik değişiklikleri seninkilerle değişir.', ok: 'Yine de yayınla' });
        if (!go) throw new Cancelled();
        ui.show();
      }
    }
    const commit = await gh('git/commits/' + head);
    const tree = [];
    const used = pendingUsed(S.draft);
    ui.step(1);
    if (used.length) ui.label(1, 'Dosyalar yükleniyor (0/' + used.length + ')');
    let n = 0;
    for (const p of used) {
      const content = await blobToBase64(S.uploads.get(p).blob);
      const blob = await gh('git/blobs', { method: 'POST', body: { content, encoding: 'base64' } });
      tree.push({ path: 'public' + p, mode: '100644', type: 'blob', sha: blob.sha });
      ui.label(1, 'Dosyalar yükleniyor (' + (++n) + '/' + used.length + ')');
    }
    ui.step(2);
    const out = clone(S.draft);
    out.meta = { rev: newRev(), updatedAt: new Date().toISOString() };
    tree.push({ path: 'content/site.json', mode: '100644', type: 'blob', content: JSON.stringify(out, null, 2) + '\n' });
    const newTree = await gh('git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree } });
    const message = 'Panelden güncelleme' + (note ? ': ' + note : '');
    const newCommit = await gh('git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [head] } });
    ui.step(3);
    await gh('git/refs/heads/' + branch, { method: 'PATCH', body: { sha: newCommit.sha, force: false } });
    for (const p of used) S.uploads.get(p).committed = true;
    S.baseSha = newCommit.sha;
    S.draft.meta = out.meta;
    S.published = clone(S.draft);
    ls.del(DRAFT_KEY);
    ui.done('Yayınlandı! Site yaklaşık bir dakika içinde güncellenecek. Hazır olunca burada haber vereceğim.');
    watchLive(out.meta.rev);
  } catch (e) {
    if (e instanceof Cancelled) ui.close();
    else ui.fail(errorText(e));
  } finally {
    S.publishing = false;
    updateStatus();
  }
}

function watchLive(rev) {
  const started = Date.now();
  const check = async () => {
    try {
      const r = await fetch('/content/site.json?v=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j && j.meta && j.meta.rev === rev) {
          toast('Site güncellendi, yeni hali yayında.', { ms: 6000 });
          const st = $('#status');
          if (st && !isDirty()) st.textContent = 'Yayında · ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          return;
        }
      }
    } catch (e) { /* keep waiting */ }
    if (Date.now() - started < 5 * 60 * 1000) setTimeout(check, 6000);
    else toast('Yayın biraz gecikti. Birkaç dakika sonra siteye bak; hâlâ eski haliyse bana yaz.', { error: true, ms: 9000 });
  };
  setTimeout(check, 20000);
}

async function discard() {
  if (!isDirty()) return;
  if (!(await dialog({ title: 'Değişiklikler atılsın mı?', body: 'Yayınlamadığın bütün değişiklikler silinir ve yayındaki haline dönülür.', ok: 'Değişiklikleri at', danger: true }))) return;
  S.draft = clone(S.published);
  for (const [p, u] of S.uploads) if (!u.committed) { URL.revokeObjectURL(u.url); S.uploads.delete(p); }
  ls.del(DRAFT_KEY);
  changed({ rerender: true });
}

async function logout() {
  if (isDirty()) saveDraft();
  try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
  location.href = '/admin/';
}

function onSessionLost() {
  if (S.lost) return;
  S.lost = true;
  saveDraft();
  const pending = [...S.uploads.values()].some((u) => !u.committed);
  dialog({
    title: 'Oturumun kapandı',
    body: 'Güvenlik için arada bir yeniden giriş yapman gerekiyor. Yazdığın değişiklikler bu cihazda saklandı; giriş yapınca kaldığın yerden devam edebilirsin.' + (pending ? ' Yeni yüklediğin dosyaları ise tekrar yüklemen gerekecek.' : ''),
    ok: 'Tekrar giriş yap', cancel: null,
  }).then(() => { location.href = '/api/auth/login?return=/admin/'; });
}

/* ======================= boot ======================= */

function screen(...kids) {
  const app = $('#app');
  app.innerHTML = '';
  app.append(h('div', { class: 'screen' }, ...kids));
}

function screenLogin(err) {
  const msg = {
    denied: 'Giriş iptal edildi.',
    state: 'Giriş süresi doldu, tekrar dene.',
    token: 'GitHub girişi tamamlanamadı, tekrar dene.',
    user: 'GitHub hesabına ulaşılamadı, tekrar dene.',
    repo: 'Bu GitHub hesabı site deposunu göremiyor. Doğru hesapla giriş yaptığından emin ol.',
    forbidden: 'Bu GitHub hesabının siteyi düzenleme yetkisi yok.',
  }[err];
  screen(h('div', { class: 'card-login' },
    h('span', { class: 'logo', 'aria-hidden': 'true' }),
    h('h1', { text: 'Site paneli' }),
    h('p', { text: 'Sitedeki yazıları, renkleri, videoları ve fotoğrafları buradan değiştirebilirsin.' }),
    h('a', { class: 'btn primary', href: '/api/auth/login?return=/admin/' }, 'GitHub ile giriş yap'),
    msg ? h('p', { class: 'err', text: msg }) : null));
}

function screenMessage(title, text) {
  screen(h('div', { class: 'card-login' }, h('span', { class: 'logo', 'aria-hidden': 'true' }), h('h1', { text: title }), h('p', { text }),
    h('button', { type: 'button', class: 'btn', onclick: () => location.reload() }, 'Sayfayı yenile')));
}

async function loadPublished() {
  const ref = await gh('git/ref/heads/' + S.user.repo.branch);
  S.baseSha = ref.object.sha;
  let text;
  try { text = await gh('contents/content/site.json?ref=' + S.baseSha, { accept: RAW, text: true }); }
  catch (e) { if (e.status !== 404) throw e; text = JSON.stringify(DEFAULTS); }
  S.published = normalize(JSON.parse(text));
  S.draft = clone(S.published);
}

function stripPending(cfg, pending) {
  const gone = new Set(pending || []);
  if (!gone.size) return cfg;
  const g = cfg.sections.find((s) => s.id === 'gallery');
  if (g) g.images = g.images.filter((im) => !gone.has(im.src) && !gone.has(im.thumb));
  if (gone.has(cfg.media.logo.src)) cfg.media.logo = clone(S.published.media.logo);
  if (gone.has(cfg.site.shareImage)) cfg.site.shareImage = S.published.site.shareImage;
  if (gone.has(cfg.audio.src)) cfg.audio.src = S.published.audio.src;
  return cfg;
}

async function maybeRestoreDraft() {
  let d = null;
  try { d = JSON.parse(ls.get(DRAFT_KEY) || 'null'); } catch (e) { d = null; }
  if (!d || !d.cfg) return;
  const cand = stripPending(normalize(d.cfg), d.pending);
  cand.meta = clone(S.published.meta);
  if (same(cand, S.published)) { ls.del(DRAFT_KEY); return; }
  const when = new Date(d.at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
  const ok = await dialog({
    title: 'Yayınlanmamış bir taslağın var',
    body: when + ' tarihinde bu cihazda kaydedilmiş, yayınlanmamış değişiklikler bulundu. Kaldığın yerden devam etmek ister misin?' + ((d.pending || []).length ? ' O taslakta yeni yüklediğin dosyalar varsa onları tekrar yüklemen gerekecek.' : ''),
    ok: 'Devam et', cancel: 'Taslağı sil',
  });
  if (ok) S.draft = cand;
  else ls.del(DRAFT_KEY);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } }
  let res;
  try { res = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }); }
  catch (e) { return screenMessage('Bağlantı yok', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip sayfayı yenile.'); }
  if (res.status === 503) return screenMessage('Panel henüz bağlanmadı', 'GitHub ile giriş için Cloudflare ayarlarının tamamlanması gerekiyor.');
  if (res.status === 401) return screenLogin(err);
  if (!res.ok) return screenMessage('Bir sorun oldu', 'Beklenmeyen bir hata oluştu (' + res.status + '). Sayfayı yenileyip tekrar dene.');
  S.user = await res.json();
  screen(h('p', { class: 'muted', text: 'Site içeriği yükleniyor…' }));
  try { await loadPublished(); }
  catch (e) { return screenMessage('İçerik yüklenemedi', errorText(e)); }
  const hashTab = (location.hash || '').slice(1);
  if (TABS.some((x) => x.id === hashTab)) S.tab = hashTab;
  await maybeRestoreDraft();
  renderShell();
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { saveDraft(); e.preventDefault(); e.returnValue = ''; } });
}

boot();
