// The sample stories as book inputs, under Node (owner: book ENGINE; dev only).
//   loadSamples() -> [{event, parsed, journey, tags, mediaStats, measured, source}]
//   nodeFonts() -> Fonts (the TTFs in daylight-public/book/fonts)
//   photoPath(src) -> the local file behind a sample photo URL
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseStory, buildJourney } from './node-story.mjs'
import { buildSource, loadFonts, measurePhotos } from '../../../../src/daylight/book/engine/index.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const FRONTEND = path.resolve(HERE, '../../../..')
export const FONT_DIR = path.join(FRONTEND, 'daylight-public/book/fonts')

export function photoPath(src) {
  const rel = String(src).replace(/^__ORIGIN__/, '')
  for (const root of ['public', 'daylight-public']) {
    const f = path.join(FRONTEND, root, rel)
    if (fs.existsSync(f)) return f
  }
  return null
}

let fontsP = null
export function nodeFonts() {
  fontsP ||= loadFonts(async (file) => fs.readFileSync(path.join(FONT_DIR, file)))
  return fontsP
}

export async function loadSamples({ rebuild = false } = {}) {
  const file = path.join(FRONTEND, 'scripts/daylight/fixtures/sample.json')
  if (rebuild || !fs.existsSync(file)) {
    const { execFileSync } = await import('node:child_process')
    execFileSync(process.execPath, [path.join(FRONTEND, 'scripts/daylight/build-sample.mjs'), '--quiet'], { stdio: 'inherit' })
  }
  const sample = JSON.parse(fs.readFileSync(file, 'utf8'))
  const out = []
  for (const event of Object.values(sample.details).sort((a, b) => a.id - b.id)) {
    const parsed = parseStory(event.description, event.event_images)
    const journey = buildJourney(event, parsed)
    const tags = sample.extras[event.id]?.tags || []
    const mediaStats = Object.fromEntries(event.event_images.map((im) => [im.id, sample.mediaStats[im.id]]).filter(([, v]) => v))
    const srcs = parsed.media.map((m) => m.src)
    const measured = await measurePhotos(srcs, async (src) => {
      const f = photoPath(src)
      if (!f) throw new Error(`no file for ${src}`)
      return fs.readFileSync(f)
    })
    const source = buildSource({ event, parsed, journey, tags, mediaStats, measured })
    out.push({ event, parsed, journey, tags, mediaStats, measured, source })
  }
  return out
}
