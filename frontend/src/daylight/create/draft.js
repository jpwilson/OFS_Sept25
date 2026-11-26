// The instant draft, built on the device (stub by F0; CREATE owns and extends this file).
// PLAN-DAYLIGHT 4.2 step 1. No network.
//
//   buildDraft(files) -> Promise<Draft>
//   draftToEvent(draft) -> an object shaped like GET /events/{id}, so the preview renders
//                          through StoryView, parseStory and buildJourney like a real story
//
// Draft: {photos, stops, days, start, end, title, place, cover, centroid}
//   photo: {id, file, name, url, ts, lat, lng, w, h, hasGps}   ts naive local "YYYY-MM-DDTHH:MM:SS"
//   stop:  {id, lat, lng, ts, photoIds, name}                   name null until geocoded
//   day:   {index, date, label, stopIds, photoIds}
import { extractImportMetadata } from '../../utils/exifExtractor.js'
import { clusterStops, centroid, tripDay, isLatLng } from '../lib/geo.js'
import { parseBackendDate, daySpan } from '../lib/format.js'

/** EXIF "2026:06:14 10:30:00" -> "2026-06-14T10:30:00" (local wall time, as the camera saw it). */
export function exifTime(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}` : null
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

export async function buildDraft(files) {
  const list = [...files].filter((f) => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))
  const photos = await pool(list, 8, async (file, i) => {
    const meta = await extractImportMetadata(file)
    const ts = exifTime(meta.timestamp)
    const hasGps = isLatLng(meta.latitude, meta.longitude)
    return {
      id: `p${i + 1}`, file, name: file.name, url: URL.createObjectURL(file), ts,
      lat: hasGps ? meta.latitude : null, lng: hasGps ? meta.longitude : null,
      w: meta.width || null, h: meta.height || null, hasGps,
    }
  })
  photos.sort((a, b) => (parseBackendDate(a.ts) || 0) - (parseBackendDate(b.ts) || 0))
  const stops = clusterStops(photos.filter((p) => p.hasGps), { radiusKm: 0.5, minutes: 90, max: 20 }).map((c, i) => ({
    id: `s${i + 1}`, lat: c.lat, lng: c.lng, ts: c.ts, photoIds: c.ids, name: null,
  }))
  const dayKeys = [...new Set(photos.map((p) => tripDay(p.ts)).filter(Boolean))]
  const days = dayKeys.map((date, index) => ({
    index, date, label: `Day ${index + 1}`,
    photoIds: photos.filter((p) => tripDay(p.ts) === date).map((p) => p.id),
    stopIds: stops.filter((s) => tripDay(s.ts) === date).map((s) => s.id),
  }))
  const timed = photos.filter((p) => p.ts)
  const start = timed[0]?.ts || null
  const end = timed[timed.length - 1]?.ts || start
  const land = photos.filter((p) => p.w && p.h && p.w >= p.h)
  const cover = (land[Math.floor(land.length / 2)] || photos[Math.floor(photos.length / 2)])?.id || null
  const n = start ? daySpan(start, end) : 0
  return {
    photos, stops, days, start, end, cover,
    place: null,
    centroid: centroid(stops),
    title: n > 1 ? `${n} days away` : n === 1 ? 'A day out' : 'New story',
  }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
/** The marker span the editor and the server understand (extensions/LocationMarker.js; events.py:361-380). */
export function markerSpan({ name, lat, lng, ts }) {
  return `<span data-location-marker="" data-location-name="${esc(name)}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${esc(ts || '')}" data-place-id="" class="location-marker">📍 ${esc(name)}</span>`
}

/** Day chapters, a marker before each stop's first photo, every photo in time order. */
export function draftHtml(draft, { text = {} } = {}) {
  const byId = Object.fromEntries(draft.photos.map((p) => [p.id, p]))
  const firstOf = new Map(draft.stops.map((s) => [s.photoIds[0], s]))
  const parts = []
  const days = draft.days.length ? draft.days : [{ index: 0, label: 'The story', photoIds: draft.photos.map((p) => p.id) }]
  for (const d of days) {
    parts.push(`<h1>${esc(d.label)}</h1>`)
    if (text[d.index]) parts.push(text[d.index])
    for (const pid of d.photoIds) {
      const s = firstOf.get(pid)
      if (s) parts.push(`<p>${markerSpan({ name: s.name || `Stop ${s.id.slice(1)}`, lat: s.lat.toFixed(6), lng: s.lng.toFixed(6), ts: s.ts })}</p>`)
      parts.push(`<p><img src="${esc(byId[pid].url)}" alt=""></p>`)
    }
  }
  return parts.join('')
}

export function draftToEvent(draft, { author } = {}) {
  const cover = draft.photos.find((p) => p.id === draft.cover)
  return {
    id: 0, slug: null, title: draft.title, short_title: null, summary: null,
    description: draftHtml(draft), start_date: draft.start, end_date: draft.end,
    location_name: draft.place, latitude: draft.centroid?.lat ?? null, longitude: draft.centroid?.lng ?? null,
    cover_image_url: cover?.url || null, has_multiple_locations: draft.stops.length > 1,
    author_id: author?.id ?? 0, author_username: author?.username || '', author_full_name: author?.full_name || '',
    privacy_level: 'followers', category: null, category_2: null, custom_group_id: null,
    locations: [],
    event_images: draft.photos.map((p, i) => ({ id: i + 1, event_id: 0, image_url: p.url, caption: '', latitude: p.lat, longitude: p.lng, timestamp: p.ts, order_index: i, width: p.w, height: p.h })),
  }
}
