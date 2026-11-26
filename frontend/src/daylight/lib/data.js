// The Daylight data layer (owner: F0). Wraps the backend through lib/http.js (which uses
// services/api.js for auth and never edits it). Every read throws on failure and nothing
// here ever returns mock data: a page shows an honest error with Retry.
//
//   useFeed({orderBy}) -> {events, loading, error, hasMore, loadMore, refresh, loadAll}
//   usePeople() -> {following, faceFor(username, fullName?), muted, refreshMuted, me, loading}
//   useStory(idOrSlug, {shareToken}) -> {event, images, locations, privacyError, error, shareContext, loading, reload}
//   useStoryExtras(eventId, {shareToken}) -> {comments, tags, likes, loading, error, actions}
//   useMediaStats(mediaIds) -> {stats, react(id, type), unreact(id), loading}
//   useNotificationCounts() -> {total, follow_requests, tag_requests, profile_claims}
//   searchPeople(query) -> Promise<[{id, username, full_name, avatar_url}]>
//   imageSrc(url, 'micro'|'small'|'medium'|'original')   imageSrcSet(url) -> "u400 400w, u1200 1200w"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getImageUrl } from '../../utils/cloudinaryUrl.js'
import { apiFetch, HttpError } from './http.js'

export { HttpError }

const PAGE = 100
const CAP = 500

// ---------------------------------------------------------------- tiny store
function createStore(initial) {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
      subs.forEach((f) => f())
    },
    subscribe(f) {
      subs.add(f)
      return () => subs.delete(f)
    },
  }
}

// ---------------------------------------------------------------- feed
// One cache per order, kept across pages, so Back returns to the same list instantly.
const feeds = new Map()
function feedStore(orderBy) {
  if (!feeds.has(orderBy)) {
    feeds.set(orderBy, createStore({ events: [], loading: false, error: null, done: false, fetchedAt: 0, inflight: null }))
  }
  return feeds.get(orderBy)
}

async function loadPage(orderBy, reset) {
  const st = feedStore(orderBy)
  const cur = st.get()
  if (cur.inflight) return cur.inflight
  if (!reset && (cur.done || cur.events.length >= CAP)) return
  const skip = reset ? 0 : cur.events.length
  const p = (async () => {
    st.set({ loading: true, error: null })
    try {
      const page = await apiFetch('/events', { query: { order_by: orderBy, skip, limit: PAGE } })
      const list = Array.isArray(page) ? page : []
      st.set((s) => {
        const base = reset ? [] : s.events
        const seen = new Set(base.map((e) => e.id))
        const events = [...base, ...list.filter((e) => !seen.has(e.id))].slice(0, CAP)
        return { events, done: list.length < PAGE || events.length >= CAP, fetchedAt: Date.now(), loading: false }
      })
    } catch (e) {
      st.set({ error: e, loading: false })
    } finally {
      st.set({ inflight: null })
    }
  })()
  st.set({ inflight: p })
  return p
}

/**
 * The paged story list (GET /events?order_by=&skip=&limit=100). The first 100 load at
 * once; loadMore() fetches the next page (one request at a time, cap 500); loadAll()
 * keeps paging to the cap (the calendar and the map need every story).
 * orderBy: 'event_date' (the date it happened) or 'upload_date' (the date posted).
 * List items are production-shaped: no description, images, locations or counts.
 */
export function useFeed({ orderBy = 'event_date' } = {}) {
  const st = feedStore(orderBy)
  const s = useSyncExternalStore(st.subscribe, st.get, st.get)
  useEffect(() => {
    const cur = st.get()
    if (!cur.fetchedAt && !cur.inflight) loadPage(orderBy, true)
    else if (Date.now() - cur.fetchedAt > 60000 && !cur.inflight) loadPage(orderBy, true)
  }, [orderBy])
  const loadMore = useCallback(() => loadPage(orderBy, false), [orderBy])
  const refresh = useCallback(() => loadPage(orderBy, true), [orderBy])
  const loadAll = useCallback(async () => {
    for (let i = 0; i < CAP / PAGE; i++) {
      const cur = feedStore(orderBy).get()
      if (cur.done || cur.events.length >= CAP || cur.error) return
      await loadPage(orderBy, false)
    }
  }, [orderBy])
  return {
    events: s.events,
    loading: s.loading || (!s.fetchedAt && !s.error),
    error: s.error,
    hasMore: !s.done && s.events.length < CAP,
    loadMore,
    refresh,
    loadAll,
  }
}

// ---------------------------------------------------------------- people
const people = createStore({ following: [], muted: [], loading: false, fetchedFor: null, error: null })
async function loadPeople(userId) {
  people.set({ loading: true, fetchedFor: userId })
  try {
    const [following, muted] = await Promise.all([
      apiFetch('/users/me/following').catch(() => []),
      apiFetch('/users/me/muted').catch(() => []),
    ])
    people.set({ following: following || [], muted: muted || [], loading: false, error: null })
  } catch (e) {
    people.set({ loading: false, error: e })
  }
}

/**
 * People the signed-in person follows (with their real photos) and the muted list.
 * faceFor(username, fullName) -> {username, name, avatarUrl|null}. Avatars are joined
 * client-side because list items carry no author avatar; anyone else gets initials.
 * loaded: true once this person's lists have arrived (always true signed out).
 */
export function usePeople() {
  const { user } = useAuth() || {}
  const s = useSyncExternalStore(people.subscribe, people.get, people.get)
  useEffect(() => {
    if (user?.id && people.get().fetchedFor !== user.id) loadPeople(user.id)
  }, [user?.id])
  const index = useMemo(() => {
    const m = new Map()
    for (const f of s.following) m.set(f.username, { username: f.username, name: f.full_name || f.display_name || f.username, avatarUrl: f.avatar_url || null })
    if (user) m.set(user.username, { username: user.username, name: user.full_name || user.display_name || user.username, avatarUrl: user.avatar_url || null })
    return m
  }, [s.following, user])
  const faceFor = useCallback(
    (username, fullName) => index.get(username) || { username, name: fullName || username || 'Someone', avatarUrl: null },
    [index],
  )
  const refreshMuted = useCallback(async () => {
    const muted = await apiFetch('/users/me/muted')
    people.set({ muted: muted || [] })
    return muted
  }, [])
  // loaded: the follow and muted lists for this person have arrived (or there is no one signed in)
  const loaded = !user?.id || (s.fetchedFor === user.id && !s.loading)
  return { following: s.following, faceFor, muted: s.muted, refreshMuted, me: user || null, loading: s.loading, loaded }
}

// ---------------------------------------------------------------- story
// GET /events/{id} increments view_count (events.py:636). StrictMode mounts effects twice,
// so identical requests within two seconds share one response.
const recent = new Map()
function once(key, fn) {
  const hit = recent.get(key)
  if (hit && Date.now() - hit.at < 2000) return hit.p
  const p = fn()
  recent.set(key, { at: Date.now(), p })
  return p
}

/**
 * One story. With shareToken it reads GET /share/{token} (any audience, no account).
 * privacyError: {status:403, ...the server's detail} when the audience does not include
 * the reader (or their plan has lapsed: subscription_required), {status:404, kind:'not_found'},
 * {status:410, kind:'expired'} for an ended share link. error: anything else (Retry).
 */
export function useStory(idOrSlug, { shareToken } = {}) {
  const [s, setS] = useState({ event: null, shareContext: null, privacyError: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!idOrSlug && !shareToken) return
    let live = true
    setS((x) => ({ ...x, loading: true, error: null, privacyError: null }))
    const key = shareToken ? `share:${shareToken}:${nonce}` : `event:${idOrSlug}:${nonce}`
    once(key, () => (shareToken ? apiFetch(`/share/${encodeURIComponent(shareToken)}`) : apiFetch(`/events/${encodeURIComponent(idOrSlug)}`)))
      .then((res) => {
        if (!live) return
        if (shareToken) setS({ event: res?.event || null, shareContext: res?.share_context || null, privacyError: null, error: null, loading: false })
        else setS({ event: res, shareContext: null, privacyError: null, error: null, loading: false })
      })
      .catch((e) => {
        if (!live) return
        if (e instanceof HttpError && e.status === 403) setS({ event: null, shareContext: null, privacyError: { status: 403, ...(e.data?.detail || {}) }, error: null, loading: false })
        else if (e instanceof HttpError && (e.status === 404 || e.status === 410)) setS({ event: null, shareContext: null, privacyError: { status: e.status, kind: e.status === 410 ? 'expired' : 'not_found' }, error: null, loading: false })
        else setS({ event: null, shareContext: null, privacyError: null, error: e, loading: false })
      })
    return () => {
      live = false
    }
  }, [idOrSlug, shareToken, nonce])
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return {
    event: s.event,
    images: s.event?.event_images || [],
    locations: s.event?.locations || [],
    shareContext: s.shareContext,
    privacyError: s.privacyError,
    error: s.error,
    loading: s.loading,
    reload,
  }
}

/**
 * Comments, tagged people and likes for a story, fetched in parallel, plus actions.
 * likes: {like_count, is_liked, recent_likes, all}. comments: the API's list (flat, with
 * parent_id; replies nest three levels). actions: like() unlike() toggleLike()
 * comment(content, parentId) deleteComment(id) reactToComment(id, type)
 * unreactComment(id) reload(). Like is optimistic. With shareToken, writes are disabled.
 */
export function useStoryExtras(eventId, { shareToken } = {}) {
  const [s, setS] = useState({ comments: [], tags: [], likes: { like_count: 0, is_liked: false, recent_likes: [], all: [] }, loading: true, error: null })
  const [nonce, setNonce] = useState(0)
  const { user } = useAuth() || {}
  useEffect(() => {
    if (!eventId) return
    let live = true
    const q = shareToken ? { share_token: shareToken } : undefined
    Promise.all([
      apiFetch(`/events/${eventId}/comments`, { query: q }),
      apiFetch(`/events/${eventId}/tags`, { query: q }),
      user && !shareToken ? apiFetch(`/events/${eventId}/likes`) : Promise.resolve(null),
      apiFetch(`/events/${eventId}/likes/all`, { query: q }).catch(() => []),
    ])
      .then(([comments, tags, mine, all]) => {
        if (!live) return
        const likes = {
          like_count: mine?.like_count ?? (all || []).length,
          is_liked: !!mine?.is_liked,
          recent_likes: mine?.recent_likes || [],
          all: all || [],
        }
        setS({ comments: comments || [], tags: tags || [], likes, loading: false, error: null })
      })
      .catch((e) => live && setS((x) => ({ ...x, loading: false, error: e })))
    return () => {
      live = false
    }
  }, [eventId, shareToken, nonce, user?.id])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const actions = useMemo(() => {
    const guard = () => {
      if (shareToken) throw new Error('Sign in to like or comment')
    }
    const setLike = async (on) => {
      guard()
      setS((x) => ({ ...x, likes: { ...x.likes, is_liked: on, like_count: Math.max(0, x.likes.like_count + (on ? 1 : -1)) } }))
      try {
        await apiFetch(`/events/${eventId}/likes`, { method: on ? 'POST' : 'DELETE' })
      } catch (e) {
        setS((x) => ({ ...x, likes: { ...x.likes, is_liked: !on, like_count: Math.max(0, x.likes.like_count + (on ? -1 : 1)) } }))
        throw e
      }
    }
    return {
      like: () => setLike(true),
      unlike: () => setLike(false),
      toggleLike: () => setLike(!s.likes.is_liked),
      async comment(content, parentId = null) {
        guard()
        const c = await apiFetch(`/events/${eventId}/comments`, { method: 'POST', body: parentId ? { content, parent_id: parentId } : { content } })
        setS((x) => ({ ...x, comments: [...x.comments, c] }))
        return c
      },
      async deleteComment(id) {
        guard()
        await apiFetch(`/events/${eventId}/comments/${id}`, { method: 'DELETE' })
        setS((x) => ({ ...x, comments: x.comments.filter((c) => c.id !== id) }))
      },
      async reactToComment(id, type = 'heart') {
        guard()
        await apiFetch(`/events/${eventId}/comments/${id}/reactions`, { method: 'POST', body: { reaction_type: type } })
        reload()
      },
      async unreactComment(id) {
        guard()
        await apiFetch(`/events/${eventId}/comments/${id}/reactions`, { method: 'DELETE' })
        reload()
      },
      reload,
    }
  }, [eventId, shareToken, s.likes.is_liked, reload])

  return { comments: s.comments, tags: s.tags, likes: s.likes, loading: s.loading, error: s.error, actions }
}

/**
 * Photo reactions for a set of event_images ids (GET /media/batch/stats). Call it when
 * the first photo nears the screen, not on load. stats: {[id]: {like_count,
 * comment_count, is_liked, user_reaction, reaction_counts}}. react and unreact are optimistic.
 */
export function useMediaStats(mediaIds) {
  const ids = useMemo(() => [...new Set((mediaIds || []).filter((x) => x != null).map(Number))].sort((a, b) => a - b), [mediaIds])
  const key = ids.join(',')
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!ids.length) return
    let live = true
    setLoading(true)
    apiFetch('/media/batch/stats', { query: { ids: key } })
      .then((rows) => {
        if (!live) return
        const m = {}
        for (const r of rows || []) m[r.media_id] = r
        setStats(m)
      })
      .catch(() => {})
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [key])
  const apply = (id, type) =>
    setStats((m) => {
      const cur = m[id] || { like_count: 0, reaction_counts: {}, user_reaction: null, is_liked: false }
      const rc = { ...(cur.reaction_counts || {}) }
      if (cur.user_reaction) rc[cur.user_reaction] = Math.max(0, (rc[cur.user_reaction] || 1) - 1)
      if (type) rc[type] = (rc[type] || 0) + 1
      const n = Object.values(rc).reduce((a, b) => a + b, 0)
      return { ...m, [id]: { ...cur, reaction_counts: rc, user_reaction: type, is_liked: !!type, like_count: n } }
    })
  const react = useCallback(async (id, type = 'heart') => {
    const before = stats[id]
    apply(id, type)
    try {
      await apiFetch(`/media/${id}/likes`, { method: 'POST', body: { reaction_type: type } })
    } catch (e) {
      setStats((m) => ({ ...m, [id]: before }))
      throw e
    }
  }, [stats])
  const unreact = useCallback(async (id) => {
    const before = stats[id]
    apply(id, null)
    try {
      await apiFetch(`/media/${id}/likes`, { method: 'DELETE' })
    } catch (e) {
      setStats((m) => ({ ...m, [id]: before }))
      throw e
    }
  }, [stats])
  return { stats, react, unreact, loading }
}

// ---------------------------------------------------------------- shell helpers
const counts = createStore({ total: 0, follow_requests: 0, tag_requests: 0, profile_claims: 0 })
let pollers = 0
let timer = null
async function pollCounts() {
  if (typeof document !== 'undefined' && document.hidden) return
  try {
    counts.set(await apiFetch('/users/me/notification-counts'))
  } catch {
    /* keep the last value */
  }
}
/** GET /users/me/notification-counts every 30s while signed in, paused while the tab is hidden. */
export function useNotificationCounts() {
  const { user } = useAuth() || {}
  const s = useSyncExternalStore(counts.subscribe, counts.get, counts.get)
  const onVis = useRef(() => !document.hidden && pollCounts())
  useEffect(() => {
    if (!user) return
    if (pollers++ === 0) {
      pollCounts()
      timer = setInterval(pollCounts, 30000)
      document.addEventListener('visibilitychange', onVis.current)
    }
    return () => {
      if (--pollers === 0) {
        clearInterval(timer)
        document.removeEventListener('visibilitychange', onVis.current)
      }
    }
  }, [user?.id])
  return s
}

/** People search (GET /users/search/users?q=). */
export function searchPeople(query, { signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return Promise.resolve([])
  return apiFetch('/users/search/users', { query: { q }, signal, auth: true })
}

// ---------------------------------------------------------------- images
/** A delivery-size URL (R2 resizing, legacy Cloudinary, or the URL unchanged). */
export function imageSrc(url, size = 'medium') {
  if (!url) return ''
  try {
    return getImageUrl(url, size) || url
  } catch {
    return url
  }
}
/** srcset for a cover or photo: small (400w) and medium (1200w), when the host resizes. */
export function imageSrcSet(url) {
  if (!url) return undefined
  const a = imageSrc(url, 'small'), b = imageSrc(url, 'medium')
  if (a === b) return undefined
  return `${a} 400w, ${b} 1200w`
}
