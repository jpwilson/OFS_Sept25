#!/usr/bin/env node
// FAMILY's own capture script (owner: FAMILY). The shared scripts/daylight/capture.mjs shoots
// a route once; the family page's sheets, steps, sample sets and exports need clicks between.
//
//   node src/daylight/family/dev/shoot.mjs [--base http://127.0.0.1:5338] [--scene tree,person|all] [--device phone,desktop|all]
//
// Scenes: tree growing reduced list person tag add requests empty large viewers preview error
//         lapsed keyboard export classic owner notes (docs/app/FAMILY-NOTES.md: the notes section,
//         the composer, the delete dialog, your birthday, the tag form's More about; on the
//         iPhone the owner checks with, 393x680, and desktop)
// Writes frontend/shots/daylight-family/<scene>/<NN>-<device>-<name>.jpg, a labelled contact
// sheet per scene (frontend/shots/daylight-family/<scene>.jpg, phone first) and report.json.
// Like capture.mjs: signs in through the sample (/__fx/family?set=…&as=…), blocks service
// workers, aborts every other host, fake clock 26 Nov 2026 noon America/Chicago. Exits 1 on an
// unanswered API route, a page error or sideways scroll.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../../../..')
const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = requirePw('playwright')

const args = { base: 'http://127.0.0.1:5338', scene: 'all', device: 'all' }
for (let i = 2; i < process.argv.length; i++) args[process.argv[i].replace(/^--/, '')] = process.argv[++i]
const NOW = new Date('2026-11-26T12:00:00')
const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  iphone: { width: 393, height: 680 }, // an iPhone in Chrome, once its bars are counted
  ipad: { width: 820, height: 1180 },
  'ipad-land': { width: 1180, height: 820 },
  desktop: { width: 1440, height: 900 },
}
const ALL_DEVICES = Object.keys(VIEWPORTS).filter((d) => d !== 'iphone') // iphone: the scenes that name it
const devices = args.device === 'all' ? Object.keys(VIEWPORTS) : args.device.split(',')
const ROOT = path.join(FRONTEND, 'shots', 'daylight-family')
fs.mkdirSync(ROOT, { recursive: true })
const report = { base: args.base, scenes: {}, errors: [], unanswered: [], sideways: [], hosts: {}, aborted: {} }
const bump = (o, k) => (o[k] = (o[k] || 0) + 1)

const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })

async function context(device, { reduced = false } = {}) {
  const phone = device === 'phone' || device === 'iphone'
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[device],
    deviceScaleFactor: 2,
    isMobile: phone,
    hasTouch: device !== 'desktop',
    serviceWorkers: 'block',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    acceptDownloads: true,
    userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' : undefined,
  })
  const appHost = new URL(args.base).host
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    bump(report.hosts, u.host)
    if (u.host === appHost) return route.continue()
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
    if (/Failed to load resource: the server responded with a status of 500/.test(t)) return // the error set, on purpose
    if (/status of 404/.test(t) && current?.scene === 'notes') return // the older server the notes scene plays, on purpose
    report.errors.push(`${device} console: ${t.slice(0, 200)}`)
  })
  page.on('response', async (res) => {
    if (res.status() !== 404) return
    const u = new URL(res.url())
    if (!u.pathname.startsWith('/api/v1/')) return
    const body = await res.text().catch(() => '')
    if (body.includes('no sample answer')) report.unanswered.push(`${res.request().method()} ${u.pathname}${u.search}`)
  })
  return { ctx, page }
}

/** Choose a sample set, sign in as `as`, land on `path`. */
async function open(page, { set = 'hartley', as = 'maya', to = '/family-tree' } = {}) {
  await page.request.get(`${args.base}/__fx/reset`)
  await page.goto(`${args.base}/__fx/family?set=${set}&as=${as}&next=${encodeURIComponent(to)}`, { waitUntil: 'load' })
  await page.waitForURL((u) => new URL(u).pathname === new URL(to, args.base).pathname, { timeout: 20000 })
}

/** Wait for the page to settle: a grown or held tree, the list, the empty or error state. */
async function settle(page, { grown = true, ms = 500 } = {}) {
  await page.waitForSelector('[data-ui="family-page"], [data-ui="empty-state"]', { timeout: 20000 }).catch(() => report.errors.push(`no family page at ${page.url()}`))
  const sel = grown
    ? '[data-tree-state="grown"], [data-tree-state="held"], [data-ui="family-list"], [data-ui="family-empty"], [data-ui="empty-state"]'
    : '[data-tree-state], [data-ui="family-list"], [data-ui="family-empty"], [data-ui="empty-state"]'
  await page.waitForSelector(sel, { timeout: 20000 }).catch(() => report.errors.push(`never settled at ${page.url()}`))
  await page.evaluate(async () => {
    await document.fonts?.ready
    const imgs = [...document.images].filter((i) => !i.complete)
    await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000) })))
  })
  await page.waitForTimeout(ms)
}

async function sideways(page, label) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth
    return sw > vw ? { vw, sw } : null
  })
  if (r) report.sideways.push(`${label}: scrollWidth ${r.sw} > ${r.vw}`)
}

let current = null
async function shot(page, device, name, label) {
  const dir = path.join(ROOT, current.scene)
  const n = current.shots.length + 1
  const file = path.join(dir, `${String(n).padStart(2, '0')}-${device}-${name}.jpg`)
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 })
  current.shots.push({ device, name, label, file: path.relative(FRONTEND, file) })
  await sideways(page, `${current.scene}/${device}/${name}`)
  console.log(`  ${current.scene} ${device} ${String(n).padStart(2, '0')} ${label}`)
}
async function saveFile(device, name, label, src) {
  const dir = path.join(ROOT, current.scene)
  const n = current.shots.length + 1
  const file = path.join(dir, `${String(n).padStart(2, '0')}-${device}-${name}${path.extname(src) || '.png'}`)
  fs.copyFileSync(src, file)
  current.shots.push({ device, name, label, file: path.relative(FRONTEND, file), image: true })
  console.log(`  ${current.scene} ${device} ${String(n).padStart(2, '0')} ${label}`)
}

const sheetOpen = async (page) => {
  await page.waitForSelector('[data-ui="sheet"] [role="dialog"]', { timeout: 10000 })
  await page.waitForTimeout(650)
}
const tapNode = (page, id) => page.locator(`[data-ui="tree-person"][data-id="${id}"]`).first().click({ timeout: 10000 })

// ---------------------------------------------------------------- the scenes
const SCENES = {
  async tree(page, device) {
    await open(page)
    await settle(page)
    await shot(page, device, 'maya', 'The Hartley tree as Maya, grown')
    if (device === 'phone') {
      await page.locator('[data-ui="tree-scroller"]').evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }))
      await page.waitForTimeout(300)
      await shot(page, device, 'maya-right', 'Swiped right: Add a relative and the trays')
    }
  },
  async growing(page, device) {
    await open(page)
    await page.waitForSelector('[data-tree-state="growing"], [data-tree-state="grown"]', { timeout: 20000 })
    await page.waitForTimeout(650)
    await shot(page, device, 'growing-1', 'Growing in: your unit and the row above')
    await page.waitForTimeout(500)
    await shot(page, device, 'growing-2', 'Growing in: the children arrive')
    for (const n of [0, 1, 2]) {
      await page.goto(`${args.base}/family-tree?grow=${n}`, { waitUntil: 'domcontentloaded' })
      await settle(page)
      await shot(page, device, `held-${n}`, `?grow=${n} holds step ${n}`)
    }
  },
  async reduced(page, device) {
    await open(page)
    await settle(page)
    const state = await page.getAttribute('[data-ui="family-tree"]', 'data-tree-state')
    if (state !== 'grown') report.errors.push(`${device}: reduced motion tree is ${state}, not grown`)
    await shot(page, device, 'reduced', 'Reduced motion: complete at once, never hidden')
  },
  async list(page, device) {
    await open(page, { to: '/family-tree?view=list' })
    await settle(page)
    await shot(page, device, 'list', 'List view')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    await shot(page, device, 'list-end', 'List view, further down')
  },
  async person(page, device) {
    await open(page)
    await settle(page)
    await tapNode(page, 'u:2')
    await sheetOpen(page)
    await shot(page, device, 'tom', "Tom's person sheet")
    await page.locator('[data-ui="remove-relative"]').click()
    await page.waitForTimeout(600)
    await shot(page, device, 'tom-remove', 'Remove from your tree: the dialog')
  },
  async tag(page, device) {
    await open(page)
    await settle(page)
    await tapNode(page, 't:41')
    await sheetOpen(page)
    await shot(page, device, 'biscuit', "Biscuit's tag sheet")
    await page.getByRole('button', { name: 'Edit Biscuit' }).click()
    await page.waitForTimeout(400)
    await shot(page, device, 'biscuit-edit', 'Editing Biscuit')
  },
  async add(page, device) {
    await open(page)
    await settle(page)
    await page.locator('[data-ui="add-relative"]').first().click()
    await sheetOpen(page)
    await page.waitForSelector('[data-ui="add-person"]', { timeout: 10000 })
    await page.waitForTimeout(300)
    await shot(page, device, 'step1-who', 'Add, step 1: who')
    await page.locator('[data-ui="add-person"][data-username="priya"]').click()
    await page.waitForSelector('[data-ui="add-how"]')
    await page.locator('[data-ui="add-how"] button', { hasText: /^Sister$/ }).first().click()
    await page.waitForTimeout(250)
    await page.locator('[data-ui="add-how"] button', { hasText: /^Sister$/ }).nth(1).click()
    await page.waitForTimeout(350)
    await shot(page, device, 'step2-how', 'Add, step 2: how you are related')
    await page.locator('[data-ui="add-send"]').click()
    await page.waitForSelector('[data-ui="add-sent"]')
    await page.waitForTimeout(400)
    await shot(page, device, 'step3-sent', 'Add, step 3: sent')
    await page.getByRole('button', { name: 'Add someone else' }).click()
    await page.waitForSelector('[data-ui="add-tag"]')
    await page.locator('[data-ui="add-tag"]').click()
    await page.waitForSelector('[data-ui="tag-form"]')
    await page.locator('[data-ui="tag-form"] input[type="text"]').first().fill('Pip')
    await page.locator('[data-ui="tag-form"] button', { hasText: /^Pet$/ }).click()
    await page.waitForTimeout(300)
    await shot(page, device, 'tag-form', 'Someone without an account')
    await page.locator('[data-ui="tag-form"] button[type="submit"]').click()
    await page.waitForSelector('[data-ui="add-tag-done"]')
    await page.waitForTimeout(400)
    await shot(page, device, 'tag-done', 'Pip joins your tree')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(1600)
    await shot(page, device, 'after', 'Back on the tree: Pip, and Priya asked')
  },
  async requests(page, device) {
    await open(page, { set: 'requests' })
    await settle(page)
    await shot(page, device, 'strip', 'Requests strip: Nico asks; Waiting for 2')
    await page.locator('[data-ui="waiting-chip"]').first().click()
    await sheetOpen(page)
    await shot(page, device, 'sheet', 'The requests sheet')
    await page.locator('[data-ui="requests-sheet"] [data-ui="request-card"] button', { hasText: 'Confirm' }).click()
    await page.waitForTimeout(700)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    await shot(page, device, 'confirmed', 'Nico confirmed: he pops into the tree')
  },
  async empty(page, device) {
    await open(page, { set: 'empty' })
    await settle(page)
    await shot(page, device, 'empty', 'Empty: you and Add a relative')
  },
  async large(page, device) {
    await open(page, { set: 'large' })
    await settle(page)
    await shot(page, device, 'large', 'Large family at 1x, centred on you')
    await page.locator('[data-ui="whole-tree"]').click()
    await page.waitForTimeout(800)
    await page.evaluate(() => document.querySelector('[data-ui="family-tree"]').scrollIntoView({ block: 'start' }))
    await page.evaluate(() => window.scrollBy(0, -90))
    await page.waitForTimeout(400)
    await shot(page, device, 'whole', 'Whole tree')
    await page.locator('[data-ui="tray-more"]').first().click()
    await sheetOpen(page)
    await shot(page, device, 'tray', 'A tray sheet: the cousins')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.goto(`${args.base}/family-tree?view=list`, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await shot(page, device, 'list', 'The large family as a list, with search')
  },
  async viewers(page, device) {
    for (const as of ['ivy', 'kate', 'ruth']) {
      await open(page, { as })
      await settle(page)
      await shot(page, device, as, `As ${as[0].toUpperCase()}${as.slice(1)}`)
    }
  },
  async preview(page, device) {
    for (const as of ['maya', 'ivy', 'kate']) {
      await open(page, { as, to: '/family-tree?links=preview' })
      await settle(page, { ms: 900 })
      await shot(page, device, `preview-${as}`, `?links=preview as ${as[0].toUpperCase()}${as.slice(1)} (what Stage 2 would draw)`)
    }
  },
  async error(page, device) {
    await open(page, { set: 'error' })
    await settle(page)
    await shot(page, device, 'error', 'Error, with Try again')
  },
  async lapsed(page, device) {
    await open(page, { set: 'lapsed' })
    await settle(page)
    await shot(page, device, 'lapsed', 'Plan ended: See plans leads, no actions')
  },
  async keyboard(page, device) {
    await open(page)
    await settle(page)
    await page.locator('[data-ui="tree-person"][data-id="u:1"]').focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(250)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(450)
    await shot(page, device, 'focus', 'Keyboard: from Maya, right to Tom, down to Biscuit (the focus ring)')
    await page.keyboard.press('Home')
    await page.waitForTimeout(450)
    await shot(page, device, 'home', 'Home returns to you')
  },
  async export(page, device) {
    for (const [set, to, name] of [['hartley', '/family-tree', 'maya'], ['large', '/family-tree', 'large'], ['hartley', '/family-tree?links=preview', 'preview']]) {
      await open(page, { set, to })
      await settle(page, { ms: 700 })
      const dl = page.waitForEvent('download', { timeout: 30000 })
      if (device === 'desktop') await page.locator('[data-ui="save-image"]').click()
      else {
        await page.locator('[data-ui="family-more"]').click()
        await page.getByRole('menuitem', { name: 'Save image' }).click()
      }
      const d = await dl
      const tmp = path.join(ROOT, `.${name}.png`)
      await d.saveAs(tmp)
      await saveFile(device, `export-${name}`, `Saved image: ${name}`, tmp)
      fs.rmSync(tmp)
    }
  },
  async owner(page, device) {
    await open(page, { set: 'owner-shape', as: 'nate' })
    await settle(page)
    await shot(page, device, 'owner', "The owner's family shape (made-up names), as Nate")
    if (device === 'phone') {
      await page.locator('[data-ui="tree-scroller"]').evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' }))
      await page.waitForTimeout(300)
      await shot(page, device, 'owner-left', 'Swiped left: the Cousins tray on his row')
    }
    await tapNode(page, 't:401')
    await sheetOpen(page)
    await shot(page, device, 'rosie', 'Rosie (a tag daughter): to you, details with her birth date, stories')
    await page.getByRole('button', { name: 'Edit Rosie' }).click()
    await page.waitForSelector('[data-ui="tag-birthday"]')
    await page.locator('[data-ui="tag-birthday"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(350)
    await shot(page, device, 'rosie-edit', "Editing Rosie: her birthday sets the children's order")
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await tapNode(page, 'u:303')
    await sheetOpen(page)
    await shot(page, device, 'maureen', 'Maureen (his mother, on the app): the person sheet in sections')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.goto(`${args.base}/family-tree?view=list`, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await shot(page, device, 'owner-list', 'The same family as a list')
  },
  async notes(page, device) {
    const notesReady = async () => {
      await page.waitForSelector('[data-ui="person-notes"]', { timeout: 10000 })
      await page.locator('[data-ui="person-notes"]').scrollIntoViewIfNeeded()
      await page.waitForSelector('[data-ui="person-notes"][data-state="ready"], [data-ui="person-notes"][data-state="error"]', { timeout: 10000 })
      await page.waitForTimeout(400)
    }
    const toTop = (sel) => page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'start' }))
    await open(page)
    await settle(page)
    // Ruth: history (a year, a month, undated) and notes by Tom, Kate and Maya
    await tapNode(page, 'u:5')
    await sheetOpen(page)
    await notesReady()
    await toTop('[data-ui="person-notes"]')
    await page.waitForTimeout(300)
    await shot(page, device, 'ruth-history', "Ruth's notes and history: the History side")
    await page.locator('[data-ui="person-notes"] [role="radio"]', { hasText: 'Notes' }).click()
    await page.waitForTimeout(300)
    await toTop('[data-ui="person-notes"]')
    await shot(page, device, 'ruth-notes', 'The Notes side: who wrote it, when, Edited')
    await page.locator('[data-ui="note-menu"]').first().click()
    await page.waitForSelector('[data-ui="menu"]')
    await page.waitForTimeout(300)
    await shot(page, device, 'note-menu', 'Your own note: Edit and Delete')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.waitForTimeout(600)
    await shot(page, device, 'delete', 'Delete this note?')
    await page.getByRole('button', { name: 'Keep' }).click()
    await page.waitForTimeout(500)
    // the composer: a note, then history with only a year
    await page.locator('[data-ui="notes-write"]').click()
    await page.waitForSelector('[data-ui="note-composer"]')
    await page.locator('[data-ui="note-text"]').fill('She sang in the choir at St. Finbarr\'s every Christmas until she was eighty.\nAsk her for the one about the organist.')
    await page.waitForTimeout(300)
    await shot(page, device, 'composer-note', 'Write about Ruth: a note')
    await page.locator('[data-ui="note-composer"] [role="radio"]', { hasText: 'History' }).click()
    await page.locator('[data-ui="date-year"]').fill('1979')
    await page.waitForTimeout(300)
    await shot(page, device, 'composer-history', 'History with only a year')
    await page.locator('[data-ui="note-save"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, device, 'composer-history-end', 'Who can read it, and Save')
    await page.locator('[data-ui="note-save"]').click()
    await notesReady()
    await toTop('[data-ui="person-notes"]')
    await page.waitForTimeout(300)
    await shot(page, device, 'saved', 'Saved: 1979 takes its place in the history')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    // Leo: nothing yet
    await tapNode(page, 'u:4')
    await sheetOpen(page)
    await notesReady()
    await shot(page, device, 'leo-empty', 'Leo: nothing written yet')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    // your own sheet: your birthday
    await tapNode(page, 'u:1')
    await sheetOpen(page)
    await page.locator('[data-ui="your-birthday"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, device, 'you', 'Your sheet: born, and Change your birthday')
    await page.locator('[data-ui="your-birthday"]').click()
    await page.waitForSelector('[data-ui="birthday-form"]')
    await page.waitForTimeout(400)
    await shot(page, device, 'birthday', 'Your birthday: never public')
    await page.locator('[data-ui="birthday-save"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, device, 'birthday-end', 'Your birthday: Save, Cancel, Remove')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    // Biscuit's tag form, More about open
    await tapNode(page, 't:41')
    await sheetOpen(page)
    await page.getByRole('button', { name: 'Edit Biscuit' }).click()
    await page.waitForSelector('[data-ui="tag-birthday"]')
    await page.locator('[data-ui="tag-birthday"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, device, 'tag-birthday', 'Editing Biscuit: a birthday where a year is enough')
    await page.locator('[data-ui="tag-died"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, device, 'tag-more', 'More about Biscuit: birthplace and died')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    // an older server answers 404: the section is not there at all
    await page.route('**/api/v1/family-notes?*', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Not Found"}' }))
    await page.goto(`${args.base}/family-tree?person=u:6`, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await sheetOpen(page)
    await page.locator('[data-ui="person-actions"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    if (await page.locator('[data-ui="person-notes"]').count()) report.errors.push(`${device}: the notes section shows on a 404`)
    await shot(page, device, 'old-server', 'An older server (404): no notes section')
  },
  async classic(page, device) {
    await open(page, { to: '/family-tree?look=classic' })
    await page.waitForTimeout(2500)
    await shot(page, device, 'classic', '/family-tree?look=classic (the previous page)')
  },
}
const DEVICES_FOR = { export: ['phone', 'desktop'], classic: ['phone', 'desktop'], notes: ['iphone', 'desktop'] }

const scenes = args.scene === 'all' ? Object.keys(SCENES) : args.scene.split(',')
for (const scene of scenes) {
  if (!SCENES[scene]) throw new Error(`unknown scene ${scene}`)
  fs.rmSync(path.join(ROOT, scene), { recursive: true, force: true })
  fs.mkdirSync(path.join(ROOT, scene), { recursive: true })
  current = { scene, shots: [] }
  const ds = (DEVICES_FOR[scene] || ALL_DEVICES).filter((d) => devices.includes(d))
  for (const device of ds) {
    const { ctx, page } = await context(device, { reduced: scene === 'reduced' })
    try {
      await SCENES[scene](page, device)
    } catch (e) {
      report.errors.push(`${scene}/${device}: ${e.message.split('\n')[0]}`)
      console.log(`  ✗ ${scene} ${device}: ${e.message.split('\n')[0]}`)
      await shot(page, device, 'failed', `FAILED: ${e.message.split('\n')[0].slice(0, 80)}`).catch(() => {})
    }
    await ctx.close()
  }
  report.scenes[scene] = current.shots
  await contactSheet(scene, current.shots)
}
await browser.close()
await fetch(`${args.base}/__fx/reset`).catch(() => {})

async function contactSheet(scene, shots) {
  if (!shots.length) return
  const b = await chromium.launch({ headless: true })
  const width = { phone: 300, iphone: 300, ipad: 380, 'ipad-land': 520, desktop: 620 }
  const byDevice = Object.keys(VIEWPORTS).map((d) => [d, shots.filter((x) => x.device === d)]).filter(([, l]) => l.length)
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font:13px Menlo,monospace;color:#101B3B">
  <div style="padding:16px 16px 4px;font-weight:700">daylight-family · ${scene} · ${shots.length} shots · phone first</div>
  ${byDevice.map(([d, list]) => `<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px">${list.map((x) => {
    const w = x.image ? 900 : width[d]
    const data = fs.readFileSync(path.join(FRONTEND, x.file)).toString('base64')
    const mime = x.file.endsWith('.png') ? 'image/png' : 'image/jpeg'
    return `<figure style="margin:0;width:${w}px"><div style="padding:4px 0;min-height:32px">${d} · ${x.label.replace(/</g, '&lt;')}</div><img style="width:${w}px;border:2px solid #101B3B;border-radius:8px;display:block" src="data:${mime};base64,${data}"></figure>`
  }).join('')}</div>`).join('')}</body></html>`
  const ctx = await b.newContext({ viewport: { width: 1900, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.setContent(html, { waitUntil: 'load' })
  await p.screenshot({ path: path.join(ROOT, `${scene}.jpg`), type: 'jpeg', quality: 78, fullPage: true })
  await b.close()
}

report.errors = [...new Set(report.errors)]
report.unanswered = [...new Set(report.unanswered)]
fs.writeFileSync(path.join(ROOT, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\nsheets: ${path.relative(process.cwd(), ROOT)}/<scene>.jpg`)
console.log(report.unanswered.length ? `✗ unanswered API routes:\n    ${report.unanswered.join('\n    ')}` : '✓ every API route answered')
console.log(report.sideways.length ? `✗ sideways scroll:\n    ${report.sideways.join('\n    ')}` : '✓ no sideways scroll')
console.log(report.errors.length ? `✗ errors (${report.errors.length}):\n    ${report.errors.slice(0, 30).join('\n    ')}` : '✓ no errors')
process.exit(report.unanswered.length || report.sideways.length || report.errors.some((e) => /pageerror|FAILED|never|no family/.test(e)) ? 1 : 0)
