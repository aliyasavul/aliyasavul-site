// Shared by the build script (Node) and the browser (site + admin preview).
// content/site.json holds everything the admin panel can change; normalize() fills in
// anything missing from DEFAULTS, and the render* functions turn it into HTML.

export const LANGS = ['tr', 'en'];

export const FONT_CATALOG = {
  display: [
    { name: 'Barlow Condensed', weights: [500, 600, 700] },
    { name: 'Bebas Neue', weights: [400] },
    { name: 'Oswald', weights: [400, 500, 600, 700] },
    { name: 'Anton', weights: [400] },
    { name: 'Antonio', weights: [400, 500, 600, 700] },
    { name: 'Saira Condensed', weights: [400, 500, 600, 700] },
    { name: 'Teko', weights: [400, 500, 600, 700] },
    { name: 'Archivo Narrow', weights: [400, 500, 600, 700] },
    { name: 'Fjalla One', weights: [400] },
    { name: 'League Gothic', weights: [400] },
  ],
  body: [
    { name: 'Barlow', weights: [400, 500, 600] },
    { name: 'Inter', weights: [400, 500, 600] },
    { name: 'IBM Plex Sans', weights: [400, 500, 600] },
    { name: 'Manrope', weights: [400, 500, 600] },
    { name: 'Work Sans', weights: [400, 500, 600] },
    { name: 'DM Sans', weights: [400, 500, 600] },
    { name: 'Space Grotesk', weights: [400, 500, 600] },
    { name: 'Archivo', weights: [400, 500, 600] },
    { name: 'Sora', weights: [400, 500, 600] },
  ],
  mono: [
    { name: 'IBM Plex Mono', weights: [400, 500] },
    { name: 'JetBrains Mono', weights: [400, 500] },
    { name: 'DM Mono', weights: [400, 500] },
    { name: 'Roboto Mono', weights: [400, 500] },
    { name: 'Space Mono', weights: [400, 700] },
  ],
};

const FALLBACK_STACK = {
  display: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  body: "'Helvetica Neue', Arial, sans-serif",
  mono: 'ui-monospace, Menlo, Consolas, monospace',
};

export const COLOR_KEYS = [
  'background', 'text', 'muted', 'accent', 'accentText', 'line', 'panel',
  'bannerBackground', 'bannerText', 'logo', 'glow', 'timeline',
];

export const PRESETS = {
  amber: { background: '#000000', text: '#ece4d6', muted: '#a59b8a', accent: '#e9a14b', accentText: '#0a0705', line: '#ece4d6', panel: '#050403', bannerBackground: '#e9a14b', bannerText: '#0a0705', logo: '#f2efe8', glow: '#ffa03c', timeline: '#ffc36a' },
  bone: { background: '#050505', text: '#eeeae2', muted: '#9c968b', accent: '#d9ccb4', accentText: '#0b0a08', line: '#eeeae2', panel: '#0a0a09', bannerBackground: '#d9ccb4', bannerText: '#0b0a08', logo: '#f4f1ea', glow: '#ffc27a', timeline: '#ffe4b8' },
  blood: { background: '#030101', text: '#efe6e1', muted: '#a8928c', accent: '#c4202c', accentText: '#fff3ef', line: '#efe6e1', panel: '#0a0303', bannerBackground: '#8f141c', bannerText: '#fff3ef', logo: '#f3ece8', glow: '#ff6a3c', timeline: '#ff6b4a' },
  ash: { background: '#0b0b0c', text: '#e6e6e6', muted: '#8e8e93', accent: '#f0f0f0', accentText: '#0b0b0c', line: '#e6e6e6', panel: '#111113', bannerBackground: '#e6e6e6', bannerText: '#0b0b0c', logo: '#ffffff', glow: '#ffb060', timeline: '#ffffff' },
  toxic: { background: '#020302', text: '#e7ecdf', muted: '#94a088', accent: '#a6d84b', accentText: '#071003', line: '#e7ecdf', panel: '#060a04', bannerBackground: '#a6d84b', bannerText: '#071003', logo: '#f0f5e8', glow: '#d8ff6a', timeline: '#dcff7a' },
};

// natural kinds of amber: the colour shift keeps the stone believable
export const STONE_PRESETS = {
  natural: { hue: 0, saturation: 100, brightness: 100 },
  honey: { hue: 10, saturation: 92, brightness: 108 },
  cherry: { hue: -12, saturation: 112, brightness: 92 },
  cognac: { hue: -6, saturation: 82, brightness: 84 },
  lemon: { hue: 22, saturation: 106, brightness: 112 },
  green: { hue: 48, saturation: 78, brightness: 98 },
};

const bi = (tr, en) => ({ tr, en });

export const DEFAULTS = {
  version: 1,
  meta: { rev: '', updatedAt: '' },
  site: {
    name: 'Ali Yasavul',
    url: 'https://aliyasavul.com',
    defaultLang: 'auto',
    title: bi('Ali Yasavul | Elektro Gitarist · Gitar Dersi · Session', 'Ali Yasavul | Electric Guitarist · Lessons · Session'),
    description: bi(
      'Ali Yasavul ile birebir elektro gitar dersleri, session gitaristlik, kayıt ve aranje.',
      'One-on-one electric guitar lessons, session guitar, recording and arrangement with Ali Yasavul.'
    ),
    shareImage: '/assets/share.jpg',
  },
  theme: {
    preset: 'amber',
    fonts: { display: 'Barlow Condensed', body: 'Barlow', mono: 'IBM Plex Mono' },
    colors: { ...PRESETS.amber },
    effects: { glitch: 50, glow: 50, spin: 50, parallax: 50 },
    stone: { preset: 'natural', ...STONE_PRESETS.natural },
  },
  // saved looks (for example a New Year theme) that can switch on by themselves between two dates
  themes: { auto: true, list: [] },
  media: {
    logo: { src: '/assets/logo-white.webp', width: 1926, height: 816 },
    stone: { mp4: '/assets/amber.mp4', mp4Small: '/assets/amber-480.mp4', webm: '/assets/amber.webm', poster: '/assets/amber-poster.jpg' },
  },
  audio: { src: '', title: bi('Ambiyans', 'Ambient drone'), volume: 70 },
  gate: {
    tagline: bi('Elektro gitar · Ders · Session · Kayıt · Aranje', 'Electric guitar · Lessons · Session · Recording · Arrangement'),
    start: bi('Başlamak için tıkla', 'Click to start'),
    note: bi('Ses açık', 'Sound on'),
    noteOff: bi('Ses kapalı', 'Sound off'),
  },
  header: { cta: { label: bi('Ders al', 'Book a lesson'), target: 'lessons' } },
  banner: { enabled: false, text: bi('Kasım için 2 öğrenci yeri kaldı.', '2 student spots left for November.'), linkLabel: bi('Yer ayırt', 'Save a spot'), link: '' },
  intro: { nav: bi('Giriş', 'Intro'), era: bi('Bugün', 'Today'), stamp: '0' },
  sections: [
    {
      id: 'about', enabled: true, stamp: '23',
      nav: bi('Hakkımda', 'About'),
      era: bi('23 milyon yıl önce · Miyosen', '23 million years ago · Miocene'),
      title: bi('Hakkımda', 'About'),
      body: bi(
        '[Kısa biyografin: kaç yıldır çaldığın, sevdiğin tarzlar ve birlikte çaldığın gruplar ya da sanatçılar.]',
        '[Your short bio: how long you have been playing, the styles you love, and the bands or artists you have played with.]'
      ),
      facts: [
        { k: bi('Enstrüman', 'Instrument'), v: bi('Elektro gitar', 'Electric guitar') },
        { k: bi('Deneyim', 'Playing for'), v: bi('[X] yıl', '[X] years') },
        { k: bi('Tarzlar', 'Styles'), v: bi('[Tarzların]', '[Your styles]') },
      ],
    },
    {
      id: 'lessons', enabled: true, stamp: '34',
      nav: bi('Dersler', 'Lessons'),
      era: bi('34 milyon yıl önce · Oligosen', '34 million years ago · Oligocene'),
      title: bi('Gitar dersleri', 'Guitar lessons'),
      body: bi(
        'Birebir elektro gitar dersleri: teknik, teori, ton ve gerçekten çalmak istediğin şarkılar.',
        'One-on-one electric guitar lessons: technique, theory, tone and the songs you actually want to play.'
      ),
      facts: [
        { k: bi('Nerede', 'Where'), v: bi('Online ya da yüz yüze, [şehrin]', 'Online or in person, [your city]') },
        { k: bi('Seviye', 'Level'), v: bi('Başlangıçtan ileri seviyeye', 'Beginner to advanced') },
      ],
      packages: [
        { name: bi('Tek ders', 'Single lesson'), price: bi('[Fiyat]', '[Price]'), details: bi('60 dakika', '60 minutes') },
        { name: bi('4 derslik paket', '4-lesson pack'), price: bi('[Fiyat]', '[Price]'), details: bi('Haftada bir, 60 dakika', 'Once a week, 60 minutes') },
      ],
      cta: { label: bi('Ders ayarla', 'Book a lesson'), target: 'contact' },
    },
    {
      id: 'work', enabled: true, stamp: '56',
      nav: bi('Portfolyo', 'Work'),
      era: bi('56 milyon yıl önce · Eosen', '56 million years ago · Eocene'),
      title: bi('Portfolyo', 'Work'),
      body: bi(
        'Session gitar, kayıt ve aranje. Şarkın için doğru partisyonu birlikte bulalım.',
        "Session guitar, recording and arrangement. Let's find the right part for your song."
      ),
      services: [
        { name: bi('Session gitar', 'Session guitar'), desc: bi('Şarkıların ve kayıtların için gitar partisyonları', 'Parts for your songs and records') },
        { name: bi('Kayıt', 'Recording'), desc: bi('Ritim, lead, solo ve dokular', 'Rhythm, leads, solos and textures') },
        { name: bi('Aranje', 'Arrangement'), desc: bi('Şarkıya göre yazılmış gitar partisyonları', 'Guitar parts written for the song') },
      ],
      videos: [],
      // Ali's own recordings, uploaded through the panel (MP3s made from his WAV masters)
      recordings: [],
      // songs on Spotify Ali arranged, recorded, wrote or played on
      tracks: [],
    },
    {
      id: 'gallery', enabled: true, stamp: '66',
      nav: bi('Galeri', 'Gallery'),
      era: bi("66 milyon yıl önce · Kretase'nin sonu", '66 million years ago · End of the Cretaceous'),
      title: bi('Galeri', 'Gallery'),
      body: bi('', ''),
      images: [],
      instagram: { enabled: false, profile: '', feedUrl: '', count: 6, label: bi("Instagram'da takip et", 'Follow on Instagram') },
    },
    {
      id: 'contact', enabled: true, stamp: '99 MA',
      nav: bi('İletişim', 'Contact'),
      era: bi('99 milyon yıl önce · Kehribardaki dinozor kuyruğu', '99 million years ago · The dinosaur tail in amber'),
      title: bi('İletişim', 'Contact'),
      body: bi(
        'Ders, session ya da aranje: neye ihtiyacın olduğunu yaz, sana dönüş yapayım.',
        'Lessons, a session or an arrangement: tell me what you need and I will get back to you.'
      ),
      email: 'info@aliyasavul.com',
      whatsapp: { number: '', message: bi('Merhaba Ali, ders hakkında bilgi almak istiyorum.', "Hi Ali, I'd like to ask about lessons.") },
      booking: { url: '', label: bi('Takvimden gün seç', 'Pick a time') },
      links: [
        { label: 'Instagram', url: '' },
        { label: 'YouTube', url: '' },
        { label: 'Spotify', url: '' },
      ],
    },
  ],
  strings: {
    soundOff: bi('Ses kapalı', 'Sound off'),
    nowPlaying: bi('Çalıyor', 'Now playing'),
    soundOn: bi('Sesi aç', 'Sound on'),
    soundMute: bi('Sesi kapat', 'Sound off'),
    dragHint: bi('Kehribarı çevirmek için sürükle', 'Drag to turn the amber'),
    scrollHint: bi('Kaydır', 'Scroll'),
    copy: bi('Kopyala', 'Copy'),
    copied: bi('Kopyalandı', 'Copied'),
    selected: bi('Seçildi', 'Selected'),
    email: bi('E-posta', 'Email'),
    whatsapp: bi("WhatsApp'tan yaz", 'Message on WhatsApp'),
    watch: bi('İzle', 'Watch'),
    listen: bi('Dinle', 'Listen'),
    onSpotify: bi("Spotify'da", 'On Spotify'),
    openSpotify: bi("Spotify'da aç", 'Open in Spotify'),
    recordings: bi('Kayıtlar', 'Recordings'),
    play: bi('Çal', 'Play'),
    pause: bi('Duraklat', 'Pause'),
    seek: bi('Şarkıda ilerle', 'Seek'),
    close: bi('Kapat', 'Close'),
    prev: bi('Önceki', 'Previous'),
    next: bi('Sonraki', 'Next'),
    backToStart: bi('Ali Yasavul, başa dön', 'Ali Yasavul, back to the start'),
    sections: bi('Bölümler, milyon yıl önce cinsinden bir jeolojik zaman çizelgesinde', 'Sections, set on a geological timeline in millions of years ago'),
    stoneLabel: bi('İçeriden aydınlanan, yavaşça dönen ham bir kehribar parçası. Çevirmek için sürükle.', 'A raw piece of amber lit from inside, turning slowly. Drag to turn it.'),
    language: bi('Dil', 'Language'),
    switchTo: bi("Switch to English", "Türkçe'ye geç"),
    instagram: bi('Instagram', 'Instagram'),
    dismiss: bi('Duyuruyu kapat', 'Dismiss announcement'),
  },
};

/* ---------------- helpers ---------------- */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isBi = (v) => isObj(v) && ('tr' in v || 'en' in v) && Object.keys(v).every((k) => k === 'tr' || k === 'en');
export const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function merge(target, src) {
  if (!isObj(src)) return target;
  for (const k of Object.keys(src)) {
    const sv = src[k];
    if (sv === undefined) continue;
    const tv = target[k];
    if (isObj(tv) && isObj(sv)) merge(tv, sv);
    else if (isBi(tv) && typeof sv === 'string') target[k] = { tr: sv, en: sv };
    else target[k] = clone(sv);
  }
  return target;
}

const HEX = /^#[0-9a-f]{6}$/i;
const FONT_NAME = /^[A-Za-z0-9 ]{1,40}$/;
const clampNum = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

const MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function sanitizeTheme(th) {
  const base = DEFAULTS.theme;
  for (const k of ['fonts', 'colors', 'effects', 'stone']) if (!isObj(th[k])) th[k] = clone(base[k]);
  const c = th.colors;
  for (const k of COLOR_KEYS) if (!HEX.test(String(c[k] || ''))) c[k] = base.colors[k];
  const f = th.fonts;
  for (const k of ['display', 'body', 'mono']) if (!FONT_NAME.test(String(f[k] || ''))) f[k] = base.fonts[k];
  const e = th.effects;
  for (const k of ['glitch', 'glow', 'spin', 'parallax']) e[k] = clampNum(e[k], 0, 100, base.effects[k]);
  const st = th.stone;
  st.hue = clampNum(st.hue, -60, 60, 0);
  st.saturation = clampNum(st.saturation, 40, 160, 100);
  st.brightness = clampNum(st.brightness, 70, 130, 100);
  return th;
}

// the saved theme whose dates include today, if seasonal switching is on
export function themeForDate(cfg, date = new Date()) {
  const T = cfg.themes;
  if (!T || !T.auto) return null;
  const today = (date.getMonth() + 1) * 100 + date.getDate();
  const num = (md) => (MD.test(md || '') ? Number(md.slice(0, 2)) * 100 + Number(md.slice(3)) : null);
  for (const th of T.list) {
    const a = num(th.from), b = num(th.to);
    if (a == null || b == null) continue;
    if (a <= b ? today >= a && today <= b : today >= a || today <= b) return th;
  }
  return null;
}

// the config as it looks with a saved theme on top
export function withTheme(cfg, th) {
  if (!th) return cfg;
  const out = clone(cfg);
  out.theme = sanitizeTheme(merge(clone(cfg.theme), th.theme || {}));
  if (th.banner) out.banner = merge(clone(cfg.banner), th.banner);
  out.activeTheme = th.id;
  return out;
}

export function normalize(raw) {
  const src = isObj(raw) ? raw : {};
  const rest = { ...src };
  delete rest.sections;
  const out = merge(clone(DEFAULTS), rest);

  const defaults = new Map(DEFAULTS.sections.map((s) => [s.id, s]));
  const seen = new Set();
  const list = [];
  for (const s of Array.isArray(src.sections) ? src.sections : []) {
    if (!isObj(s) || !defaults.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    list.push(merge(clone(defaults.get(s.id)), s));
  }
  for (const d of DEFAULTS.sections) if (!seen.has(d.id)) list.push(clone(d));
  out.sections = list;

  sanitizeTheme(out.theme);
  const T = out.themes;
  T.auto = T.auto !== false;
  T.list = (Array.isArray(T.list) ? T.list : []).filter((th) => isObj(th) && typeof th.id === 'string' && th.id).slice(0, 24).map((th) => ({
    id: String(th.id).slice(0, 40),
    name: String(th.name || 'Tema').slice(0, 60),
    from: MD.test(th.from || '') ? th.from : '',
    to: MD.test(th.to || '') ? th.to : '',
    theme: sanitizeTheme(merge(clone(out.theme), isObj(th.theme) ? th.theme : {})),
    banner: isObj(th.banner) ? merge(clone(DEFAULTS.banner), th.banner) : null,
  }));
  out.audio.volume = clampNum(out.audio.volume, 0, 100, 70);
  if (!['auto', 'tr', 'en'].includes(out.site.defaultLang)) out.site.defaultLang = 'auto';
  const lg = out.media.logo;
  lg.width = clampNum(lg.width, 1, 20000, 1926);
  lg.height = clampNum(lg.height, 1, 20000, 816);
  return out;
}

export function t(v, lang) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);
  const own = v[lang];
  if (typeof own === 'string' && own.trim()) return own;
  for (const k of LANGS) if (typeof v[k] === 'string' && v[k].trim()) return v[k];
  return '';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

export function prose(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s.split(/\n\s*\n/).map((p) => '<p>' + inline(p.trim()) + '</p>').join('');
}

export function safeUrl(u, { allowBlob = false } = {}) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^(mailto|tel):[^\s"'<>]+$/i.test(s)) return s;
  if (/^\/(?!\/)[^\s"'<>]*$/.test(s)) return s;
  if (allowBlob && /^blob:[^\s"'<>]+$/i.test(s)) return s;
  return '';
}

function cssUrl(u) {
  const s = safeUrl(u, { allowBlob: true });
  return s && !/[()\\]/.test(s) ? s : '';
}

// the parts Ali can have played in a song, shown under its title
export const ROLES = {
  arrangement: bi('Aranje', 'Arrangement'),
  recording: bi('Kayıt', 'Recording'),
  composition: bi('Beste', 'Composition'),
  guitar: bi('Gitar', 'Guitar'),
};

const rolesText = (roles, L) => (Array.isArray(roles) ? roles : []).filter((r) => ROLES[r]).map((r) => L(ROLES[r])).join(' · ');
export const mmss = (sec) => { const s = Math.max(0, Math.round(Number(sec) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// the outline of a recording (160 one-byte bars, base64) as an SVG path in a 640 x 40 box
function wavePath(peaks) {
  let bytes = [];
  try { bytes = Array.from(atob(String(peaks || '')), (ch) => ch.charCodeAt(0)); } catch (e) { bytes = []; }
  if (!bytes.length) bytes = new Array(80).fill(40);
  const n = Math.min(240, bytes.length), w = 640 / n, bw = Math.max(1, w * 0.62);
  let d = '';
  for (let i = 0; i < n; i++) {
    const hgt = Math.max(1.5, (bytes[i] / 255) * 40);
    d += 'M' + (i * w + (w - bw) / 2).toFixed(1) + ' ' + ((40 - hgt) / 2).toFixed(1) + 'h' + bw.toFixed(1) + 'v' + hgt.toFixed(1) + 'h-' + bw.toFixed(1) + 'z';
  }
  return d;
}

// a Spotify link or URI → { kind, id }; also accepts the localised (intl-tr) and embed links
export function spotifyRef(u) {
  const s = String(u || '').trim();
  let m = s.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]{22})$/);
  if (!m) m = s.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i);
  return m ? { kind: m[1].toLowerCase(), id: m[2] } : null;
}

export function youtubeId(url) {
  const s = String(url || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : '';
}

export function whatsappLink(number, message) {
  let d = String(number || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = '90' + d.slice(1);
  else if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  return 'https://wa.me/' + d + (message ? '?text=' + encodeURIComponent(message) : '');
}

export function prettyUrl(u) {
  return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => 'rgba(' + hexToRgb(hex).join(', ') + ', ' + a + ')';

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/* ---------------- fonts and theme ---------------- */

function fontEntry(role, name) {
  return FONT_CATALOG[role].find((f) => f.name === name) || FONT_CATALOG.display.concat(FONT_CATALOG.body, FONT_CATALOG.mono).find((f) => f.name === name) || null;
}

export function fontsHref(cfg) {
  const fams = new Map();
  for (const role of ['display', 'body', 'mono']) {
    const name = cfg.theme.fonts[role];
    const entry = fontEntry(role, name);
    const weights = entry ? entry.weights : [400];
    const prev = fams.get(name) || new Set();
    weights.forEach((w) => prev.add(w));
    fams.set(name, prev);
  }
  const parts = [];
  for (const [name, ws] of fams) {
    const list = [...ws].sort((a, b) => a - b);
    const fam = name.trim().replace(/ +/g, '+');
    parts.push('family=' + fam + (list.length > 1 || list[0] !== 400 ? ':wght@' + list.join(';') : ''));
  }
  return 'https://fonts.googleapis.com/css2?' + parts.join('&') + '&display=swap';
}

export function themeCSS(cfg) {
  const c = cfg.theme.colors;
  const f = cfg.theme.fonts;
  const e = cfg.theme.effects;
  const logo = cfg.media.logo;
  const logoUrl = cssUrl(logo.src) || DEFAULTS.media.logo.src;
  const q = (name) => "'" + name + "'";
  return ':root{' + [
    '--bg:' + c.background,
    '--text:' + c.text,
    '--muted:' + c.muted,
    '--accent:' + c.accent,
    '--accent-ink:' + c.accentText,
    '--accent-soft:' + rgba(c.accent, 0.15),
    '--line:' + rgba(c.line, 0.22),
    '--line-strong:' + rgba(c.line, 0.6),
    '--scrim:' + rgba(c.panel, 0.7),
    '--shadow:' + rgba(c.background, 0.9),
    '--banner-bg:' + c.bannerBackground,
    '--banner-ink:' + c.bannerText,
    '--logo:' + c.logo,
    '--glow:' + rgba(c.glow, 0.5),
    '--glow-base:' + (0.02 + 0.06 * (e.glow / 50)).toFixed(3),
    '--tl-light:' + c.timeline,
    '--stone-filter:hue-rotate(' + cfg.theme.stone.hue + 'deg) saturate(' + (cfg.theme.stone.saturation / 100) + ') brightness(' + (cfg.theme.stone.brightness / 100) + ')',
    '--logo-src:url("' + logoUrl + '")',
    '--logo-ar:' + logo.width + ' / ' + logo.height,
    '--f-display:' + q(f.display) + ', ' + FALLBACK_STACK.display,
    '--f-body:' + q(f.body) + ', ' + FALLBACK_STACK.body,
    '--f-mono:' + q(f.mono) + ', ' + FALLBACK_STACK.mono,
  ].join(';') + '}';
}

/* ---------------- structure ---------------- */

export function enabledSections(cfg) {
  const list = [{ id: 'intro', nav: cfg.intro.nav, era: cfg.intro.era, stamp: cfg.intro.stamp }];
  for (const s of cfg.sections) if (s.enabled) list.push(s);
  return list;
}

export function sectionById(cfg, id) {
  return cfg.sections.find((s) => s.id === id) || null;
}

// Where a call-to-action goes: a section, the booking link or WhatsApp.
export function ctaHref(cfg, target, lang) {
  const contact = sectionById(cfg, 'contact');
  if (target === 'booking' && contact && safeUrl(contact.booking.url)) return { href: safeUrl(contact.booking.url) };
  if (target === 'whatsapp' && contact && contact.whatsapp.number) return { href: whatsappLink(contact.whatsapp.number, t(contact.whatsapp.message, lang)) };
  const on = enabledSections(cfg).map((s) => s.id);
  if (on.includes(target)) return { go: target };
  if (on.includes('contact')) return { go: 'contact' };
  return null;
}

function eraHTML(era) {
  const parts = String(era || '').split(/\s+·\s+/).filter(Boolean);
  if (!parts.length) return '';
  return '<p class="era">' + parts.map((p) => '<span>' + esc(p) + '</span>').join('') + '</p>';
}

function factsHTML(items, lang, cls = 'facts') {
  const rows = (items || []).map((it) => {
    const k = t(it && it.k, lang), v = t(it && it.v, lang);
    if (!k && !v) return '';
    return '<li><span class="k">' + esc(k) + '</span><span class="v">' + inline(v) + '</span></li>';
  }).join('');
  return rows ? '<ul class="' + cls + '">' + rows + '</ul>' : '';
}

function actionHTML(cfg, cta, lang, cls) {
  if (!cta) return '';
  const label = t(cta.label, lang);
  const dest = ctaHref(cfg, cta.target, lang);
  if (!label || !dest) return '';
  if (dest.href) return '<a class="' + cls + '" href="' + esc(dest.href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
  return '<button type="button" class="' + cls + '" data-go="' + esc(dest.go) + '">' + esc(label) + '</button>';
}

function panelInner(cfg, s, lang) {
  const L = (v) => t(v, lang);
  const S = (k) => L(cfg.strings[k]);
  let html = eraHTML(L(s.era));
  html += '<h2 id="h-' + s.id + '">' + esc(L(s.title)) + '</h2>';
  const body = prose(L(s.body));
  if (body) html += '<div class="prose">' + body + '</div>';

  if (s.id === 'about') {
    html += factsHTML(s.facts, lang);
  }

  if (s.id === 'lessons') {
    html += factsHTML(s.facts, lang);
    const pk = (s.packages || []).map((p) => {
      const name = L(p.name), price = L(p.price), details = L(p.details);
      if (!name && !price) return '';
      return '<li><div class="pk-h"><b>' + esc(name) + '</b><span class="pk-p">' + esc(price) + '</span></div>' + (details ? '<p>' + inline(details) + '</p>' : '') + '</li>';
    }).join('');
    if (pk) html += '<ul class="packages">' + pk + '</ul>';
    html += actionHTML(cfg, s.cta, lang, 'btn');
  }

  if (s.id === 'work') {
    const sv = (s.services || []).map((it) => ({ k: it.name, v: it.desc }));
    html += factsHTML(sv, lang);
    const vids = (s.videos || []).map((v) => {
      const id = youtubeId(v.url);
      if (!id) return '';
      const title = L(v.title);
      return '<li><button type="button" class="vid" data-yt="' + id + '" data-title="' + esc(title) + '" aria-label="' + esc(S('watch') + (title ? ': ' + title : '')) + '">' +
        '<span class="vid-img"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="vid-play" aria-hidden="true"></span></span>' +
        (title ? '<span class="vid-t">' + esc(title) + '</span>' : '') + '</button></li>';
    }).join('');
    if (vids) html += '<ul class="videos">' + vids + '</ul>';
    const recs = (s.recordings || []).map((r, i) => {
      // the site's own uploads; blob: links are the panel's preview of a file that is not published yet
      const src = safeUrl(r && r.src, { allowBlob: true });
      if (!src || !(/^\/uploads\/[a-z0-9-]+\.(mp3|m4a)$/i.test(src) || /^blob:/.test(src))) return '';
      const title = L(r.title) || L(cfg.strings.recordings);
      const roles = rolesText(r.roles, L);
      const artist = typeof r.artist === 'string' ? r.artist.trim() : '';
      const d = wavePath(r.peaks);
      const dur = Math.max(0, Math.round(Number(r.duration) || 0));
      return '<li class="rec" data-src="' + esc(src) + '" data-title="' + esc(title) + '" data-dur="' + dur + '">' +
        '<button type="button" class="rec-play" data-rec="' + i + '" aria-pressed="false" aria-label="' + esc(S('play') + ': ' + title) + '"><span aria-hidden="true"></span></button>' +
        '<div class="rec-main"><div class="rec-h"><span class="trk-t">' + esc(title) + '</span><span class="rec-time"><span class="rec-now"></span>' + mmss(dur) + '</span></div>' +
        (artist || roles ? '<div class="rec-sub">' + (artist ? '<span class="trk-a">' + esc(artist) + '</span>' : '') + (roles ? '<span class="trk-r">' + esc(roles) + '</span>' : '') + '</div>' : '') +
        '<div class="rec-wave" role="slider" tabindex="0" aria-label="' + esc(S('seek') + ': ' + title) + '" aria-valuemin="0" aria-valuemax="' + dur + '" aria-valuenow="0" aria-valuetext="0:00">' +
        '<svg class="bg" viewBox="0 0 640 40" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '"/></svg>' +
        '<svg class="fg" viewBox="0 0 640 40" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '"/></svg></div></div></li>';
    }).join('');
    if (recs) html += '<div class="sp"><p class="sub-h">' + esc(S('recordings')) + '</p><ul class="recs">' + recs + '</ul></div>';
    const tracks = (s.tracks || []).map((tr) => {
      const ref = spotifyRef(tr && tr.url);
      if (!ref) return '';
      const title = L(tr.title);
      const roles = rolesText(tr.roles, L);
      const cover = safeUrl(tr.cover);
      const artist = typeof tr.artist === 'string' ? tr.artist.trim() : '';
      return '<li><button type="button" class="trk" data-sp="' + ref.kind + '/' + ref.id + '" data-title="' + esc(title) + '" aria-label="' + esc(S('listen') + (title ? ': ' + title : '') + (artist ? ', ' + artist : '')) + '">' +
        '<span class="trk-img">' + (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy" width="300" height="300">' : '') + '</span>' +
        '<span class="trk-txt">' + '<span class="trk-t">' + esc(title || 'Spotify') + '</span>' + (artist ? '<span class="trk-a">' + esc(artist) + '</span>' : '') + (roles ? '<span class="trk-r">' + esc(roles) + '</span>' : '') + '</span>' +
        '<span class="trk-play" aria-hidden="true"></span></button></li>';
    }).join('');
    if (tracks) html += '<div class="sp"><p class="sub-h">' + esc(S('onSpotify')) + '</p><ul class="tracks">' + tracks + '</ul></div>';
  }

  if (s.id === 'gallery') {
    const imgs = (s.images || []).map((im, i) => {
      const src = safeUrl(im.src, { allowBlob: true });
      if (!src) return '';
      const thumb = safeUrl(im.thumb, { allowBlob: true }) || src;
      return '<li><button type="button" class="ph" data-img="' + i + '" aria-label="' + esc(L(im.alt) || L(s.title)) + '"><img src="' + esc(thumb) + '" alt="' + esc(L(im.alt)) + '" loading="lazy"></button></li>';
    }).join('');
    if (imgs) html += '<ul class="grid">' + imgs + '</ul>';
    const ig = s.instagram || {};
    if (ig.enabled) {
      const feed = safeUrl(ig.feedUrl);
      const profile = safeUrl(ig.profile);
      if (feed) html += '<div class="ig" data-feed="' + esc(feed) + '" data-count="' + clampNum(Number(ig.count), 1, 12, 6) + '"><p class="ig-h">' + esc(S('instagram')) + '</p><ul class="ig-grid"></ul></div>';
      if (profile) html += '<a class="btn ghost" href="' + esc(profile) + '" target="_blank" rel="noopener">' + esc(L(ig.label)) + '</a>';
    }
  }

  if (s.id === 'contact') {
    if (s.email) {
      html += '<div class="copy"><a class="mail" href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a><button type="button" data-copy="' + esc(s.email) + '">' + esc(S('copy')) + '</button></div>';
    }
    const acts = [];
    if (s.whatsapp && s.whatsapp.number) acts.push('<a class="btn" href="' + esc(whatsappLink(s.whatsapp.number, L(s.whatsapp.message))) + '" target="_blank" rel="noopener">' + esc(S('whatsapp')) + '</a>');
    if (s.booking && safeUrl(s.booking.url)) acts.push('<a class="btn ghost" href="' + esc(safeUrl(s.booking.url)) + '" target="_blank" rel="noopener">' + esc(L(s.booking.label)) + '</a>');
    if (acts.length) html += '<div class="actions">' + acts.join('') + '</div>';
    const links = (s.links || []).map((l) => {
      const u = safeUrl(l.url);
      if (!u || !l.label) return '';
      return '<li><span class="k">' + esc(l.label) + '</span><a class="v" href="' + esc(u) + '" target="_blank" rel="noopener me">' + esc(l.text || prettyUrl(u)) + '</a></li>';
    }).join('');
    if (links) html += '<ul class="facts">' + links + '</ul>';
  }
  return html;
}

/* ---------------- page pieces ---------------- */

export function renderUI(cfg, lang) {
  const L = (v) => t(v, lang);
  const S = (k) => L(cfg.strings[k]);
  const secs = enabledSections(cfg);
  const n = secs.length;
  let html = '<div class="hud">';

  if (cfg.banner.enabled && L(cfg.banner.text)) {
    const key = hashString(L(cfg.banner.text) + '|' + (cfg.banner.link || ''));
    const link = safeUrl(cfg.banner.link);
    html += '<div class="banner" data-key="' + key + '"><p>' + esc(L(cfg.banner.text)) +
      (link && L(cfg.banner.linkLabel) ? ' <a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(L(cfg.banner.linkLabel)) + '</a>' : '') +
      '</p><button type="button" class="banner-x" aria-label="' + esc(S('dismiss')) + '"><span aria-hidden="true">×</span></button></div>';
  }

  html += '<div class="top">';
  html += '<button type="button" class="brand" data-go="intro" aria-label="' + esc(S('backToStart')) + '"><span class="logo" aria-hidden="true"></span></button>';
  html += '<nav class="timeline" style="--n:' + n + '" aria-label="' + esc(S('sections')) + '"><div class="tl-track" aria-hidden="true"><span class="tl-fill"></span><span class="tl-mark"></span></div><ol>';
  for (const s of secs) {
    const name = L(s.nav), era = L(s.era);
    html += '<li><button type="button" class="stop" data-go="' + s.id + '" aria-current="false" aria-label="' + esc(name + (era && s.id !== 'intro' ? ', ' + era : '')) + '">' +
      '<span class="ma">' + esc(s.stamp) + '</span><span class="dot"></span><span class="name">' + esc(name) + '</span>' +
      '<span class="hl" aria-hidden="true"><b>' + esc(name) + '</b><i>' + esc(era) + '</i></span></button></li>';
  }
  html += '</ol></nav>';
  const other = lang === 'tr' ? 'en' : 'tr';
  html += '<div class="top-r"><button type="button" class="lang" data-lang="' + other + '" lang="' + other + '" aria-label="' + esc(S('switchTo')) + '">' + other.toUpperCase() + '</button>';
  html += actionHTML(cfg, cfg.header.cta, lang, 'cta');
  html += '</div></div><div class="spacer"></div>';

  html += '<div class="bottom"><div class="now" aria-live="polite"><span class="k" id="nowK">' + esc(S('soundOff')) + '</span><span class="v" id="nowV">' + esc(L(cfg.audio.title)) + '</span></div>' +
    '<span class="hint">' + esc(S('scrollHint')) + ' · ' + esc(S('dragHint')) + '</span>' +
    '<button type="button" class="sound" id="soundBtn" aria-pressed="false" title="' + esc(S('soundOn')) + '"><span class="sr-only">' + esc(S('soundOn')) + '</span>' +
    '<svg viewBox="0 0 56 20" aria-hidden="true"><g class="amp"><path class="w" d="M0 10 Q 3.75 2 7.5 10 T 15 10 T 22.5 10 T 30 10 T 37.5 10 T 45 10 T 52.5 10 T 60 10 T 67.5 10 T 75 10 T 82.5 10 T 90 10"/></g></svg></button></div>';
  html += '</div>';

  // on phones the sections become slides you scroll through; this first empty slide is the intro
  html += '<div class="intro-slide" data-id="intro" aria-hidden="true"><span class="scroll-cue">' + esc(S('scrollHint')) + '</span></div>';
  secs.slice(1).forEach((s, i) => {
    const side = (i + 1) % 2 === 1 ? 'left' : 'right';
    const wide = s.id === 'work' || s.id === 'gallery' ? ' data-wide="1"' : '';
    html += '<section class="panel" id="p-' + s.id + '" data-id="' + s.id + '" data-side="' + side + '"' + wide + ' aria-labelledby="h-' + s.id + '" aria-hidden="true" inert><div class="pin">' + panelInner(cfg, s, lang) + '</div></section>';
  });
  return html;
}

export function renderGate(cfg, lang) {
  const L = (v) => t(v, lang);
  const other = lang === 'tr' ? 'en' : 'tr';
  return '<div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gateTitle">' +
    '<button type="button" class="lang gate-lang" data-lang="' + other + '" lang="' + other + '" aria-label="' + esc(L(cfg.strings.switchTo)) + '">' + other.toUpperCase() + '</button>' +
    '<h1 id="gateTitle" class="sr-only">' + esc(cfg.site.name) + '</h1>' +
    '<span class="logo gate-logo" role="img" aria-label="' + esc(cfg.site.name) + '"></span>' +
    '<p class="gate-sub">' + esc(L(cfg.gate.tagline)) + '</p>' +
    '<button type="button" class="gate-start" id="startBtn">' + esc(L(cfg.gate.start)) + '</button>' +
    '<button type="button" class="gate-sound" id="gateSound" aria-pressed="true" data-on="' + esc(L(cfg.gate.note)) + '" data-off="' + esc(L(cfg.gate.noteOff)) + '">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="w1" d="M16.5 8.5a5 5 0 0 1 0 7"/><path class="w2" d="M19 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>' +
    '<span>' + esc(L(cfg.gate.note)) + '</span></button>' +
    '</div>';
}

function absUrl(base, path) {
  const p = safeUrl(path);
  if (!p) return '';
  return /^https?:/i.test(p) ? p : base.replace(/\/$/, '') + p;
}

export function renderHead(cfg, lang) {
  const L = (v) => t(v, lang);
  const base = safeUrl(cfg.site.url) || DEFAULTS.site.url;
  const root = base.replace(/\/$/, '');
  const url = root + (lang === 'en' ? '/en/' : '/');
  const title = L(cfg.site.title) || cfg.site.name;
  const desc = L(cfg.site.description);
  const share = absUrl(root, cfg.site.shareImage) || root + DEFAULTS.site.shareImage;
  const contact = sectionById(cfg, 'contact');
  const sameAs = contact ? (contact.links || []).map((l) => safeUrl(l.url)).filter((u) => /^https:/i.test(u)) : [];
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: cfg.site.name, url: root + '/', jobTitle: lang === 'tr' ? 'Elektro gitarist' : 'Electric guitarist', sameAs };
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<title>' + esc(title) + '</title>',
    '<meta name="description" content="' + esc(desc) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<link rel="alternate" hreflang="tr" href="' + esc(root + '/') + '">',
    '<link rel="alternate" hreflang="en" href="' + esc(root + '/en/') + '">',
    '<link rel="alternate" hreflang="x-default" href="' + esc(root + '/') + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + esc(cfg.site.name) + '">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:image" content="' + esc(share) + '">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:locale" content="' + (lang === 'tr' ? 'tr_TR' : 'en_US') + '">',
    '<meta property="og:locale:alternate" content="' + (lang === 'tr' ? 'en_US' : 'tr_TR') + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="' + esc(cfg.theme.colors.background) + '">',
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" href="/assets/icon-192.png">',
    '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" id="fonts-css" href="' + esc(fontsHref(cfg)) + '">',
    '<link rel="stylesheet" href="/css/site.css">',
    '<style id="theme-css">' + themeCSS(cfg) + '</style>',
    '<link rel="preload" as="image" href="' + esc(safeUrl(cfg.media.stone.poster) || DEFAULTS.media.stone.poster) + '">',
    '<link rel="preload" as="image" href="/assets/amber/depth.webp">',
    '<link rel="preload" as="fetch" href="/assets/amber/c000.webp" crossorigin>',
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>',
    '<script type="module" src="/js/site.js"></script>',
  ].join('\n');
}

export function renderPage(cfg, lang) {
  const L = (v) => t(v, lang);
  const stone = cfg.media.stone;
  const poster = safeUrl(stone.poster) || DEFAULTS.media.stone.poster;
  const data = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n' + renderHead(cfg, lang) + '\n<noscript><style>.gate{display:none}.panel{position:relative!important;inset:auto!important;width:auto!important;max-height:none!important;margin:24px auto;max-width:640px;opacity:1!important;visibility:visible!important;transform:none!important}.stage,.mark{position:relative}body{overflow:auto}</style></noscript>\n</head>\n' +
    '<body>\n' +
    '<div class="stage" id="stage"><div class="stone" id="stone" role="img" aria-label="' + esc(L(cfg.strings.stoneLabel)) + '">' +
    '<canvas id="stoneGL" aria-hidden="true"></canvas>' +
    '<video id="amberVideo" muted loop playsinline webkit-playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" hidden></video>' +
    '<img class="poster" id="amberPoster" src="' + esc(poster) + '" alt="" width="720" height="900" fetchpriority="high" draggable="false">' +
    '<div class="glow" id="amberGlow" aria-hidden="true"></div></div></div>\n' +
    '<div class="mark" id="mark" aria-hidden="true"><span class="logo"></span><canvas id="markFx"></canvas></div>\n' +
    '<div id="ui">' + renderUI(cfg, lang) + '</div>\n' +
    '<div id="gateRoot">' + renderGate(cfg, lang) + '</div>\n' +
    '<div class="overlay" id="overlay" hidden></div>\n' +
    '<script type="application/json" id="site-data">' + data + '</script>\n' +
    '</body>\n</html>\n';
}
