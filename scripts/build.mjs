// Builds dist/ for Cloudflare: copies public/, pre-renders the Turkish (/) and English
// (/en/) pages from content/site.json, and checks that every file the content points to exists.
// Wrangler runs this automatically before each deploy (see wrangler.jsonc > build).
import { readFile, writeFile, mkdir, rm, cp, copyFile, stat, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, renderPage } from '../src/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const MAX_ASSET = 25 * 1024 * 1024;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function main() {
  const rawText = await readFile(join(root, 'content/site.json'), 'utf8');
  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch (e) {
    console.error('content/site.json is not valid JSON: ' + e.message);
    process.exit(1);
  }
  const cfg = normalize(raw);

  await rm(dist, { recursive: true, force: true });
  await cp(join(root, 'public'), dist, { recursive: true });
  await mkdir(join(dist, 'en'), { recursive: true });
  await mkdir(join(dist, 'content'), { recursive: true });
  await copyFile(join(root, 'src/render.mjs'), join(dist, 'js/render.js'));
  await writeFile(join(dist, 'index.html'), renderPage(cfg, 'tr'));
  await writeFile(join(dist, 'en/index.html'), renderPage(cfg, 'en'));
  await writeFile(join(dist, 'content/site.json'), rawText);

  const base = (cfg.site.url || 'https://aliyasavul.com').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urlEntry = (loc) => '  <url><loc>' + loc + '</loc><lastmod>' + today + '</lastmod>' +
    '<xhtml:link rel="alternate" hreflang="tr" href="' + base + '/"/><xhtml:link rel="alternate" hreflang="en" href="' + base + '/en/"/></url>';
  await writeFile(join(dist, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urlEntry(base + '/') + '\n' + urlEntry(base + '/en/') + '\n</urlset>\n');
  await writeFile(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ' + base + '/sitemap.xml\n');

  // every local file the content points to should be in the build
  const refs = new Set([cfg.media.logo.src, cfg.media.stone.mp4, cfg.media.stone.mp4Small, cfg.media.stone.webm, cfg.media.stone.poster, cfg.site.shareImage, cfg.audio.src]);
  for (const s of cfg.sections) for (const im of s.images || []) { refs.add(im.src); refs.add(im.thumb); }
  const missing = [];
  for (const r of refs) {
    if (typeof r !== 'string' || !r.startsWith('/')) continue;
    try { await stat(join(dist, decodeURIComponent(r.split('?')[0]))); } catch (e) { missing.push(r); }
  }
  if (missing.length) console.warn('Warning: files referenced in content/site.json are missing:\n  ' + missing.join('\n  '));

  const files = await walk(dist);
  const tooBig = [];
  for (const f of files) if ((await stat(f)).size > MAX_ASSET) tooBig.push(relative(dist, f));
  if (tooBig.length) {
    console.error('These files are larger than 25 MB, which Cloudflare cannot serve:\n  ' + tooBig.join('\n  '));
    process.exit(1);
  }
  console.log('Built dist/ with ' + files.length + ' files.');
}

main().catch((e) => { console.error(e); process.exit(1); });
