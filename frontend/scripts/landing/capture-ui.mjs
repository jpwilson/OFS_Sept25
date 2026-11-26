#!/usr/bin/env node
// Real screens of the real OFS interface, showing the sample family (owner: CAPTURE).
//
//   VITE_API_URL=http://127.0.0.1:59999 npx vite --port 5325 --strictPort     (in frontend/)
//   node scripts/landing/capture-ui.mjs [--base http://localhost:5325] [--only ui-feed-d,ui-tree] [--raw]
//
// Every API call is answered from fixtures/ (the API base points at a dead port, so a
// missed route cannot reach production). Every other host is aborted except
// OpenStreetMap tiles. Writes frontend/public/landing/ui/<id>.<hash8>.webp (+ .m.webp),
// merges kind:"ui" entries into src/landing/art/manifest.json, builds fixtures/sheet.jpg
// and fixtures/request-log.json. Exits non-zero if any API request went unanswered.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { REPO, HERE as FX, MANIFEST_PATH, MISSING, readManifest } from './fixtures/media.mjs';
import { answer } from './fixtures/api.mjs';
import { SCENES } from './fixtures/scenes.mjs';

const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/');
const { chromium } = requirePw('playwright');
const requireArt = createRequire(path.join(REPO, 'landing-art/package.json'));
const sharp = requireArt('sharp');

const args = { base: 'http://localhost:5325', only: null, raw: false };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '');
  if (k === 'raw') args.raw = true;
  else args[k] = process.argv[++i];
}
const only = args.only ? new Set(args.only.split(',')) : null;

const OUT_UI = path.join(REPO, 'frontend/public/landing/ui');
const RAW = path.join(FX, '_raw'); // full-resolution PNGs, for review only
fs.mkdirSync(OUT_UI, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

// api.js uses VITE_API_URL (the dead port); AuthContext and LocationAutocomplete hard-code
// localhost:8000 when the page host is "localhost". Both are answered here, never forwarded.
const API_HOSTS = new Set(['127.0.0.1:59999', 'localhost:8000']);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const APP_HOST = new URL(args.base).host;
const TILE_RE = /^([abc]\.)?tile\.openstreetmap\.org$/;
const SB_USER = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'maya@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2025-11-02T09:00:00Z' };
// two weeks after the newest story (12 December 2026), so every visible date stays in 2026
const NOW = new Date('2026-12-28T16:00:00Z');

const log = { api: {}, unanswered: [], local: 0, tiles: 0, aborted: {}, fxFiles: 0 };
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
function serveFile(route, file) {
  if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
  log.fxFiles++;
  return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file), headers: { 'cache-control': 'max-age=3600' } });
}

async function router(route, state) {
  const req = route.request();
  const u = new URL(req.url());
  if (API_HOSTS.has(u.host) && req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (API_HOSTS.has(u.host)) {
    const res = await answer(req, u, state);
    const key = `${req.method()} ${u.pathname.replace(/\/\d+(?=\/|$)/g, '/:n')}`;
    if (!res) {
      log.unanswered.push(`${req.method()} ${u.pathname}${u.search}`);
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"no fixture"}' });
    }
    bump(log.api, key);
    const status = res.__http || 200, body = res.__http ? res.body : res;
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: CORS });
  }
  if (u.host === APP_HOST) {
    if (u.pathname.startsWith('/__fx/avatar/')) return serveFile(route, path.join(FX, 'avatars', path.basename(u.pathname)));
    if (u.pathname.startsWith('/__fx/video/')) return serveFile(route, path.join(FX, 'video', path.basename(u.pathname)));
    if (u.pathname.startsWith('/__fx/raw/')) {
      const f = path.join(REPO, 'landing-art/raw', path.basename(u.pathname));
      return serveFile(route, fs.existsSync(f) ? f : path.join(REPO, 'landing-art/raw/look_photo_coast.png'));
    }
    log.local++;
    return route.continue();
  }
  if (TILE_RE.test(u.host)) { log.tiles++; return route.continue(); }
  if (u.host === 'cdnjs.cloudflare.com' && /leaflet\/.*\/images\//.test(u.pathname)) {
    return serveFile(route, path.join(REPO, 'frontend/node_modules/leaflet/dist/images', path.basename(u.pathname)));
  }
  if (/supabase\.co$/.test(u.host)) {
    bump(log.aborted, `${u.host} (stubbed)`);
    const body = /auth\/v1\/user/.test(u.pathname) ? SB_USER : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  }
  bump(log.aborted, u.host);
  return route.abort();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio', '--font-render-hinting=none'],
});

async function newPage({ phone = false, theme = 'light', state = {} } = {}) {
  const ctx = await browser.newContext({
    viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: phone ? 3 : 2,
    isMobile: phone, hasTouch: phone,
    serviceWorkers: 'block',
    locale: 'en-GB', timezoneId: 'Europe/London',
    permissions: ['microphone'],
    userAgent: phone
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  state.theme = theme;
  await ctx.addInitScript(({ u, theme }) => {
    const s = { access_token: 'stub.stub.stub', refresh_token: 'stub', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: 4102444800, user: u };
    localStorage.setItem('sb-vrquvdzoelvmwsxixqkt-auth-token', JSON.stringify(s));
    localStorage.setItem('theme', theme);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('welcome_dismissed_1', 'true');
    localStorage.removeItem('quickAddDraft');
  }, { u: SB_USER, theme });
  await ctx.route('**/*', (r) => router(r, state));
  const page = await ctx.newPage();
  // "now" is late December 2026 so every sample date is in the past; time keeps flowing
  // (Leaflet fades tiles in by elapsed time, a frozen clock leaves them invisible).
  await page.clock.install({ time: NOW });
  await page.clock.resume();
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.__errors.push(m.text().slice(0, 240)); });
  return page;
}

// wait for network-loaded images inside the page (or an element) to decode
async function settle(page, ms = 600) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts?.ready;
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
  });
  await page.waitForTimeout(ms);
}

async function save(id, buf, { phone = false } = {}) {
  fs.writeFileSync(path.join(RAW, `${id}.png`), buf);
  if (args.raw) return null;
  // WebP cannot exceed 16383px on a side; a very tall page is scaled down just enough to fit
  let meta = await sharp(buf).metadata();
  if (Math.max(meta.width, meta.height) > 16383) {
    buf = await sharp(buf).resize({ width: Math.floor(meta.width * 16383 / meta.height) }).png().toBuffer();
    meta = await sharp(buf).metadata();
  }
  // keep the full-size file under about 1MB: lower quality a little, then scale down if still needed
  let webp = await sharp(buf).webp({ quality: 72, effort: 6 }).toBuffer();
  for (let q = 66; webp.length > 1_000_000 && q >= 60; q -= 6) webp = await sharp(buf).webp({ quality: q, effort: 6 }).toBuffer();
  while (webp.length > 1_000_000) {
    buf = await sharp(buf).resize({ width: Math.round(meta.width * 0.85) }).png().toBuffer();
    meta = await sharp(buf).metadata();
    webp = await sharp(buf).webp({ quality: 66, effort: 6 }).toBuffer();
  }
  const hash = crypto.createHash('sha1').update(webp).digest('hex').slice(0, 8);
  for (const f of fs.readdirSync(OUT_UI)) if (f.startsWith(id + '.') && /^[0-9a-f]{8}\./.test(f.slice(id.length + 1))) fs.unlinkSync(path.join(OUT_UI, f));
  const name = `${id}.${hash}`;
  fs.writeFileSync(path.join(OUT_UI, `${name}.webp`), webp);
  // phone copy: long edge 900 for landscape; for anything taller than wide, cap the width at 780
  const m = sharp(buf).resize(meta.width >= meta.height ? { width: Math.min(900, meta.width) } : { width: Math.min(780, meta.width) });
  fs.writeFileSync(path.join(OUT_UI, `${name}.m.webp`), await m.webp({ quality: 72, effort: 6 }).toBuffer());
  return { src: `/landing/ui/${name}.webp`, srcM: `/landing/ui/${name}.m.webp`, w: meta.width, h: meta.height, kind: 'ui', alpha: false };
}

// art snapshot: if the art builder rewrites photos mid-run, the captures may show stale (404) images
const artKey = (m) => Object.entries(m).filter(([, v]) => v.kind !== 'ui').map(([k, v]) => `${k}=${v.src}`).sort().join('\n');
const artAtStart = artKey(readManifest());
const results = {};
const notes = {};
const themes = {};
const ctxApi = { newPage, settle, NOW };

for (const scene of SCENES) {
  const ids = scene.ids;
  if (only && !ids.some((i) => only.has(i))) continue;
  const state = { viewer: scene.viewer || 'maya' };
  const page = await newPage({ phone: scene.phone, theme: scene.theme || 'light', state });
  const t0 = Date.now();
  try {
    const shots = await scene.run(page, ctxApi, state);
    const seen = await page.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.querySelector('header')?.textContent?.includes('Profile')]).catch(() => [null]);
    for (const id of ids) themes[id] = { asked: scene.theme || 'light', html: seen[0], viewer: state.viewer };
    for (const [id, buf] of Object.entries(shots || {})) {
      if (only && !only.has(id)) continue;
      if (!buf) { notes[id] = notes[id] || 'not captured'; continue; }
      if (typeof buf === 'string') { notes[id] = buf; continue; }
      results[id] = await save(id, buf, scene);
      console.log(`ok  ${id}`);
    }
  } catch (e) {
    for (const id of ids) notes[id] = notes[id] || `failed: ${e.message.split('\n')[0]}`;
    console.log(`ERR ${ids.join(',')}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: path.join(RAW, `_error-${ids[0]}.png`) }).catch(() => {});
  }
  if (page.__errors.length) notes[`${ids[0]}:console`] = [...new Set(page.__errors)].slice(0, 6);
  console.log(`    ${scene.name} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.context().close();
}
await browser.close();

// merge kind:"ui" entries into the shared manifest (re-read right before writing)
if (!args.raw) {
  const fresh = readManifest();
  for (const [id, entry] of Object.entries(results)) if (entry) fresh[id] = entry;
  const sorted = Object.fromEntries(Object.keys(fresh).sort().map((k) => [k, fresh[k]]));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

// contact sheet of everything captured so far (all ui-*.png under _raw)
await buildSheet();

const artChanged = artKey(readManifest()) !== artAtStart;
if (artChanged) console.log('WARNING: art changed in the manifest during this run; re-run once the art builder is idle');
const summary = { artChangedDuringRun: artChanged, captured: Object.keys(results), themes, notes, missingArt: [...MISSING], requests: log };
fs.writeFileSync(path.join(FX, 'request-log.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ themeMismatch: Object.entries(themes).filter(([, t]) => t.asked !== t.html), captured: Object.keys(results).length, unanswered: log.unanswered, aborted: log.aborted, tiles: log.tiles, missingArt: [...MISSING], notes }, null, 1));
process.exit(log.unanswered.length ? 1 : 0);

async function buildSheet() {
  const files = fs.readdirSync(RAW).filter((f) => /^ui-.*\.png$/.test(f)).sort();
  const cell = 360, label = 26, cols = 6;
  const rows = Math.ceil(files.length / cols);
  const comps = [];
  for (let i = 0; i < files.length; i++) {
    const buf = await sharp(path.join(RAW, files[i])).resize(cell, cell - label, { fit: 'contain', background: '#e8ecf2' }).toBuffer();
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    comps.push({ input: buf, left: x, top: y + label });
    const svg = `<svg width="${cell}" height="${label}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101B3B"/><text x="8" y="18" font-family="Menlo,monospace" font-size="14" fill="#fff">${files[i].replace('.png', '')}</text></svg>`;
    comps.push({ input: Buffer.from(svg), left: x, top: y });
  }
  if (!comps.length) return;
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#ffffff' } })
    .composite(comps).jpeg({ quality: 80 }).toFile(path.join(FX, 'sheet.jpg'));
}
