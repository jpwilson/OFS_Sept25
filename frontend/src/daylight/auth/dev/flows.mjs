#!/usr/bin/env node
// The sign-in round trips, end to end against the stub (owner: AUTH). PLAN-AUTH section 8.
// The real Supabase client runs unmodified: it stores its PKCE verifier, leaves for the
// stand-in chooser, comes back with ?code=, and exchanges it itself.
//
//   node src/daylight/auth/dev/flows.mjs [--base http://127.0.0.1:5336] [--only name,name]
//
// The Google flows need Google switched on in the dev server (VITE_AUTH_GOOGLE=1, see
// src/daylight/auth/lib/features.js); the email flows pass either way.
// Each flow starts from GET /__fx/reset in a fresh browser context, at 390x844. Exits 1 on
// any failure, page error or unexpected console error.
import { createRequire } from 'node:module'

const { chromium } = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')('playwright')
const args = { base: 'http://127.0.0.1:5336', only: null }
for (let i = 2; i < process.argv.length; i++) args[process.argv[i].replace(/^--/, '')] = process.argv[++i]
const B = args.base
const only = args.only ? new Set(args.only.split(',')) : null

// AuthContext (unchanged, outside this package) logs these for a signed-in person with no
// profile yet; they are expected until the first-run step creates it.
// The browser also logs every 4xx answer the flows provoke on purpose (wrong password, 429, 422).
const EXPECTED = [/No username in Supabase user metadata/, /Failed to load resource: the server responded with a status of (400|401|403|404|422|429)/]

const browser = await chromium.launch()
const results = []

async function ctxPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', ...opts })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (!EXPECTED.some((re) => re.test(t))) page.errors.push(`console: ${t.slice(0, 200)}`)
  })
  return { ctx, page }
}
const path = (page) => new URL(page.url()).pathname + new URL(page.url()).search
const reset = (page) => page.request.get(`${B}/__fx/reset`)
async function signInAs(page, as, next = '/feed') {
  await page.goto(`${B}/__fx/signin?as=${as}&next=${encodeURIComponent(next)}`)
  await page.waitForURL((u) => new URL(u).pathname === next.split('?')[0], { timeout: 15000 })
}
async function google(page, persona) {
  await page.click('[data-ui="google"]')
  await page.waitForSelector(`[data-persona="${persona}"]`, { timeout: 10000 })
  await page.click(`[data-persona="${persona}"]`)
}
async function expectText(page, text, timeout = 10000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout })
}
async function finishFirstRun(page, { handle } = {}) {
  await page.waitForSelector('[data-ui="handle"]', { timeout: 10000 })
  if (handle) await page.fill('[data-ui="handle"]', handle)
  await expectText(page, 'is free.')
  await page.click('[data-ui="start"]')
  await expectText(page, "You're in,")
}

async function flow(name, fn) {
  if (only && !only.has(name)) return
  const { ctx, page } = await ctxPage()
  const t0 = Date.now()
  let ok = true
  let note = ''
  try {
    await reset(page)
    note = (await fn(page, ctx)) || ''
  } catch (e) {
    ok = false
    note = e.message.split('\n')[0]
    if (args.debug) await page.screenshot({ path: `${args.debug}/${name}.jpg` }).catch(() => {})
  }
  if (page.errors.length) {
    ok = false
    note += ` | ${page.errors.join(' | ')}`
  }
  results.push({ name, ok, note, ms: Date.now() - t0 })
  console.log(`${ok ? '✓' : '✗'} ${name}${note ? `: ${note}` : ''}`)
  await ctx.close()
}

// ------------------------------------------------------------------ Google
await flow('google-member', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'member')
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
  const verifier = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-code-verifier')).length)
  if (verifier) throw new Error('the PKCE verifier was not consumed')
  return `ended on ${path(page)} (PKCE verifier exchanged and cleared)`
})

await flow('google-new', async (page) => {
  await page.goto(`${B}/login?signup=true`)
  await google(page, 'new')
  await page.waitForURL(/\/auth\/callback$/, { timeout: 15000 })
  if (new URL(page.url()).search) throw new Error('the callback URL kept its parameters')
  await expectText(page, 'What should we')
  const nameVal = await page.inputValue('input[autocomplete="name"]')
  const handleVal = await page.inputValue('[data-ui="handle"]')
  if (nameVal !== 'Alex Rivera' || handleVal !== 'alex_rivera') throw new Error(`prefill ${nameVal} / ${handleVal}`)
  await finishFirstRun(page)
  await expectText(page, "You're in, Alex.")
  await page.click('[data-ui="welcome-make"]')
  await page.waitForURL(/\/create\?from=photos$/, { timeout: 15000 })
  return `first run prefilled "${nameVal}" @${handleVal}; welcome; ended on ${path(page)}`
})

await flow('google-handle-taken', async (page) => {
  await page.goto(`${B}/login?signup=true`)
  await google(page, 'taken')
  await page.waitForSelector('[data-ui="handle"]')
  await page.fill('[data-ui="handle"]', 'sam')
  await page.waitForFunction(() => /@sam is taken\./.test(document.querySelector('[data-ui="handle-note"]')?.textContent || ''), null, { timeout: 10000 })
  const alt = await page.textContent('[data-ui="use-alt"]')
  await page.click('[data-ui="use-alt"]')
  await page.waitForFunction((a) => (document.querySelector('[data-ui="handle-note"]')?.textContent || '').includes(`${a} is free.`), alt, { timeout: 10000 })
  await page.click('[data-ui="start"]')
  await expectText(page, "You're in, Sam.")
  return `@sam taken, offered ${alt}, accepted`
})

await flow('google-cancel', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'cancel')
  await expectText(page, 'closed before it finished')
  if (new URL(page.url()).search) throw new Error('error parameters left in the URL')
  await page.waitForSelector('[data-ui="google"]')
  return 'calm line, Google offered again, URL cleaned'
})

await flow('google-error', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'error')
  await expectText(page, "Google couldn't finish signing you in")
})

await flow('google-unverified', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'unverified')
  await expectText(page, 'confirm your email with Google')
})

await flow('google-legacy-email', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'legacy')
  await page.waitForSelector('[data-ui="handle"]')
  await expectText(page, 'is free.')
  await page.click('[data-ui="start"]')
  await expectText(page, 'This email already has an account here')
})

// ------------------------------------------------------------------ email
await flow('email-signup-confirm', async (page) => {
  await page.goto(`${B}/login?signup=true`)
  await page.fill('[data-ui="email"]', 'robin.new@example.test')
  await page.fill('[data-ui="password"]', 'robin-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'Check your')
  await expectText(page, 'robin.new@example.test')
  await page.goto(`${B}/__fx/inbox?go=verify&kind=confirm`)
  await page.waitForURL(/\/auth\/callback$/, { timeout: 15000 })
  await page.waitForSelector('[data-ui="handle"]')
  const h = await page.inputValue('[data-ui="handle"]')
  await page.fill('input[autocomplete="name"]', 'Robin Lake')
  await finishFirstRun(page)
  await expectText(page, "You're in, Robin.")
  await page.click('[data-ui="look-around"]')
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
  return `inbox, link, first run (suggested @${h}), welcome, ${path(page)}`
})

await flow('email-confirm-other-device', async (page, ctx) => {
  await page.goto(`${B}/login?signup=true`)
  await page.fill('[data-ui="email"]', 'kim.new@example.test')
  await page.fill('[data-ui="password"]', 'kim-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'Check your')
  const { ctx: other, page: phone } = await ctxPage()
  await phone.goto(`${B}/__fx/inbox?go=verify&kind=confirm`)
  await expectText(phone, 'One more')
  await phone.click('[data-ui="to-login"]')
  await phone.fill('[data-ui="email"]', 'kim.new@example.test')
  await phone.fill('[data-ui="password"]', 'kim-password')
  await phone.click('[data-ui="submit"]')
  await phone.waitForSelector('[data-ui="handle"]', { timeout: 10000 })
  const errs = phone.errors
  await other.close()
  if (errs.length) throw new Error(errs.join(' | '))
  void ctx
  return 'other device: "One more step", log in, first run'
})

await flow('email-token-hash', async (page) => {
  await page.goto(`${B}/login?signup=true`)
  await page.fill('[data-ui="email"]', 'lee.hash@example.test')
  await page.fill('[data-ui="password"]', 'lee-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'Check your')
  await page.goto(`${B}/__fx/inbox?go=hash&kind=confirm`)
  await page.waitForSelector('[data-ui="handle"]', { timeout: 15000 })
  if (new URL(page.url()).search) throw new Error('token_hash left in the URL')
  return 'go-live template link verified on any device'
})

await flow('email-wrong-password', async (page) => {
  await page.goto(`${B}/login`)
  await page.fill('[data-ui="email"]', 'maya@example.test')
  await page.fill('[data-ui="password"]', 'not-it')
  await page.click('[data-ui="submit"]')
  await expectText(page, "That email and password don't match")
  const focused = await page.evaluate(() => document.activeElement?.dataset.ui)
  const described = await page.getAttribute('[data-ui="password"]', 'aria-invalid')
  if (focused !== 'password' || described !== 'true') throw new Error(`focus ${focused}, aria-invalid ${described}`)
  return 'inline error on the password, focus moved there'
})

await flow('email-login-return-path', async (page) => {
  await page.goto(`${B}/login?next=${encodeURIComponent('/event/110')}`)
  await page.fill('[data-ui="email"]', 'maya@example.test')
  await page.fill('[data-ui="password"]', 'sample-password')
  await page.click('[data-ui="submit"]')
  await page.waitForURL(/\/event\/110$/, { timeout: 15000 })
  return `ended on ${path(page)}`
})

await flow('email-not-confirmed', async (page) => {
  await page.goto(`${B}/login?signup=true`)
  await page.fill('[data-ui="email"]', 'sky.new@example.test')
  await page.fill('[data-ui="password"]', 'sky-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'Check your')
  await page.goto(`${B}/login`)
  await page.fill('[data-ui="email"]', 'sky.new@example.test')
  await page.fill('[data-ui="password"]', 'sky-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'Confirm your email to finish')
  await page.click('[data-ui="resend"]')
  await expectText(page, "That's a lot of tries") // within 60 s of the first email: the stub's limit, like Supabase's
  return 'confirm line with "Send the link again"; the 60-second limit answered calmly'
})

await flow('rate-limited-and-paused', async (page) => {
  await page.goto(`${B}/login`)
  await page.fill('[data-ui="email"]', 'busy@example.test')
  await page.fill('[data-ui="password"]', 'sample-password')
  await page.click('[data-ui="submit"]')
  await expectText(page, "That's a lot of tries")
  await page.fill('[data-ui="email"]', 'paused@example.test')
  await page.click('[data-ui="submit"]')
  await expectText(page, 'This account is paused')
})

// ------------------------------------------------------------------ password reset
await flow('reset-by-code', async (page) => {
  await page.goto(`${B}/login`)
  await page.fill('[data-ui="email"]', 'tom@example.test')
  await page.click('[data-ui="forgot"]')
  await page.waitForURL(/\/reset-password$/)
  if ((await page.inputValue('[data-ui="email"]')) !== 'tom@example.test') throw new Error('email not carried over')
  await page.click('[data-ui="send-link"]')
  await expectText(page, 'a link to choose a new password is on its way')
  await page.goto(`${B}/__fx/inbox?go=verify&kind=recovery`)
  await page.waitForSelector('[data-ui="new-password"]', { timeout: 15000 })
  await page.waitForTimeout(1500) // stays on the form (today's page bounces to /feed here)
  if (!/\/reset-password$/.test(page.url())) throw new Error(`left the form for ${path(page)}`)
  await page.fill('[data-ui="new-password"]', 'sample-password')
  await page.click('[data-ui="save-password"]')
  await expectText(page, "haven't used here before")
  await page.fill('[data-ui="new-password"]', 'a-brand-new-one')
  await page.click('[data-ui="save-password"]')
  await expectText(page, "You're all")
  await page.click('[data-ui="to-stories"]')
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
  // the new password works
  await page.evaluate(() => localStorage.clear())
  await page.goto(`${B}/login`)
  await page.fill('[data-ui="email"]', 'tom@example.test')
  await page.fill('[data-ui="password"]', 'a-brand-new-one')
  await page.click('[data-ui="submit"]')
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
  return 'ask, inbox, link, stayed on the form, same-password refused, saved, signed in with the new one'
})

await flow('reset-by-token-hash', async (page) => {
  await page.goto(`${B}/reset-password`)
  await page.fill('[data-ui="email"]', 'kate@example.test')
  await page.click('[data-ui="send-link"]')
  await expectText(page, 'on its way')
  const { ctx: other, page: phone } = await ctxPage()
  await phone.goto(`${B}/__fx/inbox?go=hash&kind=recovery`)
  await phone.waitForSelector('[data-ui="new-password"]', { timeout: 15000 })
  await phone.fill('[data-ui="new-password"]', 'kate-new-password')
  await phone.click('[data-ui="save-password"]')
  await expectText(phone, "You're all")
  await other.close()
  return 'token-hash link on another device: form, saved'
})

await flow('reset-spent-link', async (page) => {
  await page.goto(`${B}/reset-password?code=not-a-real-code`)
  await expectText(page, 'fresh')
  await page.waitForSelector('[data-ui="send-link"]')
  return 'code without its verifier: fresh-link screen, never a form that cannot work'
})

// ------------------------------------------------------------------ signed in already
await flow('signed-in-never-sees-form', async (page) => {
  await signInAs(page, 'maya')
  await page.addInitScript(() => {
    window.__sawForm = false
    new MutationObserver(() => {
      if (document.querySelector('[data-ui="email"]')) window.__sawForm = true
    }).observe(document, { subtree: true, childList: true })
  })
  await page.goto(`${B}/login`)
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
  if (await page.evaluate(() => window.__sawForm)) throw new Error('the form flashed')
  return 'sent on to /feed without the form ever painting'
})

await flow('direct-load-stays', async (page) => {
  await signInAs(page, 'maya')
  await page.goto(`${B}/notifications`)
  await page.waitForTimeout(3500)
  if (!/\/notifications$/.test(page.url())) throw new Error(`ended on ${path(page)}`)
  return `direct load of /notifications ended on ${path(page)}`
})

await flow('unsafe-next', async (page) => {
  await signInAs(page, 'maya')
  const out = []
  for (const n of ['https://evil.example', '//evil.example', '/\\evil.example']) {
    await page.goto(`${B}/login?next=${encodeURIComponent(n)}`)
    await page.waitForURL(/\/feed$/, { timeout: 15000 })
    out.push(path(page))
  }
  return `each ended on ${[...new Set(out)].join(', ')}`
})

await flow('session-without-profile', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'new')
  await page.waitForSelector('[data-ui="handle"]')
  await page.goto(`${B}/login`)
  await page.waitForSelector('[data-ui="handle"]', { timeout: 15000 })
  return '/login with a session but no profile shows the first-run step'
})

await flow('local-sign-out', async (page) => {
  await page.goto(`${B}/login`)
  await google(page, 'member')
  await page.waitForURL(/\/feed$/)
  const scopes = []
  page.on('request', (r) => r.url().includes('/__sb/auth/v1/logout') && scopes.push(new URL(r.url()).searchParams.get('scope')))
  await page.click('[data-ui="tabbar"] button:has-text("You")')
  await page.getByText('Log out', { exact: true }).click()
  await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 })
  if (scopes.join() !== 'local') throw new Error(`logout scopes: ${scopes.join() || 'none'}`)
  return 'signed out with scope=local only'
})

// ------------------------------------------------------------------ invitations
await flow('invite-google-new', async (page) => {
  await page.goto(`${B}/join/ruth-link`)
  await expectText(page, 'Ruth saved you a')
  await google(page, 'new')
  await page.waitForSelector('[data-ui="handle"]')
  await finishFirstRun(page)
  await expectText(page, 'You and Ruth follow each other')
  await page.click('[data-ui="welcome-read"]')
  await page.waitForURL(/\/event\/\d+$/, { timeout: 15000 })
  return `welcome names Ruth; "Read Ruth's latest story" opened ${path(page)}`
})

await flow('invite-used', async (page) => {
  await page.goto(`${B}/join/used-invite`)
  await expectText(page, 'already')
})

await flow('invite-signed-in', async (page) => {
  await signInAs(page, 'maya')
  await page.goto(`${B}/join/ruth-link`)
  await expectText(page, "You're already")
  await page.waitForSelector('[data-ui="to-inviter"]')
})

await flow('invited-signup-redirect', async (page) => {
  await page.goto(`${B}/signup/invited?token=ruth-link`)
  await page.waitForURL(/\/join\/ruth-link$/)
})

await flow('in-app-browser', async (page, ctx) => {
  void ctx
  const { ctx: ig, page: p2 } = await ctxPage({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0' })
  await p2.goto(`${B}/login`)
  await p2.click('[data-ui="google"]')
  await expectText(p2, 'Google opens in your browser')
  const still = path(p2)
  await ig.close()
  if (still !== '/login') throw new Error('left the page')
  return 'the sheet explains; nothing breaks'
})

await flow('demo', async (page) => {
  await page.goto(`${B}/demo-login`)
  await page.fill('[data-ui="password"]', 'sample-demo')
  await page.click('[data-ui="submit"]')
  await page.waitForURL(/\/feed$/, { timeout: 15000 })
})

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} flows passed`)
process.exit(failed.length ? 1 : 0)
