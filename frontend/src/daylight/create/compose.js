// From draft to POST /events (owner: CREATE). PLAN-DAYLIGHT 4.2 steps 2, 3 and 5.
//
//   writeRequest(draft, {uploaded, author, people, words, answers}) -> {photos, user_text, interview_answers}
//       the body for POST /admin/ai/generate-story (and, without answers, generate-questions)
//   finalizeStoryHtml(aiHtml, draft, idOfUrl) -> token HTML: the model's words and photo
//       placement kept; unknown or repeated photos dropped; every missing photo put back in
//       its own day; a location marker before the first photo of each stop
//   composeEvent(draft, written, edits) -> {eventData, captions, tags}
//       written: {html, captions:{photoId: text}} from finalizeStoryHtml, or null (the photo story stands)
//       edits:   {uploaded:{photoId:url}, title, audience, groupId, category, start, end, place, placeLatLng,
//                 cover, people:[{kind, id}], lead}
//   normalizeMediaUrl(url)  the server's own rule for matching event_images rows (events.py:58-60)
import { draftHtml, markerFor, photoToken, resolvePhotos, esc, stopOfPhotoIn } from './draft.js'
import { tripDay } from '../lib/geo.js'
import { dateRange, timeLabel, dayLabel } from '../lib/format.js'

const MAX_MODEL_PHOTOS = 40 // PLAN-DAYLIGHT 4.2: the rest are placed by time
const MAX_USER_TEXT = 5000 // validate_user_text (ai_creator.py:105-109)

export const normalizeMediaUrl = (u) => String(u || '').replace('/medium/', '/full/').replace('/thumbnails/', '/full/')

/** At most 40 photos: the cover, the first photo of every stop, then evenly by time. */
export function modelPhotos(draft, uploadedIds) {
  const ok = draft.photos.filter((p) => uploadedIds.has(p.id))
  if (ok.length <= MAX_MODEL_PHOTOS) return ok
  const keep = new Set([draft.cover, ...draft.stops.map((s) => s.photoIds[0])].filter((id) => uploadedIds.has(id)))
  const rest = ok.filter((p) => !keep.has(p.id))
  const room = MAX_MODEL_PHOTOS - keep.size
  for (let i = 0; i < room && rest.length; i++) keep.add(rest[Math.floor((i * rest.length) / room)].id)
  return ok.filter((p) => keep.has(p.id)).slice(0, MAX_MODEL_PHOTOS)
}

const firstName = (u) => String(u?.full_name || u?.display_name || u?.username || '').split(' ')[0]

/** The outline, the names and the author's own words, carried in user_text (the channel SmartImport.jsx:254-259 uses). */
export function writeRequest(draft, { uploaded, author, people = [], words = [], answers = [] }) {
  const ids = new Set(Object.keys(uploaded))
  const photos = modelPhotos(draft, ids)
  const stopOf = (p) => stopOfPhotoIn(draft.stops, draft.photos, p)
  const payload = photos.map((p) => ({
    image_url: uploaded[p.id],
    place_name: stopOf(p)?.name || null,
    latitude: p.lat,
    longitude: p.lng,
    timestamp: p.ts,
  }))
  const me = firstName(author)
  const lines = []
  if (me) lines.push(`Write this as ${me}, in the first person ("I" and "we"). Use people's names as given. Plain, warm and specific: say what happened and where.`)
  if (draft.days.length > 1) {
    lines.push(`It covers ${draft.days[draft.days.length - 1].n} days, ${dateRange(draft.start, draft.end)}. Use exactly one <h1> per day, in this order, and put each day's photos under its own heading:`)
    for (const d of draft.days) {
      const stops = d.stopIds.map((id) => draft.stops.find((s) => s.id === id)).filter(Boolean)
      const where = stops.map((s) => `${s.name || 'a stop'} (${timeLabel(s.ts)})`).join(', ')
      lines.push(`Day ${d.n}, ${dayLabel(d.date)}: ${where || `${d.photoIds.length} photos`}`)
    }
  } else if (draft.start) {
    lines.push(`It happened on ${dayLabel(draft.start)}.`)
  }
  const names = people.map((p) => p.name).filter(Boolean)
  if (names.length) lines.push(`Who was there: ${names.join(', ')}.`)
  for (const w of words) {
    if (!w.text?.trim()) continue
    lines.push(w.kind === 'voice' ? `What ${me || 'the author'} said about it in a voice note: "${w.text.trim()}"` : `What ${me || 'the author'} wrote about it: "${w.text.trim()}"`)
  }
  let user_text = lines.join('\n')
  if (user_text.length > MAX_USER_TEXT) user_text = user_text.slice(0, MAX_USER_TEXT - 1) + '…'
  const interview_answers = answers.filter((a) => a.answer?.trim()).map((a) => ({ question: a.question, answer: a.answer.trim() }))
  return { photos: payload, user_text, interview_answers: interview_answers.length ? interview_answers : null }
}

/**
 * The app owns the final HTML. Returns token HTML (img src="ofs-photo:pN") plus the
 * captions keyed by photo id. Browser only (DOMParser).
 */
export function finalizeStoryHtml(aiHtml, draft, idOfUrl, aiCaptions = []) {
  const doc = new DOMParser().parseFromString(`<div id="r">${aiHtml || ''}</div>`, 'text/html')
  const root = doc.getElementById('r')
  root.querySelectorAll('[data-location-marker], script, style, iframe').forEach((n) => n.remove())
  const used = new Set()
  const photoP = (id) => {
    const p = doc.createElement('p')
    const img = doc.createElement('img')
    img.setAttribute('src', photoToken(id))
    img.setAttribute('alt', '')
    p.appendChild(img)
    return p
  }
  // 1. keep the model's placement of known photos, once each, each in its own paragraph
  for (const img of [...root.querySelectorAll('img')]) {
    const id = idOfUrl(img.getAttribute('src'))
    if (!id || used.has(id)) { img.remove(); continue }
    used.add(id)
    const block = img.closest('#r > *') || img
    const holder = photoP(id)
    if (block === img) img.replaceWith(holder)
    else {
      img.remove()
      block.after(holder)
      if (!block.textContent.trim() && !block.querySelector('img')) block.remove()
    }
  }
  // 2. headings: the model's h1s are the chapters; if they match the days one to one, missing photos go to their own day
  const h1s = [...root.querySelectorAll(':scope > h1')]
  const aligned = draft.days.length > 1 && h1s.length === draft.days.length
  const dayOfPhoto = (id) => {
    const p = draft.photos.find((x) => x.id === id)
    return p?.ts ? draft.days.findIndex((d) => d.date === tripDay(p.ts)) : -1
  }
  const sectionEnd = (di) => (aligned ? (h1s[di + 1] ? h1s[di + 1] : null) : null)
  for (const p of draft.photos) {
    if (used.has(p.id)) continue
    const di = dayOfPhoto(p.id)
    // after the last placed photo of the same day, else at the end of that day's section, else at the end
    const sameDay = [...root.querySelectorAll('img')].filter((im) => dayOfPhoto(im.getAttribute('src').slice(10)) === di && di >= 0)
    const holder = photoP(p.id)
    if (sameDay.length) {
      // keep time order among that day's photos
      const later = sameDay.find((im) => {
        const other = draft.photos.find((x) => x.id === im.getAttribute('src').slice(10))
        return other?.ts && p.ts && other.ts > p.ts
      })
      if (later) later.closest('p').before(holder)
      else sameDay[sameDay.length - 1].closest('p').after(holder)
    } else if (aligned && di >= 0) {
      const end = sectionEnd(di)
      if (end) end.before(holder)
      else root.appendChild(holder)
    } else root.appendChild(holder)
    used.add(p.id)
  }
  // 3. a marker before the first photo (in text order) of each stop
  const imgs = [...root.querySelectorAll('img')]
  for (const s of draft.stops) {
    const first = imgs.find((im) => s.photoIds.includes(im.getAttribute('src').slice(10)))
    if (!first) continue
    const tmp = doc.createElement('div')
    tmp.innerHTML = markerFor(s)
    first.closest('p').before(tmp.firstChild)
  }
  const captions = {}
  for (const c of aiCaptions || []) {
    const id = idOfUrl(c.image_url)
    if (id && c.caption) captions[id] = String(c.caption).trim()
  }
  return { html: root.innerHTML, captions }
}

/** The author's own words as the story's opening, used when there is no write-up. */
export function leadHtml(words) {
  const parts = words.map((w) => w.text?.trim()).filter(Boolean)
  return parts.map((t) => t.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('')).join('')
}

export function composeEvent(draft, written, edits = {}) {
  const uploaded = edits.uploaded || {}
  const tokenHtml = written?.html ?? draftHtml(draft, { lead: edits.lead || '' })
  const html = resolvePhotos(tokenHtml, (id) => uploaded[id] || null)
  const coverId = uploaded[edits.cover] ? edits.cover : uploaded[draft.cover] ? draft.cover : Object.keys(uploaded)[0]
  const ll = edits.placeLatLng || draft.centroid
  const eventData = {
    title: (edits.title || draft.title || 'A new story').trim(),
    summary: edits.summary ?? null,
    description: html,
    start_date: edits.start || draft.start,
    end_date: edits.end || draft.end || edits.start || draft.start,
    location_name: edits.place ?? draft.place ?? null,
    latitude: ll?.lat ?? null,
    longitude: ll?.lng ?? null,
    cover_image_url: uploaded[coverId] || null,
    has_multiple_locations: draft.stops.length > 1,
    privacy_level: edits.audience || 'followers',
    category: edits.category || null,
    custom_group_id: edits.audience === 'custom_group' ? edits.groupId ?? null : null,
  }
  const captions = Object.entries(written?.captions || {})
    .filter(([id, c]) => uploaded[id] && c)
    .map(([id, caption]) => ({ image_url: uploaded[id], caption }))
  const tags = (edits.people || []).map((p) => (p.kind === 'profile' ? { profile_id: p.id } : { user_id: p.id }))
  return { eventData, captions, tags }
}
