// The admin page's requests (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "State and loading".
// Everything goes through lib/http.js; each request has its own AbortController, and a
// hook refetches only when its key string changes (no useCallback chains).
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/http.js'

const BASE = '/admin/analytics'

export const getOverview = ({ range, interval }, signal) => apiFetch(`${BASE}/overview`, { query: { range, interval, include_staff: false }, signal })
export const getVisitors = ({ range, interval }, signal) => apiFetch(`${BASE}/visitors`, { query: { range, interval, include_staff: false }, signal })
export const getUnfinished = ({ range }, signal) => apiFetch(`${BASE}/unfinished`, { query: { range }, signal })
// POST, so search text stays out of URLs and logs
export const postMembers = (body, signal) => apiFetch(`${BASE}/members`, { method: 'POST', body, signal })

/**
 * useResource(key, load) -> {data, error, loading, at}
 * load(signal) runs whenever `key` changes (null: not yet). The last answer stays on screen
 * while the next one loads; a failure clears it, so old numbers never pass for new ones.
 */
export function useResource(key, load) {
  const [st, set] = useState({ data: null, error: null, loading: key != null, at: 0 })
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (key == null) return undefined
    const ac = new AbortController()
    set((x) => ({ ...x, loading: true, error: null }))
    loadRef.current(ac.signal).then(
      (data) => {
        if (!ac.signal.aborted) set({ data, error: null, loading: false, at: Date.now() })
      },
      (error) => {
        if (ac.signal.aborted || error?.name === 'AbortError') return
        set({ data: null, error, loading: false, at: Date.now() })
      },
    )
    return () => ac.abort()
  }, [key])
  return st
}

/** True once the element has come near the screen (it stays true). */
export function useSeen(ref, margin = '200px') {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (seen || !ref.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setSeen(true)
    }, { rootMargin: margin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen, ref, margin])
  return seen
}

/** The value, settled for `ms` (the search box). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
export const pct = (a, b) => (a == null || !b ? null : `${((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0)}%`)
