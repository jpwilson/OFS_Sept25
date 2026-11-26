// The instant draft, built on the device with no network (owner: CREATE).
// PLAN-DAYLIGHT 4.2 step 1, with the stop rule tuned on the Tetons kit (see groupStops).
//
//   buildDraft(files, {metaOf, onProgress}) -> Promise<Draft>
//   draftToEvent(draft, {author, html, captions, settings}) -> an object shaped like
//       GET /events/{id}, so the preview renders through StoryView, parseStory and
//       buildJourney exactly like a published story
//   draftHtml(draft, {lead, urlOf}) -> the photo story: one <h1> per day, a location
//       marker before each stop's first photo, every photo in time order
//   markerSpan({name, lat, lng, ts})   exifTime("2026:06:14 10:30:00")   readMeta(file)
//   workingTitle(draft, area)   dayTitle(draft, day)   photoToken(id)   resolvePhotos(html, urlOf)
//
// Draft: {photos, stops, days, start, end, title, place, cover, centroid, skipped}
//   photo: {id, file, name, url, ts, lat, lng, w, h, hasGps, heic}   ts naive local "YYYY-MM-DDTHH:MM:SS"
//   stop:  {id, n, lat, lng, ts, photoIds, name, area}               name null until geocoded
//   day:   {index, n, date, label, stopIds, photoIds}                n: calendar day of the trip (1-based)
//   skipped: files that are not photos (clips, documents), by name
import ExifReader from 'exifreader'
import { centroid, isLatLng, km, tripDay } from '../lib/geo.js'
import { parseBackendDate, dayLabel } from '../lib/format.js'

const HEAD_BYTES = 256 * 1024 // EXIF sits in the first segment of a JPEG; HEIC may need the whole file
const MAX_META_BYTES = 40 * 1024 * 1024
// A photo joins the current stop when it is on the same trip day and close to the stop's centre,
// or a little further but taken soon after the previous photo (a short walk). Tuned so the kit's
// Hidden Falls and Inspiration Point (167m apart, 50 minutes) stay two stops, and its 15-60m
// jitter at one stop never splits it.
const STOP_KM = 0.15
const WALK_KM = 0.4
const WALK_MINUTES = 20
const MAX_STOPS = 20 // the server refuses more location markers (events.py:334-341)
const GPS_INHERIT_MIN = 30 // a photo with no GPS borrows the nearest located photo within 30 minutes (photo_clustering.py:33)

/** EXIF "2026:06:14 10:30:00" -> "2026-06-14T10:30:00" (local wall time, as the camera saw it). */
export function exifTime(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m || m[1] === '0000') return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}`
}

const isHeic = (f) => /\.(heic|heif)$/i.test(f.name || '') || /heic|heif/i.test(f.type || '')
const isPhotoFile = (f) => /^image\//.test(f.type || '') || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(f.name || '')

function tagsToMeta(tags) {
  const exif = tags.exif || {}
  const gps = tags.gps || {}
  const w = Number(exif.PixelXDimension?.value || tags.file?.['Image Width']?.value || 0) || 0
  const h = Number(exif.PixelYDimension?.value || tags.file?.['Image Height']?.value || 0) || 0
  const orient = Number(tags.exif?.Orientation?.value || 1)
  const swap = orient >= 5 && orient <= 8
  return {
    ts: exifTime(exif.DateTimeOriginal?.description || exif.DateTimeDigitized?.description || exif.DateTime?.description),
    lat: gps.Latitude ?? null,
    lng: gps.Longitude ?? null,
    w: swap ? h : w,
    h: swap ? w : h,
    camera: Boolean(exif.Make || exif.Model),
  }
}

/** Time, place and size of one photo, read on the device. Never throws. */
export async function readMeta(file) {
  const empty = { ts: null, lat: null, lng: null, w: 0, h: 0, camera: false }
  if (!file || file.size > MAX_META_BYTES) return empty
  try {
    const head = await file.slice(0, HEAD_BYTES).arrayBuffer()
    const meta = tagsToMeta(ExifReader.load(head, { expanded: true }))
    if (meta.ts || file.size <= HEAD_BYTES) return meta
  } catch {
    // fall through to the whole file (HEIC keeps its EXIF further in)
  }
  try {
    return tagsToMeta(ExifReader.load(await file.arrayBuffer(), { expanded: true }))
  } catch {
    return empty
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++
      out[k] = await fn(items[k], k)
    }
  }))
  return out
}

const ms = (ts) => parseBackendDate(ts)?.getTime() ?? null

/**
 * Located photos in time order -> stops. See the constants above for the rule. Then the
 * closest consecutive pair is merged until there are at most MAX_STOPS.
 */
export function groupStops(photos) {
  const located = photos.filter((p) => p.hasGps).sort((a, b) => (ms(a.ts) ?? 0) - (ms(b.ts) ?? 0))
  const groups = []
  for (const p of located) {
    const g = groups[groups.length - 1]
    if (g) {
      const c = centroid(g.pts)
      const sameDay = tripDay(p.ts) === tripDay(g.pts[0].ts)
      const d = km(c, p)
      const gap = ms(p.ts) != null && ms(g.last.ts) != null ? (ms(p.ts) - ms(g.last.ts)) / 60000 : Infinity
      if (sameDay && (d <= STOP_KM || (d <= WALK_KM && gap <= WALK_MINUTES))) {
        g.pts.push(p)
        g.last = p
        continue
      }
    }
    groups.push({ pts: [p], last: p })
  }
  while (groups.length > MAX_STOPS) {
    let best = 0, bd = Infinity
    for (let i = 0; i < groups.length - 1; i++) {
      const d = km(centroid(groups[i].pts), centroid(groups[i + 1].pts))
      if (d < bd) { bd = d; best = i }
    }
    const [a, b] = groups.splice(best, 2)
    groups.splice(best, 0, { pts: [...a.pts, ...b.pts], last: b.last })
  }
  return groups.map((g, i) => {
    const c = centroid(g.pts)
    return { id: `s${i + 1}`, n: i + 1, lat: c.lat, lng: c.lng, ts: g.pts[0].ts, photoIds: g.pts.map((p) => p.id), name: null, area: null }
  })
}

/** The stop a photo belongs to: its own, or (no GPS) the stop of the nearest located photo within 30 minutes. */
function stopOfPhotoIn(stops, photos, photo) {
  const own = stops.find((s) => s.photoIds.includes(photo.id))
  if (own || photo.hasGps || ms(photo.ts) == null) return own || null
  let best = null, bd = Infinity
  for (const p of photos) {
    if (!p.hasGps || ms(p.ts) == null) continue
    const d = Math.abs(ms(p.ts) - ms(photo.ts))
    if (d < bd) { bd = d; best = p }
  }
  return best && bd <= GPS_INHERIT_MIN * 60000 ? stops.find((s) => s.photoIds.includes(best.id)) || null : null
}

/** The server's cover rule (photo_clustering.py:353-386): landscape, the busiest hour, full size, not at the very start or end. */
export function pickCover(photos) {
  const timed = photos.filter((p) => ms(p.ts) != null)
  if (!timed.length) return photos.find((p) => p.w >= p.h)?.id || photos[0]?.id || null
  const hours = new Map()
  let last = null
  for (const p of timed) {
    const t = ms(p.ts)
    if (last != null && t - last <= 2000) { last = t; continue }
    const k = p.ts.slice(0, 13)
    hours.set(k, (hours.get(k) || 0) + 1)
    last = t
  }
  let peak = null, pc = -1
  for (const [k, c] of hours) if (c > pc) { pc = c; peak = k }
  const px = timed.map((p) => (p.w || 0) * (p.h || 0)).sort((a, b) => a - b)
  const median = px[Math.floor(px.length / 2)] || 0
  const t0 = ms(timed[0].ts), span = ms(timed[timed.length - 1].ts) - t0 || 1, edge = 0.05 * span
  let best = timed[0], bs = -1
  for (const p of timed) {
    let sc = 0
    if (p.w > p.h) sc += 2
    if (peak && p.ts.slice(0, 13) === peak) sc += 2
    if ((p.w || 0) * (p.h || 0) >= median) sc += 1
    const off = ms(p.ts) - t0
    if (off > edge && off < span - edge) sc += 1
    if (sc > bs) { bs = sc; best = p }
  }
  return best.id
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** A working title in the spirit of the server's templates (photo_clustering.py:389-403). */
export function workingTitle(draft, area) {
  const n = draft.days.length ? draft.days[draft.days.length - 1].n : 0
  const s = parseBackendDate(draft.start)
  if (!n || !s) return area ? `A story from ${area}` : 'A new story'
  if (n === 1) {
    if (area) return `A day in ${area}`
    const part = s.getHours() < 12 ? 'morning' : s.getHours() < 17 ? 'afternoon' : 'evening'
    return `${dayLabel(s).split(',')[0]} ${part}`
  }
  const dates = draft.days.map((d) => parseBackendDate(d.date))
  const weekend = n <= 3 && dates.some((d) => d && (d.getDay() === 0 || d.getDay() === 6))
  if (weekend) return area ? `A weekend in ${area}` : 'A weekend away'
  const count = cap(WORDS[n] || String(n))
  return area ? `${count} days in ${area}` : `${count} days in ${MONTHS[s.getMonth()]}`
}

const stopName = (s) => s.name || `Stop ${s.n}`

/** "Day 3: Jenny Lake, Hidden Falls and Inspiration Point" once places are named, else "Day 3 · Tuesday, June 16". */
export function dayTitle(draft, day) {
  const names = [...new Set(day.stopIds.map((id) => draft.stops.find((s) => s.id === id)).filter((s) => s?.name).map((s) => s.name))]
  const head = `Day ${day.n}`
  if (!names.length) return day.date ? `${head} · ${dayLabel(day.date)}` : head
  const list = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${head}: ${list.length <= 48 ? list : `${names[0]} and ${names[1]}`}`
}

export async function buildDraft(files, { metaOf, onProgress } = {}) {
  const all = [...files]
  const list = all.filter(isPhotoFile)
  const skipped = all.filter((f) => !isPhotoFile(f)).map((f) => f.name)
  let done = 0
  const photos = await pool(list, 8, async (file, i) => {
    const meta = (metaOf && metaOf(file)) || (await readMeta(file))
    onProgress?.(++done, list.length)
    const hasGps = isLatLng(meta.lat, meta.lng)
    return {
      id: `p${i + 1}`, file, name: file.name, url: isHeic(file) ? null : URL.createObjectURL(file), ts: meta.ts,
      lat: hasGps ? +meta.lat : null, lng: hasGps ? +meta.lng : null, w: meta.w || null, h: meta.h || null, hasGps, heic: isHeic(file),
    }
  })
  // time order; photos with no time keep their picked order, after the rest
  photos.sort((a, b) => (ms(a.ts) ?? Infinity) - (ms(b.ts) ?? Infinity))
  photos.forEach((p, i) => { p.id = `p${i + 1}` })
  const stops = groupStops(photos)
  const timed = photos.filter((p) => ms(p.ts) != null)
  const start = timed[0]?.ts || null
  const end = timed[timed.length - 1]?.ts || start
  const dayKeys = [...new Set(timed.map((p) => tripDay(p.ts)))]
  const d0 = dayKeys[0] ? parseBackendDate(dayKeys[0]) : null
  const days = dayKeys.map((date, index) => ({
    index, date,
    n: d0 ? Math.round((parseBackendDate(date) - d0) / 86400000) + 1 : index + 1,
    label: '',
    photoIds: timed.filter((p) => tripDay(p.ts) === date).map((p) => p.id),
    stopIds: stops.filter((s) => tripDay(s.ts) === date).map((s) => s.id),
  }))
  const untimed = photos.filter((p) => ms(p.ts) == null).map((p) => p.id)
  const draft = {
    photos, stops, days, untimed, start, end, skipped,
    cover: pickCover(photos),
    place: null,
    centroid: centroid(stops),
    title: null,
  }
  for (const d of draft.days) d.label = dayTitle(draft, d)
  draft.title = workingTitle(draft, null)
  return draft
}

/** Re-derives the labels after stops are named (stops are replaced, never mutated). */
export function withStops(draft, stops, area) {
  const next = { ...draft, stops, place: area?.label ?? draft.place }
  next.days = draft.days.map((d) => ({ ...d, label: dayTitle(next, d) }))
  next.title = workingTitle(next, area?.short ?? null)
  return next
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export { esc }

/** The marker span the editor and the server understand (extensions/LocationMarker.js; events.py:361-380). */
export function markerSpan({ name, lat, lng, ts }) {
  return `<span data-location-marker="" data-location-name="${esc(name)}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${esc(ts || '')}" data-place-id="" class="location-marker">📍 ${esc(name)}</span>`
}
export const markerFor = (s) => `<p>${markerSpan({ name: stopName(s), lat: s.lat.toFixed(6), lng: s.lng.toFixed(6), ts: s.ts })}</p>`

/** The src a photo carries inside the draft's own HTML, replaced by resolvePhotos before anyone sees it. */
export const photoToken = (id) => `ofs-photo:${id}`
const TOKEN_RE = /ofs-photo:(p\d+)/g
/** Swaps photo tokens for real URLs (local previews, or uploaded URLs at Publish). Unknown ids drop their <img>. */
export function resolvePhotos(html, urlOf) {
  return html
    .replace(/<p><img src="ofs-photo:(p\d+)"[^>]*><\/p>/g, (m, id) => (urlOf(id) ? m : ''))
    .replace(TOKEN_RE, (m, id) => esc(urlOf(id) || ''))
}

/** Day chapters, a marker before each stop's first photo, every photo in time order. Photos are tokens. */
export function draftHtml(draft, { lead = '' } = {}) {
  const parts = []
  if (lead) parts.push(lead)
  const placed = new Set()
  const markerBefore = new Map()
  for (const s of draft.stops) markerBefore.set(s.photoIds[0], s)
  const photo = (id) => `<p><img src="${photoToken(id)}" alt=""></p>`
  const days = draft.days.length ? draft.days : []
  for (const d of days) {
    parts.push(`<h1>${esc(d.label || dayTitle(draft, d))}</h1>`)
    for (const id of d.photoIds) {
      const s = markerBefore.get(id)
      if (s) parts.push(markerFor(s))
      parts.push(photo(id))
      placed.add(id)
    }
  }
  const rest = draft.photos.filter((p) => !placed.has(p.id))
  if (rest.length) {
    parts.push(`<h1>${days.length ? 'More photos' : 'The photos'}</h1>`)
    for (const p of rest) parts.push(photo(p.id))
  }
  return parts.join('')
}

export { stopOfPhotoIn }

/** A local object shaped like GET /events/{id}. html is token HTML (draftHtml or the finished write-up). */
export function draftToEvent(draft, { author, html, captions = {}, settings = {}, urlOf } = {}) {
  const src = urlOf || ((id) => draft.photos.find((p) => p.id === id)?.url || null)
  const body = resolvePhotos(html ?? draftHtml(draft), src)
  const coverId = settings.cover || draft.cover
  return {
    id: 0, slug: null, title: settings.title || draft.title, short_title: null, summary: null,
    description: body, start_date: settings.start || draft.start, end_date: settings.end || draft.end,
    location_name: settings.place ?? draft.place, latitude: draft.centroid?.lat ?? null, longitude: draft.centroid?.lng ?? null,
    cover_image_url: src(coverId) || null, has_multiple_locations: draft.stops.length > 1,
    author_id: author?.id ?? 0, author_username: author?.username || '', author_full_name: author?.full_name || author?.display_name || '',
    privacy_level: settings.audience || 'followers', category: settings.category || null, category_2: null, custom_group_id: null,
    view_count: 0, like_count: 0, comment_count: 0, is_published: false,
    locations: [],
    event_images: draft.photos
      .filter((p) => src(p.id))
      .map((p, i) => ({ id: i + 1, event_id: 0, image_url: src(p.id), caption: captions[p.id] || '', latitude: p.lat, longitude: p.lng, timestamp: p.ts, order_index: i, width: p.w, height: p.h, media_type: 'image' })),
  }
}

// ---------------------------------------------------------------- the preview
/** {event, parsed, journey} for StoryView and JourneyMap, from local photos. parseStory and buildJourney are passed in (browser-only modules). */
export function previewStory(draft, { author, html, captions, settings, urlOf, parseStory, buildJourney }) {
  const event = draftToEvent(draft, { author, html, captions, settings, urlOf })
  // the photos are still blob: URLs on this device; parseStory's localMedia keeps them through sanitising
  const parsed = parseStory(event.description, event.event_images, { localMedia: true })
  return { event, parsed, journey: buildJourney(event, parsed) }
}
