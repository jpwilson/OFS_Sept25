// Sample answers for the create flow (owner: CREATE). Asked before the core sample
// (dev/sampleApi.js). Shapes follow the production endpoints; times are slowed to feel real.
//   POST /upload                            ai_creator-free, files only (upload.py:221-305)
//   GET  /geocoding/reverse | /search       the kit's real places (landing-art/kits/tetons/README.md)
//   POST /admin/ai/transcribe | generate-questions | generate-story | cluster-photos
//   GET  /custom-groups/  GET /search/taggable  POST /events/{id}/publish (for stories made here)
// Test controls (sample only, never in production):
//   POST /api/v1/__create/sample {story: 'fail'|'limit'|null, failUploads: [n, ...], fast: bool}
//   GET  /api/v1/__create/sample/reset
// Pure: no browser or Node globals, so a future in-browser shim can use it too.
import { SHOTS, DAYS } from '../../../scripts/daylight/fixtures/teton.placeholder.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The kit's places with the coordinates in landing-art/kits/tetons/README.md and docs/landing/ROUND2.md
const KIT = [
  ['Jackson Town Square', 43.4799, -110.7624, 'Jackson'],
  ['Mormon Row', 43.6608, -110.6653],
  ['Schwabacher Landing', 43.7109, -110.6719],
  ['Jenny Lake', 43.751, -110.7228],
  ['Hidden Falls', 43.7654, -110.7447],
  ['Inspiration Point', 43.7663, -110.743],
  ['Taggart Lake', 43.7069, -110.7541],
  ['Chapel of the Transfiguration', 43.6596, -110.7136, 'Moose'],
  ["Deadman's Bar", 43.7598, -110.6234],
  ['Oxbow Bend', 43.866, -110.549],
  ['Signal Mountain', 43.8504, -110.5713],
  ['Colter Bay', 43.902, -110.6413],
  ['String Lake', 43.787, -110.729],
  ['Teton Village tram', 43.5875, -110.8279, 'Teton Village'],
  ['Snake River Overlook', 43.7536, -110.6234],
]
const distKm = (a, b, c, d) => {
  const R = 6371, r = Math.PI / 180
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function reverse(lat, lng, gaz) {
  let best = null, bd = Infinity
  for (const k of KIT) {
    const d = distKm(lat, lng, k[1], k[2])
    if (d < bd) { bd = d; best = k }
  }
  if (best && bd <= 1.5) {
    const [name, , , town] = best
    const address = { tourism: name, ...(town ? { town } : {}), county: 'Teton County', state: 'Wyoming', country: 'United States' }
    return { name: [name, town, 'Teton County', 'Wyoming', 'United States'].filter(Boolean).join(', '), latitude: lat, longitude: lng, type: 'attraction', place_id: Math.round(best[1] * 1e4), address }
  }
  // elsewhere: the core gazetteer's nearest town, if it is close
  let g = null, gd = Infinity
  for (const x of gaz || []) {
    const d = distKm(lat, lng, x.lat, x.lng)
    if (d < gd) { gd = d; g = x }
  }
  if (g && gd <= 25) return { name: g.name, latitude: lat, longitude: lng, type: 'town', place_id: Math.round(g.lat * 1e4), address: g.address }
  if (lat > 43.3 && lat < 44.2 && lng > -111.1 && lng < -110.3) return { name: 'Teton Park Road, Teton County, Wyoming, United States', latitude: lat, longitude: lng, type: 'road', place_id: 1, address: { road: 'Teton Park Road', county: 'Teton County', state: 'Wyoming', country: 'United States' } }
  return null
}

// ---------------------------------------------------------------- the Tetons write-up (sample words, in Tom's voice)
const TEXT = [
  ['We left Madison before six and rolled into Jackson in the middle of the afternoon. Ivy wanted a photo under the antler arch before we had even found the cabin, so that is where this starts.', 'Leo slept through the last hour of the drive with the mountains filling the window. Dinner was burgers and milkshakes on the square.'],
  ['The alarm went at five. Maya said it would be worth it and she was right: the barn on Mormon Row went pink and then gold, and for twenty minutes nobody else was there.', 'At Schwabacher Landing the peaks sat upside down in the beaver pond. Leo found the dam and would not leave it.'],
  ['We took the shuttle boat across Jenny Lake and walked up to Hidden Falls, which you hear a long time before you see it.', 'Inspiration Point was steeper than the sign suggested. All four of us made it, arms up for the photo, and Leo told everyone on the way down that he had climbed a mountain. Back at the dock he dangled his boots over the water while we finished the snacks.'],
  ['An easy trail through aspens and wildflowers to Taggart Lake, which was flat enough to hold the whole range. Ivy sat on a rock and drew it while we had lunch.', 'On the way back we stopped at the little log chapel in Moose, where the window frames the Grand Teton.'],
  ["Our guide rowed us down the Snake from Deadman's Bar. A bald eagle watched us go by, and Ivy trailed her hand in the water most of the way.", 'In the evening at Oxbow Bend a bull moose walked out into the shallows. We stood very still and watched him for twenty minutes.'],
  ['From the top of Signal Mountain you can see the valley, the lake and the whole range at once.', 'We rented a red canoe at Colter Bay. Leo caught a very small fish and gave it a name before letting it go. Marshmallows by the cabin to finish.'],
  ['Last day. The kids waded in String Lake, which is shallow and very cold, and I jumped off a rock to prove a point.', 'The tram at Teton Village took us up to waffles on the mountaintop deck. On the drive back we pulled in at the Snake River Overlook for one more look at the range.'],
]
const VOICE_EXTRA = [
  'Leo started asking about bears before we reached Wyoming and kept it up, about every ten minutes, for a week.',
  null,
  null,
  'By the end of the week Ivy had drawn every lake we saw.',
  'Nobody said a word, not even Leo.',
  'If I had to pick one day of the seven, it was this one.',
  null,
]
export const TRANSCRIPT = "Okay, the Tetons. Seven days, the four of us and far too many snacks. The thing I'll remember is the moose at Oxbow Bend. We just stood there and nobody said a word, not even Leo. Ivy drew every lake we saw in her sketchbook. Leo asked about bears about every ten minutes. Best day was probably the canoe at Colter Bay."
const QUESTIONS = ['What made you pick the Tetons this year?', 'Who spotted the moose first at Oxbow Bend?', 'What did Ivy draw at Taggart Lake?']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const shotFor = (ts) => {
  if (!ts) return null
  const day = Number(ts.slice(8, 10)) - 13
  return SHOTS.find((x) => x[1] === day && x[2] === ts.slice(11, 16)) || null
}

function tetonsStory(photos, userText) {
  const voice = /voice note/.test(userText || '')
  const byDay = new Map()
  for (const p of photos) {
    const d = p.timestamp ? Number(p.timestamp.slice(8, 10)) - 14 : 6
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d).push(p)
  }
  const parts = []
  for (let d = 0; d < 7; d++) {
    const ph = byDay.get(d) || []
    parts.push(`<h1>${esc(DAYS[d].replace(/^Day \d+: /, ''))}</h1>`)
    const [a, b] = TEXT[d]
    parts.push(`<p>${esc(a)}${voice && VOICE_EXTRA[d] && d < 1 ? ' ' + esc(VOICE_EXTRA[d]) : ''}</p>`)
    const half = Math.ceil(ph.length / 2)
    ph.slice(0, half).forEach((p) => parts.push(`<img src="${p.image_url}">`))
    parts.push(`<p>${esc(b)}${voice && VOICE_EXTRA[d] && d >= 1 ? ' ' + esc(VOICE_EXTRA[d]) : ''}</p>`)
    ph.slice(half).forEach((p) => parts.push(`<img src="${p.image_url}">`))
  }
  return {
    suggested_title: 'Seven days in the Tetons',
    story_html: parts.join(''),
    photo_captions: photos.map((p) => ({ image_url: p.image_url, caption: shotFor(p.timestamp)?.[5] || '' })).filter((c) => c.caption),
    suggested_category: 'Vacation',
    location_name: 'Grand Teton National Park, Wyoming',
    original_text: userText || '',
  }
}

function plainStory(photos, userText) {
  const days = new Map()
  for (const p of photos) {
    const k = p.timestamp ? p.timestamp.slice(0, 10) : 'later'
    if (!days.has(k)) days.set(k, [])
    days.get(k).push(p)
  }
  const parts = []
  let i = 0
  for (const [, ph] of days) {
    i++
    if (days.size > 1) parts.push(`<h1>Day ${i}</h1>`)
    parts.push(`<p>${i === 1 ? 'A sample write-up: the real one is written from what is in the photos.' : 'More from the same trip.'}</p>`)
    ph.forEach((p) => parts.push(`<img src="${p.image_url}">`))
  }
  return { suggested_title: days.size > 1 ? `${days.size} days away` : 'A good day', story_html: parts.join(''), photo_captions: [], suggested_category: 'Daily Life', location_name: null, original_text: userText || '' }
}

// ---------------------------------------------------------------- Smart Import's clusterer, ported for the sample
// backend/app/utils/photo_clustering.py, stages 0 to 6, constants verbatim.
const C = { MIN_GAP_S: 2700, MAX_GAP_S: 28800, K: Math.log(17), D: 10, CLAMP: 60, VENUE_M: 5000, NOISE_M: 500, INHERIT_S: 1800, PIVOT_H: 4, HOME_M: 50000, CELL: 0.5, TRIP_GAP_S: 144000, CHAIN_M: 200000, MIN_ALBUM: 5, TINY_GAP_S: 10800, BURST_S: 2 }
const parseTs = (v) => {
  if (!v) return null
  let s = String(v).trim()
  if (s.length >= 19 && s[4] === ':' && s[7] === ':') s = s.slice(0, 10).replace(/:/g, '-') + s.slice(10)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):?(\d{2})?/)
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000 : null
}
const iso = (t) => new Date(t * 1000).toISOString().slice(0, 19)
const pdate = (t) => new Date((t - C.PIVOT_H * 3600) * 1000).toISOString().slice(0, 10)
const hav = (a, b) => distKm(a.lat, a.lon, b.lat, b.lon) * 1000
const median = (v) => {
  const s = [...v].sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function pickCover(seg) {
  const hours = new Map()
  let last = null
  for (const p of seg) {
    if (last != null && p.ts - last <= C.BURST_S) { last = p.ts; continue }
    const k = Math.floor(p.ts / 3600)
    hours.set(k, (hours.get(k) || 0) + 1)
    last = p.ts
  }
  let peak = null, pc = -1
  for (const [k, c] of hours) if (c > pc) { pc = c; peak = k }
  const px = seg.map((p) => p.w * p.h).sort((a, b) => a - b)
  const med = px[px.length >> 1] || 0
  const span = seg[seg.length - 1].ts - seg[0].ts || 1, edge = 0.05 * span
  let best = seg[0], bs = -1
  for (const p of seg) {
    let s = 0
    if (p.w > p.h) s += 2
    if (Math.floor(p.ts / 3600) === peak) s += 2
    if (p.w * p.h >= med) s += 1
    const off = p.ts - seg[0].ts
    if (off > edge && off < span - edge) s += 1
    if (s > bs) { bs = s; best = p }
  }
  return best.id
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function titleHint(seg, isTrip) {
  const dates = [...new Set(seg.map((p) => pdate(p.ts)))].sort()
  const days = dates.length
  const gps = seg.some((p) => p.lat != null)
  if (isTrip || days > 1) {
    const weekend = dates.some((d) => [0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay()))
    if (days === 1) return gps ? 'Day trip to {place}' : 'A day out'
    if (days <= 3 && weekend) return gps ? 'Weekend in {place}' : 'A weekend away'
    return gps ? `${days} days in {place}` : `${days} days together`
  }
  const h = new Date(seg[0].ts * 1000).getUTCHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `${WEEKDAYS[new Date(seg[0].ts * 1000).getUTCDay()]} ${part}` + (gps ? ' in {place}' : '')
}
function payload(seg, confidence = 'medium', isTrip = false) {
  const dates = [...new Set(seg.map((p) => pdate(p.ts)))].sort()
  const lats = seg.filter((p) => p.lat != null).map((p) => p.lat), lons = seg.filter((p) => p.lon != null).map((p) => p.lon)
  const real = seg.filter((p) => p.lat != null && !p.inferred).length
  return {
    photo_ids: seg.map((p) => p.id), photo_count: seg.length, start_ts: iso(seg[0].ts), end_ts: iso(seg[seg.length - 1].ts), days: dates.length,
    chapters: dates.map((d) => ({ date: d, photo_ids: seg.filter((p) => pdate(p.ts) === d).map((p) => p.id) })),
    centroid: lats.length ? { latitude: median(lats), longitude: median(lons) } : null,
    geo_frac: Math.round((real / seg.length) * 100) / 100, confidence, is_trip: isTrip, title_hint: titleHint(seg, isTrip), cover_photo_id: pickCover(seg),
  }
}
export function clusterPhotos(photos) {
  const unsorted = []
  const ps = []
  for (const ph of photos) {
    const ts = parseTs(ph.timestamp)
    if (ts == null) { unsorted.push(ph.id); continue }
    const ok = ph.latitude != null && ph.longitude != null
    ps.push({ id: ph.id, ts, lat: ok ? ph.latitude : null, lon: ok ? ph.longitude : null, w: ph.width || 0, h: ph.height || 0, inferred: false })
  }
  if (!ps.length) return { albums: [], unsorted_photo_ids: unsorted }
  ps.sort((a, b) => a.ts - b.ts || a.id - b.id)
  if (ps.length === 1) return { albums: [payload(ps, 'low')], unsorted_photo_ids: unsorted }
  const located = ps.filter((p) => p.lat != null)
  if (located.length) {
    for (const p of ps) {
      if (p.lat != null) continue
      const n = located.reduce((a, b) => (Math.abs(b.ts - p.ts) < Math.abs(a.ts - p.ts) ? b : a))
      if (Math.abs(n.ts - p.ts) <= C.INHERIT_S) { p.lat = n.lat; p.lon = n.lon; p.inferred = true }
    }
  }
  const n = ps.length
  const gaps = [], logs = []
  for (let i = 0; i < n - 1; i++) { const g = Math.max(ps[i + 1].ts - ps[i].ts, C.CLAMP); gaps.push(g); logs.push(Math.log(g)) }
  const bounds = []
  for (let i = 0; i < n - 1; i++) {
    const g = gaps[i]
    if (g < C.MIN_GAP_S) continue
    if (g > C.MAX_GAP_S) { bounds.push(i); continue }
    const lo = Math.max(0, i - C.D), hi = Math.min(n - 2, i + C.D)
    const mean = logs.slice(lo, hi + 1).reduce((a, b) => a + b, 0) / (hi - lo + 1)
    const a = ps[i], b = ps[i + 1]
    const moved = a.lat != null && b.lat != null && hav(a, b) > Math.max(C.VENUE_M, C.NOISE_M)
    if (logs[i] >= C.K + mean || moved) bounds.push(i)
  }
  const segs = []
  let st = 0
  for (const b of bounds) { segs.push(ps.slice(st, b + 1)); st = b + 1 }
  segs.push(ps.slice(st))
  const feats = segs.map((sg) => {
    const la = sg.filter((p) => p.lat != null && !p.inferred).map((p) => p.lat), lo = sg.filter((p) => p.lon != null && !p.inferred).map((p) => p.lon)
    return { c: la.length ? { lat: median(la), lon: median(lo) } : null, dates: new Set(sg.map((p) => pdate(p.ts))), zone: 'unknown' }
  })
  let home = null
  if (feats.length >= 2) {
    const cells = new Map()
    for (const f of feats) {
      if (!f.c) continue
      const k = `${Math.round(f.c.lat / C.CELL)},${Math.round(f.c.lon / C.CELL)}`
      const cell = cells.get(k) || { dates: new Set(), cs: [] }
      f.dates.forEach((d) => cell.dates.add(d))
      cell.cs.push(f.c)
      cells.set(k, cell)
    }
    if (cells.size >= 2) {
      const best = [...cells.values()].sort((a, b) => b.dates.size - a.dates.size || b.cs.length - a.cs.length)[0]
      home = { lat: median(best.cs.map((c) => c.lat)), lon: median(best.cs.map((c) => c.lon)) }
    }
  }
  for (const f of feats) f.zone = !f.c ? 'unknown' : home && hav(f.c, home) > C.HOME_M ? 'away' : 'home'
  let merged = []
  for (let i = 0; i < segs.length;) {
    if (feats[i].zone !== 'away') { merged.push([segs[i], false]); i++; continue }
    let trip = [...segs[i]], tc = feats[i].c, isTrip = false, j = i + 1
    while (j < segs.length) {
      const gap = segs[j][0].ts - trip[trip.length - 1].ts
      if (gap > C.TRIP_GAP_S) break
      if (feats[j].zone === 'away') {
        if (tc && feats[j].c && hav(tc, feats[j].c) > C.CHAIN_M) break
        trip.push(...segs[j]); tc = feats[j].c || tc; isTrip = true; j++
      } else if (feats[j].zone === 'unknown' && gap <= 86400 && j + 1 < segs.length && feats[j + 1].zone === 'away' && segs[j + 1][0].ts - segs[j][segs[j].length - 1].ts <= 86400) {
        trip.push(...segs[j], ...segs[j + 1]); tc = feats[j + 1].c || tc; isTrip = true; j += 2
      } else break
    }
    merged.push([trip, isTrip])
    i = j > i + 1 ? j : i + 1
  }
  for (let changed = true; changed;) {
    changed = false
    const order = merged.map((_, k) => k).sort((a, b) => merged[a][0].length - merged[b][0].length)
    for (const k of order) {
      const [sg] = merged[k]
      if (sg.length >= C.MIN_ALBUM) continue
      const cands = []
      if (k > 0) { const g = sg[0].ts - merged[k - 1][0].at(-1).ts; if (g <= C.TINY_GAP_S) cands.push([g, k - 1]) }
      if (k < merged.length - 1) { const g = merged[k + 1][0][0].ts - sg.at(-1).ts; if (g <= C.TINY_GAP_S) cands.push([g, k + 1]) }
      if (cands.length) {
        const [, idx] = cands.sort((a, b) => a[0] - b[0])[0]
        merged[idx] = [[...merged[idx][0], ...sg].sort((a, b) => a.ts - b.ts || a.id - b.id), merged[idx][1]]
        merged.splice(k, 1)
        changed = true
        break
      }
      if (sg.length <= 2 && merged.length > 1) { unsorted.push(...sg.map((p) => p.id)); merged.splice(k, 1); changed = true; break }
    }
  }
  const albums = merged.map(([sg, t]) => payload(sg, sg.length < C.MIN_ALBUM ? 'low' : sg.length >= 8 ? 'high' : 'medium', t))
  albums.sort((a, b) => a.start_ts.localeCompare(b.start_ts))
  return { albums, unsorted_photo_ids: unsorted }
}

// ---------------------------------------------------------------- answers
export async function answer(req, state, { ok, err }) {
  const { method: m, path: p, query: q = {}, body } = req
  const db = state.db
  const cs = (state.create ||= { story: null, failUploads: [], fast: false, uploads: 0 })
  const wait = (ms) => (cs.fast ? Promise.resolve() : sleep(ms))
  let r

  if (p === '/__create/sample/reset') { state.create = { story: null, failUploads: [], fast: false, uploads: 0 }; state.uploaded = []; return ok({ ok: true }) }
  if (m === 'POST' && p === '/__create/sample') { Object.assign(cs, body || {}); return ok(cs) }

  if (m === 'POST' && p === '/upload') {
    const n = cs.uploads++
    await wait(280 + ((n * 137) % 520))
    if (cs.failUploads.includes(n)) return err(500, 'Error uploading image to storage: connection reset')
    return undefined // the core hands out the sample files in order
  }
  if (m === 'GET' && p === '/geocoding/reverse') {
    await wait(220)
    const res = reverse(Number(q.latitude), Number(q.longitude), db.gazetteer)
    return res ? ok(res) : err(404, 'No location found for these coordinates')
  }
  if (m === 'GET' && p === '/geocoding/search') {
    const term = String(q.query || '').toLowerCase()
    if (term.length < 2) return err(400, 'Query must be at least 2 characters')
    await wait(300)
    const hits = [
      ...KIT.map(([name, lat, lng, town]) => ({ name: [name, town, 'Teton County', 'Wyoming', 'United States'].filter(Boolean).join(', '), latitude: lat, longitude: lng, type: 'attraction' })),
      { name: 'Grand Teton National Park, Teton County, Wyoming, United States', latitude: 43.79, longitude: -110.68, type: 'national_park' },
      ...(db.gazetteer || []).map((g) => ({ name: g.name, latitude: g.lat, longitude: g.lng, type: 'town' })),
    ].filter((h) => h.name.toLowerCase().includes(term))
    return ok(hits.filter((h, i, a) => a.findIndex((x) => x.name === h.name) === i).slice(0, Number(q.limit || 5)))
  }

  if (p.startsWith('/admin/ai/') && m === 'POST' && p !== '/admin/ai/cluster-photos') {
    if (cs.story === 'limit') { await wait(400); return err(429, 'Daily AI limit reached (5/day). Try again tomorrow.') }
  }
  if (m === 'POST' && p === '/admin/ai/transcribe') {
    await wait(1600)
    return ok({ text: TRANSCRIPT })
  }
  if (m === 'POST' && p === '/admin/ai/generate-questions') {
    await wait(1500)
    return ok({ questions: QUESTIONS, context_summary: 'A week of mountains, lakes and a moose.' })
  }
  if (m === 'POST' && p === '/admin/ai/generate-story') {
    await wait(3200)
    if (cs.story === 'fail') return err(500, 'Story generation failed: upstream request timeout')
    const photos = body?.photos || []
    const kit = photos.length && photos.every((x) => shotFor(x.timestamp)) && photos.some((x) => (x.timestamp || '').startsWith('2026-06-1'))
    return ok(kit ? tetonsStory(photos, body?.user_text) : plainStory(photos, body?.user_text))
  }
  if (m === 'POST' && p === '/admin/ai/cluster-photos') {
    await wait(500)
    return ok(clusterPhotos(body?.photos || []))
  }

  if (m === 'GET' && p === '/custom-groups/') return ok(db.routes['GET /custom-groups'] || [])
  if (m === 'GET' && p === '/search/taggable') {
    const term = String(q.q || '').toLowerCase()
    const users = Object.values(db.users).filter((u) => u.username !== state.viewer && (u.username.includes(term) || u.full_name.toLowerCase().includes(term)))
      .map((u) => ({ type: 'user', id: u.id, name: u.username, display_name: u.full_name, photo_url: u.avatar_url, username: u.username }))
    const profiles = (db.routes['GET /tag-profiles/mine'] || []).filter((t) => t.name.toLowerCase().includes(term))
      .map((t) => ({ type: 'profile', id: t.id, name: t.name, display_name: null, photo_url: t.photo_url, relationship_to_creator: t.relationship_to_creator, created_by_username: t.created_by_username }))
    return ok([...profiles, ...users].slice(0, 10))
  }
  if (m === 'POST' && (r = p.match(/^\/events\/(\d+)\/publish$/)) && Number(r[1]) >= 900) {
    const d = db.details[r[1]]
    if (!d) return err(404, 'Event not found')
    if (!d.is_published) {
      d.is_published = true
      db.list.unshift({ ...d, description: '', short_title: null, category_2: null, like_count: 0, comment_count: 0, locations: [], event_images: [] })
    }
    return ok({ message: 'Event published successfully' })
  }
  return undefined
}
