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
    // text sizes (px; titles and their line height in %), and how long texts are cut
    type: { h2: 100, h2lh: 105, body: 16, k: 13, v: 15, vAlign: 'left', era: 12, btn: 15, sub: 12, small: 14, pkn: 20, pkp: 15, rect: 15, mail: 17, banner: 13, gate: 12, note: 14, more: true, clamp: 6 },
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
    // more lines under the one below the logo (see extrasHTML)
    extras: [],
  },
  header: { cta: { label: bi('Ders al', 'Book a lesson'), target: 'lessons' } },
  banner: { enabled: false, text: bi('Kasım için 2 öğrenci yeri kaldı.', '2 student spots left for November.'), linkLabel: bi('Yer ayırt', 'Save a spot'), link: '' },
  intro: { nav: bi('Giriş', 'Intro'), era: bi('Bugün', 'Today'), stamp: '0', stage: bi('', '') },
  // the timeline's text sizes (px, and % for the big name), and what phones show above the dots
  timeline: { stageSize: 11, nameSize: 100, subSize: 11, phoneTop: 'stamp' },
  sections: [
    {
      id: 'about', enabled: true, stamp: '23',
      nav: bi('Hakkımda', 'About'), stage: bi('', ''),
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
      extras: [],
    },
    {
      id: 'production', enabled: true, stamp: '28',
      nav: bi('Prodüksiyon', 'Production'), stage: bi('', ''),
      era: bi('28 milyon yıl önce · Oligosen', '28 million years ago · Oligocene'),
      title: bi('Kayıt, Aranje ve Prodüksiyon', 'Recording, Arrangement & Production'),
      body: bi(
        '[Kayıt, aranje ve prodüksiyon işlerin hakkında kısa bir yazı: neler yaptığın, nasıl çalıştığın.]',
        '[A short text about your recording, arrangement and production work: what you do and how you work.]'
      ),
      facts: [
        { k: bi('Kayıt', 'Recording'), v: bi('[Kısa açıklama]', '[Short description]') },
        { k: bi('Aranje', 'Arrangement'), v: bi('[Kısa açıklama]', '[Short description]') },
        { k: bi('Prodüksiyon', 'Production'), v: bi('[Kısa açıklama]', '[Short description]') },
      ],
      extras: [],
    },
    {
      id: 'lessons', enabled: true, stamp: '34',
      nav: bi('Dersler', 'Lessons'), stage: bi('', ''),
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
      extras: [],
    },
    {
      id: 'work', enabled: true, stamp: '56',
      nav: bi('Portfolyo', 'Work'), stage: bi('', ''),
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
      extras: [],
    },
    {
      id: 'gallery', enabled: true, stamp: '66',
      nav: bi('Galeri', 'Gallery'), stage: bi('', ''),
      era: bi("66 milyon yıl önce · Kretase'nin sonu", '66 million years ago · End of the Cretaceous'),
      title: bi('Galeri', 'Gallery'),
      body: bi('', ''),
      images: [],
      instagram: { enabled: false, profile: '', feedUrl: '', count: 6, label: bi("Instagram'da takip et", 'Follow on Instagram') },
      extras: [],
    },
    {
      id: 'contact', enabled: true, stamp: '99 MA',
      nav: bi('İletişim', 'Contact'), stage: bi('', ''),
      era: bi('99 milyon yıl önce · Kehribardaki dinozor kuyruğu', '99 million years ago · The dinosaur tail in amber'),
      title: bi('İletişim', 'Contact'),
      body: bi(
        'Ders, session ya da aranje: neye ihtiyacın olduğunu yaz, sana dönüş yapayım.',
        'Lessons, a session or an arrangement: tell me what you need and I will get back to you.'
      ),
      email: 'info@aliyasavul.com',
      whatsapp: { number: '', message: bi('Merhaba Ali, ders hakkında bilgi almak istiyorum.', "Hi Ali, I'd like to ask about lessons.") },
      booking: { url: '', label: bi('Takvimden gün seç', 'Pick a time') },
      // a month calendar Ali fills in by hand in the panel: the days in `busy` are booked
      calendar: { enabled: false, title: bi('Müsaitlik takvimi', 'Availability'), busy: [] },
      links: [
        { label: 'Instagram', url: '' },
        { label: 'YouTube', url: '' },
        { label: 'Spotify', url: '' },
      ],
      extras: [],
    },
  ],
  strings: {
    soundOff: bi('Ses kapalı', 'Sound off'),
    nowPlaying: bi('Çalıyor', 'Now playing'),
    paused: bi('Duraklatıldı', 'Paused'),
    busy: bi('Dolu', 'Booked'),
    free: bi('Müsait', 'Available'),
    loading: bi('Yükleniyor', 'Loading'),
    recording: bi('Kayıt', 'Recording'),
    player: bi('Çalan şarkı', 'Now playing'),
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

// every section can scale its own title (100 = as all titles) and set its line height (0 = as all)
// and scale each of its other texts (% of the size set for all sections)
export const SIZE_KEYS = ['era', 'body', 'k', 'v', 'sub', 'small', 'btn', 'pkn', 'pkp', 'rect', 'mail'];
for (const s of DEFAULTS.sections) Object.assign(s, { titleSize: 100, titleLh: 0, sizes: Object.fromEntries(SIZE_KEYS.map((k) => [k, 100])) });
DEFAULTS.strings.readMore = { tr: 'Devamını oku', en: 'Read more' };
DEFAULTS.strings.readLess = { tr: 'Daha az göster', en: 'Show less' };

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
  for (const k of ['fonts', 'colors', 'effects', 'stone', 'type']) if (!isObj(th[k])) th[k] = clone(base[k]);
  const ty = th.type;
  for (const [k, lo, hi] of [['h2', 60, 150], ['h2lh', 80, 160], ['body', 12, 22], ['k', 9, 18], ['v', 11, 22], ['era', 9, 18], ['btn', 11, 20], ['sub', 9, 18], ['small', 10, 20], ['pkn', 12, 30], ['pkp', 10, 24], ['rect', 11, 24], ['mail', 12, 26], ['banner', 10, 20], ['gate', 9, 20], ['note', 10, 22], ['clamp', 3, 15]]) ty[k] = clampNum(ty[k], lo, hi, base.type[k]);
  ty.more = ty.more !== false;
  if (ty.vAlign !== 'right') ty.vAlign = 'left';
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

// Rows Ali adds himself: on the start screen under the line below the logo, and at the end of
// every section. A row is a line of text, a small note, a subheading, a two-column row (like the
// facts) or a button that opens a link or goes to a section.
export const EXTRA_KINDS = ['text', 'small', 'heading', 'pair', 'button'];
const biOf = (v) => (isObj(v) ? { tr: typeof v.tr === 'string' ? v.tr : '', en: typeof v.en === 'string' ? v.en : '' } : typeof v === 'string' ? { tr: v, en: v } : { tr: '', en: '' });
function cleanExtras(list) {
  return (Array.isArray(list) ? list : []).filter((x) => isObj(x) && EXTRA_KINDS.includes(x.kind)).slice(0, 40).map((x) => ({
    kind: x.kind,
    text: biOf(x.text),
    value: biOf(x.value),
    url: typeof x.url === 'string' ? x.url.trim().slice(0, 500) : '',
    target: typeof x.target === 'string' && /^[a-z]{1,20}$/.test(x.target) ? x.target : 'link',
    style: x.style === 'solid' ? 'solid' : 'ghost',
  }));
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
  DEFAULTS.sections.forEach((d, k) => {
    if (seen.has(d.id)) return;
    const prev = k > 0 ? list.findIndex((x) => x.id === DEFAULTS.sections[k - 1].id) : -1;
    list.splice(prev >= 0 ? prev + 1 : k === 0 ? 0 : list.length, 0, clone(d));
    seen.add(d.id);
  });
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
  out.gate.extras = cleanExtras(out.gate.extras);
  for (const s of out.sections) {
    s.extras = cleanExtras(s.extras);
    s.titleSize = clampNum(s.titleSize, 50, 150, 100);
    s.titleLh = s.titleLh >= 80 ? clampNum(s.titleLh, 80, 160, 105) : 0;
    const sz = isObj(s.sizes) ? s.sizes : {};
    s.sizes = Object.fromEntries(SIZE_KEYS.map((k) => [k, clampNum(sz[k], 50, 200, 100)]));
  }
  const ct = out.sections.find((x) => x.id === 'contact');
  if (ct) ct.calendar.busy = [...new Set((Array.isArray(ct.calendar.busy) ? ct.calendar.busy : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-400);
  const tl = out.timeline;
  tl.stageSize = clampNum(tl.stageSize, 8, 24, 11);
  tl.nameSize = clampNum(tl.nameSize, 50, 150, 100);
  tl.subSize = clampNum(tl.subSize, 8, 20, 11);
  if (!['stamp', 'stage', 'both'].includes(tl.phoneTop)) tl.phoneTop = 'stamp';
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
    '--tl-stage:' + cfg.timeline.stageSize + 'px',
    '--tl-name:' + cfg.timeline.nameSize / 100,
    '--tl-sub:' + cfg.timeline.subSize + 'px',
    '--stone-filter:hue-rotate(' + cfg.theme.stone.hue + 'deg) saturate(' + (cfg.theme.stone.saturation / 100) + ') brightness(' + (cfg.theme.stone.brightness / 100) + ')',
    '--logo-src:url("' + logoUrl + '")',
    '--logo-ar:' + logo.width + ' / ' + logo.height,
    '--f-display:' + q(f.display) + ', ' + FALLBACK_STACK.display,
    '--f-body:' + q(f.body) + ', ' + FALLBACK_STACK.body,
    '--f-mono:' + q(f.mono) + ', ' + FALLBACK_STACK.mono,
    ...((ty) => ['--t-h2:' + ty.h2 / 100, '--t-h2lh:' + ty.h2lh / 100, '--t-body:' + ty.body + 'px', '--t-k:' + ty.k + 'px', '--t-v:' + ty.v + 'px', '--t-v-align:' + ty.vAlign,
      '--t-era:' + ty.era + 'px', '--t-btn:' + ty.btn + 'px', '--t-sub:' + ty.sub + 'px', '--t-small:' + ty.small + 'px', '--t-pkn:' + ty.pkn + 'px', '--t-pkp:' + ty.pkp + 'px', '--t-rect:' + ty.rect + 'px', '--t-mail:' + ty.mail + 'px', '--t-banner:' + ty.banner + 'px', '--t-gate:' + ty.gate + 'px', '--t-note:' + ty.note + 'px', '--t-clamp:' + ty.clamp])(cfg.theme.type),
  ].join(';') + '}';
}

/* ---------------- structure ---------------- */

export function enabledSections(cfg) {
  const list = [{ id: 'intro', nav: cfg.intro.nav, era: cfg.intro.era, stamp: cfg.intro.stamp, stage: cfg.intro.stage }];
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

// a button row: a link of its own, or one of the places the other buttons can go to
function extraButton(cfg, x, lang, cls) {
  const label = t(x.text, lang);
  if (!label) return '';
  const c = cls + (x.style === 'solid' ? '' : ' ghost');
  if (x.target && x.target !== 'link') {
    const dest = ctaHref(cfg, x.target, lang);
    if (!dest) return '';
    if (dest.href) return '<a class="' + c + '" href="' + esc(dest.href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
    return '<button type="button" class="' + c + '" data-go="' + esc(dest.go) + '">' + esc(label) + '</button>';
  }
  const u = safeUrl(x.url);
  if (!u) return '';
  return '<a class="' + c + '" href="' + esc(u) + '"' + (/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(label) + '</a>';
}
// the rows added in the panel; two-column rows that follow each other make one list, and buttons
// one row of buttons
export function extrasHTML(cfg, list, lang, { gate = false } = {}) {
  let html = '', run = '', runKind = '';
  const flush = () => {
    if (run) html += runKind === 'pair' ? '<ul class="' + (gate ? 'gate-pairs' : 'facts x-facts') + '">' + run + '</ul>' : '<div class="' + (gate ? 'gate-btns' : 'actions x-actions') + '">' + run + '</div>';
    run = ''; runKind = '';
  };
  for (const x of Array.isArray(list) ? list : []) {
    const text = t(x.text, lang);
    if (x.kind === 'pair' || x.kind === 'button') {
      const item = x.kind === 'pair'
        ? ((text || t(x.value, lang)) ? '<li><span class="k">' + esc(text) + '</span><span class="v">' + inline(t(x.value, lang)) + '</span></li>' : '')
        : extraButton(cfg, x, lang, gate ? 'gate-btn' : 'btn x-btn');
      if (!item) continue;
      if (runKind !== x.kind) flush();
      runKind = x.kind;
      run += item;
      continue;
    }
    flush();
    if (!text) continue;
    if (gate) html += '<p class="' + (x.kind === 'small' ? 'gate-note' : x.kind === 'heading' ? 'gate-head' : 'gate-sub') + '">' + (x.kind === 'heading' ? esc(text) : inline(text)) + '</p>';
    else if (x.kind === 'heading') html += '<p class="sub-h x-h">' + esc(text) + '</p>';
    else html += '<p class="' + (x.kind === 'small' ? 'x-small' : 'x-text') + '">' + inline(text) + '</p>';
  }
  flush();
  return html;
}

function panelInner(cfg, s, lang) {
  const L = (v) => t(v, lang);
  const S = (k) => L(cfg.strings[k]);
  let html = eraHTML(L(s.era));
  html += '<h2 id="h-' + s.id + '">' + esc(L(s.title)) + '</h2>';
  const body = prose(L(s.body));
  // a long text shows its first lines and a "Devamını oku" (the button shows only when the text is cut)
  if (body) html += cfg.theme.type.more ? '<div class="prose more">' + body + '</div><button type="button" class="more-btn" hidden>' + esc(S('readMore')) + '</button>' : '<div class="prose">' + body + '</div>';

  if (s.id === 'about' || s.id === 'production') {
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
      return '<li class="spe"><iframe src="https://open.spotify.com/embed/' + ref.kind + '/' + ref.id + '?utm_source=generator&theme=0" title="' + esc(S('listen') + ': ' + (title || 'Spotify')) + '" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
        (roles ? '<span class="trk-r">' + esc(roles) + '</span>' : '') + '</li>';
    }).join('');
    if (tracks) html += '<div class="sp"><p class="sub-h">' + esc(S('onSpotify')) + '</p><ul class="spes">' + tracks + '</ul></div>';
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
    // the month grid is drawn in the browser, so it always shows the visitor's current month
    if (s.calendar && s.calendar.enabled) html += '<div class="cal" data-busy="' + esc(s.calendar.busy.join(',')) + '"><p class="sub-h">' + esc(L(s.calendar.title)) + '</p><div class="cal-m"></div><p class="cal-k"><span class="b"></span>' + esc(S('busy')) + '<span class="f"></span>' + esc(S('free')) + '</p></div>';
    const links = (s.links || []).map((l) => {
      const u = safeUrl(l.url);
      if (!u || !l.label) return '';
      return '<li><span class="k">' + esc(l.label) + '</span><a class="v" href="' + esc(u) + '" target="_blank" rel="noopener me">' + esc(l.text || prettyUrl(u)) + '</a></li>';
    }).join('');
    if (links) html += '<ul class="facts">' + links + '</ul>';
  }
  const extras = extrasHTML(cfg, s.extras, lang);
  if (extras) html += '<div class="x">' + extras + '</div>';
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
  const top = cfg.timeline.phoneTop;
  html += '<nav class="timeline" data-top="' + top + '" style="--n:' + n + '" aria-label="' + esc(S('sections')) + '"><div class="tl-track" aria-hidden="true"><span class="tl-fill"></span><span class="tl-mark"></span></div><ol>';
  for (const s of secs) {
    const name = L(s.nav), era = L(s.era), stage = L(s.stage);
    // above the dot on phones: the number, the small line (Evre 1…) or both
    const above = top === 'stamp' || !stage ? esc(s.stamp) : top === 'stage' ? esc(stage) : '<span class="st">' + esc(stage) + '</span>' + esc(s.stamp);
    html += '<li><button type="button" class="stop" data-go="' + s.id + '" aria-current="false" aria-label="' + esc([stage, name, era && s.id !== 'intro' ? era : ''].filter(Boolean).join(', ')) + '">' +
      '<span class="ma">' + above + '</span><span class="dot"></span><span class="name">' + esc(name) + '</span>' +
      '<span class="hl" aria-hidden="true">' + (stage ? '<em>' + esc(stage) + '</em>' : '') + '<b>' + esc(name) + '</b>' + (era ? '<i>' + esc(era) + '</i>' : '') + '</span></button></li>';
  }
  html += '</ol></nav>';
  const other = lang === 'tr' ? 'en' : 'tr';
  html += '<div class="top-r"><button type="button" class="lang" data-lang="' + other + '" lang="' + other + '" aria-label="' + esc(S('switchTo')) + '">' + other.toUpperCase() + '</button>';
  html += actionHTML(cfg, cfg.header.cta, lang, 'cta');
  html += '</div></div><div class="spacer"></div>';

  html += '<div class="bottom"><div class="now"><span class="np" role="group" aria-label="' + esc(S('player')) + '" hidden>' +
    '<button type="button" class="np-b np-prev" aria-label="' + esc(S('prev')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5.5v13"/><path class="f" d="M18 5.8v12.4L9.2 12z"/></svg></button>' +
    '<button type="button" class="np-b np-play" aria-pressed="false" aria-label="' + esc(S('play')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="f i-play" d="M8.5 5.5v13L19 12z"/><path class="i-pause" d="M9 6v12M15 6v12"/></svg></button>' +
    '<button type="button" class="np-b np-next" aria-label="' + esc(S('next')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 5.5v13"/><path class="f" d="M6 5.8v12.4l8.8-6.2z"/></svg></button></span>' +
    '<span class="now-t" aria-live="polite"><span class="k" id="nowK">' + esc(S('soundOff')) + '</span><span class="v" id="nowV">' + esc(L(cfg.audio.title)) + '</span></span></div>' +
    '<span class="hint">' + esc(S('scrollHint')) + ' · ' + esc(S('dragHint')) + '</span>' +
    '<button type="button" class="sound" id="soundBtn" aria-pressed="false" title="' + esc(S('soundOn')) + '"><span class="sr-only">' + esc(S('soundOn')) + '</span>' +
    '<svg viewBox="0 0 56 20" aria-hidden="true"><g class="amp"><path class="w" d="M0 10 Q 3.75 2 7.5 10 T 15 10 T 22.5 10 T 30 10 T 37.5 10 T 45 10 T 52.5 10 T 60 10 T 67.5 10 T 75 10 T 82.5 10 T 90 10"/></g></svg></button></div>';
  html += '</div>';

  // on phones the sections become slides you scroll through; this first empty slide is the intro
  html += '<div class="intro-slide" data-id="intro" aria-hidden="true"><span class="scroll-cue">' + esc(S('scrollHint')) + '</span></div>';
  secs.slice(1).forEach((s, i) => {
    const side = (i + 1) % 2 === 1 ? 'left' : 'right';
    const wide = s.id === 'work' || s.id === 'gallery' ? ' data-wide="1"' : '';
    html += '<section class="panel" id="p-' + s.id + '" data-id="' + s.id + '" data-side="' + side + '"' + wide + ' style="--h2s:' + (s.titleSize || 100) / 100 + (s.titleLh ? ';--h2lh:' + s.titleLh / 100 : '') + Object.entries(s.sizes || {}).filter(([, v]) => v !== 100).map(([k, v]) => ';--s-' + k + ':' + v / 100).join('') + '" aria-labelledby="h-' + s.id + '" aria-hidden="true" inert><div class="pin">' + panelInner(cfg, s, lang) + '</div></section>';
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
    '<div class="gate-lines"><p class="gate-sub">' + String(L(cfg.gate.tagline)).split(/\s+·\s+/).map((part) => esc(part).replace(/ /g, '&nbsp;')).join(' · ') + '</p>' + extrasHTML(cfg, cfg.gate.extras, lang, { gate: true }) + '</div>' +
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
    '<div class="stage" id="stage"><canvas id="stoneGL" aria-hidden="true"></canvas><div class="stone" id="stone" role="img" aria-label="' + esc(L(cfg.strings.stoneLabel)) + '">' +
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
