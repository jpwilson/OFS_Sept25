// The family tree's data (owner: FAMILY). docs/app/FAMILY.md sections 1 and 5.
//
//   useFamily() -> {status: 'loading'|'ready'|'error', error, relationships, tags, pending, sent,
//                   requestsLoaded, fresh: Set<id>, reload, actions}
//
// Reads go through lib/http.js (it throws; nothing here invents an empty tree on failure).
// The database allows five connections, so the page asks for /relationships and
// /tag-profiles/mine together, and only after the tree has painted for the requests (pending
// and sent). Writes update the store from what the server answers, without reloading.
// The store outlives the page, so Back to the tree is instant (refreshed after a minute).
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { apiFetch } from '../lib/http.js'

const STALE = 60000
const EMPTY = { userId: null, status: 'loading', error: null, relationships: [], tags: [], pending: [], sent: [], requestsLoaded: false, fresh: new Set(), fetchedAt: 0, inflight: null }

let state = EMPTY
const subs = new Set()
const set = (patch) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  subs.forEach((f) => f())
}
const subscribe = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}
const get = () => state

const afterPaint = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(r, 0)))

async function load(userId, { quiet = false } = {}) {
  if (state.inflight && state.userId === userId) return state.inflight
  const p = (async () => {
    if (!quiet) set({ status: state.userId === userId && state.fetchedAt ? state.status : 'loading', error: null, userId })
    try {
      const [relationships, tags] = await Promise.all([apiFetch('/relationships'), apiFetch('/tag-profiles/mine')])
      if (state.userId !== userId) return
      set({ status: 'ready', error: null, relationships: relationships || [], tags: tags || [], fetchedAt: Date.now() })
    } catch (e) {
      if (state.userId !== userId) return
      if (!quiet || !state.fetchedAt) set({ status: 'error', error: e })
      return
    } finally {
      if (state.userId === userId) set({ inflight: null })
    }
    await afterPaint()
    try {
      const [pending, sent] = await Promise.all([apiFetch('/relationships/pending'), apiFetch('/relationships/sent')])
      if (state.userId === userId) set({ pending: pending || [], sent: sent || [], requestsLoaded: true })
    } catch {
      // the requests are extras: the tree stands without them, and Retry is not needed for it
      if (state.userId === userId) set({ requestsLoaded: true })
    }
  })()
  set({ inflight: p, userId })
  return p
}

const markFresh = (id) => set((s) => ({ fresh: new Set([...s.fresh, id]) }))

/**
 * The tag profile body from TagForm's values {name, word, photoUrl, birth, birthplace, died}
 * (birth and died are partial dates {ymd, precision}, docs/app/FAMILY-NOTES.md). A birth date's
 * precision is null for a full day, as the server keeps it; an empty field is null, which clears.
 */
function tagBody({ name, word, photoUrl, birth, birthplace, died }) {
  return {
    name,
    relationship_to_creator: word || null,
    photo_url: photoUrl || null,
    birth_date: birth?.ymd || null,
    birth_date_precision: birth?.ymd && birth.precision && birth.precision !== 'day' ? birth.precision : null,
    birthplace: String(birthplace || '').trim() || null,
    died_on: died?.ymd || null,
    died_on_precision: died?.ymd ? died.precision || 'day' : null,
  }
}

/** Writes. Each throws HttpError on refusal (the sheet shows the server's words). */
const actions = {
  async propose(otherUser, mine, theirs) {
    const r = await apiFetch('/relationships/propose', { method: 'POST', body: { other_user_id: otherUser.id, my_relationship_to_them: mine, their_relationship_to_me: theirs } })
    const row = {
      id: r.id, recipient_id: r.other_user_id, recipient_username: r.other_user_username, recipient_display_name: r.other_user_display_name,
      recipient_avatar_url: r.other_user_avatar_url, i_call_them: r.my_relationship_to_them, they_would_call_me: r.their_relationship_to_me, status: r.status, created_at: r.created_at,
    }
    set((s) => ({ sent: [row, ...s.sent.filter((x) => x.id !== row.id)] }))
    markFresh(`u:${r.other_user_id}`)
    return row
  },
  async accept(id) {
    const r = await apiFetch(`/relationships/${id}/accept`, { method: 'POST' })
    set((s) => ({ pending: s.pending.filter((x) => x.id !== id), relationships: [r, ...s.relationships.filter((x) => x.id !== r.id)] }))
    markFresh(`u:${r.other_user_id}`)
    return r
  },
  async reject(id) {
    await apiFetch(`/relationships/${id}/reject`, { method: 'POST' })
    set((s) => ({ pending: s.pending.filter((x) => x.id !== id) }))
  },
  async withdraw(id) {
    await apiFetch(`/relationships/${id}`, { method: 'DELETE' })
    set((s) => ({ sent: s.sent.filter((x) => x.id !== id) }))
  },
  async remove(id) {
    await apiFetch(`/relationships/${id}`, { method: 'DELETE' })
    set((s) => ({ relationships: s.relationships.filter((x) => x.id !== id) }))
  },
  async createTag(values) {
    const t = await apiFetch('/tag-profiles', { method: 'POST', body: tagBody(values) })
    set((s) => ({ tags: [...s.tags.filter((x) => x.id !== t.id), t] }))
    markFresh(`t:${t.id}`)
    return t
  },
  /** Every field is sent: the PUT applies what is sent, and an explicit null clears it. */
  async updateTag(id, values) {
    const t = await apiFetch(`/tag-profiles/${id}`, { method: 'PUT', body: tagBody(values) })
    set((s) => ({ tags: s.tags.map((x) => (x.id === id ? t : x)) }))
    return t
  },
  /**
   * Your own birthday, birthplace and who sees them (PUT /users/me/family-details: only the
   * fields sent; null clears). Returns {birth_date, birthplace, birth_date_visibility}; the
   * caller hands them to useAuth().updateUser so the tree re-sorts at once.
   */
  async saveBirthday(fields) {
    return apiFetch('/users/me/family-details', { method: 'PUT', body: fields })
  },
  /** Links a tag to one of your relatives. {pending: true} when they must approve it first. */
  async linkTag(id, userId, word) {
    const r = await apiFetch(`/tag-profiles/${id}/relationships`, { method: 'POST', body: { user_id: userId, relationship_type: word } })
    if (!r.id) return { pending: true, link: r }
    set((s) => ({ tags: s.tags.map((x) => (x.id === id ? { ...x, relationships: [...(x.relationships || []), r] } : x)) }))
    return { pending: false, link: r }
  },
  async unlinkTag(id, linkId) {
    await apiFetch(`/tag-profiles/${id}/relationships/${linkId}`, { method: 'DELETE' })
    set((s) => ({ tags: s.tags.map((x) => (x.id === id ? { ...x, relationships: (x.relationships || []).filter((l) => l.id !== linkId) } : x)) }))
  },
}

export function useFamily() {
  const { user } = useAuth() || {}
  const s = useSyncExternalStore(subscribe, get, get)
  const uid = user?.id ?? null
  useEffect(() => {
    if (uid == null) return
    const cur = get()
    if (cur.userId !== uid) {
      state = { ...EMPTY, userId: uid, fresh: new Set() }
      load(uid)
    } else if (!cur.inflight && (cur.status === 'error' || Date.now() - cur.fetchedAt > STALE)) {
      load(uid, { quiet: cur.status === 'ready' })
    }
  }, [uid])
  const reload = useCallback(() => uid != null && load(uid), [uid])
  const mine = s.userId === uid
  return useMemo(
    () => ({
      status: uid == null ? 'loading' : mine ? s.status : 'loading',
      error: mine ? s.error : null,
      relationships: mine ? s.relationships : [],
      tags: mine ? s.tags : [],
      pending: mine ? s.pending : [],
      sent: mine ? s.sent : [],
      requestsLoaded: mine && s.requestsLoaded,
      fresh: s.fresh,
      reload,
      actions,
    }),
    [s, uid, mine, reload],
  )
}

/** People you follow and who follow you, for the Add sheet (asked only when it opens). */
export async function loadFollows() {
  const [following, followers] = await Promise.all([apiFetch('/users/me/following'), apiFetch('/users/me/followers')])
  // both lists are accepted follows today; a row with another status (pending, or a request the
  // asker withdrew, kept as 'cancelled') never counts as following
  const accepted = (rows) => (rows || []).filter((f) => f.status == null || f.status === 'accepted')
  return { following: accepted(following), followers: accepted(followers) }
}
