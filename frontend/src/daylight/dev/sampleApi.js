// The sample backend (owner: F0). PLAN-DAYLIGHT 5.6. Pure ESM with no browser or Node
// globals, so the dev middleware (scripts/daylight/vite-seam.mjs, through ssrLoadModule)
// and a future in-browser shim can both use it.
//
//   createState(snapshot) -> state         snapshot: scripts/daylight/fixtures/sample.json
//   answer({method, path, query, body, auth}, state) -> {status, json} | undefined
//        path is after /api/v1 ("/events/110"); undefined means "no sample answer" (the
//        middleware logs it and returns 404, and capture.mjs fails the run)
//   answerSupabase({method, path, query}, state) -> {status, json}     the stub auth server
//   signinPage(as, next) -> HTML for /__fx/signin?as=maya&next=/feed
//   fixtureFile(urlPath) -> {path} | {svg} | null                       /__fx/* files
//
// Packages extend it without editing this file: add src/daylight/<pkg>/sample.js
// exporting answer(req, state, helpers) -> {status, json} | undefined. Extensions are asked
// first, in package order.
//
// Special sample routes: /event/403 (audience does not include you), /event/lapsed-plan
// (the author's plan has lapsed), /event/404, /share/tetons-share (a working share link),
// /share/expired-share (410).
import { toShare } from '../../../scripts/daylight/fixtures/contract.mjs'

const EXTENSIONS = Object.entries(import.meta.glob('../*/sample.js', { eager: true }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m)
  .filter((m) => typeof m.answer === 'function')

const clone = (x) => JSON.parse(JSON.stringify(x))
const ok = (json) => ({ status: 200, json })
const err = (status, detail) => ({ status, json: { detail } })
let seq = 1

export function createState(snapshot) {
  const s = clone(snapshot)
  // Most real users are on the dark theme (AuthContext defaults to it): sample as they do,
  // so the classic-variable bridge is always exercised.
  for (const k of Object.keys(s.me)) s.me[k].theme_preference = 'dark'
  return {
    db: s,
    viewer: 'maya',
    origin: 'http://127.0.0.1:5330',
    uploaded: [],
    nextEventId: 900,
    nextCommentId: 90000,
  }
}

function withOrigin(json, origin) {
  if (json == null) return json
  const t = JSON.stringify(json)
  return t.includes('__ORIGIN__') ? JSON.parse(t.split('__ORIGIN__').join(origin)) : json
}

function nearest(gaz, lat, lng) {
  let best = null, d = Infinity
  for (const g of gaz) {
    const dd = (g.lat - lat) ** 2 + ((g.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (dd < d) { d = dd; best = g }
  }
  return best
}

const viewerUser = (st) => st.db.users[st.viewer]
const detailOf = (st, ident) => {
  const id = /^\d+$/.test(ident) ? Number(ident) : st.db.slugs[ident]
  return id != null ? st.db.details[id] : null
}
const extrasOf = (st, id) => (st.db.extras[id] ||= { comments: [], likes: { like_count: 0, is_liked: false, recent_likes: [] }, likesAll: [], tags: [] })

function core(req, st) {
  const { method: m, path: p, query: q = {}, body } = req
  const db = st.db
  let r
  const is = (re) => (r = p.match(re))

  // ---------------------------------------------------------------- me and people
  if (m === 'GET' && p === '/users/me') return ok(db.me[st.viewer])
  if (m === 'GET' && p === '/users/search/users') {
    const term = String(q.q || '').toLowerCase()
    return ok(Object.values(db.users).filter((u) => term && (u.username.includes(term) || u.full_name.toLowerCase().includes(term))).map((u) => ({ id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url })))
  }
  if (m === 'GET' && is(/^\/users\/([^/]+)\/is-following(-me)?$/)) {
    const key = Object.keys(db.users).find((k) => db.users[k].username === r[1])
    const yes = r[2] ? db.followers.includes(key) : db.following.includes(key)
    return ok({ is_following: !!yes, status: yes ? 'accepted' : null })
  }
  if ((m === 'POST' || m === 'DELETE') && is(/^\/users\/([^/]+)\/follow$/)) return ok({ status: m === 'POST' ? 'pending' : 'removed', message: 'ok' })
  if ((m === 'POST' || m === 'DELETE') && is(/^\/users\/(\d+)\/mute$/)) {
    const u = Object.values(db.users).find((x) => x.id === Number(r[1]))
    const muted = (db.routes['GET /users/me/muted'] ||= [])
    if (m === 'POST' && u && !muted.some((x) => x.id === u.id)) muted.push({ id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url })
    if (m === 'DELETE') db.routes['GET /users/me/muted'] = muted.filter((x) => x.id !== Number(r[1]))
    return ok({ message: 'ok' })
  }
  if (m === 'GET' && is(/^\/users\/([^/]+)$/) && db.profiles[r[1]]) return ok(db.profiles[r[1]])

  // ---------------------------------------------------------------- events
  if (m === 'GET' && p === '/events') {
    const skip = Number(q.skip || 0), limit = Number(q.limit || 100)
    let list = db.list
    if (q.order_by === 'upload_date') list = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    return ok(list.slice(skip, skip + limit))
  }
  if (m === 'GET' && p === '/events/403') {
    return { status: 403, json: { detail: { message: "You don't have permission to view this event", privacy_level: 'close_family', privacy_display: 'Close Family', privacy_description: 'Only people Kate has marked as close family can open this story.', author_username: 'kate', author_full_name: 'Kate Brennan', requires_auth: false, requires_follow: true, follow_request_pending: false } } }
  }
  if (m === 'GET' && p === '/events/lapsed-plan') {
    return { status: 403, json: { detail: { message: 'Upgrade to Premium to view this event, or follow this user to see their content.', subscription_required: true, author_username: 'deb', author_full_name: 'Deb Walsh' } } }
  }
  if (m === 'GET' && is(/^\/events\/([^/]+)$/) && !['drafts', 'trash'].includes(r[1])) {
    const d = detailOf(st, r[1])
    if (!d) return err(404, 'Event not found')
    d.view_count = (d.view_count || 0) + 1
    const ex = extrasOf(st, d.id)
    return ok({ ...d, like_count: ex.likes.like_count, comment_count: ex.comments.length })
  }
  if (m === 'POST' && p === '/events') {
    const u = viewerUser(st)
    const id = st.nextEventId++
    const now = '2026-11-26T12:00:00'
    const d = {
      title: '', short_title: null, summary: null, description: '', start_date: now, end_date: null, location_name: null, latitude: null, longitude: null,
      cover_image_url: null, has_multiple_locations: false, privacy_level: 'followers', category: null, category_2: null, custom_group_id: null,
      ...body, gps_locations: undefined,
      id, slug: `sample-${id}`, author_id: u.id, author_username: u.username, author_full_name: u.full_name, view_count: 0, like_count: 0, comment_count: 0,
      is_published: q.is_published !== 'false', share_enabled: false, share_expires_at: null, created_at: now, updated_at: now, content_blocks: [],
      locations: markerLocations(body?.description || '', id), event_images: imagesFromHtml(body?.description || '', id),
    }
    delete d.gps_locations
    db.details[id] = d
    db.slugs[d.slug] = id
    if (d.is_published) db.list.unshift({ ...d, description: '', short_title: null, category_2: null, like_count: 0, comment_count: 0, locations: [], event_images: [] })
    return { status: 201, json: d }
  }
  if (m === 'PUT' && is(/^\/events\/(\d+)$/)) {
    const d = db.details[r[1]]
    if (!d) return err(404, 'Event not found')
    Object.assign(d, body || {})
    return ok(d)
  }
  if (m === 'GET' && is(/^\/events\/(\d+)\/comments$/)) return ok(extrasOf(st, r[1]).comments)
  if (m === 'POST' && is(/^\/events\/(\d+)\/comments$/)) {
    const u = viewerUser(st)
    const ex = extrasOf(st, r[1])
    const parent = ex.comments.find((c) => c.id === body?.parent_id)
    const c = {
      id: st.nextCommentId++, event_id: Number(r[1]), author_id: u.id, author_username: u.username, author_full_name: u.full_name, author_display_name: u.full_name,
      author_avatar_url: u.avatar_url, content: body?.content || '', created_at: '2026-11-26T12:00:00Z', parent_id: body?.parent_id ?? null,
      depth: parent ? (parent.depth || 0) + 1 : 0, reaction_count: 0, reaction_counts: {}, user_reaction: null,
    }
    ex.comments.push(c)
    return { status: 201, json: c }
  }
  if (m === 'DELETE' && is(/^\/events\/(\d+)\/comments\/(\d+)$/)) {
    const ex = extrasOf(st, r[1])
    ex.comments = ex.comments.filter((c) => c.id !== Number(r[2]))
    return ok({ message: 'deleted' })
  }
  if ((m === 'POST' || m === 'DELETE') && is(/^\/events\/(\d+)\/comments\/(\d+)\/reactions$/)) {
    const c = extrasOf(st, r[1]).comments.find((x) => x.id === Number(r[2]))
    if (!c) return err(404, 'Comment not found')
    const rc = (c.reaction_counts ||= {})
    if (c.user_reaction) rc[c.user_reaction] = Math.max(0, (rc[c.user_reaction] || 1) - 1)
    c.user_reaction = m === 'POST' ? body?.reaction_type || 'heart' : null
    if (c.user_reaction) rc[c.user_reaction] = (rc[c.user_reaction] || 0) + 1
    c.reaction_count = Object.values(rc).reduce((a, b) => a + b, 0)
    return ok({ message: 'ok', reaction_counts: rc })
  }
  if (m === 'GET' && is(/^\/events\/(\d+)\/likes$/)) return ok(extrasOf(st, r[1]).likes)
  if (m === 'GET' && is(/^\/events\/(\d+)\/likes\/all$/)) return ok(extrasOf(st, r[1]).likesAll)
  if ((m === 'POST' || m === 'DELETE') && is(/^\/events\/(\d+)\/likes$/)) {
    const ex = extrasOf(st, r[1])
    const u = viewerUser(st)
    const on = m === 'POST'
    if (on !== ex.likes.is_liked) {
      ex.likes.is_liked = on
      ex.likes.like_count = Math.max(0, ex.likes.like_count + (on ? 1 : -1))
      ex.likesAll = on ? [{ id: seq++, user_id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, created_at: '2026-11-26T12:00:00Z' }, ...ex.likesAll] : ex.likesAll.filter((l) => l.user_id !== u.id)
      ex.likes.recent_likes = ex.likesAll.slice(0, 3)
    }
    return ok({ message: 'ok', like_count: ex.likes.like_count })
  }
  if (m === 'GET' && is(/^\/events\/(\d+)\/tags$/)) return ok(extrasOf(st, r[1]).tags)
  if (m === 'POST' && is(/^\/events\/(\d+)\/tags$/)) return ok([])
  if (m === 'GET' && is(/^\/events\/(\d+)\/locations$/)) return ok(db.details[r[1]]?.locations || [])
  if (m === 'GET' && is(/^\/events\/(\d+)\/share$/)) return err(404, 'No share link')
  if (m === 'POST' && is(/^\/events\/(\d+)\/share$/)) {
    const days = body?.expires_in_days || 3
    return ok({ share_token: 'tetons-share', share_url: '/share/tetons-share', expires_at: `2026-12-0${Math.min(9, days)}T10:00:00`, view_count: 0, shared_on: '2026-11-26T12:00:00' })
  }
  if (m === 'GET' && is(/^\/share\/([^/]+)$/)) {
    if (r[1] === 'expired-share') return err(410, 'Share link has expired')
    const id = db.share[r[1]]
    const d = id != null ? db.details[id] : null
    if (!d) return err(404, 'Share link not found or expired')
    return ok({
      event: toShare(d),
      share_context: { is_shared_link: true, expires_at: '2026-12-01T10:00:00', author_username: d.author_username, author_full_name: d.author_full_name, viewer_status: req.auth ? 'following' : 'anonymous', message: req.auth ? 'Shared link (you already follow this user)' : `Sign up to follow @${d.author_username} and see more events` },
    })
  }

  // ---------------------------------------------------------------- photos
  if (m === 'GET' && p === '/media/batch/stats') return ok(String(q.ids || '').split(',').filter(Boolean).map((id) => db.mediaStats[id] || { media_id: Number(id), like_count: 0, comment_count: 0, is_liked: false, user_reaction: null, reaction_counts: null }))
  if (m === 'GET' && p === '/media/batch/likes') return ok(String(q.ids || '').split(',').filter(Boolean).map((id) => ({ media_id: Number(id), like_count: db.mediaStats[id]?.like_count || 0, is_liked: !!db.mediaStats[id]?.is_liked })))
  if (m === 'GET' && is(/^\/media\/(\d+)\/likes$/)) {
    const s = db.mediaStats[r[1]] || {}
    return ok({ like_count: s.like_count || 0, is_liked: !!s.is_liked, user_reaction: s.user_reaction || null, reaction_counts: s.reaction_counts || {}, recent_likes: [] })
  }
  if ((m === 'POST' || m === 'DELETE') && is(/^\/media\/(\d+)\/likes$/)) {
    const s = (db.mediaStats[r[1]] ||= { media_id: Number(r[1]), like_count: 0, comment_count: 0, is_liked: false, user_reaction: null, reaction_counts: {} })
    const rc = (s.reaction_counts ||= {})
    if (s.user_reaction) rc[s.user_reaction] = Math.max(0, (rc[s.user_reaction] || 1) - 1)
    s.user_reaction = m === 'POST' ? body?.reaction_type || 'heart' : null
    if (s.user_reaction) rc[s.user_reaction] = (rc[s.user_reaction] || 0) + 1
    s.is_liked = !!s.user_reaction
    s.like_count = Object.values(rc).reduce((a, b) => a + b, 0)
    return ok({ message: 'ok', like_count: s.like_count })
  }
  if (m === 'GET' && is(/^\/media\/(\d+)\/comments$/)) return ok([])
  if (m === 'GET' && is(/^\/upload\/event-images\/(\d+)$/)) return ok(db.details[r[1]]?.event_images || [])
  if (m === 'PATCH' && is(/^\/upload\/event-image\/(\d+)$/)) {
    for (const d of Object.values(db.details)) {
      const im = d.event_images.find((x) => x.id === Number(r[1]))
      if (im) { Object.assign(im, body || {}); return ok(im) }
    }
    return err(404, 'Image not found')
  }

  // ---------------------------------------------------------------- create, AI, places
  if (m === 'POST' && p === '/upload') {
    const url = db.uploads[st.uploaded.length % db.uploads.length]
    st.uploaded.push(url)
    return ok({ filename: url.split('/').pop(), url, urls: { thumbnail: url, medium: url, full: url }, metadata: {} })
  }
  if (m === 'GET' && p === '/geocoding/reverse') {
    const lat = Number(q.latitude ?? q.lat), lng = Number(q.longitude ?? q.lon ?? q.lng)
    const g = nearest(db.gazetteer, lat, lng)
    return ok(g ? { name: g.name, latitude: lat, longitude: lng, type: 'tourism', place_id: Math.round(g.lat * 1000), address: g.address } : { name: null, latitude: lat, longitude: lng, address: {} })
  }
  if (m === 'POST' && p === '/admin/ai/transcribe') return ok({ text: db.ai.transcript })
  if (m === 'POST' && p === '/admin/ai/generate-questions') return ok({ questions: db.ai.questions, context_summary: 'A family trip.' })
  if (m === 'POST' && p === '/admin/ai/generate-story') {
    const photos = body?.photos || []
    const html = photos.map((ph, i) => `${i === 0 ? '<h1>The trip</h1><p>Written from the photos in the sample.</p>' : ''}<p><img src="${ph.url || ph.image_url || ph}"></p>`).join('')
    return ok({ suggested_title: 'Seven days in the Tetons', story_html: html, suggested_category: 'Vacation', location_name: 'Grand Teton National Park, Wyoming', original_text: body?.user_text || '', photo_captions: photos.map((ph) => ({ image_url: ph.url || ph.image_url || ph, caption: '' })) })
  }

  // ---------------------------------------------------------------- recorded GETs
  if (m === 'GET' && db.routes[`GET ${p}`] !== undefined) return ok(db.routes[`GET ${p}`])
  // lists the classic pages read that the sample family has nothing in
  if (m === 'GET' && ['/me/tag-requests/sent', '/relationships/pending', '/relationships/sent', '/users/me/blocked'].includes(p)) return ok([])
  return undefined
}

function markerLocations(html, eventId) {
  const out = []
  const re = /<span[^>]*data-location-marker[^>]*>/g
  let mm, i = 0
  while ((mm = re.exec(html))) {
    const a = (n) => (mm[0].match(new RegExp(`data-${n}="([^"]*)"`)) || [])[1]
    if (!a('latitude')) continue
    out.push({ id: eventId * 10 + i, event_id: eventId, location_name: a('location-name'), latitude: Number(a('latitude')), longitude: Number(a('longitude')), location_type: 'inline_marker', timestamp: a('timestamp') || null, order_index: i++, section_id: null, section_title: null, associated_image_url: null, additional_data: null, created_at: null, updated_at: null })
  }
  return out
}
function imagesFromHtml(html, eventId) {
  const out = []
  const re = /<img[^>]*src="([^"]+)"/g
  let mm, i = 0
  while ((mm = re.exec(html))) {
    out.push({ id: eventId * 100 + i, event_id: eventId, image_url: mm[1], caption: null, latitude: null, longitude: null, timestamp: null, order_index: i++, alt_text: null, width: null, height: null, file_size: null, media_type: 'image', duration_seconds: null, video_thumbnail_url: null, processing_status: 'ready', original_size: null, compressed_size: null, created_at: null, updated_at: null })
  }
  return out
}

export async function answer(req, state) {
  const helpers = { ok, err, clone, detailOf: (ident) => detailOf(state, ident), extrasOf: (id) => extrasOf(state, id) }
  for (const ext of EXTENSIONS) {
    const r = await ext.answer(req, state, helpers)
    if (r) return { status: r.status, json: withOrigin(r.json, state.origin) }
  }
  const r = core(req, state)
  return r ? { status: r.status, json: withOrigin(r.json, state.origin) } : undefined
}

// ---------------------------------------------------------------- the stub auth server
export const SB_USER = (st) => ({
  id: `00000000-0000-4000-8000-${String(st.db.users[st.viewer]?.id || 1).padStart(12, '0')}`,
  aud: 'authenticated', role: 'authenticated', email: `${st.viewer}@example.test`, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2025-11-02T09:00:00Z',
})
export function answerSupabase({ method, path }, state) {
  if (path.startsWith('/auth/v1/user')) return ok(SB_USER(state))
  if (path.startsWith('/auth/v1/token')) return ok({ access_token: 'sample.sample.sample', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: 4102444800, refresh_token: 'sample', user: SB_USER(state) })
  if (path.startsWith('/auth/v1/logout')) return { status: 204, json: null }
  void method
  return ok({})
}

/** /__fx/viewer?as=maya: switch the signed-in sample person. */
export function setViewer(state, as) {
  if (state.db.users[as]) state.viewer = as
  return { user: SB_USER(state), appId: state.db.users[state.viewer].id }
}

/** /__fx/signin?as=maya&next=/feed: writes the stub Supabase session (key read at run time) and redirects. */
export function signinPage(as = 'maya', next = '/feed') {
  const safeAs = String(as).replace(/[^a-z]/g, '') || 'maya'
  const safeNext = /^\/[^/]/.test(next) || next === '/' ? next : '/feed'
  return `<!doctype html><meta charset="utf-8"><title>Signing in as ${safeAs}</title>
<p style="font:16px system-ui;padding:24px">Signing in to the sample as ${safeAs}…</p>
<script type="module">
  const res = await fetch('/__fx/viewer?as=${safeAs}')
  const { user, appId } = await res.json()
  const { supabase } = await import('/src/lib/supabaseClient.js')
  const s = { access_token: 'sample.sample.sample', refresh_token: 'sample', token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, user }
  localStorage.setItem(supabase.auth.storageKey, JSON.stringify(s))
  localStorage.setItem('theme', 'dark')
  localStorage.setItem('pwa-install-dismissed', 'true')
  localStorage.setItem('welcome_dismissed_' + appId, 'true')
  location.replace(${JSON.stringify(safeNext)})
</script>`
}

/** Files under /__fx/: avatars, the race video, raw art stand-ins, labelled photo placeholders. */
export function fixtureFile(urlPath) {
  const base = urlPath.split('/').pop()
  if (urlPath.startsWith('/__fx/avatar/')) return { path: `scripts/landing/fixtures/avatars/${base}` }
  if (urlPath.startsWith('/__fx/video/')) return { path: `scripts/landing/fixtures/video/${base}` }
  if (urlPath.startsWith('/__fx/raw/') || urlPath.startsWith('/__fx/ph/')) {
    const id = base.replace(/\.(png|svg|webp|jpg)$/, '')
    return { svg: placeholderSvg(id) }
  }
  return null
}

const PH_WASHES = ['#3AA8FF', '#C6F135', '#19CFC7', '#FF8A1F', '#A98BFF', '#FFD43B', '#FF62C4']
function placeholderSvg(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const n = (id.match(/(\d+)$/) || [])[1]
  const wash = PH_WASHES[(n ? Number(n) : h) % PH_WASHES.length]
  const label = id.replace(/^photo-/, '').replace(/-/g, ' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
<rect width="1600" height="1200" fill="${wash}"/>
<path d="M0 900 L420 520 L640 720 L900 380 L1240 760 L1600 560 L1600 1200 L0 1200Z" fill="#101B3B" fill-opacity=".18"/>
<circle cx="1260" cy="300" r="110" fill="#fff" fill-opacity=".55"/>
<rect x="64" y="64" width="${Math.max(520, label.length * 34 + 80)}" height="120" rx="16" fill="#fff" stroke="#101B3B" stroke-width="6"/>
<text x="104" y="144" font-family="Menlo, monospace" font-size="52" fill="#101B3B">${label.toUpperCase()}</text>
<text x="64" y="1130" font-family="Menlo, monospace" font-size="40" fill="#101B3B" fill-opacity=".7">SAMPLE PHOTO PLACEHOLDER</text>
</svg>`
}
