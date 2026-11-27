#!/usr/bin/env node
// Fails if the sample snapshot carries a key production does not send, or misses one it
// does (owner: F0). PLAN-DAYLIGHT 5.6. Run after build-sample.mjs.
//   node scripts/daylight/check-contract.mjs
// It also asks src/daylight/admin/sample.js every admin analytics route, in every range,
// interval and state, and compares each answer with fixtures/admin-contract.json: the keys
// of every response and nested object, the same file the API branch tests its Pydantic
// models against (docs/app/ADMIN-ANALYTICS.md). An object in an answer that the contract
// does not list fails too.
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

// ---------------------------------------------------------------- admin analytics
const ADMIN = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/admin-contract.json'), 'utf8'))
const admin = await import('../../src/daylight/admin/sample.js')
const used = new Set()
function walk(value, at, what) {
  if (Array.isArray(value)) return value.forEach((v) => walk(v, `${at}[]`, what))
  if (value === null || typeof value !== 'object') return
  const keys = ADMIN[at]
  if (!keys) return problems.push(`${what}: ${at} is an object the admin contract does not list`)
  used.add(at)
  const d = diffKeys(value, keys)
  if (d.extra.length || d.missing.length) problems.push(`${what}: ${at} extra [${d.extra}] missing [${d.missing}]`)
  for (const [k, v] of Object.entries(value)) walk(v, `${at}.${k}`, what)
}
const visitorsRoot = (j) => (j.configured === false ? 'visitors:not_configured' : j.ok === false ? 'visitors:failed' : 'visitors:ok')
let asked = 0
const ask = async (method, p, query = {}, body = null) => {
  const st = { db: JSON.parse(JSON.stringify(snap)), viewer: 'maya', origin: 'http://127.0.0.1' }
  const r = await admin.answer({ method, path: p, query, body }, st, {})
  asked++
  const what = `${method} ${p} ${JSON.stringify({ ...query, ...(body || {}) })}`
  if (!r || r.status !== 200) return problems.push(`${what}: status ${r?.status ?? 'no answer'}`)
  const root = p.split('/').pop()
  walk(r.json, root === 'visitors' ? visitorsRoot(r.json) : root, what)
}
const COMBOS = [['24h', 'hour'], ['7d', 'day'], ['7d', 'hour'], ['30d', 'day'], ['90d', 'day'], ['90d', 'month'], ['all', 'month'], ['all', 'day'], ['7d', 'month']]
for (const mode of ['ok', 'noauth', 'sessions', 'empty']) {
  for (const [range, interval] of COMBOS) {
    await ask('GET', '/admin/analytics/overview', { range, interval, __overview: mode })
    await ask('GET', '/admin/analytics/visitors', { range, interval, __overview: mode })
    await ask('GET', '/admin/analytics/overview', { range, interval, include_staff: 'true', __overview: mode })
  }
  await ask('GET', '/admin/analytics/unfinished', { range: '30d', __overview: mode })
  for (const sort of ['joined', 'last_active', 'last_sign_in', 'stories', 'name']) {
    await ask('POST', '/admin/analytics/members', { __overview: mode }, { q: null, sort, order: 'desc', page: 1, page_size: 100, include_staff: true, joined: 'all' })
  }
}
await ask('POST', '/admin/analytics/members', {}, { q: 'a', method: 'google', source: 'organic', plan: 'trial', activity: 'active_7d', stories: 'none', confirmed: true, joined: '7d', include_staff: false, sort: 'last_active', order: 'asc', page: 1, page_size: 25 })
for (const on of ['0', 'fail']) await ask('GET', '/admin/analytics/visitors', { range: '7d', __posthog: on })
const unused = Object.keys(ADMIN).filter((k) => !used.has(k))
if (unused.length) problems.push(`admin contract entries no sample answer exercised: ${unused.join(', ')}`)
console.log(`contract: ${asked} admin analytics answers against ${Object.keys(ADMIN).length} objects in admin-contract.json`)

if (problems.length) {
  console.log(`FAIL (${problems.length})\n  - ${problems.slice(0, 20).join('\n  - ')}`)
  process.exit(1)
}
console.log('PASS: every event, photo and stop has exactly the keys production sends, and every admin analytics answer the keys in admin-contract.json')
