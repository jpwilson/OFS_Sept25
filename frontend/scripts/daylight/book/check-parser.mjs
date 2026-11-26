#!/usr/bin/env node
// Proves the Node parser path equals the browser's (owner: book ENGINE).
//
//   node scripts/daylight/book/check-parser.mjs
//
// Bundles the real lib/storyBlocks.js (with DOMPurify) and lib/journey.js with esbuild, runs
// them in headless Chromium over every sample story, runs the same files under Node with
// lib/minidom.mjs, and compares. The parsed blocks must be identical; the HTML strings in
// text blocks are compared after DOMPurify's attribute pruning is normalised away, and the
// text the book takes from them (engine/html.js) must be identical, character for character.
// Exits 1 on any difference.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseStory, buildJourney } from './lib/node-story.mjs'
import { htmlToParagraphs } from '../../../src/daylight/book/engine/html.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../../..')
const require = createRequire(path.join(FRONTEND, 'package.json'))
const esbuild = require('esbuild')
const { chromium } = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')('playwright')

const sample = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'scripts/daylight/fixtures/sample.json'), 'utf8'))
const stories = Object.values(sample.details)

const bundle = await esbuild.build({
  stdin: {
    contents: "export { parseStory } from './src/daylight/lib/storyBlocks.js'; export { buildJourney } from './src/daylight/lib/journey.js'",
    resolveDir: FRONTEND,
    loader: 'js',
  },
  bundle: true,
  format: 'iife',
  globalName: 'SB',
  write: false,
  logLevel: 'silent',
})
const code = bundle.outputFiles[0].text

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setContent('<!doctype html><title>parser</title>')
await page.addScriptTag({ content: code })
const inBrowser = await page.evaluate((list) => list.map((d) => {
  const parsed = window.SB.parseStory(d.description, d.event_images)
  const journey = window.SB.buildJourney(d, parsed)
  return { id: d.id, parsed, journey }
}), stories)
await browser.close()

// DOMPurify drops attributes it does not allow (contenteditable); the text is what matters
const norm = (html) => html.replace(/ contenteditable="[^"]*"/g, '')
let fails = 0
let htmlDiffs = 0
for (const b of inBrowser) {
  const d = stories.find((x) => x.id === b.id)
  const parsed = parseStory(d.description, d.event_images)
  const journey = buildJourney(d, parsed)
  const strip = (p) => ({ ...p, blocks: p.blocks.map((x) => (x.type === 'html' ? { ...x, html: norm(x.html) } : x)) })
  const same = JSON.stringify(strip(parsed)) === JSON.stringify(strip(b.parsed))
  const sameJourney = JSON.stringify(journey) === JSON.stringify(b.journey)
  const texts = (p) => JSON.stringify(p.blocks.filter((x) => x.type === 'html').map((x) => htmlToParagraphs(x.html)))
  const sameText = texts(parsed) === texts(b.parsed)
  const rawSame = JSON.stringify(parsed) === JSON.stringify(b.parsed)
  if (!rawSame) htmlDiffs++
  const ok = same && sameJourney && sameText
  if (!ok) fails++
  console.log(`${ok ? 'same' : 'DIFF'}  ${String(d.id).padEnd(4)} ${d.title.padEnd(36)} blocks ${String(parsed.blocks.length).padStart(3)}  media ${String(parsed.media.length).padStart(2)}  journey ${journey ? journey.stops.length + ' stops' : 'none'}${rawSame ? '' : '  (html attributes differ only by DOMPurify pruning)'}${same ? '' : '  blocks differ'}${sameJourney ? '' : '  journey differs'}${sameText ? '' : '  book text differs'}`)
}
console.log(fails ? `[book] parser check: ${fails} of ${inBrowser.length} stories differ` : `[book] parser check: all ${inBrowser.length} stories give the same blocks, journey and book text in Node and Chromium${htmlDiffs ? ` (${htmlDiffs} differ only in attributes DOMPurify prunes)` : ''}`)
process.exit(fails ? 1 : 0)
