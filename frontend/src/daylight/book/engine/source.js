// Story -> book source (owner: book ENGINE). Pure; no DOM, no clock, no time zone.
//
//   buildSource({event, parsed, journey, tags, mediaStats, measured}) -> Source
//     event      GET /events/{id} (title, dates, summary, cover_image_url, author, event_images)
//     parsed     parseStory(event.description, event.event_images)
//     journey    buildJourney(event, parsed) or null
//     tags       GET /events/{id}/tags rows (accepted ones are the people)
//     mediaStats {[event_image id]: {like_count, comment_count, reaction_counts}}   (optional)
//     measured   {[src]: {w, h}}   real pixel sizes from measure.js (the stored ones are often missing)
//
// Source: {id, slug, title, summary, author, dates:{start, end, label}, place,
//   photos: {[photoId]: Photo}, sections: [Section], stops: [Stop], route: Route|null,
//   people: [{key, name}], coverCandidates: [photoId], skipped: {videos}}
// Photo: {id, imageId, src, px:{w,h}, sizeFrom:'measured'|'stored'|'assumed', aspect, shape,
//   caption, ts, reactions, inBody, sectionId, lead, cover}
//   shape: 'panorama' (>= 2:1) | 'landscape' | 'squarish' (0.83 to 1.2) | 'portrait' | 'tall' (< 0.55)
// Section: {id, kind:'intro'|'chapter'|'more', index, title, label, date, washIndex,
//   units:[{paras:[Para], photos:[photoId]}]}
//   A unit is text and the photos that follow it: the book keeps a paragraph with the first
//   photo after it.
// Para: {kind:'p'|'li'|'quote'|'h2'|'h3'|'stop', runs:[{text, b, i}], stop?: {n, label, dayIndex}}
// Stop: {id, n, name, short, time, dayIndex, lat, lng, kind:'named'|'photo'}
// Route: {stops:[{id, n, lat, lng, dayIndex, kind, short}], legs:[{id, dayIndex, line:[[lng, lat]]}], days:[{index, label}]}
import { greatCircle } from '../../lib/geo.js'
import { shortPlace, dateRange } from '../../lib/format.js'
import { mediaKeyOf } from './util.js'
import { htmlToParagraphs, educate } from './html.js'

const ASSUMED = { w: 1200, h: 900 }

export function shapeOf(aspect) {
  if (aspect >= 2) return 'panorama'
  if (aspect >= 1.2) return 'landscape'
  if (aspect >= 0.83) return 'squarish'
  if (aspect >= 0.55) return 'portrait'
  return 'tall'
}

/** "5:40 PM" from the wall-clock part of a timestamp (local time at the place). */
export function wallTime(ts) {
  const m = String(ts || '').match(/T(\d{2}):(\d{2})/)
  if (!m) return ''
  const h = +m[1]
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** "Monday, June 15" from the wall-clock date of a timestamp, with no time zone involved. */
export function wallDay(ts) {
  const m = String(ts || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()
  return `${DAYS[dow]}, ${MONTHS[+m[2] - 1]} ${+m[3]}`
}
/** "June 14 – 20, 2026", from wall-clock dates (dateRange from lib/format with naive strings). */
export function wallRange(start, end) {
  const d = (s) => (String(s || '').match(/^\d{4}-\d{2}-\d{2}/) || [''])[0]
  const a = d(start), b = d(end) || a
  return a ? dateRange(a, b) : ''
}

const LABELLED = /^\s*((?:day|week|part|chapter|stage|leg|night)\s+[\w-]+)\s*[:.–—-]\s*(.+)$/i

export function buildSource({ event, parsed, journey = null, tags = [], mediaStats = {}, measured = {} }) {
  if (!event) throw new Error('buildSource: no event')
  const blocks = parsed?.blocks || []
  const chapterIds = new Set((parsed?.chapters || []).map((c) => c.id))
  const imagesById = new Map((event.event_images || []).map((im) => [im.id, im]))
  const coverKey = mediaKeyOf(event.cover_image_url)

  // ---- photos
  const photos = {}
  let videos = 0
  const addPhoto = (item) => {
    if (item.kind === 'video') { videos++; return null }
    if (photos[item.id]) return item.id
    const im = item.imageId != null ? imagesById.get(item.imageId) : null
    const m = measured[item.src]
    let px, sizeFrom
    if (m && m.w > 0 && m.h > 0) { px = { w: m.w, h: m.h }; sizeFrom = 'measured' }
    else if (item.w > 0 && item.h > 0) { px = { w: +item.w, h: +item.h }; sizeFrom = 'stored' }
    else { px = { ...ASSUMED }; sizeFrom = 'assumed' }
    const st = im ? mediaStats[im.id] : null
    const reactions = st ? (st.like_count || 0) + (st.comment_count || 0) + Object.values(st.reaction_counts || {}).reduce((s, v) => s + (+v || 0), 0) : 0
    const aspect = px.w / px.h
    photos[item.id] = {
      id: item.id,
      imageId: item.imageId ?? null,
      src: item.src,
      px,
      sizeFrom,
      aspect: Math.round(aspect * 10000) / 10000,
      shape: shapeOf(aspect),
      caption: educate(String(item.caption || '').replace(/\s+/g, ' ').trim()),
      ts: item.ts || null,
      reactions,
      inBody: !!item.inBody,
      sectionId: null,
      lead: false,
      cover: !!coverKey && mediaKeyOf(item.src) === coverKey,
    }
    return item.id
  }

  // ---- stops (named, numbered as on the map)
  const jStops = journey?.stops || []
  const stopByAnchor = new Map(jStops.filter((s) => s.anchorId).map((s) => [s.anchorId, s]))
  const stopLabel = (marker) => {
    const js = stopByAnchor.get(marker.anchorId)
    const short = shortPlace(marker.name || js?.name || '', 1)
    const time = wallTime(marker.ts || js?.ts)
    const bits = []
    if (js?.n != null) bits.push(`STOP ${js.n}`)
    if (short) bits.push(short.toUpperCase())
    if (time) bits.push(time)
    return { n: js?.n ?? null, label: bits.join(' · '), dayIndex: js?.dayIndex ?? 0 }
  }

  // ---- sections and units
  const sections = []
  let sec = null
  const newSection = (kind, title, id) => {
    const m = title ? title.match(LABELLED) : null
    sec = {
      id: id || `section-${sections.length + 1}`,
      kind,
      index: 0,
      title: m ? educate(m[2].trim()) : title ? educate(title) : null,
      label: m ? m[1].toUpperCase() : null,
      date: '',
      washIndex: 0,
      units: [],
    }
    sections.push(sec)
    return sec
  }
  const unit = (needText) => {
    if (!sec) newSection('intro', null, 'intro')
    let u = sec.units[sec.units.length - 1]
    if (!u || (needText && u.photos.length)) {
      u = { paras: [], photos: [] }
      sec.units.push(u)
    }
    return u
  }
  for (const b of blocks) {
    if (b.type === 'heading' && chapterIds.has(b.id)) {
      newSection('chapter', b.text, b.id)
      continue
    }
    if (b.type === 'heading') {
      unit(true).paras.push({ kind: b.level <= 2 ? 'h2' : 'h3', runs: [{ text: educate(b.text), b: false, i: false }] })
      continue
    }
    if (b.type === 'marker') {
      const s = stopLabel(b.stop)
      if (s.label) unit(true).paras.push({ kind: 'stop', runs: [{ text: s.label, b: false, i: false }], stop: s })
      continue
    }
    if (b.type === 'html') {
      const paras = htmlToParagraphs(b.html)
      if (paras.length) unit(true).paras.push(...paras.map((p) => ({ kind: p.kind, runs: p.runs })))
      continue
    }
    if (b.type === 'media') {
      const ids = b.items.map(addPhoto).filter(Boolean)
      if (ids.length) {
        const u = unit(false)
        for (const id of ids) {
          if (u.photos.includes(id)) continue
          u.photos.push(id)
          photos[id].sectionId = sec.id
        }
      }
    }
  }
  // photos attached to the story but not placed in the text
  const loose = (parsed?.media || []).filter((m) => !m.inBody).map(addPhoto).filter(Boolean).filter((id) => !photos[id].sectionId)
  if (loose.length) {
    const more = newSection('more', 'More photos', 'more-photos')
    more.units.push({ paras: [], photos: loose })
    for (const id of loose) photos[id].sectionId = more.id
  }
  // drop empty sections; number and colour the rest; find each one's lead photo and date
  const kept = sections.filter((s) => s.units.some((u) => u.paras.length || u.photos.length))
  let chapterN = 0
  kept.forEach((s, i) => {
    s.index = i
    if (s.kind === 'chapter') s.number = ++chapterN
    s.washIndex = s.kind === 'chapter' ? s.number - 1 : s.kind === 'more' ? 5 : 0
    s.units = s.units.filter((u) => u.paras.length || u.photos.length)
    const first = s.units.flatMap((u) => u.photos)[0]
    if (first && s.kind !== 'more') photos[first].lead = true
    const stopTs = s.units.flatMap((u) => u.paras).find((p) => p.kind === 'stop')
    const ts = s.units.flatMap((u) => u.photos).map((id) => photos[id].ts).find(Boolean)
    const markerTs = (parsed?.markers || []).find((m) => m.chapterId === s.id && m.ts)?.ts
    s.date = wallDay(markerTs || ts || '')
    void stopTs
  })
  // the day colour of a chapter follows the map's day when the journey's days are chapters
  for (const s of kept) {
    const day = journey?.days?.find((d) => d.chapterId === s.id)
    if (day) s.washIndex = day.index
  }

  // ---- stops and route for the map page
  const stops = jStops.map((s) => ({
    id: s.id, n: s.n ?? null, name: s.name || '', short: shortPlace(s.name || '', 1), time: wallTime(s.ts),
    dayIndex: s.dayIndex ?? 0, lat: s.lat, lng: s.lng, kind: s.kind,
  }))
  const route = journey ? {
    stops: stops.map((s) => ({ id: s.id, n: s.n, lat: s.lat, lng: s.lng, dayIndex: s.dayIndex, kind: s.kind, short: s.short })),
    legs: journey.legs.map((l) => ({ id: l.id, dayIndex: l.dayIndex, line: legLine(journey, l) })),
    days: journey.days.map((d) => {
      const m = d.label && d.label.match(LABELLED)
      return { index: d.index, label: m ? m[1] : d.label }
    }),
  } : null

  // ---- people: the author, then everyone tagged, once each
  const people = []
  const seen = new Set()
  const addPerson = (key, name) => {
    if (!name || seen.has(key)) return
    seen.add(key)
    people.push({ key, name })
  }
  addPerson(`u:${event.author_username || event.author_id}`, event.author_full_name || event.author_username)
  for (const t of tags || []) {
    if (t.status && t.status !== 'accepted') continue
    const name = t.tagged_user_display_name || t.tag_profile_name || t.tagged_user_username || null
    addPerson(t.tagged_user_username ? `u:${t.tagged_user_username}` : `t:${t.tag_profile_id ?? t.id}`, name)
  }

  // ---- cover candidates: the story's cover, then what the family reacted to, then leads
  const all = Object.values(photos)
  const order = new Map(all.map((p, i) => [p.id, i]))
  const coverCandidates = [...all]
    .sort((a, b) => (b.cover - a.cover) || (b.reactions - a.reactions) || (b.lead - a.lead) || order.get(a.id) - order.get(b.id))
    .map((p) => p.id)

  return {
    id: event.id,
    slug: event.slug || null,
    title: educate(String(event.title || 'Our story').trim()),
    summary: educate(String(event.summary || '').replace(/\s+/g, ' ').trim()),
    author: { name: event.author_full_name || event.author_username || '', username: event.author_username || '' },
    dates: { start: event.start_date || null, end: event.end_date || null, label: wallRange(event.start_date, event.end_date) },
    place: shortPlace(event.location_name || '', 2),
    photos,
    sections: kept,
    stops,
    route,
    people,
    coverCandidates,
    skipped: { videos },
  }
}

// The same gentle curve the live map and the route sketch draw (map/route.js legLine),
// copied so a change in the map package cannot move a printed book.
function legLine(journey, leg) {
  const a = journey.stops.find((s) => s.id === leg.from), b = journey.stops.find((s) => s.id === leg.to)
  if (!a || !b) return []
  if (leg.arc) return greatCircle(a, b, 48)
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180) || 1
  const ax = a.lng * k, ay = a.lat, bx = b.lng * k, by = b.lat
  const dx = bx - ax, dy = by - ay
  const bow = (leg.seq % 2 ? 1 : -1) * 0.13
  const cx = (ax + bx) / 2 - dy * bow, cy = (ay + by) / 2 + dx * bow
  const out = []
  const N = 28
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t
    out.push([(u * u * ax + 2 * u * t * cx + t * t * bx) / k, u * u * ay + 2 * u * t * cy + t * t * by])
  }
  return out
}
