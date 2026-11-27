#!/usr/bin/env node
// The short-screen overlap sweep (owner: F0 / integration). Every Daylight page with sample
// data, and the sheets and menus a person opens on it, at the phone heights people really see
// once the browser's bars are counted, plus a tablet and a small laptop. Each page is scrolled
// top to bottom (with a sheet open, the sheet is scrolled) and scripts/daylight/overlap.mjs
// lists text over text, controls running into each other, things covered by the page, and
// things stuck under a fixed bar with no way to scroll them out.
//
// Start the sample server first (docs/app/handover/FOUNDATION.md "Sample mode"), then:
//   node scripts/daylight/check-overlap.mjs --base http://127.0.0.1:5371
// Options:
//   --vp 360x540,375x560     viewports (default: 360x540 375x560 393x680 390x750 430x800 768x900 1024x700)
//   --only feed,story-long   scenes by name (--list prints them)
//   --out name               writes shots/daylight-overlap/<name>/ (default: run)
//   --replay <report.json>   shoot the frames of an earlier report again, same scene, viewport and
//                            scroll, so a before and an after sheet line up
//   --jobs 3                 viewports checked at once
//   --shots 4                frames kept per scene and viewport
//   --no-reset               leave the sample as it is (by default it is reset first)
//   --notch                  an iPhone added to the home screen: the safe-area insets set (47px
//                            top, 34px bottom on phones) and the status bar and home indicator drawn
//                            as opaque bars over the page, so what lands under them is found.
//                            Headless Chromium has no insets of its own.
// Writes <vp>-<scene>-NN.jpg (findings outlined: pink the thing, orange what it collides with),
// sheet-NN.jpg (labelled contact sheets), report.json. Exits 1 when anything collides.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { detectOverlap, sweep, highlight, unhighlight, markScroller } from './overlap.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const KIT = path.resolve(FRONTEND, '../landing-art/kits/tetons')
const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = requirePw('playwright')

const args = { base: 'http://127.0.0.1:5371', vp: '360x540,375x560,393x680,390x750,430x800,768x900,1024x700', only: null, out: 'run', replay: null, jobs: 3, shots: 4 }
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '')
  if (k === 'list' || k === 'notch' || k === 'no-reset') args[k] = true
  else args[k] = process.argv[++i]
}
const TILE_HOSTS = new Set(['tiles.openfreemap.org', 'tiles.mapterhorn.com'])
const NOW = new Date('2026-11-26T12:00:00')
const KIT_FILES = fs.existsSync(KIT) ? fs.readdirSync(KIT).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => path.join(KIT, f)) : []
const TETONS = '/event/seven-days-in-the-tetons'

// ---------------------------------------------------------------- scenes
// {name, path, as: 'maya'|null (signed out), me: a key of ME (the member's account changed),
//  prep(page, h), wide: only >= 900, narrow: only < 900, maxW: only this wide or narrower,
//  noSweep: look once where prep leaves it}
// prep opens whatever a person would open; the sweep then scrolls whatever is on top.
// one at a time across the viewports run at once: two password resets asked for together in
// the stub do not both come back (a sample quirk, not the app's)
let queue1 = Promise.resolve()
const one = (fn) => (queue1 = queue1.then(fn, fn))

// what the member's account says, for the banners the sample member never sees
const ME = {
  demo: { is_demo_account: true },
  earlybird: { subscription_status: 'trial', subscription_tier: 'free', trial_days_remaining: 28, is_within_first_5_days: true, trial_end_date: '2026-12-24T00:00:00' },
  trialend: { subscription_status: 'trial', subscription_tier: 'free', trial_days_remaining: 0, trial_end_date: '2026-11-20T00:00:00' },
  trial: { subscription_status: 'trial', subscription_tier: 'free', trial_days_remaining: 12, is_within_first_5_days: false, trial_end_date: '2026-12-08T00:00:00' },
}
const openYou = async (page, h) => (h.desktop ? h.tap('button[aria-label$="your menu"]') : h.tap('[data-ui="tabbar"] button:has-text("You")'))
const SCENES = [
  { name: 'feed', path: '/feed' },
  { name: 'feed-category', path: '/feed?group=category' },
  { name: 'feed-filter', path: '/feed', prep: async (page, h) => { await h.tap('[data-ui="filter-button"]'); await page.waitForSelector('[data-ui="filter-sheet"]') } },
  { name: 'calendar', path: '/feed?view=calendar' },
  { name: 'calendar-month', path: '/feed?view=calendar&month=2026-06' },
  { name: 'timeline', path: '/feed?view=timeline' },
  { name: 'story-long', path: TETONS },
  { name: 'story-short', path: '/event/two-weeks-in-galway' },
  { name: 'story-own', path: '/event/six-weeks-without-a-kitchen' },
  { name: 'story-contents', path: TETONS, narrow: true, prep: async (page, h) => {
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight * 0.3))
    await page.waitForTimeout(600)
    await h.tap('[data-ui="story-bottombar"] button')
    await page.waitForSelector('[aria-modal="true"]')
  } },
  { name: 'journey-sheet', path: TETONS, narrow: true, prep: async (page, h) => {
    await h.tap(page.getByRole('button', { name: 'Open the journey map' }).first())
    await page.waitForSelector('[data-ui="journey-sheet"]')
    await h.idle(900)
  } },
  { name: 'lightbox', path: TETONS, prep: async (page, h) => {
    await h.tap('[data-ui="story-body"] figure button[aria-haspopup="dialog"]')
    await page.waitForSelector('[data-ui="lightbox-foot"]')
    await page.waitForTimeout(900)
  } },
  { name: 'lightbox-reactions', path: TETONS, prep: async (page, h) => {
    await h.tap('[data-ui="story-body"] figure button[aria-haspopup="dialog"]')
    await page.waitForSelector('[data-ui="lightbox-foot"]')
    await page.waitForTimeout(700)
    await h.tap('[data-ui="lightbox-foot"] [data-ui="reaction-button"]')
    await page.waitForSelector('[data-ui="reaction-tray"]')
    await page.waitForTimeout(500)
  } },
  { name: 'lightbox-comments', path: TETONS, prep: async (page, h) => {
    await h.tap('[data-ui="story-body"] figure button[aria-haspopup="dialog"]')
    await page.waitForSelector('[data-ui="lightbox-foot"]')
    await page.waitForTimeout(700)
    await h.tap(page.locator('[data-ui="lightbox-foot"] button', { hasText: /Comment|\d/ }).last())
    await page.waitForSelector('[aria-modal="true"]')
    await page.waitForTimeout(700)
  } },
  { name: 'story-reactions', path: TETONS, prep: async (page, h) => {
    await h.scrollTo('#ofsa-comments', 0.3)
    await h.tap('#ofsa-comments [data-ui="reaction-button"]')
    await page.waitForSelector('[data-ui="reaction-tray"]')
    await page.waitForTimeout(500)
  }, noSweep: true },
  { name: 'world', path: '/feed?view=map', settle: 1500 },
  { name: 'world-card', path: '/feed?view=map', settle: 1500, prep: async (page, h) => {
    // a lone pin if one is in view, else open a group and take one of its pins; where the
    // group's pins land under the map's own controls, the list or the carousel instead
    const pin = () => h.tapMarker('[data-ui="map-pin"]')
    await pin().catch(async () => {
      await h.tapMarker('[data-ui="map-cluster"]')
      await h.idle(1200)
      await pin().catch(() => h.tap(h.desktop ? '[data-ui="world-list"] [data-story] button' : '[data-ui="world-carousel"] button'))
    })
    await h.idle(1200)
  } },
  { name: 'create-picker', path: '/create?from=photos' },
  { name: 'create-draft', path: '/create?from=photos', create: true },
  ...['title', 'audience', 'people', 'dates', 'place', 'category', 'cover'].map((k) => ({
    name: `create-${k}`, path: '/create?from=photos', create: true, prep: async (page, h) => {
      await h.tap(h.desktop ? `[data-ui="setting-${k}"]` : k === 'title' ? '[data-ui="settings-chips"] button:first-child' : `[data-ui="chip-${k}"]`)
      await page.waitForSelector('[aria-modal="true"]')
      await page.waitForTimeout(700)
    },
  })),
  { name: 'create-words', path: '/create?from=photos', create: true, prep: async (page, h) => {
    await h.tap('[data-ui="words-pill"], [data-ui="words-input"]')
    await page.waitForTimeout(700)
  } },
  { name: 'create-questions', path: '/create?from=photos', create: true, prep: async (page, h) => {
    await h.tap('[data-ui="questions-toggle"]')
    await page.waitForTimeout(800)
  } },
  { name: 'create-recording', path: '/create?from=photos', create: true, noSweep: true, prep: async (page, h) => {
    await h.tap('[data-ui="mic"]')
    await page.waitForSelector('[data-ui="recording"]')
    await page.waitForTimeout(1500)
  } },
  { name: 'create-written', path: '/create?from=photos', create: true, prep: async (page, h) => {
    await h.tap('[data-ui="mic"]')
    await page.waitForSelector('[data-ui="recording"]')
    await page.waitForTimeout(1500)
    await h.tap('[data-ui="mic-stop"]')
    await page.waitForSelector('[data-ui="word-voice"][data-state="ready"]', { timeout: 30000 })
    await page.waitForFunction(() => /Written|did not arrive|used up/.test(document.querySelector('[data-ui="job-write"]')?.textContent || ''), null, { timeout: 90000 })
    await h.idle(900)
  } },
  { name: 'create-classic', path: '/create' },
  { name: 'import', path: '/import' },
  { name: 'new-menu', path: '/feed', prep: async (page, h) => { await h.tap(h.desktop ? 'button:has-text("New story")' : '[data-ui="tabbar"] >> text=New'); await page.waitForTimeout(700) } },
  { name: 'you-menu', path: '/feed', prep: async (page, h) => { await openYou(page, h); await page.waitForTimeout(700) } },
  { name: 'family-menu', path: '/feed', prep: async (page, h) => { await h.tap(h.desktop ? 'nav[aria-label="Main"] button:has-text("Family")' : '[data-ui="tabbar"] button:has-text("Family")'); await page.waitForTimeout(700) } },
  { name: 'search', path: '/feed', prep: async (page, h) => { await h.tap('button[aria-label="Find people"]'); await page.waitForTimeout(500); await page.keyboard.type('a'); await page.waitForTimeout(900) } },
  { name: 'banner-demo', path: '/feed', me: 'demo' },
  { name: 'banner-demo-story', path: TETONS, me: 'demo' },
  { name: 'banner-earlybird', path: '/feed', me: 'earlybird' },
  { name: 'banner-trial', path: '/feed', me: 'trial' },
  { name: 'banner-trial-ended', path: '/feed', me: 'trialend' },
  { name: 'install-prompt', path: '/feed', maxW: 599, noSweep: true, prep: async (page, h) => {
    await page.evaluate(() => { sessionStorage.setItem('overlap-install-prompt', '1'); localStorage.removeItem('pwa-install-dismissed') })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Get the OFS App').waitFor({ timeout: 8000 })
    await page.waitForTimeout(600)
    await page.evaluate(() => sessionStorage.removeItem('overlap-install-prompt'))
  } },
  { name: 'profile-you', path: '/profile/maya' },
  { name: 'profile-other', path: '/profile/tom' },
  { name: 'privacy-403', path: '/event/403' },
  { name: 'privacy-lapsed', path: '/event/lapsed-plan' },
  { name: 'not-found-story', path: '/event/404' },
  // the classic pages shown inside the new frame
  { name: 'settings', path: '/settings' },
  { name: 'billing', path: '/billing' },
  { name: 'pricing', path: '/pricing' },
  { name: 'notifications', path: '/notifications' },
  { name: 'tags', path: '/tags' },
  { name: 'sharing', path: '/relationships' },
  { name: 'family-tree', path: '/family-tree' },
  { name: 'my-feedback', path: '/my-feedback' },
  { name: 'admin', path: '/admin' },
  { name: 'admin-users', path: '/admin/users' },
  // signed out
  { name: 'login', path: '/login', as: null },
  { name: 'signup', path: '/login?signup=true', as: null },
  { name: 'reset', path: '/reset-password', as: null },
  { name: 'reset-new', path: '/reset-password', as: null, prep: (page, h) => one(async () => {
    // one member per viewport: the sample limits how often one address asks
    const who = ['joe', 'kate', 'marcus', 'finn', 'priya', 'sam', 'deb', 'leo', 'ivy'][h.index % 9]
    await page.fill('[data-ui="email"]', `${who}@example.test`)
    await page.click('[data-ui="send-link"]')
    await page.waitForFunction(() => /on its way|Send it again/.test(document.body.innerText), null, { timeout: 12000 }).catch(async () => { throw new Error(`no confirmation: ${page.url()} ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160)}`) })
    // the stub inbox can lag the request a moment: look again
    for (let i = 0; ; i++) {
      await page.goto(`${args.base}/__fx/inbox?go=verify&kind=recovery&to=${who}@example.test`)
      const ok = await page.waitForSelector('[data-ui="new-password"]', { timeout: 5000 }).then(() => true, () => false)
      if (ok) break
      if (i === 3) throw new Error(`no reset link for ${who}: ${page.url()}`)
      await page.waitForTimeout(1500)
    }
    await h.idle(500)
  }) },
  { name: 'invite-link', path: '/join/tom-link', as: null },
  { name: 'invite-email', path: '/join/tom-email', as: null },
  { name: 'invite-used', path: '/join/used-invite', as: null },
  { name: 'share-link', path: '/share/tetons-share', as: null },
  { name: 'share-expired', path: '/share/expired-share', as: null },
]
if (args.list) {
  console.log(SCENES.map((s) => s.name).join('\n'))
  process.exit(0)
}

const viewports = args.vp.split(',').map((v) => { const [w, h] = v.split('x').map(Number); return { width: w, height: h, key: `${w}x${h}` } })
const OUT = path.join(FRONTEND, 'shots', 'daylight-overlap', args.out)
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const replay = args.replay ? JSON.parse(fs.readFileSync(args.replay, 'utf8')) : null
const only = args.only ? new Set(args.only.split(',')) : replay ? new Set(replay.frames.map((f) => f.scene)) : null
const scenes = SCENES.filter((s) => !only || only.has(s.name))
const report = { base: args.base, when: new Date().toISOString(), viewports: viewports.map((v) => v.key), findings: [], frames: [], errors: [], unanswered: [] }

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

async function newPage(vp, as, me) {
  const phone = vp.width < 600
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: phone,
    hasTouch: vp.width <= 1024,
    serviceWorkers: 'block',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: ['microphone'],
    userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' : undefined,
  })
  const appHost = new URL(args.base).host
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url())
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    if (!(u.host === appHost || TILE_HOSTS.has(u.host))) return route.abort()
    // the sample has no superuser: let the sample member see the admin pages and menu item
    if (as && u.pathname === '/api/v1/users/me' && route.request().method() === 'GET') {
      const res = await route.fetch()
      const json = await res.json().catch(() => null)
      if (!json) return route.fulfill({ response: res })
      Object.assign(json, { is_superuser: true }, ME[me] || {})
      return route.fulfill({ response: res, json })
    }
    return route.continue()
  })
  // the classic "Get the OFS App" prompt rises over every page a few seconds in on an iPhone
  // until it is dismissed once: dismissed here, and looked at on its own (install-prompt)
  await ctx.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('overlap-install-prompt')) localStorage.setItem('pwa-install-dismissed', 'true')
    } catch {}
  })
  if (args.notch && phone) {
    await ctx.addInitScript(() => {
      const put = () => {
        if (!document.body || document.getElementById('overlap-notch')) return
        const st = document.createElement('style')
        st.id = 'overlap-notch'
        st.textContent = 'html.ofsa-on, .ofsa { --a-safe-top: 47px !important; --a-safe-bottom: 34px !important; }'
        document.head.appendChild(st)
        for (const [edge, h] of [['top', 47], ['bottom', 34]]) {
          const d = document.createElement('div')
          d.dataset.ui = `system-${edge}`
          d.setAttribute('aria-hidden', 'true')
          d.style.cssText = `position:fixed;left:0;right:0;${edge}:0;height:${h}px;background:rgba(0,0,0,.92);z-index:2147483646`
          document.body.appendChild(d)
        }
      }
      document.addEventListener('DOMContentLoaded', put)
    })
  }
  const page = await ctx.newPage()
  await page.clock.install({ time: NOW })
  await page.clock.resume()
  page.on('pageerror', (e) => report.errors.push(`${vp.key} pageerror: ${e.message.split('\n')[0]}`))
  page.on('response', async (res) => {
    if (res.status() !== 404) return
    const u = new URL(res.url())
    if (!u.pathname.startsWith('/api/v1/')) return
    const body = await res.text().catch(() => '')
    if (body.includes('no sample answer')) report.unanswered.push(`${res.request().method()} ${u.pathname}`)
  })
  if (as) {
    await page.goto(`${args.base}/__fx/signin?as=${as}&next=/feed`, { waitUntil: 'load' })
    await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 20000 })
    await page.waitForFunction(() => !!document.querySelector('[data-ui="tabbar"], button[aria-label$="your menu"]'), null, { timeout: 20000 }).catch(() => report.errors.push(`${vp.key} sign-in did not complete`))
  }
  return page
}

function helpers(page, vp) {
  const touch = vp.width <= 1024
  const h = {
    desktop: vp.width >= 900,
    index: viewports.indexOf(vp),
    async tap(sel) {
      const loc = typeof sel === 'string' ? page.locator(sel).first() : sel
      await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {})
      if (touch) await loc.tap({ timeout: 10000 })
      else await loc.click({ timeout: 10000 })
    },
    async idle(ms = 500) {
      // the sample answers at once; the notification poll keeps the network from going idle
      await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {})
      await page.waitForFunction(() => [...document.querySelectorAll('[data-map-state]')].every((e) => e.dataset.mapState === 'idle' || e.dataset.mapState === 'failed'), null, { timeout: 30000 }).catch(() => {})
      await page.evaluate(async () => {
        await document.fonts?.ready
        const imgs = [...document.images].filter((i) => !i.complete && i.loading !== 'lazy')
        await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000) })))
      })
      await page.waitForTimeout(ms)
    },
    scrollTo: (sel, at = 0.38) => page.evaluate(([q, f]) => {
      const el = document.querySelector(q)
      if (!el) throw new Error(`nothing at ${q}`)
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - window.innerHeight * f, behavior: 'instant' })
    }, [sel, at]),
    async tapMarker(sel) {
      const pt = await page.evaluate((q) => {
        const box = document.querySelector('[data-ui="world-map"]').getBoundingClientRect()
        for (const el of document.querySelectorAll(q)) {
          const r = el.getBoundingClientRect()
          const x = r.left + r.width / 2, y = r.top + r.height / 2
          if (el.classList.contains('maplibregl-marker-covered')) continue
          if (x < box.left + 30 || x > box.right - 30 || y < box.top + 70 || y > box.bottom - 30) continue
          const hit = document.elementFromPoint(x, y)
          if (hit && (el === hit || el.contains(hit))) return { x, y }
        }
        return null
      }, sel)
      if (!pt) throw new Error(`no visible marker for ${sel}`)
      if (touch) await page.touchscreen.tap(pt.x, pt.y)
      else await page.mouse.click(pt.x, pt.y)
    },
  }
  return h
}

async function openScene(page, vp, scene) {
  const h = helpers(page, vp)
  if (scene.create) {
    if (!KIT_FILES.length) throw new Error(`no kit photos in ${KIT}`)
    await page.goto(`${args.base}/create?from=photos`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ui="photo-input"]', { state: 'attached', timeout: 20000 })
    await page.setInputFiles('[data-ui="photo-input"]', KIT_FILES)
    await page.waitForSelector('[data-ui="create-summary"]', { timeout: 30000 })
    await page.waitForTimeout(1200)
  } else if (page.url().startsWith(args.base) && !/^\/__fx\//.test(new URL(page.url()).pathname) && new URL(page.url()).pathname !== new URL(scene.path, args.base).pathname) {
    // another page: move inside the running app, as the router answers popstate like a Back (a
    // full load costs hundreds of module requests on the dev server). The same page loads
    // afresh, so nothing the last scene opened on it stays open.
    await page.evaluate((p) => {
      history.pushState({}, '', p)
      dispatchEvent(new PopStateEvent('popstate'))
      window.scrollTo(0, 0)
    }, scene.path)
    await page.waitForTimeout(300)
  } else {
    await page.goto(`${args.base}${scene.path}`, { waitUntil: 'domcontentloaded' })
  }
  await h.idle(scene.settle || 700)
  if (scene.prep) await scene.prep(page, h)
  return h
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-')
async function frame(page, vp, scene, label, findings, n) {
  const file = path.join(OUT, `${vp.key}-${slug(scene.name)}-${String(n).padStart(2, '0')}.jpg`)
  if (findings.length) await highlight(page, findings)
  await page.screenshot({ path: file, type: 'jpeg', quality: 72 })
  if (findings.length) await unhighlight(page)
  return path.relative(OUT, file)
}

async function runViewport(vp) {
  const pages = {}
  const pageFor = async (as, me) => (pages[`${as || '-'}:${me || ''}`] ||= await newPage(vp, as, me))
  for (const scene of scenes) {
    const wide = vp.width >= 900
    if ((scene.wide && !wide) || (scene.narrow && wide) || (scene.maxW && vp.width > scene.maxW)) continue
    const as = scene.as === undefined ? 'maya' : scene.as
    const page = await pageFor(as, scene.me)
    // a scene may leave a sheet open or the voice recorder running: start each from clean
    for (let i = 0; i < 3; i++) await page.keyboard.press('Escape').catch(() => {})
    if (as === null) await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} }).catch(() => {})
    const wanted = replay ? replay.frames.filter((f) => f.scene === scene.name && f.vp === vp.key) : null
    if (replay && !wanted.length) continue
    let n = 0
    try {
      await openScene(page, vp, scene)
      if (replay) {
        await markScroller(page)
        for (const f of wanted) {
          await page.evaluate(({ page: y, inner, innerEnds }) => {
            window.scrollTo({ top: y, behavior: 'instant' })
            const s = document.querySelector('[data-overlap-scroller]')
            if (s) s.scrollTo({ top: inner, behavior: 'instant' })
            // the frame was taken with every scroller on the screen at its end
            if (innerEnds) {
              for (const e of document.querySelectorAll('body *')) {
                const st = getComputedStyle(e)
                if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4 && !e.closest('.maplibregl-map')) e.scrollTo({ top: e.scrollHeight, behavior: 'instant' })
              }
            }
          }, f.at)
          await page.waitForTimeout(400)
          const res = await page.evaluate(detectOverlap)
          for (const x of res.findings) report.findings.push({ vp: vp.key, scene: scene.name, ...x, at: f.at })
          const file = await frame(page, vp, scene, f.label, res.findings, ++n)
          report.frames.push({ vp: vp.key, scene: scene.name, at: f.at, label: f.label, file, count: res.findings.length })
        }
        continue
      }
      const onFinding = async (f) => {
        report.findings.push({ vp: vp.key, scene: scene.name, ...f })
        console.log(`  ${vp.key} ${scene.name}: ${f.kind} ${f.a}${f.b ? `  x  ${f.b}` : ''}${f.note ? ` (${f.note})` : ''} @${f.at.page}/${f.at.inner}`)
        if (n >= Number(args.shots)) return
        const here = await page.evaluate(detectOverlap)
        const file = await frame(page, vp, scene, '', here.findings, ++n)
        report.frames.push({ vp: vp.key, scene: scene.name, at: f.at, label: `${f.kind}: ${f.a}${f.b ? ` x ${f.b}` : ''}`, file, count: here.findings.length })
      }
      if (scene.noSweep) {
        const res = await page.evaluate(detectOverlap)
        const at = await page.evaluate(() => ({ page: window.scrollY, inner: 0 }))
        for (const f of res.findings) await onFinding({ ...f, at, scope: res.scope })
      } else {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await sweep(page, { onFinding })
      }
      process.stdout.write(`  ${vp.key} ${scene.name} ✓\n`)
    } catch (e) {
      report.errors.push(`${vp.key} ${scene.name}: ${e.message.split('\n')[0]}`)
      console.log(`  ${vp.key} ✗ ${scene.name}: ${e.message.split('\n')[0]}`)
      const file = await frame(page, vp, scene, '', [], ++n).catch(() => null)
      if (file) report.frames.push({ vp: vp.key, scene: scene.name, at: { page: 0, inner: 0 }, label: `FAILED: ${e.message.split('\n')[0].slice(0, 80)}`, file, count: 0 })
    }
  }
  for (const p of Object.values(pages)) await p.context().close()
}

// a fresh sample, as the walk starts from (--no-reset leaves it, for a server something else is using)
if (!args['no-reset']) {
  await fetch(`${args.base}/__fx/reset`).catch(() => {})
  await fetch(`${args.base}/api/v1/__create/sample/reset`).catch(() => {})
}

// a few viewports at a time; each has its own signed-in and signed-out pages
const queue = [...viewports]
await Promise.all(Array.from({ length: Math.min(Number(args.jobs), queue.length) }, async () => {
  while (queue.length) await runViewport(queue.shift())
}))

// ---------------------------------------------------------------- contact sheet
// Labelled contact sheets, 30 frames a page (one tall page runs past what Chromium can shoot):
// sheet-01.jpg, sheet-02.jpg...
async function contactSheets() {
  const order = (f) => viewports.findIndex((v) => v.key === f.vp) * 1000 + SCENES.findIndex((s) => s.name === f.scene)
  const frames = [...report.frames].sort((a, b) => order(a) - order(b))
  const pages = []
  for (let i = 0; i < frames.length; i += 30) pages.push(frames.slice(i, i + 30))
  for (const [n, page] of pages.entries()) {
    const tiles = page.map((f) => {
      const w = Number(f.vp.split('x')[0]) < 600 ? 240 : 380
      const img = fs.readFileSync(path.join(OUT, f.file)).toString('base64')
      const tag = f.count ? `<b style="color:#C4253B">${f.count} found</b>` : '<b style="color:#1a7f37">clear</b>'
      return `<figure style="margin:0;width:${w}px"><div style="padding:4px 0;min-height:48px;word-break:break-word">${f.vp} · ${f.scene} · ${tag}<br>${(f.label || '').replace(/</g, '&lt;').slice(0, 120)}</div><img style="width:${w}px;border:2px solid #101B3B;border-radius:8px;display:block" src="data:image/jpeg;base64,${img}"></figure>`
    }).join('')
    const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font:12px Menlo,monospace;color:#101B3B">
    <div style="padding:16px 16px 4px;font-weight:700">Daylight overlap sweep · ${args.out}${replay ? ' (replay)' : ''} · page ${n + 1} of ${pages.length} · ${report.findings.length} findings in all · pink: the thing, orange: what it meets</div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px">${tiles}</div></body></html>`
    const ctx = await browser.newContext({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    await p.setContent(html, { waitUntil: 'load' })
    await p.screenshot({ path: path.join(OUT, `sheet-${String(n + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 78, fullPage: true })
    await ctx.close()
  }
}
report.errors = [...new Set(report.errors)]
report.unanswered = [...new Set(report.unanswered)]
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
await contactSheets().catch((e) => console.log(`(contact sheet failed: ${e.message.split('\n')[0]})`))
await browser.close()
const byKind = report.findings.reduce((o, f) => ((o[f.kind] = (o[f.kind] || 0) + 1), o), {})
console.log(`\nreport: ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}`)
console.log(report.findings.length ? `✗ ${report.findings.length} findings: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', ')}` : '✓ nothing collides')
console.log(report.errors.length ? `✗ errors (${report.errors.length}):\n    ${report.errors.slice(0, 30).join('\n    ')}` : '✓ every scene ran')
if (report.unanswered.length) console.log(`  (unanswered sample routes: ${report.unanswered.join(', ')})`)
process.exit(report.findings.length || report.errors.length ? 1 : 0)
