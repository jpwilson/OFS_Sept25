// The story maker (owner: CREATE): one plain object that holds the draft and runs the
// three background jobs (uploads, place names, the write-up) plus voice notes, questions
// and publishing, outside React so StrictMode and re-renders never start a job twice.
// The page reads it with useMaker(maker) (useSyncExternalStore).
//
// PLAN-DAYLIGHT 4.2. Endpoints, all existing: POST /upload, GET /geocoding/reverse,
// POST /admin/ai/transcribe, /admin/ai/generate-questions, /admin/ai/generate-story,
// POST /events, POST /events/{id}/publish, GET /upload/event-images/{id},
// PATCH /upload/event-image/{id}, POST /events/{id}/tags.
//
// Nothing is created on the server before Publish or Save draft (uploads are files only).
import { useSyncExternalStore } from 'react'
import apiService from '../../services/api.js'
import { apiFetch, HttpError } from '../lib/http.js'
import { FACTS } from '../../landing/content/facts.js'
import { buildDraft, withStops, draftHtml, renameMarkers } from './draft.js'
import { writeRequest, finalizeStoryHtml, composeEvent, normalizeMediaUrl, leadHtml } from './compose.js'

export const AI_PER_DAY = Number(FACTS.aiPerDay.value) // backend/app/api/ai_creator.py:22, shared by write-ups, voice notes and questions
const UPLOADS_AT_ONCE = 4
const GEOCODE_GAP_MS = 1100 // Nominatim allows one request a second (the pace SmartImport.jsx:163-182 keeps)
const PLACES_WAIT_MS = 15000 // the write-up waits this long after the uploads for place names
const UPLOAD_EDGE = 2048
const WRITE_TIMEOUT_MS = 150000

export const AUDIENCES = [
  // ROUND2 order; the app's own names (PrivacySelector.jsx:38-69). "Open", never "see".
  { value: 'private', label: 'Private', note: 'Only you. You can still make a share link for it.' },
  { value: 'close_family', label: 'Close Family', note: 'Followers you have marked as close family.' },
  { value: 'followers', label: 'Followers', note: 'People whose follow request you accepted: friends and family who follow you.' },
  { value: 'custom_group', label: 'Custom Group', note: 'A named list you build from people you follow.' },
  { value: 'public', label: 'Public', note: 'Anyone with the link, signed in or not.' },
]
export const CATEGORIES = [
  // CategorySelector.jsx:13-22, values as stored
  { value: 'Vacation', label: 'Vacations' },
  { value: 'Family Gathering', label: 'Family Gatherings' },
  { value: 'Birthday', label: 'Birthdays' },
  { value: 'Holiday', label: 'Holidays' },
  { value: 'Anniversary', label: 'Anniversaries' },
  { value: 'Project', label: 'Projects' },
  { value: 'Milestone', label: 'Milestones' },
  { value: 'Daily Life', label: 'Daily Life' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let wid = 1

// ---------------------------------------------------------------- AI usage on this device
const usageKey = () => {
  const d = new Date()
  return `ofsa.create.ai.${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}` // the server's day is UTC (ai_creator.py:52)
}
function readUsed() {
  try { return Number(localStorage.getItem(usageKey()) || 0) } catch { return 0 }
}
function writeUsed(n) {
  try { localStorage.setItem(usageKey(), String(n)) } catch { /* private mode */ }
}

/** One AI failure, as the person should read it. */
export function aiFailure(e) {
  if (e instanceof HttpError) {
    if (e.status === 429) return { kind: 'limit', message: `You have used today's ${AI_PER_DAY} AI actions. They reset at midnight UTC.` }
    if (e.status === 403) return { kind: 'noaccess', message: 'The write-up, voice notes and questions need Pro or the free trial.' }
    if (e.status === 0) return { kind: 'failed', message: e.message }
    return { kind: 'failed', message: apiService.friendlyAIError(e.data?.detail || e.message) }
  }
  if (e?.name === 'AbortError') return { kind: 'failed', message: 'That took too long. Try again, or with fewer photos.' }
  return { kind: 'failed', message: 'Something went wrong. Please try again.' }
}

// ---------------------------------------------------------------- places
const NAME_KEYS = ['tourism', 'attraction', 'natural', 'leisure', 'historic', 'amenity', 'building', 'water', 'place', 'hamlet', 'village', 'town', 'city', 'suburb', 'road']
export function placeName(r) {
  const a = r?.address || {}
  for (const k of NAME_KEYS) if (a[k]) return String(a[k])
  return r?.name ? String(r.name).split(',')[0].trim() || null : null
}
const townOf = (a = {}) => a.city || a.town || a.village || null
/** The story's place from its stops' addresses: a town most stops share, else the state. */
export function areaOf(results, total = results.length) {
  const rs = results.filter(Boolean)
  if (!rs.length) return null
  const count = new Map()
  for (const r of rs) {
    const t = townOf(r.address)
    if (t) count.set(t, (count.get(t) || 0) + 1)
  }
  const [town, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] || []
  const state = rs.map((r) => r.address?.state).find(Boolean)
  const county = rs.map((r) => r.address?.county).find(Boolean)
  const country = rs.map((r) => r.address?.country).find(Boolean)
  if (town && n >= Math.ceil(Math.max(total, rs.length) / 2)) return { short: town, label: [town, state || country].filter(Boolean).join(', ') }
  if (state) return { short: state, label: [county, state].filter(Boolean).join(', ') }
  if (country) return { short: country, label: country }
  const first = placeName(rs[0])
  return first ? { short: first, label: first } : null
}

// ---------------------------------------------------------------- uploads
async function prepareUpload(photo) {
  const f = photo.file
  if (photo.heic) return null // api.js converts HEIC in the browser and routes it to R2
  const big = (photo.w && Math.max(photo.w, photo.h) > UPLOAD_EDGE) || f.size > 3.5 * 1024 * 1024
  if (!big || typeof createImageBitmap !== 'function') return f
  try {
    const bmp = await createImageBitmap(f)
    const scale = Math.min(1, UPLOAD_EDGE / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
    if (!blob) return f
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return f
  }
}

async function uploadOne(photo) {
  const prepared = await prepareUpload(photo)
  if (!prepared) {
    const r = await apiService.uploadImage(photo.file)
    return r.url
  }
  const fd = new FormData()
  fd.append('file', prepared, prepared.name || 'photo.jpg')
  const r = await apiFetch('/upload', { method: 'POST', body: fd })
  return r.url || r.urls?.medium
}

// ---------------------------------------------------------------- the maker
export class StoryMaker {
  constructor({ author, canUseAI }) {
    this.author = author
    this.canUseAI = canUseAI
    this.listeners = new Set()
    this.dead = false
    this.timers = []
    this.state = {
      phase: 'idle', read: { done: 0, total: 0 },
      draft: null,
      uploads: {},
      places: { state: 'idle', done: 0, total: 0, failed: 0 },
      area: null,
      write: { state: canUseAI ? 'waiting' : 'noaccess', error: null, written: null, count: 0, stale: false, at: null },
      words: [],
      answers: [
        { id: 'a-more', question: "Anything the photos don't show?", answer: '', source: 'free' },
      ],
      questions: { state: 'idle', error: null },
      people: [],
      settings: { title: null, audience: 'followers', groupId: null, category: null, start: null, end: null, place: null, placeLatLng: null, cover: null },
      ai: { used: readUsed() },
      hold: { recording: false, typing: false },
      publish: { state: 'idle', step: null, error: null, result: null },
    }
    this.subscribe = this.subscribe.bind(this)
    this.getState = this.getState.bind(this)
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  getState() { return this.state }
  set(patch) {
    if (this.dead) return
    this.state = { ...this.state, ...(typeof patch === 'function' ? patch(this.state) : patch) }
    for (const fn of this.listeners) fn()
  }
  sub(key, patch) { this.set((s) => ({ [key]: { ...s[key], ...patch } })) }
  destroy() {
    this.dead = true
    this.timers.forEach(clearTimeout)
    for (const p of this.state.draft?.photos || []) if (p.url) URL.revokeObjectURL(p.url)
  }

  // ------------------------------------------------------------ 1. the instant draft
  async start(files, { metaOf } = {}) {
    this.set({ phase: 'reading', read: { done: 0, total: files.length } })
    const draft = await buildDraft(files, { metaOf, onProgress: (done, total) => this.set({ read: { done, total } }) })
    if (this.dead) return
    if (!draft.photos.length) { this.set({ phase: 'nophotos', draft }); return }
    const uploads = Object.fromEntries(draft.photos.map((p) => [p.id, { state: 'queued', url: null, error: null }]))
    this.set({ phase: 'ready', draft, uploads, places: { state: draft.stops.length ? 'running' : 'done', done: 0, total: draft.stops.length, failed: 0 } })
    this.runUploads()
    this.runPlaces()
  }

  // ------------------------------------------------------------ 2a. uploads, four at a time
  async runUploads() {
    if (this.uploading) return
    this.uploading = true
    const next = () => this.state.draft.photos.find((p) => this.state.uploads[p.id]?.state === 'queued')
    await Promise.all(Array.from({ length: UPLOADS_AT_ONCE }, async () => {
      for (let p = next(); p && !this.dead; p = next()) {
        this.setUpload(p.id, { state: 'uploading', error: null })
        try {
          const url = await uploadOne(p)
          if (!url) throw new Error('The server returned no address for this photo.')
          this.setUpload(p.id, { state: 'done', url })
        } catch (e) {
          this.setUpload(p.id, { state: 'failed', error: e?.message || 'Upload failed' })
        }
      }
    }))
    this.uploading = false
    this.uploadsSettledAt = Date.now()
    this.maybeWrite()
    const pub = this.state.publish
    if (pub.state === 'waiting') this.publish({ asDraft: pub.asDraft })
  }
  setUpload(id, patch) { this.set((s) => ({ uploads: { ...s.uploads, [id]: { ...s.uploads[id], ...patch } } })) }
  retryUploads() {
    this.set((s) => ({ uploads: Object.fromEntries(Object.entries(s.uploads).map(([k, u]) => [k, u.state === 'failed' ? { ...u, state: 'queued', error: null } : u])) }))
    this.runUploads()
  }
  uploaded() {
    return Object.fromEntries(Object.entries(this.state.uploads).filter(([, u]) => u.state === 'done').map(([k, u]) => [k, u.url]))
  }
  uploadCounts() {
    const us = Object.values(this.state.uploads)
    return { total: us.length, done: us.filter((u) => u.state === 'done').length, failed: us.filter((u) => u.state === 'failed').length, busy: us.filter((u) => u.state === 'queued' || u.state === 'uploading').length }
  }

  // ------------------------------------------------------------ 2b. place names, one per stop, 1.1s apart
  async runPlaces() {
    const results = []
    const stops = this.state.draft.stops
    for (let i = 0; i < stops.length && !this.dead; i++) {
      if (i) await sleep(GEOCODE_GAP_MS)
      const s = stops[i]
      let r = null
      try {
        r = await apiFetch('/geocoding/reverse', { query: { latitude: s.lat.toFixed(6), longitude: s.lng.toFixed(6) } })
      } catch {
        r = null
      }
      if (this.dead) return
      results[i] = r
      const name = placeName(r)
      this.set((st) => {
        const named = st.draft.stops.map((x) => (x.id === s.id ? { ...x, name: name || null, area: r?.address || null } : x))
        const area = areaOf(results, stops.length)
        return {
          draft: withStops(st.draft, named, area),
          area,
          places: { ...st.places, done: i + 1, failed: st.places.failed + (name ? 0 : 1) },
        }
      })
    }
    this.sub('places', { state: this.state.places.failed === stops.length && stops.length ? 'failed' : 'done' })
    this.maybeWrite()
  }

  // ------------------------------------------------------------ 2c. the write-up
  setHold(patch) {
    this.sub('hold', patch)
    if (!this.state.hold.recording && !this.state.hold.typing) this.maybeWrite()
  }
  /** Starts the first write-up by itself once the photos are up, unless the author is still talking or typing. */
  maybeWrite() {
    const s = this.state
    if (!this.canUseAI || s.phase !== 'ready' || s.write.state !== 'waiting') return
    const u = this.uploadCounts()
    if (u.busy || !u.done) return
    if (s.hold.recording || s.hold.typing || s.words.some((w) => w.state === 'transcribing')) return
    if (s.places.state === 'running') {
      const left = PLACES_WAIT_MS - (Date.now() - (this.uploadsSettledAt || Date.now()))
      if (left > 0) {
        clearTimeout(this.placesTimer)
        this.placesTimer = setTimeout(() => this.maybeWrite(), left)
        this.timers.push(this.placesTimer)
        return
      }
    }
    this.write()
  }
  holdReason() {
    const s = this.state
    if (s.write.state !== 'waiting') return null
    const u = this.uploadCounts()
    if (u.busy) return 'uploads'
    if (s.hold.recording) return 'recording'
    if (s.words.some((w) => w.state === 'transcribing')) return 'transcribing'
    if (s.hold.typing) return 'typing'
    if (s.places.state === 'running') return 'places'
    if (!u.done) return 'nophotos'
    return null
  }
  spend() {
    const used = readUsed() + 1
    writeUsed(used)
    this.sub('ai', { used })
  }
  noteLimit() {
    writeUsed(Math.max(readUsed(), AI_PER_DAY))
    this.sub('ai', { used: Math.max(readUsed(), AI_PER_DAY) })
  }
  async write() {
    const s = this.state
    if (s.write.state === 'running') return
    const uploaded = this.uploaded()
    if (!Object.keys(uploaded).length) return
    this.sub('write', { state: 'running', error: null, stale: false, startedAt: Date.now() })
    const body = writeRequest(s.draft, { uploaded, author: this.author, people: s.people, words: s.words.filter((w) => w.state === 'ready'), answers: s.answers })
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), WRITE_TIMEOUT_MS)
    try {
      const ai = await apiFetch('/admin/ai/generate-story', { method: 'POST', body, signal: ctl.signal })
      this.spend()
      const byUrl = new Map(Object.entries(uploaded).map(([id, url]) => [normalizeMediaUrl(url), id]))
      const idOfUrl = (u) => byUrl.get(normalizeMediaUrl(u)) || null
      const written = finalizeStoryHtml(ai.story_html, this.state.draft, idOfUrl, ai.photo_captions)
      this.set((st) => ({
        write: { ...st.write, state: 'done', written, count: st.write.count + 1, stale: false, at: Date.now(), suggested: { title: ai.suggested_title, category: ai.suggested_category, place: ai.location_name } },
        settings: {
          ...st.settings,
          title: st.settings.titleEdited ? st.settings.title : ai.suggested_title || st.settings.title,
          category: st.settings.categoryEdited ? st.settings.category : ai.suggested_category || st.settings.category,
          place: st.settings.place ?? (st.draft.place ? null : ai.location_name || null),
        },
      }))
    } catch (e) {
      const f = aiFailure(e)
      if (f.kind === 'limit') this.noteLimit()
      this.sub('write', { state: f.kind === 'limit' ? 'limit' : f.kind === 'noaccess' ? 'noaccess' : 'failed', error: f.message, stale: false })
    } finally {
      clearTimeout(t)
    }
  }
  /** Marks the write-up out of date when the author adds something after it arrived. */
  touched() {
    if (this.state.write.state === 'done') this.sub('write', { stale: true })
  }

  // ------------------------------------------------------------ 3. words: typed, spoken, answered
  addTyped(text) {
    const t = String(text || '').trim()
    if (!t) return
    this.set((s) => ({ words: [...s.words, { id: `w${wid++}`, kind: 'typed', text: t, state: 'ready' }] }))
    this.touched()
    this.maybeWrite()
  }
  editWord(id, text) {
    this.set((s) => ({ words: s.words.map((w) => (w.id === id ? { ...w, text } : w)) }))
    this.touched()
  }
  removeWord(id) {
    this.set((s) => ({ words: s.words.filter((w) => w.id !== id) }))
    this.touched()
    this.maybeWrite()
  }
  /** A finished recording: transcribe it into a card the author can edit. target: an answer id, or null for the story. */
  async addVoice(rec, { target = null } = {}) {
    const id = `w${wid++}`
    const word = { id, kind: 'voice', text: '', state: 'transcribing', seconds: rec.seconds, rec, target, error: null }
    if (target) this.set((s) => ({ answers: s.answers.map((a) => (a.id === target ? { ...a, transcribing: true, error: null } : a)) }))
    else this.set((s) => ({ words: [...s.words, word] }))
    await this.transcribe(id, rec, target)
  }
  async transcribe(id, rec, target) {
    if (!target) this.set((s) => ({ words: s.words.map((w) => (w.id === id ? { ...w, state: 'transcribing', error: null } : w)) }))
    const fd = new FormData()
    fd.append('file', rec.blob, rec.fileName)
    try {
      const r = await apiFetch('/admin/ai/transcribe', { method: 'POST', body: fd })
      this.spend()
      const text = String(r?.text || '').trim()
      if (target) this.set((s) => ({ answers: s.answers.map((a) => (a.id === target ? { ...a, answer: [a.answer, text].filter(Boolean).join(' '), transcribing: false } : a)) }))
      else this.set((s) => ({ words: s.words.map((w) => (w.id === id ? { ...w, state: 'ready', text } : w)) }))
      this.touched()
    } catch (e) {
      const f = aiFailure(e)
      if (f.kind === 'limit') this.noteLimit()
      if (target) this.set((s) => ({ answers: s.answers.map((a) => (a.id === target ? { ...a, transcribing: false, error: f.message } : a)) }))
      else this.set((s) => ({ words: s.words.map((w) => (w.id === id ? { ...w, state: 'failed', error: f.message, kind: 'voice' } : w)) }))
    }
    this.maybeWrite()
  }
  retryVoice(id) {
    const w = this.state.words.find((x) => x.id === id)
    if (w?.rec) this.transcribe(id, w.rec, null)
  }
  answer(id, text) {
    this.set((s) => ({ answers: s.answers.map((a) => (a.id === id ? { ...a, answer: text, error: null } : a)) }))
    this.touched()
  }
  async askQuestions() {
    const uploaded = this.uploaded()
    if (!Object.keys(uploaded).length || this.state.questions.state === 'running') return
    this.sub('questions', { state: 'running', error: null })
    const { photos, user_text } = writeRequest(this.state.draft, { uploaded, author: this.author, people: this.state.people, words: this.state.words.filter((w) => w.state === 'ready'), answers: [] })
    try {
      const r = await apiFetch('/admin/ai/generate-questions', { method: 'POST', body: { photos, user_text } })
      this.spend()
      const have = new Set(this.state.answers.map((a) => a.question.toLowerCase()))
      const fresh = (r?.questions || []).filter((q) => q && !have.has(q.toLowerCase())).slice(0, 5)
      this.set((s) => ({ answers: [...s.answers, ...fresh.map((q) => ({ id: `a${wid++}`, question: q, answer: '', source: 'asked' }))], questions: { state: 'done', error: null } }))
    } catch (e) {
      const f = aiFailure(e)
      if (f.kind === 'limit') this.noteLimit()
      this.sub('questions', { state: 'failed', error: f.message, kind: f.kind })
    }
  }

  // ------------------------------------------------------------ people and settings
  addPerson(p) {
    if (this.state.people.some((x) => x.kind === p.kind && x.id === p.id)) return
    this.set((s) => ({ people: [...s.people, p] }))
    this.touched()
  }
  removePerson(p) {
    this.set((s) => ({ people: s.people.filter((x) => !(x.kind === p.kind && x.id === p.id)) }))
    this.touched()
  }
  setting(patch) { this.sub('settings', patch) }

  // ------------------------------------------------------------ the HTML the preview and Publish use
  tokenHtml(state = this.state) {
    if (state.write.written) return renameMarkers(state.write.written.html, state.draft.stops)
    return draftHtml(state.draft, { lead: leadHtml(state.words.filter((w) => w.state === 'ready')) })
  }

  // ------------------------------------------------------------ 4. publish or save a draft
  async publish({ asDraft = false, withoutFailed = false } = {}) {
    const s = this.state
    if (s.publish.state === 'running') return
    const u = this.uploadCounts()
    if (u.busy) { this.sub('publish', { state: 'waiting', step: 'uploads', asDraft, error: null }); return }
    if (u.failed && !withoutFailed) { this.sub('publish', { state: 'needs', step: 'failed-uploads', asDraft, error: null }); return }
    if (!u.done) { this.sub('publish', { state: 'failed', error: 'None of the photos have uploaded yet. Try them again.' }); return }
    const st = s.settings
    if (!(st.start || s.draft.start)) { this.sub('publish', { state: 'needs', step: 'dates', asDraft, error: null }); return }
    if (st.audience === 'custom_group' && !st.groupId) { this.sub('publish', { state: 'needs', step: 'group', asDraft, error: null }); return }
    this.sub('publish', { state: 'running', step: 'story', asDraft, error: null })
    const uploaded = this.uploaded()
    const written = s.write.written
    const lead = written ? '' : leadHtml(s.words.filter((w) => w.state === 'ready'))
    const { eventData, captions, tags } = composeEvent(s.draft, written, {
      uploaded, lead,
      title: st.title || s.draft.title, audience: st.audience, groupId: st.groupId, category: st.category,
      start: st.start, end: st.end, place: st.place ?? s.draft.place, placeLatLng: st.placeLatLng,
      cover: st.cover || s.draft.cover, people: s.people,
    })
    // A published story emails every follower (events.py:427-460). A Private story is made as a
    // draft and then published (events.py:823-862 sends nothing), so its title and cover reach no one.
    const quiet = st.audience === 'private'
    let event
    try {
      event = await apiFetch('/events', { method: 'POST', query: { is_published: !asDraft && !quiet }, body: eventData })
      if (!asDraft && quiet) await apiFetch(`/events/${event.id}/publish`, { method: 'POST' })
    } catch (e) {
      const msg = e instanceof HttpError && e.status === 403 && /limit/i.test(e.message)
        ? `The trial allows ${FACTS.trialStories.value} published stories. Save this one as a draft, or upgrade to publish it.`
        : e?.message || 'The story did not save.'
      this.sub('publish', { state: 'failed', error: msg, limit: /published stories/.test(msg) })
      return
    }
    const warnings = []
    if (captions.length) {
      this.sub('publish', { step: 'captions' })
      try {
        const rows = await apiFetch(`/upload/event-images/${event.id}`)
        const rowOf = new Map((rows || []).map((r) => [normalizeMediaUrl(r.image_url), r.id]))
        const jobs = captions.map((c) => ({ id: rowOf.get(normalizeMediaUrl(c.image_url)), caption: c.caption })).filter((j) => j.id != null)
        let failed = captions.length - jobs.length
        for (let i = 0; i < jobs.length; i += 3) {
          const res = await Promise.allSettled(jobs.slice(i, i + 3).map((j) => apiFetch(`/upload/event-image/${j.id}`, { method: 'PATCH', body: { caption: j.caption } })))
          failed += res.filter((r) => r.status === 'rejected').length
        }
        if (failed) warnings.push(`${failed} ${failed === 1 ? 'caption' : 'captions'} did not save. You can add ${failed === 1 ? 'it' : 'them'} by editing the story.`)
      } catch {
        warnings.push('The captions did not save. You can add them by editing the story.')
      }
    }
    if (tags.length) {
      this.sub('publish', { step: 'people' })
      try {
        await apiFetch(`/events/${event.id}/tags`, { method: 'POST', body: { tags } })
      } catch {
        warnings.push('The people you tagged were not added. You can tag them from the story.')
      }
    }
    this.sub('publish', { state: 'done', step: null, result: { event, warnings, asDraft } })
  }
  clearPublish() { this.sub('publish', { state: 'idle', step: null, error: null }) }
}

export function useMaker(maker) {
  return useSyncExternalStore(maker.subscribe, maker.getState, maker.getState)
}
