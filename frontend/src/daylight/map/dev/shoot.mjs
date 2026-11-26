#!/usr/bin/env node
// MAP's own capture script (owner: MAP). The shared scripts/daylight/capture.mjs shoots a
// route once; the map's sheets need gestures, scrolling and playback in between.
//
//   node src/daylight/map/dev/shoot.mjs --scene globe|world|journey|play|phone|fallback|all [--base http://127.0.0.1:5333]
//
// Writes frontend/shots/daylight-map-<scene>/{NN-name}.jpg, sheet.jpg (phone first) and
// report.json. Like capture.mjs: signs in through /__fx/signin, blocks service workers,
// aborts every host except the app and the two tile hosts, fake clock 26 Nov 2026 noon
// America/Chicago, reports console errors and hosts. Never full-page (WebGL clears).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../../../..')
const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = requirePw('playwright')

const args = { base: 'http://127.0.0.1:5333', scene: 'globe', as: 'maya' }
for (let i = 2; i < process.argv.length; i++) args[process.argv[i].replace(/^--/, '')] = process.argv[++i]
const TILE_HOSTS = new Set(['tiles.openfreemap.org', 'tiles.mapterhorn.com'])
const NOW = new Date('2026-11-26T12:00:00')
const TETONS = '/event/seven-days-in-the-tetons'

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })

function makeRun(scene) {
  const OUT = path.join(FRONTEND, 'shots', `daylight-map-${scene}`)
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const report = { scene, base: args.base, shots: [], errors: [], unanswered: [], hosts: {}, aborted: {}, notes: [] }
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1)

  async function open(device, { reduced = false, query = '' } = {}) {
    const phone = device === 'phone'
    const ctx = await browser.newContext({
      viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: 'block',
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      locale: 'en-US',
      timezoneId: 'America/Chicago',
      userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' : undefined,
    })
    const appHost = new URL(args.base).host
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url())
      if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
      bump(report.hosts, u.host)
      if (u.host === appHost || TILE_HOSTS.has(u.host)) return route.continue()
      bump(report.aborted, u.host)
      return route.abort()
    })
    const page = await ctx.newPage()
    await page.clock.install({ time: NOW })
    await page.clock.resume()
    page.on('pageerror', (e) => report.errors.push(`${device} pageerror: ${e.message.split('\n')[0]}`))
    page.on('console', (m) => {
      if (m.type() !== 'error') return
      const t = m.text()
      if (/Failed to load resource: net::ERR_FAILED/.test(t)) return
      report.errors.push(`${device} console: ${t.slice(0, 240)}`)
    })
    page.on('response', async (res) => {
      if (res.status() !== 404) return
      const u = new URL(res.url())
      if (!u.pathname.startsWith('/api/v1/')) return
      const body = await res.text().catch(() => '')
      if (body.includes('no sample answer')) report.unanswered.push(`${res.request().method()} ${u.pathname}${u.search}`)
    })
    await page.goto(`${args.base}/__fx/signin?as=${args.as}&next=/feed${query}`, { waitUntil: 'load' })
    await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 15000 })
    await page.waitForFunction(() => !!document.querySelector('[data-ui="tabbar"], button[aria-label$="your menu"]'), null, { timeout: 15000 }).catch(() => report.errors.push('sign-in did not complete'))
    page.device = device
    return page
  }

  /** Wait until every map on the page is idle (or failed), fonts and images are in. */
  async function idle(page, { ms = 500, timeout = 45000 } = {}) {
    await page.waitForFunction(() => {
      const els = [...document.querySelectorAll('[data-map-state]')]
      return els.length && els.every((e) => e.dataset.mapState === 'idle' || e.dataset.mapState === 'failed')
    }, null, { timeout }).catch(() => report.errors.push(`${page.device}: timeout waiting for the map to go idle (${page.url().replace(args.base, '')})`))
    await page.evaluate(async () => {
      await document.fonts?.ready
      const imgs = [...document.images].filter((i) => !i.complete)
      await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000) })))
    })
    await page.waitForTimeout(ms)
  }

  /** clip: a selector to crop the shot to (the map itself, so it is large on the sheet). */
  async function shot(page, name, label, { clip } = {}) {
    const n = report.shots.length + 1
    const file = path.join(OUT, `${String(n).padStart(2, '0')}-${page.device}-${name}.jpg`)
    let box = null
    if (clip) {
      box = await page.evaluate((sel) => {
        const r = document.querySelector(sel)?.getBoundingClientRect()
        return r ? { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.width + 12, height: Math.min(r.height + 30, innerHeight - Math.max(0, r.y - 6)) } : null
      }, clip)
    }
    await page.screenshot({ path: file, type: 'jpeg', quality: 84, ...(box ? { clip: box } : {}) })
    report.shots.push({ device: page.device, label: label || name, file: path.relative(FRONTEND, file), url: page.url().replace(args.base, '') })
    console.log(`  ${page.device} ${String(n).padStart(2, '0')}  ${label || name}`)
  }

  async function sideways(page, label) {
    const vp = page.viewportSize()
    for (const w of [390, 768, 1280, 1920]) {
      await page.setViewportSize({ width: w, height: vp.height })
      await page.waitForTimeout(150)
      const r = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }))
      if (r.sw > r.vw) report.errors.push(`sideways scroll: ${label} at ${w}: scrollWidth ${r.sw} > ${r.vw}`)
    }
    await page.setViewportSize(vp)
  }

  async function finish() {
    const tiles = report.shots.map((s) => ({ ...s, data: fs.readFileSync(path.join(FRONTEND, s.file)).toString('base64') }))
    const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font:13px Menlo,monospace;color:#101B3B">
    <div style="padding:16px 16px 4px;font-weight:700">daylight-map-${scene} · ${new Date().toISOString().slice(0, 16)} · ${report.shots.length} shots · phone first</div>
    ${['phone', 'desktop'].map((d) => {
      const t = tiles.filter((x) => x.device === d)
      if (!t.length) return ''
      const w = d === 'phone' ? 270 : scene === 'terrain' ? 440 : 580
      return `<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px">${t.map((x) => `<figure style="margin:0;width:${w}px"><div style="padding:4px 0;min-height:32px">${x.label.replace(/</g, '&lt;')}</div><img style="width:${w}px;border:2px solid #101B3B;border-radius:8px;display:block" src="data:image/jpeg;base64,${x.data}"></figure>`).join('')}</div>`
    }).join('')}</body></html>`
    const ctx = await browser.newContext({ viewport: { width: 1840, height: 900 }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    await p.setContent(html, { waitUntil: 'load' })
    await p.screenshot({ path: path.join(OUT, 'sheet.jpg'), type: 'jpeg', quality: 82, fullPage: true })
    await ctx.close()
    report.errors = [...new Set(report.errors)]
    report.unanswered = [...new Set(report.unanswered)]
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
    console.log(`sheet: ${path.join(OUT, 'sheet.jpg')}`)
    console.log(`hosts: ${Object.entries(report.hosts).map(([h, n]) => `${h} ${n}`).join(', ')}`)
    if (Object.keys(report.aborted).length) console.log(`aborted: ${Object.entries(report.aborted).map(([h, n]) => `${h} ${n}`).join(', ')}`)
    console.log(report.unanswered.length ? `✗ unanswered: ${report.unanswered.join(', ')}` : '✓ every API route answered')
    console.log(report.errors.length ? `✗ errors (${report.errors.length}):\n    ${report.errors.slice(0, 20).join('\n    ')}` : '✓ no console errors')
    if (report.notes.length) console.log(`notes:\n    ${report.notes.join('\n    ')}`)
  }
  return { open, idle, shot, sideways, finish, report }
}

/** Tap (or click) the first marker matching `sel` that is inside the map and not hidden behind the globe. */
async function tapMarker(page, sel) {
  const pt = await page.evaluate((q) => {
    const box = document.querySelector('[data-ui="world-map"], [data-ui="journey-map"]').getBoundingClientRect()
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
  if (page.device === 'phone') await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
}

/** Scroll the story so the first anchor of a stop sits on the reading line (38% down). */
async function toStop(page, stopId) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-ui="story-view"] [data-stop-id="${id}"], [data-stop-id="${id}"]`)
    if (!el) throw new Error(`no anchor for ${id}`)
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.38 + 6, behavior: 'instant' })
  }, stopId)
}
async function clickStop(page, stopId) {
  const pt = await page.evaluate((id) => {
    const el = document.querySelector(`[data-ui="map-stop"][data-stop="${id}"]`)
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, stopId)
  if (page.device === 'phone') await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
}
const waitText = (page, sel, text, timeout = 40000) => page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent.includes(t), [sel, text], { timeout })
const waitCard = (page, stopId, scope = '[data-ui="journey-dock"]', timeout = 40000) => page.waitForFunction(([s, id]) => !!document.querySelector(`${s} [data-ui="stop-card"][data-stop="${id}"], ${s}[data-key="${id}"]`), [scope, stopId], { timeout })
/** Swipe a snap row to the card with data-key (a finger is on it, so the row may select). */
async function swipeTo(page, rowSel, key) {
  await page.evaluate(([sel, k]) => {
    const box = document.querySelector(sel)
    const card = [...box.children].find((c) => c.dataset.key === k)
    box.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }, [rowSel, key])
}

// ---------------------------------------------------------------- scenes
const SCENES = {
  /** The globe on opening: phone, then desktop. */
  async globe(r) {
    for (const device of ['phone', 'desktop']) {
      const page = await r.open(device)
      await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
      await r.idle(page, { ms: 900 })
      await r.shot(page, 'globe', 'The globe on opening')
      if (device === 'phone') await r.sideways(page, '/feed?view=map')
      await page.context().close()
    }
  },

  /** The world view: phone sheet at half and full, a swipe, a group zoomed, filters; then desktop. */
  async world(r) {
    let page = await r.open('phone')
    await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 900 })
    await page.tap('[data-ui="world-sheet"] button[aria-expanded]')
    await page.waitForTimeout(600)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'sheet-half', 'Sheet at half height: the first card is on the map')
    // swipe to the sixth card (the Tetons)
    await page.evaluate(() => {
      const box = document.querySelector('[data-ui="world-carousel"]')
      const card = box.querySelector('[data-story="110"]')
      box.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) // a finger is on it
      box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    })
    await page.waitForTimeout(900)
    await r.idle(page, { ms: 1100 })
    await r.shot(page, 'swipe', 'Swiped to the Tetons card: the map flew there')
    await page.tap('[data-ui="world-sheet"] button[aria-expanded]')
    await page.waitForTimeout(700)
    await r.shot(page, 'sheet-full', 'Sheet at full height: the list')
    await page.tap('[data-ui="world-sheet"] button[aria-expanded]')
    await page.waitForTimeout(500)
    await page.tap('[data-ui="world-pill"]')
    await page.waitForTimeout(700)
    await r.shot(page, 'filter-sheet', 'The filter sheet')
    await page.getByRole('button', { name: 'Tom' }).tap()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^Show \d+ stor/ }).tap()
    await page.waitForTimeout(600)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'filtered', 'Filter applied: Tom')
    await page.context().close()

    // a group, tapped
    page = await r.open('phone')
    await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 900 })
    await tapMarker(page, '[data-ui="map-cluster"]')
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'cluster', 'A group tapped: the map goes in until its stories stand apart')
    // the groups depend on the sample: go in again until a single story's pin shows
    for (let i = 0; i < 3; i++) {
      const pin = await tapMarker(page, '[data-ui="map-pin"]').then(() => true, () => false)
      if (pin) break
      await tapMarker(page, '[data-ui="map-cluster"]')
      await page.waitForTimeout(800)
      await r.idle(page, { ms: 1200 })
    }
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'pin', 'A pin tapped: the sheet rises to its card')
    await page.context().close()

    page = await r.open('desktop')
    await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 900 })
    await page.click('[data-ui="world-list"] [data-story="110"] button')
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'selected', 'A row chosen: the map flies and the card hangs from the pin')
    await page.keyboard.press('Escape')
    await page.click('[data-ui="map-button"][title="Show every story"]')
    await page.waitForTimeout(600)
    await r.idle(page, { ms: 900 })
    await tapMarker(page, '[data-ui="map-cluster"]')
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'cluster', 'A group clicked')
    await tapMarker(page, '[data-ui="map-cluster"]')
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await tapMarker(page, '[data-ui="map-cluster"]').catch(() => {})
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'spot', 'Two stories at one identical place open as a list')
    await page.getByRole('radio', { name: 'Flat' }).click()
    await page.waitForTimeout(800)
    await r.idle(page, { ms: 1200 })
    await r.shot(page, 'flat', 'Flat')
    await page.getByRole('button', { name: 'Vacation' }).click()
    await page.waitForTimeout(600)
    await r.idle(page, { ms: 1000 })
    await r.shot(page, 'filtered', 'Filter applied: Vacation, flat')
    await page.context().close()
  },

  /** The static level: the Places list. */
  async places(r) {
    for (const device of ['phone', 'desktop']) {
      const page = await r.open(device)
      await page.goto(`${args.base}/feed?view=map&maplevel=static`, { waitUntil: 'domcontentloaded' })
      await r.idle(page)
      await r.shot(page, 'places', 'Static level: the Places list')
      await page.context().close()
    }
  },

  /** Story and map in step: twelve scroll positions through the Tetons story (desktop), then the phone's strip. */
  async sync(r) {
    let page = await r.open('phone')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page)
    await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(500)
    await r.shot(page, 'strip', 'Phone: the inline strip is the static sketch (no gestures to trap a scroll)')
    await r.sideways(page, TETONS)
    await page.context().close()

    page = await r.open('desktop')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 800 })
    const steps = [null, 'stop-1', 'stop-2', 'stop-3', 'stop-4', 'stop-6', 'stop-7', 'stop-8', 'stop-9', 'stop-10', 'stop-12', 'stop-13']
    for (const id of steps) {
      if (id) {
        await toStop(page, id)
        await page.waitForTimeout(700)
        await r.idle(page, { ms: 900 })
      } else {
        // the first stop still below the reading line: the whole journey
        await page.evaluate(() => {
          const el = document.querySelector('[data-stop-id="stop-1"]')
          window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.62, behavior: 'instant' })
        })
        await page.waitForTimeout(700)
        await r.idle(page, { ms: 600 })
      }
      const where = await page.evaluate(() => {
        const card = document.querySelector('[data-ui="journey-dock"] [data-ui="stop-card"]')
        const day = document.querySelector('[data-ui="journey-days"] [aria-pressed="true"]')
        return `${day ? day.textContent.trim() : ''}${card ? ` · ${card.querySelector('p').textContent.trim()}` : ''}`
      })
      await r.shot(page, id || 'top', `${id ? `Reading at ${id}` : 'Before the first stop'}: the map shows ${where}`)
    }
    // the reverse: choose a stop on the map and the story scrolls to it
    await clickStop(page, 'stop-12')
    await page.waitForTimeout(1600)
    await r.idle(page, { ms: 700 })
    await r.shot(page, 'reverse', 'A stop chosen on the map: the story scrolled to it')
    // manual override: the reader moves the map, following pauses
    const box = await page.locator('[data-ui="journey-map"] canvas').first().boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 90, box.y + 260, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    await toStop(page, 'stop-11')
    await page.waitForTimeout(900)
    await r.shot(page, 'paused', 'The reader moved the map: following is paused, with the way back')
    await page.context().close()
  },

  /** Play: six frames of the camera travelling the trip (desktop), then the phone sheet playing. */
  async play(r) {
    let page = await r.open('desktop')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 800 })
    await page.evaluate(() => document.querySelector('[data-ui="journey-frame"]').scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(500)
    await page.click('[data-ui="journey-play"]')
    await waitText(page, '[data-ui="journey-daycard"]', 'Day 1')
    await page.waitForTimeout(700)
    await r.shot(page, 'title', '1. A title card opens each day')
    await waitCard(page, 'stop-1')
    await page.waitForTimeout(2100)
    await r.shot(page, 'photos', "2. At a stop, its photos take turns (the second of three)")
    await waitText(page, '[data-ui="journey-daycard"]', 'Day 2')
    await page.waitForFunction(() => !document.querySelector('[data-ui="journey-daycard"]'), null, { timeout: 15000 })
    await page.waitForTimeout(1300)
    await r.shot(page, 'travel', '3. Travelling: the leg draws itself and the camera goes with it')
    await waitCard(page, 'stop-2')
    await page.waitForTimeout(900)
    await r.shot(page, 'arrive', '4. Arrived at stop 2')
    await waitText(page, '[data-ui="journey-daycard"]', 'Day 3')
    await page.waitForTimeout(700)
    await r.shot(page, 'day3', '5. Day 3 begins: the camera refits to that day')
    await waitCard(page, 'stop-6')
    await page.waitForTimeout(700)
    await page.keyboard.press('k')
    await page.waitForTimeout(700)
    await r.shot(page, 'paused', '6. Paused at Inspiration Point (space or K), scrubber in the days’ colours')
    // keyboard: the scrubber is a real range input
    await page.focus('[data-ui="journey-transport"] input[type="range"]')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(1500)
    await r.idle(page, { ms: 600 })
    await r.shot(page, 'scrub', 'Keyboard: the scrubber has focus, two arrow presses on')
    await page.context().close()

    page = await r.open('phone')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page)
    await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
    await page.getByRole('button', { name: 'Play the journey' }).first().tap()
    await waitText(page, '[data-ui="journey-daycard"]', 'Day 1')
    await page.waitForTimeout(700)
    await r.shot(page, 'phone-title', 'Phone: Play opens the full-screen map and starts')
    await waitCard(page, 'stop-1', '[data-ui="journey-cards"] [data-current]')
    await page.waitForTimeout(1500)
    await r.shot(page, 'phone-stop', 'Phone: stop 1, with its card in the thumb zone')
    await waitCard(page, 'stop-3', '[data-ui="journey-cards"] [data-current]')
    await page.waitForTimeout(900)
    await r.shot(page, 'phone-stop3', 'Phone: stop 3')
    await page.context().close()
  },

  /** The phone's journey sheet: stop cards, a swipe, a day chip, Read from here. */
  async sheet(r) {
    const page = await r.open('phone')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page)
    await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
    await page.getByRole('button', { name: 'Open map' }).first().tap()
    await page.waitForTimeout(900)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'open', 'Open map: the whole journey, full screen, with a close button')
    await swipeTo(page, '[data-ui="journey-cards"]', 'stop-4')
    await page.waitForTimeout(1200)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'swipe', 'Swiped to stop 4: the map went to Jenny Lake')
    await swipeTo(page, '[data-ui="journey-cards"]', 'stop-6')
    await page.waitForTimeout(1200)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'swipe2', 'Swiped on to stop 6')
    await page.locator('[data-ui="journey-days"] button', { hasText: 'Day 5' }).tap()
    await page.waitForTimeout(1200)
    await r.idle(page, { ms: 900 })
    await r.shot(page, 'day', 'A day chip: that day in focus, the others fall back')
    await page.tap('[data-ui="journey-3d"]')
    await page.waitForTimeout(2500)
    await r.idle(page, { ms: 2600 })
    await r.shot(page, '3d', '3D on a phone, on request')
    await page.context().close()
  },

  /** 3D terrain over Jenny Lake and Cascade Canyon: the phone sheet, then the desktop panel (cropped to the map). */
  async terrain(r) {
    let page = await r.open('phone')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page)
    await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
    await page.getByRole('button', { name: 'Open map' }).first().tap()
    await page.waitForTimeout(900)
    await r.idle(page, { ms: 700 })
    await swipeTo(page, '[data-ui="journey-cards"]', 'stop-6')
    await page.waitForTimeout(1300)
    await r.idle(page, { ms: 700 })
    await r.shot(page, 'flat', 'Phone, Inspiration Point, flat: hillshade is always on')
    await page.tap('[data-ui="journey-3d"]')
    await page.waitForTimeout(2600)
    await r.idle(page, { ms: 3000 })
    await r.shot(page, '3d', 'Phone, 3D on request: Jenny Lake under Cascade Canyon')
    await page.context().close()

    page = await r.open('desktop')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 800 })
    await toStop(page, 'stop-4')
    await page.waitForTimeout(700)
    await r.idle(page, { ms: 700 })
    const clip = '[data-ui="journey-frame"]'
    await r.shot(page, 'flat', 'Desktop panel, day 3, flat', { clip })
    await page.click('[data-ui="journey-3d"]')
    await page.waitForTimeout(2600)
    await r.idle(page, { ms: 3000 })
    await r.shot(page, '3d', '3D: real terrain, turned to face the high ground', { clip })
    await toStop(page, 'stop-6')
    await page.waitForTimeout(900)
    await r.idle(page, { ms: 1500 })
    await r.shot(page, '3d-6', '3D at Inspiration Point, above the lake', { clip })
    await toStop(page, 'stop-9')
    await page.waitForTimeout(1500)
    await r.idle(page, { ms: 2500 })
    await r.shot(page, '3d-9', '3D, day 5: Oxbow Bend and Jackson Lake', { clip })
    await r.shot(page, '3d-page', 'The same, on the page')
    await page.context().close()
  },

  /** Fallbacks: the lite level, the static level, reduced motion. */
  async fallback(r) {
    for (const device of ['phone', 'desktop']) {
      let page = await r.open(device)
      await page.goto(`${args.base}/feed?view=map&maplevel=lite`, { waitUntil: 'domcontentloaded' })
      await r.idle(page, { ms: 900 })
      await r.shot(page, 'lite-world', 'Lite level, world: flat, no flights, no Globe switch')
      await page.goto(`${args.base}${TETONS}?maplevel=lite`, { waitUntil: 'domcontentloaded' })
      await r.idle(page)
      if (device === 'phone') {
        await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
        await page.getByRole('button', { name: 'Open map' }).first().tap()
        await page.waitForTimeout(900)
      } else await toStop(page, 'stop-4')
      await page.waitForTimeout(700)
      await r.idle(page, { ms: 900 })
      await r.shot(page, 'lite-journey', 'Lite level, journey: hillshade only, no 3D, jump cuts')
      await page.goto(`${args.base}/feed?view=map&maplevel=static`, { waitUntil: 'domcontentloaded' })
      await r.idle(page)
      await r.shot(page, 'static-world', 'Static level, world: the Places list')
      await page.goto(`${args.base}${TETONS}?maplevel=static`, { waitUntil: 'domcontentloaded' })
      await r.idle(page)
      if (device === 'phone') {
        await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
        await page.getByRole('button', { name: 'Open map' }).first().tap()
        await page.waitForTimeout(900)
      } else await toStop(page, 'stop-4')
      await page.waitForTimeout(600)
      await r.shot(page, 'static-journey', 'Static level, journey: the SVG sketch and the stops as a list')
      await page.context().close()

      page = await r.open(device, { reduced: true })
      await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
      await r.idle(page, { ms: 900 })
      await r.shot(page, 'reduced-world', 'Reduced motion, world: no opening turn, flights are jumps')
      await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
      await r.idle(page)
      if (device === 'phone') {
        await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
        await page.getByRole('button', { name: 'Open map' }).first().tap()
        await page.waitForTimeout(900)
        await r.idle(page, { ms: 600 })
      } else await page.evaluate(() => document.querySelector('[data-ui="journey-frame"]').scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(500)
      await (device === 'phone' ? page.tap('[data-ui="journey-play"]') : page.click('[data-ui="journey-play"]'))
      await page.waitForTimeout(2200)
      const next = page.getByRole('button', { name: 'Next stop' }).first()
      await (device === 'phone' ? next.tap() : next.click())
      await page.waitForTimeout(2600)
      await (device === 'phone' ? next.tap() : next.click())
      await page.waitForTimeout(1200)
      await r.idle(page, { ms: 700 })
      await r.shot(page, 'reduced-journey', 'Reduced motion, journey: Next stop steps, jump cuts, nothing moves by itself')
      await page.context().close()
    }
  },

  /** The tile hosts do not answer: both maps fall back to the static level by themselves. */
  async offline(r) {
    for (const device of ['phone', 'desktop']) {
      const page = await r.open(device)
      await page.route(/tiles\.(openfreemap\.org|mapterhorn\.com)/, (route) => route.abort())
      await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-ui="world-map"][data-level="static"]', { timeout: 20000 }).catch(() => r.report.errors.push(`${device}: the world map did not fall back`))
      await page.waitForTimeout(600)
      await r.shot(page, 'world', 'Tiles unreachable, world: the Places list, with the reason and a way to try again')
      await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-ui="story-view"], [data-ui="story-page"]', { timeout: 20000 })
      if (device === 'phone') {
        await page.evaluate(() => document.querySelector('[data-ui="journey-card"]').scrollIntoView({ block: 'center' }))
        await page.getByRole('button', { name: 'Open map' }).first().tap()
      } else await toStop(page, 'stop-4')
      await page.waitForSelector('[data-ui="journey-map"][data-level="static"]', { timeout: 20000 }).catch(() => r.report.errors.push(`${device}: the journey map did not fall back`))
      await page.waitForTimeout(600)
      await r.shot(page, 'journey', 'Tiles unreachable, journey: the sketch and the stops, with the reason and a way to try again')
      await page.context().close()
    }
    // a blocked tile host logs failed requests; those are the point of this scene
    r.report.errors = r.report.errors.filter((e) => !/Failed to load resource|ERR_|AJAXError|Failed to fetch|map unavailable/i.test(e))
  },

  /** Keyboard: focus visible on the list, a pin's row, the map controls and the journey controls. */
  async keyboard(r) {
    const page = await r.open('desktop')
    await page.goto(`${args.base}/feed?view=map`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 900 })
    await page.focus('[data-ui="world-list"] [data-story="110"] button')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(900)
    await r.idle(page, { ms: 1000 })
    await r.shot(page, 'row', 'Keyboard: a row has focus, Enter chose it; Tab goes on to Open')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    await r.shot(page, 'row-open', 'Keyboard: Tab from the row reaches its Open link')
    await page.goto(`${args.base}${TETONS}`, { waitUntil: 'domcontentloaded' })
    await r.idle(page, { ms: 700 })
    await toStop(page, 'stop-2')
    await page.waitForTimeout(700)
    await r.idle(page, { ms: 700 })
    await page.focus('[data-ui="journey-days"] button[aria-pressed="true"]')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    await r.shot(page, 'journey', 'Keyboard: day chips, 3D, zoom, Play are all tab stops with a visible ring')
    await page.context().close()
  },
}

const names = args.scene === 'all' ? Object.keys(SCENES) : args.scene.split(',')
let failed = false
for (const name of names) {
  if (!SCENES[name]) throw new Error(`unknown scene ${name}; one of ${Object.keys(SCENES).join(', ')}, all`)
  console.log(`scene ${name}`)
  const r = makeRun(name)
  try {
    await SCENES[name](r)
  } catch (e) {
    r.report.errors.push(`scene threw: ${e.message.split('\n')[0]}`)
  }
  await r.finish()
  if (r.report.unanswered.length || r.report.errors.some((e) => /pageerror|scene threw|sideways/.test(e))) failed = true
}
await browser.close()
process.exit(failed ? 1 : 0)
