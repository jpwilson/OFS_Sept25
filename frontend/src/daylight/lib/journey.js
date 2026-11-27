// A story's journey, built on the client (owner: F0). PLAN-DAYLIGHT 2.7. Pure: no DOM, no map.
//
// buildJourney(event, parsed) -> {stops, legs, days, bbox, photos} | null   (null: fewer than 2 located stops)
//   event:  the GET /events/{id} response (uses locations, event_images, start_date)
//   parsed: parseStory(event.description, event.event_images) (uses markers, media, chapters)
//   stop: {id, n, name, lat, lng, ts, dayIndex, photoIds, anchorId, chapterId, kind:'named'|'photo', source}
//         n is the stop number printed on the map (named stops only; photo stops have n:null)
//   leg:  {id, from, to, seq, dayIndex, km, arc}            arc: true for hops over 300km (draw a great circle)
//   day:  {index, date, label, stopIds, chapterId, bbox}    date "YYYY-MM-DD" or null
//   photos: {[mediaId]: {id, src, caption, lat, lng, ts, stopId}}
// Sources: the story's location-marker spans (named, with a place in the text), the
// event's locations (named; inline_marker rows duplicate the spans and are merged), and
// photos that carry coordinates (not limited to 20). The event's own location is the
// world pin and the fallback centre, never a forced stop.
import { bboxOf, clusterStops, isLatLng, km, tripDay } from './geo.js'
import { parseBackendDate } from './format.js'

const SAME_PLACE_KM = 0.05
const PHOTO_JOIN_KM = 0.5
const ARC_KM = 300

const ms = (ts) => parseBackendDate(ts)?.getTime() ?? null

export function buildJourney(event, parsed) {
  if (!event) return null
  const markers = parsed?.markers || []
  const chapters = parsed?.chapters || []
  const media = parsed?.media || []

  // ---- 1. named stops: markers first (they carry a place in the text), then locations
  const stops = []
  for (const m of markers) {
    if (!isLatLng(m.lat, m.lng)) continue
    stops.push({ id: `stop-${stops.length + 1}`, name: m.name, lat: +m.lat, lng: +m.lng, ts: m.ts || null, anchorId: m.anchorId, chapterId: m.chapterId, order: m.order, kind: 'named', source: 'marker', photoIds: [] })
  }
  const locs = [...(event.locations || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  for (const l of locs) {
    if (!isLatLng(l.latitude, l.longitude)) continue
    const p = { lat: +l.latitude, lng: +l.longitude }
    const twin = stops.find((s) => km(s, p) <= SAME_PLACE_KM || (l.location_name && s.name && s.name === l.location_name && km(s, p) < 2))
    if (twin) {
      twin.ts = twin.ts || l.timestamp || null
      continue
    }
    stops.push({ id: `stop-${stops.length + 1}`, name: l.location_name || null, ...p, ts: l.timestamp || null, anchorId: null, chapterId: null, order: 10000 + (l.order_index ?? 0), kind: 'named', source: l.location_type || 'manual', photoIds: [] })
  }

  // ---- 2. photos: belong to the stop whose marker precedes them, or a stop within 500m
  const precedingStop = new Map() // media id -> stop id
  const chapterOfMedia = new Map() // media id -> the chapter its photo sits in
  if (parsed?.blocks) {
    let last = null
    for (const b of parsed.blocks) {
      if (b.type === 'marker') last = stops.find((s) => s.anchorId === b.stop.anchorId) || last
      if (b.type === 'heading' && b.level === 1) last = null
      if (b.type === 'media') for (const it of b.items) {
        if (b.chapterId) chapterOfMedia.set(it.id, b.chapterId)
        if (last) precedingStop.set(it.id, last.id)
      }
    }
  }
  const photoList = media.length
    ? media
    : (event.event_images || []).map((im) => ({ id: `img-${im.id}`, src: im.image_url, caption: im.caption, lat: im.latitude, lng: im.longitude, ts: im.timestamp, inBody: false }))
  const photos = {}
  const loose = []
  photoList.forEach((p, i) => {
    const located = isLatLng(p.lat, p.lng)
    const rec = { id: p.id, src: p.src, caption: p.caption || '', lat: located ? +p.lat : null, lng: located ? +p.lng : null, ts: p.ts || null, stopId: null, order: i }
    photos[p.id] = rec
    let stop = stops.find((s) => s.id === precedingStop.get(p.id))
    if (!stop && located) {
      let best = null, bd = Infinity
      for (const s of stops) {
        const d = km(s, rec)
        if (d < bd) { bd = d; best = s }
      }
      if (best && bd <= PHOTO_JOIN_KM) stop = best
    }
    if (stop) {
      rec.stopId = stop.id
      stop.photoIds.push(p.id)
      if (!stop.ts && rec.ts) stop.ts = rec.ts
    } else if (located) loose.push(rec)
  })
  // located photos with no stop become photo stops (500m / 90 minutes, as the draft does)
  for (const c of clusterStops(loose, { max: 200 })) {
    const id = `stop-${stops.length + 1}`
    const first = photos[c.ids[0]]
    const chapterId = c.ids.map((pid) => chapterOfMedia.get(pid)).find(Boolean) || null
    stops.push({ id, name: null, lat: c.lat, lng: c.lng, ts: c.ts || null, anchorId: null, chapterId, order: 20000 + first.order, kind: 'photo', source: 'photo', photoIds: c.ids })
    for (const pid of c.ids) photos[pid].stopId = id
  }
  if (stops.length < 2) return null

  // ---- 3. order: by time when every stop has one, otherwise by place in the story
  const allTimed = stops.every((s) => ms(s.ts) != null)
  stops.sort(allTimed ? (a, b) => ms(a.ts) - ms(b.ts) || a.order - b.order : (a, b) => a.order - b.order)
  let n = 0
  for (const s of stops) s.n = s.kind === 'named' ? ++n : null

  // ---- 4. days: H1 chapters when the stops sit in them, else the trip day of each stop.
  // A photo stop outside every chapter (the cover, a gallery-only photo) does not decide
  // this: it joins the chapter of the stop before it on the route (the next one if first).
  const chapterOf = new Map(chapters.map((c) => [c.id, c]))
  const inChapter = (s) => !!s.chapterId && chapterOf.has(s.chapterId)
  const byChapter = stops.some(inChapter) && stops.every((s) => inChapter(s) || s.kind === 'photo')
  if (byChapter) {
    stops.forEach((s, i) => {
      if (inChapter(s)) return
      const near = [...stops.slice(0, i)].reverse().find(inChapter) || stops.slice(i + 1).find(inChapter)
      s.chapterId = near.chapterId
    })
  }
  const days = []
  const dayFor = (key, make) => {
    let d = days.find((x) => x.key === key)
    if (!d) { d = { key, ...make(), stopIds: [] }; days.push(d) }
    return d
  }
  for (const s of stops) {
    let d
    if (byChapter) {
      const c = chapterOf.get(s.chapterId)
      d = dayFor(`c:${c.id}`, () => ({ chapterId: c.id, label: c.title, date: null }))
    } else if (ms(s.ts) != null) {
      const day = tripDay(s.ts)
      d = dayFor(`d:${day}`, () => ({ chapterId: null, label: null, date: day }))
    } else {
      d = dayFor('all', () => ({ chapterId: null, label: null, date: null }))
    }
    if (!d.date && s.ts) d.date = tripDay(s.ts)
    d.stopIds.push(s.id)
  }
  days.forEach((d, i) => {
    d.index = i
    d.label = d.label || (d.date || days.length > 1 ? `Day ${i + 1}` : 'The route')
    d.bbox = bboxOf(d.stopIds.map((id) => stops.find((s) => s.id === id)))
    delete d.key
  })
  for (const d of days) for (const id of d.stopIds) stops.find((s) => s.id === id).dayIndex = d.index

  // ---- 5. legs
  const legs = []
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i]
    const dist = km(a, b)
    legs.push({ id: `leg-${i}`, from: a.id, to: b.id, seq: i, dayIndex: b.dayIndex, km: Math.round(dist * 10) / 10, arc: dist > ARC_KM })
  }

  for (const s of stops) delete s.order
  for (const p of Object.values(photos)) delete p.order
  const bbox = bboxOf([...stops, ...Object.values(photos)])
  return { stops, legs, days, bbox, photos }
}

/** The stop for a media id, or null. */
export function stopOfPhoto(journey, mediaId) {
  const sid = journey?.photos?.[mediaId]?.stopId
  return sid ? journey.stops.find((s) => s.id === sid) || null : null
}
