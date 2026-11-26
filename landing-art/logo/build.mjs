// Logo candidates A-F: writes <id>.svg (full colour, transparent), <id>-icon.svg (home-screen
// tile), <id>-16.svg (favicon cut), then renders options.png via Playwright.
// Usage: node landing-art/logo/build.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(DIR, '..', '..')
const INK = '#101B3B'
const C = { tide: '#19CFC7', azure: '#3AA8FF', lime: '#C6F135', fizz: '#FF62C4', zest: '#FF8A1F', violet: '#A98BFF', sun: '#FFD43B', paper: '#F4F7FB', white: '#FFFFFF' }
const k = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`

// Each mark: 64-unit art (with its ink offset shadow), 16-unit favicon cut, icon tile colour.
const MARKS = [
  {
    id: 'A', slug: 'story-sticker', name: 'Story Sticker', bg: C.sun,
    idea: 'The tilted "Family" sticker from the wordmark, carrying a bold opening quote mark: the start of a story.',
    art: `<g transform="rotate(-7 32 32)"><rect x="12" y="13" width="40" height="38" rx="8" fill="${INK}" transform="translate(3.5 3.5)"/><rect x="10" y="11" width="40" height="38" rx="8" fill="${C.white}" ${k(3)}/>
<g fill="${INK}"><circle cx="22.5" cy="35" r="6"/><circle cx="37.5" cy="35" r="6"/></g><path d="M17.5 35c0-7 3-11.5 8.5-13.5M32.5 35c0-7 3-11.5 8.5-13.5" fill="none" ${k(4.6)}/></g>`,
    s16: `<g transform="rotate(-7 8 8)"><rect x="1.8" y="2.4" width="12.4" height="11.4" rx="2.4" fill="${C.white}" ${k(1.4)}/>
<g fill="${INK}"><circle cx="5.6" cy="9.4" r="1.9"/><circle cx="10.2" cy="9.4" r="1.9"/></g><path d="M3.9 9.4c0-2.4 1-3.7 2.8-4.4M8.5 9.4c0-2.4 1-3.7 2.8-4.4" fill="none" ${k(1.5)}/></g>`,
  },
  {
    id: 'B', slug: 'audience-rings', name: 'Audience Rings', bg: C.white,
    idea: 'Nested circles that all start from one point: Private inside Close Family inside Followers inside Public.',
    art: `<circle cx="35.5" cy="34.5" r="27" fill="${INK}"/><circle cx="32" cy="31" r="27" fill="${C.azure}" ${k(3)}/>
<circle cx="32" cy="38" r="20" fill="${C.tide}" ${k(3)}/><circle cx="32" cy="45" r="13" fill="${C.sun}" ${k(3)}/><circle cx="32" cy="51.5" r="6.5" fill="${C.fizz}" ${k(3)}/>`,
    s16: `<circle cx="8" cy="8" r="6.9" fill="${C.azure}" ${k(1.3)}/><circle cx="8" cy="10.2" r="4.7" fill="${C.sun}" ${k(1.3)}/><circle cx="8" cy="12.2" r="2.3" fill="${C.fizz}" ${k(1.3)}/>`,
  },
  {
    id: 'C', slug: 'journey-pin', name: 'Journey Pin', bg: C.lime,
    idea: 'A map pin at the end of a dashed route, the journey-map line the page already draws under every trip.',
    art: `<path d="M9 55c6-1 9-5 13-9s7-5 11-4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 6"/>
<circle cx="8" cy="55" r="4" fill="${C.white}" ${k(2.5)}/>
<path d="M44.5 57.5c-3-6-14-14-14-26a14 14 0 0 1 28 0c0 12-11 20-14 26z" fill="${INK}"/><path d="M41 54c-3-6-14-14-14-26a14 14 0 0 1 28 0c0 12-11 20-14 26z" fill="${C.zest}" ${k(3)}/>
<circle cx="41" cy="28" r="6" fill="${C.white}" ${k(3)}/>`,
    s16: `<path d="M8 15C6.9 12.6 2.6 9.6 2.6 6.4a5.4 5.4 0 0 1 10.8 0C13.4 9.6 9.1 12.6 8 15z" fill="${C.zest}" ${k(1.4)}/><circle cx="8" cy="6.3" r="2.1" fill="${C.white}" ${k(1.3)}/>`,
  },
  {
    id: 'D', slug: 'home-dots', name: 'Home Dots', bg: C.azure,
    idea: 'A house with the three family dots from today\'s nav sitting inside it, like faces at the window.',
    art: `<path d="M14.5 31.5 35.5 13.5 56.5 31.5V57.5H14.5Z" fill="${INK}" ${k(3)}/><path d="M11 28 32 10 53 28V54H11Z" fill="${C.sun}" ${k(3)}/>
<circle cx="21.5" cy="40" r="6.5" fill="${C.tide}" ${k(2.5)}/><circle cx="32" cy="40" r="6.5" fill="${C.zest}" ${k(2.5)}/><circle cx="42.5" cy="40" r="6.5" fill="${C.fizz}" ${k(2.5)}/>`,
    s16: `<path d="M1.4 7.2 8 1.6 14.6 7.2V14.4H1.4Z" fill="${C.sun}" ${k(1.4)}/><circle cx="4.9" cy="10.4" r="1.7" fill="${C.tide}"/><circle cx="8" cy="10.4" r="1.7" fill="${C.zest}"/><circle cx="11.1" cy="10.4" r="1.7" fill="${C.fizz}"/>`,
  },
  {
    id: 'E', slug: 'heart-bubble', name: 'Heart Bubble', bg: C.tide,
    idea: 'A heart that is also a speech bubble: the stories, and the replies the family leaves under them.',
    art: `<g transform="translate(3.5 3.5)" fill="${INK}"><path id="h" d="M32 53C44 45 56 36 56 24c0-8-6-14-13-14-5 0-9 3-11 7-2-4-6-7-11-7-7 0-13 6-13 14 0 7 4 13 9 18l-5 12 13-6c2.5 1.8 4.8 3.5 7 5z"/></g>
<path d="M32 53C44 45 56 36 56 24c0-8-6-14-13-14-5 0-9 3-11 7-2-4-6-7-11-7-7 0-13 6-13 14 0 7 4 13 9 18l-5 12 13-6c2.5 1.8 4.8 3.5 7 5z" fill="${C.fizz}" ${k(3)}/>
<g fill="${C.white}" ${k(2.5)}><circle cx="22" cy="27" r="3.6"/><circle cx="32" cy="31" r="3.6"/><circle cx="42" cy="27" r="3.6"/></g>`,
    s16: `<path d="M8 14.2C11.5 12 15 9.4 15 5.9 15 3.7 13.4 2 11.4 2 9.9 2 8.7 2.9 8 4 7.3 2.9 6.1 2 4.6 2 2.6 2 1 3.7 1 5.9 1 7.8 2 9.4 3.4 10.8L2.2 14.6 5.9 12.8C6.6 13.3 7.3 13.7 8 14.2Z" fill="${C.fizz}" ${k(1.4)}/>`,
  },
  {
    id: 'F', slug: 'photo-stack', name: 'Photo Stack', bg: C.violet,
    idea: 'A fanned stack of prints, the top one a sunny snapshot: the long story with its photos.',
    art: `<rect x="14" y="12" width="34" height="40" rx="4" fill="${C.azure}" ${k(3)} transform="rotate(-14 31 32)"/>
<rect x="16" y="12" width="34" height="40" rx="4" fill="${C.fizz}" ${k(3)} transform="rotate(9 33 32)"/>
<g transform="rotate(-3 32 32)"><rect x="18.5" y="15.5" width="34" height="40" rx="4" fill="${INK}"/><rect x="15" y="12" width="34" height="40" rx="4" fill="${C.white}" ${k(3)}/>
<path d="M20 17h24v23H20z" fill="${C.tide}" ${k(2.5)}/><path d="M20 40l8-10 6 6 4-4 6 8z" fill="${C.lime}" ${k(2.5)}/><circle cx="37" cy="23.5" r="3.2" fill="${C.sun}" ${k(2.2)}/></g>`,
    s16: `<rect x="2.6" y="2" width="9.6" height="11.6" rx="1.4" fill="${C.fizz}" ${k(1.3)} transform="rotate(18 8.6 8.4)"/>
<g transform="rotate(-6 8 8)"><rect x="3.4" y="2.6" width="9.6" height="11.6" rx="1.4" fill="${C.white}" ${k(1.3)}/><rect x="5.2" y="4.4" width="6" height="5.4" fill="${C.tide}" ${k(1)}/></g>`,
  },
]

const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${body}</svg>\n`
const icon = (m) => svg(64, `<rect width="64" height="64" rx="14" fill="${m.bg}"/><g transform="translate(7 7) scale(.78)">${m.art}</g>`)

for (const m of MARKS) {
  m.files = { full: `${m.id}-${m.slug}.svg`, icon: `${m.id}-${m.slug}-icon.svg`, s16: `${m.id}-${m.slug}-16.svg` }
  writeFileSync(join(DIR, m.files.full), svg(64, m.art))
  writeFileSync(join(DIR, m.files.icon), icon(m))
  writeFileSync(join(DIR, m.files.s16), svg(16, m.s16))
}

// ---- comparison sheet
const fontUrl = pathToFileURL(join(ROOT, 'frontend/public/landing/fonts/bricolage-grotesque-latin-var-v5.woff2')).href
const today = readFileSync(join(ROOT, 'frontend/public/favicon.svg'), 'utf8')
const todayData = 'data:image/svg+xml;base64,' + Buffer.from(today).toString('base64')
const dots = `<svg viewBox="0 0 44 24" width="38"><circle cx="11" cy="12" r="9" fill="${C.tide}" stroke="${INK}" stroke-width="2"/><circle cx="22" cy="12" r="9" fill="${C.zest}" stroke="${INK}" stroke-width="2"/><circle cx="33" cy="12" r="9" fill="${C.fizz}" stroke="${INK}" stroke-width="2"/></svg>`
const img = (f, s) => `<img src="${f}" width="${s}" height="${s}">`

const row = ({ label, name, s16, full, iconSrc, nav }) => `<div class="row">
<div class="lab"><b>${label}</b><span>${name}</span></div>
<div class="sz">${img(s16, 16)}<i>16</i></div><div class="sz">${img(full, 32)}<i>32</i></div><div class="sz">${img(full, 64)}<i>64</i></div><div class="sz">${img(iconSrc, 180)}<i>180 icon</i></div>
<div class="phone">${img(iconSrc, 60)}<em>OFS</em></div>
<div class="tab"><div class="t">${img(s16, 16)}<span>Our Family Socials</span><u>×</u></div><div class="bar"></div></div>
<div class="nav">${nav}<span class="wm">Our <span class="st">Family</span> Socials</span></div>
</div>`

const rows = [row({ label: 'Today', name: 'People + heart', s16: todayData, full: todayData, iconSrc: todayData, nav: dots })]
for (const m of MARKS) rows.push(row({ label: m.id, name: m.name, s16: m.files.s16, full: m.files.full, iconSrc: m.files.icon, nav: img(m.files.full, 34) }))

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url('${fontUrl}') format('woff2');font-weight:200 800;font-stretch:75% 100%}
body{margin:0;background:${C.paper};font-family:B,system-ui;color:${INK};width:1500px}
h1{font-weight:800;font-variation-settings:'wdth' 86;letter-spacing:-.02em;font-size:28px;margin:24px 32px 4px}
p.k{margin:0 32px 12px;font-size:14px;opacity:.7}
.row{display:flex;align-items:center;gap:26px;padding:14px 32px;border-top:2px solid rgba(16,27,59,.12)}
.row:first-of-type{background:#e3e9f2}
.lab{width:120px;display:flex;flex-direction:column}.lab b{font-size:30px;font-weight:800;line-height:1}.lab span{font-size:14px;font-weight:600}
.sz{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:34px}.sz i{font-style:normal;font-size:11px;opacity:.6}
img{display:block}
.phone{width:120px;height:150px;background:${C.tide};border:2.5px solid ${INK};border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:4px 4px 0 ${INK}}
.phone img{border-radius:14px}.phone em{font-style:normal;font-size:12px;font-weight:600}
.tab{width:220px;background:#dfe3ea;border-radius:8px 8px 0 0;padding-top:8px}
.t{background:#fff;margin:0 8px;border-radius:8px 8px 0 0;height:32px;display:flex;align-items:center;gap:8px;padding:0 10px;font:13px system-ui;color:#333}
.t span{flex:1;white-space:nowrap;overflow:hidden}.t u{text-decoration:none;opacity:.5}.bar{height:10px;background:#fff}
.nav{display:flex;align-items:center;gap:10px;background:#fff;padding:14px 18px;border-radius:12px;font-weight:800;font-variation-settings:'wdth' 86;font-size:19px;letter-spacing:-.02em;white-space:nowrap}
.st{display:inline-block;padding:.06em .3em .1em;border:2px solid ${INK};border-radius:5px;box-shadow:2px 2px 0 ${INK};transform:rotate(-2deg);background:#fff}
</style><h1>Our Family Socials: logo options</h1><p class="k">Sizes 16 · 32 · 64 · 180 (home-screen tile) · on a phone · in a browser tab · in the nav lockup</p>${rows.join('')}`
writeFileSync(join(DIR, 'options.html'), html)

const require = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = require('playwright')
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
await page.goto(pathToFileURL(join(DIR, 'options.html')).href)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: join(DIR, 'options.png'), fullPage: true })
// true-pixel check of the 16px column, blown up 8x with nearest-neighbour so mush shows
const sharp = createRequire(join(ROOT, 'landing-art/'))('sharp')
const boxes = await page.$$eval('.row .sz:nth-child(2) img', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y] }))
const strip = await sharp({ create: { width: 16 * boxes.length + 4 * boxes.length, height: 16, channels: 4, background: { r: 244, g: 247, b: 251, alpha: 1 } } })
  .composite(await Promise.all(boxes.map(async ([x, y], i) => ({ input: await page.screenshot({ fullPage: true, clip: { x, y, width: 16, height: 16 } }), left: i * 20, top: 0 }))))
  .png().toBuffer()
await sharp(strip).resize({ width: 20 * boxes.length * 8, kernel: 'nearest' }).toFile(join(DIR, '_zoom16.png'))
await browser.close()
console.log('ok')
