// Cloudflare Worker for aliyasavul.com.
// Static files (dist/) are served by Cloudflare directly; only /api/* reaches this code.
// The admin panel signs in with GitHub (OAuth), keeps the GitHub token in an encrypted
// HttpOnly cookie, and saves changes through a narrow proxy that can only touch this repo.

const GH = 'https://api.github.com';
const UA = 'aliyasavul-site-admin';
const SESSION = 'ay_session';
const OAUTH = 'ay_oauth';
const SESSION_DAYS = 30;
const MAX_BODY = 45 * 1024 * 1024;
const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await route(request, env, url, ctx);
    } catch (err) {
      console.error('api error', err && err.stack ? err.stack : err);
      return json({ error: 'server_error' }, 500);
    }
  },
};

async function route(request, env, url, ctx) {
  const p = url.pathname, m = request.method;
  if (p === '/api/ig' && m === 'GET') return instagram(env, url, ctx);
  if (p === '/api/auth/login' && m === 'GET') return login(env, url);
  if (p === '/api/auth/callback' && m === 'GET') return callback(request, env, url);
  if (p === '/api/auth/logout' && m === 'POST') return logout(request, env, url);
  if (p === '/api/me' && m === 'GET') return me(request, env);
  if (p === '/api/oembed' && m === 'GET') return oembed(request, env, url);
  if (p.startsWith('/api/gh/')) return proxy(request, env, url);
  return json({ error: 'not_found' }, 404);
}

/* ---------------- helpers ---------------- */

function repo(env) {
  return { owner: env.REPO_OWNER || 'aliyasavul', name: env.REPO_NAME || 'aliyasavul-site', branch: env.REPO_BRANCH || 'main' };
}
const configured = (env) => !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

function json(data, status = 200, cookies = []) {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(JSON.stringify(data), { status, headers: h });
}
function redirect(location, cookies = []) {
  const h = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers: h });
}
function page(title, body, status = 200) {
  const html = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>' + title + '</title>' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#000;color:#ece4d6;font:16px/1.6 system-ui,sans-serif}main{max-width:560px}h1{font-size:22px}code{background:#1a1712;padding:2px 6px}a{color:#e9a14b}</style></head><body><main>' + body + '</main></body></html>';
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function setCookie(name, value, maxAge, path) {
  return name + '=' + value + '; Path=' + path + '; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}
function clearCookie(name, path) {
  return name + '=; Path=' + path + '; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
function readCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function b64u(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function material(env, label) {
  return crypto.subtle.digest('SHA-256', enc.encode(label + ':' + env.GITHUB_CLIENT_SECRET));
}
async function aesKey(env) {
  return crypto.subtle.importKey('raw', await material(env, 'ay-session-v1'), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function hmacKey(env) {
  return crypto.subtle.importKey('raw', await material(env, 'ay-oauth-v1'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), enc.encode(JSON.stringify(obj)));
  return b64u(iv) + '.' + b64u(ct);
}
async function unseal(env, value) {
  try {
    const [ivs, cts] = String(value || '').split('.');
    if (!ivs || !cts) return null;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(ivs) }, await aesKey(env), unb64u(cts));
    const obj = JSON.parse(dec.decode(pt));
    return obj && obj.e > Date.now() ? obj : null;
  } catch (e) {
    return null;
  }
}
async function session(request, env) {
  if (!configured(env)) return null;
  return unseal(env, readCookies(request)[SESSION]);
}
function safeReturn(r) {
  return typeof r === 'string' && /^\/(?![\/\\])[A-Za-z0-9\-._~\/?#=&%]*$/.test(r) ? r : '/admin/';
}
// State-changing and data calls must come from our own pages (custom header + same origin).
function sameOrigin(request, url) {
  if (request.headers.get('X-AY') !== '1') return false;
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin') return false;
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return false;
  return true;
}
function gh(token, path, init = {}) {
  return fetch(GH + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': UA, 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) },
  });
}
function notConfigured() {
  return page('Panel henüz bağlanmadı',
    '<h1>Panel henüz bağlanmadı</h1><p>GitHub ile giriş için Cloudflare\'de bu Worker\'a iki gizli değer eklenmeli: <code>GITHUB_CLIENT_ID</code> ve <code>GITHUB_CLIENT_SECRET</code>.</p><p>Workers &amp; Pages → aliyasavul-site → Settings → Variables and Secrets.</p><p><a href="/">Siteye dön</a></p>', 503);
}

/* ---------------- auth ---------------- */

// GitHub only accepts the callback address registered for the OAuth app, so sign-in always
// happens on the main domain (a visit to www. is sent there first).
function canonical(env, url) {
  const c = String(env.SITE_ORIGIN || '').replace(/\/$/, '');
  return /^https:\/\/[a-z0-9.-]+$/i.test(c) ? c : url.origin;
}

async function login(env, url) {
  if (!configured(env)) return notConfigured();
  const origin = canonical(env, url);
  if (origin !== url.origin) return redirect(origin + url.pathname + url.search);
  const ret = safeReturn(url.searchParams.get('return'));
  const state = b64u(crypto.getRandomValues(new Uint8Array(18)));
  const payload = state + '|' + ret + '|' + Date.now();
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload));
  const value = b64u(enc.encode(payload)) + '.' + b64u(sig);
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  gh.searchParams.set('redirect_uri', url.origin + '/api/auth/callback');
  gh.searchParams.set('scope', 'repo');
  gh.searchParams.set('state', state);
  gh.searchParams.set('allow_signup', 'false');
  return redirect(gh.toString(), [setCookie(OAUTH, value, 600, '/api/auth')]);
}

async function callback(request, env, url) {
  if (!configured(env)) return notConfigured();
  const back = (code) => redirect('/admin/?error=' + code, [clearCookie(OAUTH, '/api/auth')]);
  if (url.searchParams.get('error')) return back('denied');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const raw = readCookies(request)[OAUTH];
  if (!code || !state || !raw) return back('state');
  const [pb, sb] = raw.split('.');
  let payload;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64u(sb), unb64u(pb));
    if (!ok) return back('state');
    payload = dec.decode(unb64u(pb)).split('|');
  } catch (e) {
    return back('state');
  }
  const [st, ret, ts] = payload;
  if (st !== state || !(Date.now() - Number(ts) < 10 * 60 * 1000)) return back('state');

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: url.origin + '/api/auth/callback' }),
  });
  const tok = await res.json().catch(() => ({}));
  if (!tok.access_token) return back('token');

  const ures = await gh(tok.access_token, '/user');
  if (!ures.ok) return back('user');
  const user = await ures.json();
  const r = repo(env);
  const rres = await gh(tok.access_token, '/repos/' + r.owner + '/' + r.name);
  if (rres.status === 404) return back('repo');
  if (!rres.ok) return back('user');
  const rj = await rres.json();
  if (!rj.permissions || !rj.permissions.push) return back('forbidden');

  const value = await seal(env, { t: tok.access_token, l: user.login, n: user.name || '', a: user.avatar_url || '', e: Date.now() + SESSION_DAYS * 86400 * 1000 });
  return redirect(safeReturn(ret), [setCookie(SESSION, value, SESSION_DAYS * 86400, '/api'), clearCookie(OAUTH, '/api/auth')]);
}

async function logout(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  const s = await session(request, env);
  if (s) {
    try {
      await fetch(GH + '/applications/' + env.GITHUB_CLIENT_ID + '/token', {
        method: 'DELETE',
        headers: { Authorization: 'Basic ' + btoa(env.GITHUB_CLIENT_ID + ':' + env.GITHUB_CLIENT_SECRET), Accept: 'application/vnd.github+json', 'User-Agent': UA, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: s.t }),
      });
    } catch (e) { /* the cookie is cleared either way */ }
  }
  return json({ ok: true }, 200, [clearCookie(SESSION, '/api')]);
}

async function me(request, env) {
  if (!configured(env)) return json({ error: 'not_configured' }, 503);
  const s = await session(request, env);
  if (!s) return json({ error: 'unauthorized' }, 401);
  return json({ login: s.l, name: s.n, avatar: s.a, repo: repo(env) });
}

/* ---------------- YouTube titles for the video list ---------------- */

async function oembed(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  if (!(await session(request, env))) return json({ error: 'unauthorized' }, 401);
  let target;
  try { target = new URL(url.searchParams.get('url') || ''); } catch (e) { return json({ error: 'bad_url' }, 400); }
  if (target.protocol !== 'https:' || !/^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/i.test(target.hostname)) return json({ error: 'bad_url' }, 400);
  const res = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(target.toString()), { headers: { 'User-Agent': UA } });
  if (!res.ok) return json({ error: 'not_found' }, 404);
  const j = await res.json().catch(() => ({}));
  return json({ title: String(j.title || ''), author: String(j.author_name || '') });
}

/* ---------------- Instagram feed (Behold), cached so visits do not use up the plan ---------------- */

async function instagram(env, url, ctx) {
  const id = url.searchParams.get('feed') || '';
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return json({ error: 'bad_feed' }, 400);
  const key = new Request(url.origin + '/__cache/ig/' + id);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const up = await fetch('https://feeds.behold.so/' + id, { headers: { Accept: 'application/json', 'User-Agent': UA, Origin: canonical(env, url) } });
  if (!up.ok) return json({ error: 'feed_unavailable' }, 502);
  const body = await up.text();
  try { JSON.parse(body); } catch (e) { return json({ error: 'feed_invalid' }, 502); }
  const res = new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=10800', 'X-Content-Type-Options': 'nosniff' } });
  if (cache) {
    const put = cache.put(key, res.clone());
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return res;
}

/* ---------------- GitHub proxy, limited to this repository ---------------- */

function allowed(method, sub, branch) {
  const ref = 'heads/' + branch;
  if (sub.includes('..') || sub.includes('//')) return false;
  if (method === 'GET') {
    return sub === 'git/ref/' + ref || /^git\/commits\/[0-9a-f]{40}$/.test(sub) || /^git\/trees\/[0-9a-f]{40}$/.test(sub) ||
      sub === 'commits' || /^contents\/[A-Za-z0-9._\-\/]+$/.test(sub);
  }
  if (method === 'POST') return sub === 'git/blobs' || sub === 'git/trees' || sub === 'git/commits';
  if (method === 'PATCH') return sub === 'git/refs/' + ref;
  return false;
}

async function proxy(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);
  const s = await session(request, env);
  if (!s) return json({ error: 'unauthorized' }, 401);
  const r = repo(env);
  const sub = url.pathname.slice('/api/gh/'.length);
  const method = request.method;
  if (!allowed(method, sub, r.branch)) return json({ error: 'not_allowed' }, 403);

  const qs = new URLSearchParams();
  for (const k of ['path', 'per_page', 'page', 'sha', 'ref', 'recursive']) {
    const v = url.searchParams.get(k);
    if (v !== null) qs.set(k, v);
  }
  const accept = /application\/vnd\.github\.raw/.test(request.headers.get('Accept') || '') ? 'application/vnd.github.raw+json' : 'application/vnd.github+json';
  const init = { method, headers: { Accept: accept } };
  if (method !== 'GET') {
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'too_large' }, 413);
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY) return json({ error: 'too_large' }, 413);
    init.body = body;
    init.headers['Content-Type'] = 'application/json';
  }
  const res = await gh(s.t, '/repos/' + r.owner + '/' + r.name + '/' + sub + (qs.toString() ? '?' + qs.toString() : ''), init);
  if (res.status === 401) return json({ error: 'github_unauthorized' }, 401);
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
