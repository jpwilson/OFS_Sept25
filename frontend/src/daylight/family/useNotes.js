// Notes and history about one person on the family tree (owner: FAMILY). docs/app/FAMILY-NOTES.md
// "Endpoints" and "Page".
//
//   useNotes(person, {enabled}) -> {status, error, canWrite, history, notes, loadingMore, reload, more(kind)}
//     person: a person from arrange (kind 'me' | 'user' | 'tag', userId, tagId), or null
//     status: 'idle' (not asked yet) | 'loading' | 'ready' | 'error' | 'forbidden' | 'hidden'
//     history, notes: {items, hasMore}, each in the server's order (dates.js cmpHistory, cmpNotes)
//   noteActions.create(person, fields) / update(person, id, fields) / remove(person, id): throw HttpError
//
// One store for every person, like useFamily's: it outlives the sheet, so reopening someone is
// instant, and is refreshed quietly once it is a minute old. GET /family-notes fills both pages
// in one request (the database allows five connections; the sheet asks only once its Stories
// have arrived). A 404 "Not Found" means the server has no notes yet (an older server): every
// block stays hidden, and nothing is asked again until the page reloads.
//
// Writes change the lists from what the server answers. "Show more" asks from the number of
// items the server has given, so an entry written here that sorts past them is kept aside
// (extra) until its page arrives: nothing is skipped and nothing shows twice.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { apiFetch } from '../lib/http.js'
import { cmpHistory, cmpNotes } from './dates.js'

const STALE = 60000
const PAGE = 10
const EMPTY_PAGE = { items: [], extra: [], hasMore: false }
const IDLE = { status: 'idle', error: null, canWrite: false, history: EMPTY_PAGE, notes: EMPTY_PAGE, fetchedAt: 0, inflight: null, loadingMore: null }

let store = { viewer: null, missing: false, byKey: {} }
const subs = new Set()
const subscribe = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}
const get = () => store
const emit = () => subs.forEach((f) => f())
const entryOf = (key) => store.byKey[key] || IDLE
function patch(key, p) {
  const cur = entryOf(key)
  store = { ...store, byKey: { ...store.byKey, [key]: { ...cur, ...(typeof p === 'function' ? p(cur) : p) } } }
  emit()
}

const keyOf = (person) => (person ? (person.kind === 'tag' ? `t:${person.tagId}` : `u:${person.userId}`) : null)
const subjectQuery = (person) => (person.kind === 'tag' ? { tag_profile_id: person.tagId } : { user_id: person.userId })
const order = (kind) => (kind === 'history' ? cmpHistory : cmpNotes)
const listKey = (kind) => (kind === 'history' ? 'history' : 'notes')
const pageFrom = (p) => ({ items: p?.items || [], extra: [], hasMore: !!p?.has_more })

/** What a person sees on the page, in the server's order: what it gave, and what was written here past it. */
export const shown = (page, kind) => [...page.items, ...page.extra].sort(order(kind))

/** Put one entry in a page: among what the server gave, or aside when it sorts past them. */
function place(page, item, kind) {
  const items = page.items.filter((x) => x.id !== item.id)
  const extra = page.extra.filter((x) => x.id !== item.id)
  const last = items[items.length - 1]
  if (!page.hasMore || !last || order(kind)(item, last) <= 0) return { ...page, items: [...items, item].sort(order(kind)), extra }
  return { ...page, items, extra: [...extra, item].sort(order(kind)) }
}
const without = (page, id) => ({ ...page, items: page.items.filter((x) => x.id !== id), extra: page.extra.filter((x) => x.id !== id) })

async function load(key, person, { quiet = false } = {}) {
  const cur = entryOf(key)
  if (cur.inflight || store.missing) return cur.inflight
  const viewer = store.viewer
  const p = (async () => {
    try {
      const r = await apiFetch('/family-notes', { query: { ...subjectQuery(person), limit: PAGE } })
      if (store.viewer !== viewer) return
      patch(key, { status: 'ready', error: null, canWrite: !!r?.can_write, history: pageFrom(r?.history), notes: pageFrom(r?.notes), fetchedAt: Date.now() })
    } catch (e) {
      if (store.viewer !== viewer) return
      if (e?.status === 404) {
        // FastAPI's own "Not Found": no notes on this server yet. Anything else: this person is gone.
        if (e.data?.detail === 'Not Found') store = { ...store, missing: true }
        patch(key, { status: 'hidden', error: e })
      } else if (e?.status === 403) {
        patch(key, { status: 'forbidden', error: e })
      } else if (!(quiet && cur.fetchedAt)) {
        patch(key, { status: 'error', error: e })
      }
    } finally {
      if (store.viewer === viewer) patch(key, { inflight: null })
    }
  })()
  patch(key, (c) => ({ inflight: p, status: quiet && c.fetchedAt ? c.status : 'loading', error: quiet ? c.error : null }))
  return p
}

async function more(key, person, kind) {
  const cur = entryOf(key)
  const lk = listKey(kind)
  if (cur.loadingMore || !cur[lk].hasMore) return
  const viewer = store.viewer
  patch(key, { loadingMore: kind })
  try {
    const r = await apiFetch('/family-notes', { query: { ...subjectQuery(person), kind, skip: cur[lk].items.length, limit: PAGE } })
    if (store.viewer !== viewer) return
    const got = r?.[lk] || { items: [], has_more: false }
    patch(key, (c) => {
      const seen = new Set(c[lk].items.map((x) => x.id))
      const items = [...c[lk].items, ...(got.items || []).filter((x) => !seen.has(x.id))].sort(order(kind))
      const have = new Set(items.map((x) => x.id))
      return { [lk]: { items, extra: c[lk].extra.filter((x) => !have.has(x.id)), hasMore: !!got.has_more }, canWrite: !!r?.can_write }
    })
  } catch (e) {
    if (store.viewer === viewer) patch(key, { moreError: e })
    throw e
  } finally {
    if (store.viewer === viewer) patch(key, { loadingMore: null })
  }
}

/** Writes. Each throws HttpError on refusal; the composer shows the server's words. */
export const noteActions = {
  /** fields: {kind, body, happened_on?, happened_precision?} */
  async create(person, fields) {
    const n = await apiFetch('/family-notes', { method: 'POST', body: { ...subjectQuery(person), ...fields } })
    const key = keyOf(person)
    patch(key, (c) => ({ [listKey(n.kind)]: place(c[listKey(n.kind)], n, n.kind) }))
    return n
  },
  /** fields: what changed; a null date clears it with its precision. */
  async update(person, id, fields) {
    const n = await apiFetch(`/family-notes/${id}`, { method: 'PATCH', body: fields })
    const key = keyOf(person)
    patch(key, (c) => {
      const history = without(c.history, id)
      const notes = without(c.notes, id)
      return n.kind === 'history' ? { history: place(history, n, 'history'), notes } : { history, notes: place(notes, n, 'note') }
    })
    return n
  },
  async remove(person, id) {
    await apiFetch(`/family-notes/${id}`, { method: 'DELETE' })
    patch(keyOf(person), (c) => ({ history: without(c.history, id), notes: without(c.notes, id) }))
  },
}

/** Notes and history about `person`, asked for once `enabled` (the sheet decides when). */
export function useNotes(person, { enabled = true } = {}) {
  const { user } = useAuth() || {}
  const uid = user?.id ?? null
  if (store.viewer !== uid) store = { viewer: uid, missing: false, byKey: {} } // a new member: nothing of the last one's
  const s = useSyncExternalStore(subscribe, get, get)
  const key = keyOf(person)
  const askable = !!person && uid != null && person.status !== 'asked'
  useEffect(() => {
    if (!askable || !enabled || store.missing) return
    const cur = entryOf(key)
    if (cur.inflight) return
    if (cur.status === 'idle' || cur.status === 'error') load(key, person)
    else if (cur.status === 'ready' && Date.now() - cur.fetchedAt > STALE) load(key, person, { quiet: true })
  }, [key, askable, enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => person && load(key, person), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadMore = useCallback((kind) => (person ? more(key, person, kind) : Promise.resolve()), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const e = key ? s.byKey[key] || IDLE : IDLE
  return useMemo(
    () => ({
      status: !askable || s.missing ? 'hidden' : e.status === 'idle' && !enabled ? 'idle' : e.status === 'idle' ? 'loading' : e.status,
      error: e.error,
      canWrite: e.canWrite,
      history: e.history,
      notes: e.notes,
      loadingMore: e.loadingMore,
      reload,
      more: loadMore,
    }),
    [e, askable, enabled, s.missing, reload, loadMore],
  )
}
