#!/usr/bin/env node
// Builds the production-shaped sample snapshot (owner: F0). PLAN-DAYLIGHT 5.6.
//
//   node scripts/daylight/build-sample.mjs [--quiet]
//   -> scripts/daylight/fixtures/sample.json   (generated; the dev middleware rebuilds it at every start)
//
// One snapshot, three consumers: the sample dev server (vite-seam.mjs), capture.mjs, and
// later a sample build for a real phone. It reads the landing's fixtures READ-ONLY
// (scripts/landing/fixtures/*.mjs, answered through their own api.mjs so their shapes stay
// theirs) and passes every event through fixtures/contract.mjs, so list items and details
// carry exactly the keys production sends (the landing's fixture returns full events as
// list items, which is richer than production).
//
// The Tetons story, in order of preference:
//   1. fixtures/teton.mjs (STORY's), exporting tetonFixture({photoUrl, users}) -> {event, comments, tagged}
//   2. a story in the landing fixtures whose slug or title mentions the Tetons (round two, id 110)
//   3. fixtures/teton.placeholder.mjs (the alternative plan's audited table, stand-in words)
// Photos photo-tetons-01..30, in order of preference: the landing art manifest, then
// frontend/daylight-public/sample/teton/photo-tetons-NN.{webp,jpg}, then a labelled SVG
// placeholder served by the middleware. Missing photos are listed in sample.json.missing.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const LANDING_FX = path.join(FRONTEND, 'scripts/landing/fixtures')
const OUT = path.join(HERE, 'fixtures/sample.json')
const TOKEN = '__ORIGIN__'
const quiet = process.argv.includes('--quiet')

// The landing's media.mjs reads its origin at import time: hand it the token, then import.
process.env.CAPTURE_ORIGIN = TOKEN
const imp = (f) => import(pathToFileURL(path.join(LANDING_FX, f)).href)
const [{ USERS, FOLLOWING_KEYS, FOLLOWER_KEYS, RUN_CLUB, BISCUIT }, { STORIES }, api, media] = await Promise.all([
  imp('cast.mjs'), imp('stories.mjs'), imp('api.mjs'), imp('media.mjs'),
])
const contract = await import(pathToFileURL(path.join(HERE, 'fixtures/contract.mjs')).href)
const { toDetail, toListItem, toShare } = contract

const state = { viewer: 'maya', theme: 'light' }
const get = async (p) => {
  const u = new URL(`http://fixture.invalid/api/v1${p}`)
  const req = { method: () => 'GET', postData: () => null }
  const r = await api.answer(req, u, state)
  return r && r.__http ? { __status: r.__http, ...r.body } : r
}

// ---------------------------------------------------------------- Tetons photos
const missing = []
const manifest = media.readManifest()
const tetonId = (n) => `photo-tetons-${String(n).padStart(2, '0')}`
function photoUrl(n) {
  const id = tetonId(n)
  if (manifest[id]) return TOKEN + manifest[id].src
  for (const ext of ['webp', 'jpg']) {
    const f = path.join(FRONTEND, `daylight-public/sample/teton/${id}.${ext}`)
    if (fs.existsSync(f)) return `${TOKEN}/sample/teton/${id}.${ext}`
  }
  missing.push(id)
  return `${TOKEN}/__fx/ph/${id}.svg`
}

// ---------------------------------------------------------------- stories
const details = {}
const extras = {} // id -> {comments, likes, likesAll, tags}
for (const s of STORIES) {
  const full = await get(`/events/${s.id}`)
  details[s.id] = toDetail(full)
  extras[s.id] = {
    comments: (await get(`/events/${s.id}/comments`)) || [],
    likes: await get(`/events/${s.id}/likes`),
    likesAll: (await get(`/events/${s.id}/likes/all`)) || [],
    tags: (await get(`/events/${s.id}/tags`)) || [],
  }
}

let tetonSource = 'placeholder'
const landingTeton = STORIES.find((s) => /teton/i.test(`${s.slug} ${s.title}`))
const daylightTeton = path.join(HERE, 'fixtures/teton.mjs')
if (fs.existsSync(daylightTeton)) {
  const mod = await import(pathToFileURL(daylightTeton).href)
  const fx = mod.tetonFixture({ photoUrl, users: USERS })
  details[fx.event.id] = toDetail(fx.event)
  extras[fx.event.id] = { comments: fx.comments || [], likes: { like_count: 0, is_liked: false, recent_likes: [] }, likesAll: [], tags: tagRows(fx.event.id, fx.tagged || [], fx.event.author_id) }
  tetonSource = 'daylight fixtures/teton.mjs'
} else if (landingTeton) {
  tetonSource = `landing fixtures (story ${landingTeton.id})`
} else {
  const ph = await import(pathToFileURL(path.join(HERE, 'fixtures/teton.placeholder.mjs')).href)
  const ev = ph.tetonEvent({ photoUrl, users: USERS })
  const comments = ph.TETON_COMMENTS(USERS)
  ev.comment_count = comments.length
  details[ev.id] = toDetail(ev)
  const likers = ['ruth', 'joe', 'kate', 'maya']
  const all = likers.map((k, i) => ({ id: 7900 + i, user_id: USERS[k].id, username: USERS[k].username, full_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url, created_at: '2026-06-23T10:00:00Z' }))
  extras[ev.id] = { comments, likes: { like_count: all.length, is_liked: true, recent_likes: all.slice(0, 3) }, likesAll: all, tags: tagRows(ev.id, ph.TETON_TAGGED, ev.author_id) }
  details[ev.id].like_count = all.length
}
function tagRows(eventId, keys, by) {
  return keys.filter((k) => USERS[k]).map((k, i) => ({
    id: 8000 + eventId * 10 + i, event_id: eventId, tagged_by_id: by, status: 'accepted', created_at: '2026-06-22T20:15:00Z',
    tagged_user_id: USERS[k].id, tagged_user_username: USERS[k].username, tagged_user_display_name: USERS[k].full_name, tagged_user_avatar_url: USERS[k].avatar_url,
  }))
}

const tetonEventId = Object.values(details).find((d) => /teton/i.test(`${d.slug} ${d.title}`))?.id ?? null

// production order for order_by=event_date: start_date desc
const list = Object.values(details).sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))).map(toListItem)
const slugs = Object.fromEntries(Object.values(details).filter((d) => d.slug).map((d) => [d.slug, d.id]))

// ---------------------------------------------------------------- static routes
const routes = {}
const STATIC = [
  '/users/me/notification-counts', '/users/me/followers', '/users/me/following', '/users/me/muted',
  '/users/me/follow-requests', '/users/me/follow-requests/sent', '/users/me/follow-requests/count', '/users/me/notification-preferences',
  '/me/tag-requests', '/me/tag-requests/count', '/me/tag-profile-claims', '/me/tag-profile-claims/count', '/me/tag-profile-claims/sent',
  '/me/tag-profile-relationship-requests', '/me/tag-profile-relationship-requests/count', '/me/tag-profile-relationship-requests/sent',
  '/events/drafts', '/events/trash', '/events/me/last-location', '/custom-groups', '/invitations', '/relationships', '/relationships/types',
  '/tag-profiles/mine', '/share-links', '/stripe/subscription-status', '/geocoding/search',
]
for (const p of STATIC) {
  const r = await get(p)
  if (r !== undefined) routes[`GET ${p}`] = r
}
routes[`GET /custom-groups/${RUN_CLUB.id}`] = await get(`/custom-groups/${RUN_CLUB.id}`)
for (const p of [`/tag-profiles/${BISCUIT.id}`, `/tag-profiles/${BISCUIT.id}/events`, `/tag-profiles/${BISCUIT.id}/relationships`]) {
  const r = await get(p)
  if (r !== undefined) routes[`GET ${p}`] = Array.isArray(r) && p.endsWith('/events') ? r.map(toListItem) : r
}
const profiles = {}
for (const [k, u] of Object.entries(USERS)) {
  profiles[u.username] = await get(`/users/${u.username}`)
  routes[`GET /users/${u.username}/followers`] = await get(`/users/${u.username}/followers`)
  routes[`GET /users/${u.username}/following`] = await get(`/users/${u.username}/following`)
  routes[`GET /relationships/with/${u.id}`] = await get(`/relationships/with/${u.id}`)
  void k
}
const me = Object.fromEntries(Object.keys(USERS).map((k) => [k, api.meResponse('light', k)]))

// photo reactions, for every photo in every story
const allMediaIds = Object.values(details).flatMap((d) => d.event_images.map((i) => i.id))
const statsRows = (await get(`/media/batch/stats?ids=${allMediaIds.join(',')}`)) || []
const mediaStats = Object.fromEntries(statsRows.map((r) => [r.media_id, r]))
for (const id of allMediaIds) mediaStats[id] ||= { media_id: id, like_count: 0, comment_count: 0, is_liked: false, user_reaction: null, reaction_counts: null }

// ---------------------------------------------------------------- geocoding, uploads, AI
const gazetteer = []
const ph = await import(pathToFileURL(path.join(HERE, 'fixtures/teton.placeholder.mjs')).href)
for (const [name, lat, lng] of ph.STOPS) gazetteer.push({ name: `${name}, Teton County, Wyoming, United States`, lat, lng, address: { tourism: name, county: 'Teton County', state: 'Wyoming', country: 'United States' } })
gazetteer.push({ name: 'Jackson, Teton County, Wyoming, United States', lat: 43.4799, lng: -110.7624, address: { town: 'Jackson', county: 'Teton County', state: 'Wyoming', country: 'United States' } })
for (const s of STORIES) {
  for (const st of s.stops || []) gazetteer.push({ name: st.name, lat: st.lat, lng: st.lng, address: { town: st.name.split(',')[0] } })
  if (s.latitude != null) gazetteer.push({ name: s.location_name, lat: s.latitude, lng: s.longitude, address: { town: String(s.location_name).split(',')[0] } })
}
const kitDir = path.join(FRONTEND, 'daylight-public/sample/teton')
const uploads = fs.existsSync(kitDir)
  ? fs.readdirSync(kitDir).filter((f) => /\.(webp|jpg)$/.test(f)).sort().map((f) => `${TOKEN}/sample/teton/${f}`)
  : Array.from({ length: 30 }, (_, i) => photoUrl(i + 1))

const snapshot = {
  schema: 1,
  note: 'Generated by scripts/daylight/build-sample.mjs from the landing fixtures (read-only) and the Daylight fixtures. Do not edit; rerun.',
  origin: TOKEN,
  sources: { teton: tetonSource, stories: Object.keys(details).length },
  users: Object.fromEntries(Object.entries(USERS).map(([k, u]) => [k, u])),
  following: FOLLOWING_KEYS,
  followers: FOLLOWER_KEYS,
  me,
  list,
  details,
  slugs,
  extras,
  mediaStats,
  profiles,
  routes,
  gazetteer,
  uploads,
  ai: { transcript: api.VOICE_NOTE || '', questions: ['Who came along?', "Anything the photos don't show?", 'What would you do again?'] },
  share: tetonEventId ? { 'tetons-share': tetonEventId } : {},
  missing: { photos: [...new Set([...missing, ...media.MISSING])], note: missing.length ? 'Tetons photos are placeholders until the art lands in the landing manifest or frontend/daylight-public/sample/teton/.' : '' },
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(snapshot))
if (!quiet || missing.length) {
  console.log(`[daylight] sample.json: ${list.length} stories (Tetons: ${tetonSource}), ${Object.keys(routes).length} routes${snapshot.missing.photos.length ? `, ${snapshot.missing.photos.length} photos still placeholders` : ''}`)
}
