#!/usr/bin/env node
// Fails if the sample snapshot carries a key production does not send, or misses one it
// does (owner: F0). PLAN-DAYLIGHT 5.6. Run after build-sample.mjs.
//   node scripts/daylight/check-contract.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EVENT_KEYS, IMAGE_KEYS, LOCATION_KEYS, diffKeys } from './fixtures/contract.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const snap = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/sample.json'), 'utf8'))
const problems = []
const check = (what, obj, keys) => {
  const d = diffKeys(obj, keys)
  if (d.extra.length || d.missing.length) problems.push(`${what}: extra [${d.extra}] missing [${d.missing}]`)
}
for (const e of snap.list) {
  check(`list item ${e.id}`, e, EVENT_KEYS)
  if (e.description !== '' || e.event_images.length || e.locations.length || e.like_count || e.comment_count || e.category_2 !== null || e.short_title !== null) problems.push(`list item ${e.id} carries detail-only data`)
}
for (const d of Object.values(snap.details)) {
  check(`detail ${d.id}`, d, EVENT_KEYS)
  d.event_images.forEach((im) => check(`detail ${d.id} image ${im.id}`, im, IMAGE_KEYS))
  d.locations.forEach((l) => check(`detail ${d.id} location ${l.id}`, l, LOCATION_KEYS))
  if (d.event_images.some((im) => im.media_type !== 'image')) problems.push(`detail ${d.id}: production always says media_type 'image'`)
}
console.log(`contract: ${snap.list.length} list items, ${Object.keys(snap.details).length} details`)
if (problems.length) {
  console.log(`FAIL (${problems.length})\n  - ${problems.slice(0, 20).join('\n  - ')}`)
  process.exit(1)
}
console.log('PASS: every event, photo and stop has exactly the keys production sends')
