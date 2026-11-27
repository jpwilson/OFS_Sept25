// Overlap check for the landing page (owner: landing). Serves a production build, scrolls the
// whole page at each viewport below and fails if visible text collides with other visible
// text, or is partly covered by an unrelated control, card or picture.
//
//   npm run build   (VERCEL_ENV=production)
//   node scripts/landing/check-overlap.mjs [--dist dist] [--url http://127.0.0.1:4173]
//        [--only 393x680,375x560] [--pages /] [--step 0.25] [--shots dir]
//        [--from '#lp-tetons'] [--to '#lp-wedding' | '#lp-film@bottom' | 4000] [--size 390x664]
//
// --url checks a running site instead of serving --dist. --shots writes a screenshot of each
// collision the first time it is seen, with the two parts outlined.
//
// What counts as visible: inside the viewport and inside every overflow-clipping ancestor,
// effective opacity of at least MIN_OPACITY, not aria-hidden, not screen-reader-only.
// Lines of one heading or paragraph never collide with each other. A layer from another film
// scene (a chapter flooding in over the last one) or a fixed bar (the nav) hides text; it
// does not collide with it. A cut-out picture covers text only where its pixels are opaque.
//
// Exits 1 on any collision, or if the page can be scrolled sideways.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = require('playwright')

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : def
}

const PHONE = { isMobile: true, hasTouch: true }
const EXTRA = (arg('size', '') || '').split(',').filter(Boolean).map((t) => {
  const [width, height] = t.split('x').map(Number)
  return { width, height, ...(width < 1100 ? PHONE : {}) }
})
export const VIEWPORTS = [
  { width: 360, height: 540, ...PHONE },
  { width: 375, height: 560, ...PHONE },
  { width: 393, height: 680, ...PHONE },
  { width: 390, height: 750, ...PHONE },
  { width: 430, height: 800, ...PHONE },
  { width: 768, height: 900, ...PHONE },
  { width: 1024, height: 700, ...PHONE },
  { width: 1280, height: 650 },
  { width: 1440, height: 800 },
]

/** Text below this effective opacity is fading in or out, not being read. */
const MIN_OPACITY = 0.6

/**
 * Deliberate overlaps. Each entry matches a finding's place (at) and its two parts (as printed)
 * by regex, the parts in either order, and must say why the overlap is intended.
 */
const ALLOW = [
  {
    at: /^film:kitchen$/,
    a: /^(p\.h|p\.ptitle|span\.tag)$/,
    b: /^(img\.printImg|figure\.print)$/,
    why: 'Chapter 05 in motion: the six prints fan out in front of the story page and dock into it one at a time as its sections are written. The fan is the choreography; at rest every print sits in its own slot.',
  },
  {
    at: /^film:year$/,
    a: /^figcaption$/,
    b: /^img\.photoImg$/,
    why: "Chapter 07 in motion: at each new age that year's photograph lands on top of the last one before the old one leaves. At rest each age shows its own two photographs apart.",
  },
]

const only = arg('only', '')
// --size 390x664,375x600: check these sizes instead (phones and tablets under 1100px wide get touch)
const viewports = EXTRA.length ? EXTRA : only ? VIEWPORTS.filter((v) => only.split(',').includes(`${v.width}x${v.height}`)) : VIEWPORTS
const pages = arg('pages', '/').split(',')
const stepFrac = Number(arg('step', '0.25'))
const shotsDir = arg('shots', '') ? resolve(arg('shots')) : ''
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

/** Serve the build the way Vercel does (scripts/serve-dist.mjs) and resolve with its URL. */
function serve(dist) {
  const port = 4300 + Math.floor(Math.random() * 500)
  const child = spawn(process.execPath, [join(FRONTEND, 'scripts/serve-dist.mjs'), String(port)], {
    env: { ...process.env, OFS_DIST: dist },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((ok, fail) => {
    child.stdout.on('data', (d) => {
      if (String(d).includes('serving')) ok({ url: `http://127.0.0.1:${port}`, stop: () => child.kill() })
    })
    child.on('exit', (code) => fail(new Error(`serve-dist exited ${code}`)))
  })
}

// ---------------------------------------------------------------------------------------
// In the page: find every collision on the current screen.
// ---------------------------------------------------------------------------------------
async function measure({ minOpacity }) {
  const W = innerWidth
  const H = innerHeight
  const BLOCK = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,figcaption,blockquote,button,a,label,td,th,summary,[role=tab],[role=button]'
  const css = new Map()
  const cs = (e) => {
    let s = css.get(e)
    if (!s) css.set(e, (s = getComputedStyle(e)))
    return s
  }
  const ops = new Map()
  const opacity = (el) => {
    if (!el || el === document.documentElement) return 1
    if (ops.has(el)) return ops.get(el)
    const s = cs(el)
    const o = s.display === 'none' ? 0 : Number(s.opacity) * opacity(el.parentElement)
    ops.set(el, o)
    return o
  }
  const hiddenText = (el) => el.closest('[aria-hidden="true"],.l-sr,script,style,noscript,template,[hidden],input,textarea,select,option')
  const clipped = (el, r) => {
    let { left, top, right, bottom } = r
    left = Math.max(left, 0)
    top = Math.max(top, 0)
    right = Math.min(right, W)
    bottom = Math.min(bottom, H)
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = cs(e)
      if (s.position === 'fixed') break
      if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return null
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const b = e.getBoundingClientRect()
        if (s.overflowX !== 'visible') {
          left = Math.max(left, b.left)
          right = Math.min(right, b.right)
        }
        if (s.overflowY !== 'visible') {
          top = Math.max(top, b.top)
          bottom = Math.min(bottom, b.bottom)
        }
      }
      if (right - left < 3 || bottom - top < 3) return null
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top }
  }
  const name = (el) => {
    const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : el.className && el.className.baseVal
    const clean = c ? '.' + c.replace(/^_(.+?)_[a-z0-9]{5}_\d+$/, '$1') : ''
    return el.tagName.toLowerCase() + clean
  }
  const where = (el) => {
    const sc = el.closest('[data-scene]')
    if (sc) return `film:${sc.dataset.scene}`
    const sec = el.closest('main > section, main > div, footer, header, nav')
    return sec ? sec.id || name(sec) : 'page'
  }
  const isFixed = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) if (cs(e).position === 'fixed') return true
    return false
  }
  const alpha = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return c === 'transparent' ? 0 : 1
    const p = m[1].split(/[\s,/]+/).filter(Boolean)
    return p.length > 3 ? Number(p[3]) : 1
  }

  // Cut-out pictures cover text only where their pixels are opaque.
  window.__ofsAlpha = window.__ofsAlpha || new Map()
  const pixels = async (src) => {
    if (window.__ofsAlpha.has(src)) return window.__ofsAlpha.get(src)
    const p = new Promise((ok) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => {
        const w = 160
        const h = Math.max(1, Math.round((im.naturalHeight / im.naturalWidth) * w))
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(im, 0, 0, w, h)
        try {
          ok({ w, h, d: g.getImageData(0, 0, w, h).data })
        } catch {
          ok(null)
        }
      }
      im.onerror = () => ok(null)
      im.src = src
    })
    window.__ofsAlpha.set(src, p)
    return p
  }
  const opaqueAt = async (img, x, y) => {
    const px = await pixels(img.currentSrc || img.src)
    if (!px) return true
    const b = img.getBoundingClientRect()
    let u = (x - b.left) / b.width
    const v = (y - b.top) / b.height
    let flipped = false
    for (let e = img; e && !e.matches('[data-actor],[data-scene]'); e = e.parentElement) {
      const t = cs(e).transform
      if (t && t.startsWith('matrix(') && Number(t.slice(7).split(',')[0]) < 0) flipped = !flipped
    }
    if (flipped) u = 1 - u
    const fit = cs(img).objectFit
    if (fit === 'contain' || fit === 'cover') {
      // map from the element box to the image box
      const ir = img.naturalWidth / img.naturalHeight
      const br = b.width / b.height
      const k = fit === 'contain' ? ir > br : ir < br
      if (k) {
        const h = br / ir
        const vv = (v - (1 - h) / 2) / h
        return sample(px, u, vv)
      }
      const w = ir / br
      return sample(px, (u - (1 - w) / 2) / w, v)
    }
    return sample(px, u, v)
  }
  const sample = (px, u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) return false
    const i = (Math.min(px.h - 1, Math.floor(v * px.h)) * px.w + Math.min(px.w - 1, Math.floor(u * px.w))) * 4
    return px.d[i + 3] > 128
  }

  /** Does `e` paint something solid over whatever is under it at (x, y)? */
  const solid = async (e, x, y) => {
    if (opacity(e) < 0.5) return false
    const s = cs(e)
    if (s.visibility === 'hidden') return false
    if (e.tagName === 'IMG') {
      const id = e.dataset.art || ''
      const cut = id && !id.startsWith('ui-')
      return cut ? opaqueAt(e, x, y) : true
    }
    if (e.tagName === 'VIDEO' || e.tagName === 'CANVAS') return true
    if (s.maskImage && s.maskImage !== 'none') return false
    if (s.webkitMaskImage && s.webkitMaskImage !== 'none') return false
    if (alpha(s.backgroundColor) >= 0.5) return true
    if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return true
    return false
  }

  // 1. every line of visible text on screen
  const leaves = []
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (tw.nextNode()) {
    const t = tw.currentNode
    const text = t.textContent.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const el = t.parentElement
    if (!el || hiddenText(el)) continue
    if (cs(el).visibility !== 'visible') continue
    // closed <details>, content-visibility and the like
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) continue
    const o = opacity(el)
    if (o < minOpacity) continue
    const range = document.createRange()
    range.selectNodeContents(t)
    for (const r of range.getClientRects()) {
      if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue
      const c = clipped(el, r)
      if (!c) continue
      leaves.push({ el, blk: el.closest(BLOCK) || el, r: c, text: text.slice(0, 48), scene: el.closest('[data-scene]') })
    }
  }

  // 2. what lies on top of each line: hit-test a grid of points with pointer-events forced on
  const force = document.createElement('style')
  force.textContent = '*,*::before,*::after{pointer-events:auto!important}'
  document.head.appendChild(force)
  const found = []
  try {
    for (const L of leaves) {
      L.visible = 0
      const cover = new Map()
      const xs = [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94].map((f) => L.r.left + f * L.r.width)
      const ys = [0.3, 0.7].map((f) => L.r.top + f * L.r.height)
      for (const x of xs)
        for (const y of ys) {
          const stack = document.elementsFromPoint(x, y)
          let verdict = 'visible'
          for (const e of stack) {
            if (e === L.el || L.el.contains(e) || e.contains(L.el)) break
            if (!(await solid(e, x, y))) continue
            if (isFixed(e) && !isFixed(L.el)) verdict = 'hidden'
            else {
              const sc = e.closest('[data-scene]')
              verdict = sc && L.scene && sc !== L.scene ? 'hidden' : e
            }
            break
          }
          if (verdict === 'visible') L.visible++
          else if (verdict !== 'hidden') {
            const key = e2key(verdict)
            cover.set(key, { e: verdict, n: (cover.get(key)?.n || 0) + 1 })
          }
        }
      for (const { e, n } of cover.values()) {
        if (n < 2) continue
        found.push({ kind: 'covered', a: name(L.blk), at: where(L.el), ta: L.text, b: name(e.closest(BLOCK) || e), tb: label(e), ra: L.r, rb: e.getBoundingClientRect() })
      }
    }
  } finally {
    force.remove()
  }
  function e2key(e) {
    return e
  }
  function label(e) {
    return (e.innerText || e.alt || e.dataset?.art || '').replace(/\s+/g, ' ').trim().slice(0, 48)
  }

  // 3. visible text on top of visible text
  const seen = leaves.filter((L) => L.visible > 0)
  for (let i = 0; i < seen.length; i++)
    for (let j = i + 1; j < seen.length; j++) {
      const a = seen[i]
      const b = seen[j]
      if (a.blk === b.blk || a.blk.contains(b.blk) || b.blk.contains(a.blk)) continue
      if (a.scene && b.scene && a.scene !== b.scene) continue
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (ix > 4 && iy > Math.min(a.r.height, b.r.height) * 0.3) {
        found.push({ kind: 'text', a: name(a.blk), at: where(a.el), ta: a.text, b: name(b.blk), tb: b.text, ra: a.r, rb: b.r })
      }
    }

  const se = document.scrollingElement
  return { found, wide: se.scrollWidth > se.clientWidth + 1 ? se.scrollWidth : 0 }
}

// ---------------------------------------------------------------------------------------

async function outline(page, f) {
  await page.evaluate(({ ra, rb }) => {
    for (const [r, c] of [
      [ra, '#e5163c'],
      [rb, '#1463ff'],
    ]) {
      const d = document.createElement('div')
      d.className = '__ofs_ov'
      Object.assign(d.style, { position: 'fixed', zIndex: 2147483647, pointerEvents: 'none', left: `${r.left - 2}px`, top: `${r.top - 2}px`, width: `${r.right - r.left + 4}px`, height: `${r.bottom - r.top + 4}px`, outline: `2px solid ${c}` })
      document.body.appendChild(d)
    }
  }, f)
}

async function checkViewport(browser, base, vp, path) {
  const tag = `${vp.width}x${vp.height}`
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: shotsDir ? 2 : 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.route(/^https?:\/\/[^/]*(posthog\.com|vercel-insights\.com|googletagmanager\.com|google-analytics\.com)|\/_vercel\/(insights|speed-insights)/, (r) => r.fulfill({ status: 204, body: '' }))
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForSelector('[data-ofsl]', { state: 'attached', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const total = await page.evaluate(() => document.scrollingElement.scrollHeight)
  // --from / --to: a pixel offset or a selector (its top), to check one part of the page
  const edge = (v, def) =>
    v
      ? page.evaluate((v) => {
          if (!isNaN(Number(v))) return Number(v)
          const [sel, side] = v.split('@') // '#lp-film@bottom': the element's bottom edge
          const r = document.querySelector(sel).getBoundingClientRect()
          return (side === 'bottom' ? r.bottom : r.top) + window.scrollY
        }, v)
      : def
  const y0 = Math.round(await edge(arg('from', ''), 0))
  const y1 = Math.round(await edge(arg('to', ''), total))
  const step = Math.max(60, Math.round(vp.height * stepFrac))
  const hits = new Map()
  let wide = 0
  let shots = 0
  for (let y = y0; y <= Math.min(y1, total - vp.height + step); y += step) {
    const at = Math.min(y, total - vp.height)
    await page.evaluate((v) => window.scrollTo(0, v), at)
    await page.waitForTimeout(260)
    const res = await page.evaluate(measure, { minOpacity: MIN_OPACITY })
    wide = Math.max(wide, res.wide)
    for (const f of res.found) {
      if (ALLOW.some((x) => (!x.at || x.at.test(f.at)) && ((x.a.test(f.a) && x.b.test(f.b)) || (x.a.test(f.b) && x.b.test(f.a))))) continue
      const key = `${f.kind}|${f.at}|${f.a}|${f.b}`
      const h = hits.get(key)
      if (h) {
        h.n++
        continue
      }
      hits.set(key, { ...f, y: at, n: 1 })
      if (shotsDir && shots < 40) {
        await outline(page, f)
        const file = join(shotsDir, `${tag}${path === '/' ? '' : path.replace(/\W+/g, '-')}-${String(shots).padStart(2, '0')}-${at}.jpg`)
        await page.screenshot({ path: file, type: 'jpeg', quality: 70 })
        await page.evaluate(() => document.querySelectorAll('.__ofs_ov').forEach((d) => d.remove()))
        hits.get(key).shot = file
        shots++
      }
    }
  }
  // the page must not scroll sideways
  const sx = await page.evaluate(() => {
    window.scrollTo(400, window.scrollY)
    return window.scrollX
  })
  await ctx.close()
  return { tag, path, hits: [...hits.values()], wide: wide || (sx > 0 ? sx : 0), steps: Math.ceil((Math.min(y1, total) - y0) / step) }
}

const dist = resolve(FRONTEND, arg('dist', process.env.OFS_DIST || 'dist'))
const server = arg('url', '') ? { url: arg('url').replace(/\/$/, ''), stop: () => {} } : await serve(dist)
const browser = await chromium.launch()
let failed = 0
try {
  const jobs = viewports.flatMap((vp) => pages.map((p) => [vp, p]))
  const results = []
  const pool = Number(arg('jobs', '3'))
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(pool, jobs.length) }, async () => {
      while (next < jobs.length) {
        const [vp, p] = jobs[next++]
        results.push(await checkViewport(browser, server.url, vp, p))
      }
    })
  )
  results.sort((a, b) => viewports.findIndex((v) => `${v.width}x${v.height}` === a.tag) - viewports.findIndex((v) => `${v.width}x${v.height}` === b.tag))
  for (const r of results) {
    const bad = r.hits.length + (r.wide ? 1 : 0)
    failed += bad
    console.log(`${bad ? 'FAIL' : 'ok  '} ${r.tag} ${r.path}: ${r.hits.length} collision${r.hits.length === 1 ? '' : 's'}${r.wide ? `, scrolls sideways (${r.wide}px)` : ''} (${r.steps} screens)`)
    for (const h of r.hits) {
      const verb = h.kind === 'covered' ? 'under' : 'over'
      console.log(`     ${h.at} @${h.y} x${h.n}: [${h.a}] "${h.ta}" ${verb} [${h.b}] "${h.tb}"${h.shot ? `  ${h.shot}` : ''}`)
    }
  }
} finally {
  await browser.close()
  server.stop()
}
if (failed) {
  console.log(`\n${failed} problem${failed === 1 ? '' : 's'}. Fix the layout, or allowlist a deliberate overlap in ALLOW with the reason.`)
  process.exit(1)
}
console.log('\nNo overlapping text at any viewport.')
