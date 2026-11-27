// Same idea, but through the Supabase-session path real users take. Stub session only; all network answered locally.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/');
const { chromium } = require('playwright');
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const sbUser = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'stub@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
await ctx.addInitScript((u) => {
  const s = { access_token: 'stub.stub.stub', refresh_token: 'stub', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: u };
  localStorage.setItem('sb-vrquvdzoelvmwsxixqkt-auth-token', JSON.stringify(s));
}, sbUser);
const page = await ctx.newPage();
const errors = []; const calls = new Set();
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message).slice(0, 300)));
await page.route(/(ofs-sept25\.vercel\.app|\/api\/v1\/)/, r => {
  const path = new URL(r.request().url()).pathname; calls.add(path);
  const me = '{"id":1,"username":"stub","full_name":"Stub User","subscription_tier":"premium","subscription_status":"active","theme_preference":"dark"}';
  r.fulfill({ status: 200, contentType: 'application/json', body: /\/users\/me\/?$/.test(path) ? me : /(counts|status|stats)/.test(path) ? '{}' : '[]' });
});
await page.route(/supabase\.co/, r => {
  const u = r.request().url();
  r.fulfill({ status: 200, contentType: 'application/json', body: /auth\/v1\/user/.test(u) ? JSON.stringify(sbUser) : '{}' });
});
await page.route(/posthog\.com|cloudinary\.com|vercel-insights|_vercel/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.goto(base + '/feed', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const rootLen = await page.evaluate(() => (document.getElementById('root')?.innerHTML || '').length);
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' '));
await page.screenshot({ path: out });
console.log(JSON.stringify({ url: page.url(), rootHtmlLength: rootLen, bodyText, errors: [...new Set(errors)].slice(0, 5), apiCalls: [...calls].slice(0, 10) }, null, 1));
await browser.close();
