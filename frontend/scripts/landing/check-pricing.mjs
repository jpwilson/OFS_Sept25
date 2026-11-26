#!/usr/bin/env node
// Pricing tripwire for the story landing (owner: close).
//
//   node scripts/landing/check-pricing.mjs [path/to/index.html]     (default: dist/index.html)
//   node scripts/landing/check-pricing.mjs --source-only            (skip the html checks)
//
// Fails (exit 1) when:
//   1. Source: PRICES (content/facts.js) disagrees with PRICING in src/content/site.js.
//   2. Built html: the #lp-plans section is missing, or an element marked data-price or
//      data-math shows a value other than the one computed from site.js, or any dollar
//      amount or percentage printed in the section is not one of those values.
// (Round four: the comparison cards no longer copy marketing.js, so they are not checked.)
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '../..')
const load = (p) => import(pathToFileURL(join(FRONTEND, p)).href)

const args = process.argv.slice(2)
const sourceOnly = args.includes('--source-only')
const htmlPath = resolve(process.cwd(), args.find((a) => !a.startsWith('--')) || join(FRONTEND, 'dist/index.html'))

const errors = []
const fail = (m) => errors.push(m)

const { PRICING } = await load('src/content/site.js')
const { PRICES } = await load('src/landing/content/facts.js')

// ---------------------------------------------------------------- prices vs site.js

const $ = (n) => `$${n}`
const num = (s) => Number(String(s).replace(/[^0-9.]/g, ''))
const EXPECT = {
  free: $(PRICING.free.price),
  'pro-month-yearly': $(PRICING.proAnnual.price),
  'pro-year': $(PRICING.proAnnual.billed),
  'pro-month': $(PRICING.proMonthly.price),
  lifetime: $(PRICING.lifetime.price),
}
const pairs = [
  ['free', PRICES.free.price],
  ['pro-month-yearly', PRICES.pro.perMonthBilledYearly],
  ['pro-year', PRICES.pro.perYear],
  ['pro-month', PRICES.pro.perMonth],
  ['lifetime', PRICES.lifetime.price],
]
for (const [k, v] of pairs) if (v !== EXPECT[k]) fail(`prices: PRICES ${k} is ${v}, site.js says ${EXPECT[k]}`)

// The arithmetic, recomputed here from site.js alone.
const months = Math.round(num(PRICING.proAnnual.billed) / num(PRICING.proAnnual.price))
const monthlyYear = months * num(PRICING.proMonthly.price)
const MATH = {
  months: String(months),
  'monthly-year': $(monthlyYear),
  saving: `${Math.round(((monthlyYear - num(PRICING.proAnnual.billed)) / monthlyYear) * 100)}%`,
  years: (num(PRICING.lifetime.price) / num(PRICING.proAnnual.billed)).toFixed(1),
}
const saved = $(monthlyYear - num(PRICING.proAnnual.billed))

// ---------------------------------------------------------------- the built page

const decode = (s) =>
  s
    .replace(/<!--.*?-->/gs, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/** The outer html of the element with this id: from its open tag to the matching close tag. */
function elementById(html, id) {
  const open = new RegExp(`<(\\w+)[^>]*\\sid="${id}"[^>]*>`).exec(html)
  if (!open) return null
  const tag = open[1]
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g')
  re.lastIndex = open.index
  let depth = 0
  let m
  while ((m = re.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1
    if (depth === 0) return html.slice(open.index, m.index + m[0].length)
  }
  return null
}

let checkedHtml = false
if (!sourceOnly) {
  if (!existsSync(htmlPath)) {
    fail(`html: ${htmlPath} not found (build first, or pass a path, or --source-only)`)
  } else {
    checkedHtml = true
    const html = readFileSync(htmlPath, 'utf8')
    const plans = elementById(html, 'lp-plans')
    if (!plans) {
      fail('html: no element with id="lp-plans" (is this the story variant, prerendered?)')
    } else {
      const seen = new Set()
      for (const m of plans.matchAll(/data-(price|math)="([\w-]+)"[^>]*>([^<]*)</g)) {
        const [, kind, key, raw] = m
        const text = decode(raw).trim()
        const want = (kind === 'price' ? EXPECT : MATH)[key]
        seen.add(`${kind}:${key}`)
        if (want == null) fail(`html: unknown data-${kind}="${key}"`)
        else if (text !== want) fail(`html: data-${kind}="${key}" shows "${text}", expected "${want}"`)
      }
      for (const k of Object.keys(EXPECT)) if (!seen.has(`price:${k}`)) fail(`html: plans section has no data-price="${k}"`)
      for (const k of Object.keys(MATH)) if (!seen.has(`math:${k}`)) fail(`html: plans section has no data-math="${k}"`)

      // Every amount printed anywhere in the section must be a known one.
      const text = decode(plans.replace(/<[^>]+>/g, ' '))
      const allowed = new Set([...Object.values(EXPECT), MATH['monthly-year'], saved, MATH.saving])
      for (const m of text.matchAll(/\$\s?\d[\d,.]*|\d[\d,.]*\s?%/g)) {
        const v = m[0].replace(/\s/g, '').replace(/[.,]$/, '')
        if (!allowed.has(v)) fail(`html: plans section prints "${v}", which is not a price from site.js or arithmetic on them`)
      }
    }
  }
}

if (errors.length) {
  console.error(`check-pricing: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log(
  `check-pricing: ok. ${Object.entries(EXPECT)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')}${checkedHtml ? `; checked ${htmlPath}` : '; html not checked'}`,
)
