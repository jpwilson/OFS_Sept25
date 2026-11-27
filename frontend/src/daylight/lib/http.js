// The one HTTP door for Daylight reads and writes (owner: F0). It uses services/api.js for
// auth headers (Supabase session, legacy token) and never edits it, but unlike several
// api.js methods it never swallows a failure and never returns mock data: it throws an
// HttpError, and the UI shows an honest error with Retry.
import apiService from '../../services/api.js'

// Same rule as services/api.js:5-9 (VITE_API_URL, else production unless the host is localhost).
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'https://ofs-sept25.vercel.app' : 'http://localhost:8000')
export const API_BASE = `${API_URL}/api/v1`

export class HttpError extends Error {
  constructor(status, data, path) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.message
    super(detail || `Request failed (${status})`)
    this.name = 'HttpError'
    this.status = status
    this.data = data
    this.path = path
  }
}

/**
 * apiFetch('/events', {query: {skip: 0}, method, body, auth: true, signal}) -> parsed JSON
 * body: a plain object (sent as JSON) or FormData (sent as is). auth: false skips the
 * Authorization header (share links). Throws HttpError (status 0 for a network failure).
 */
export async function apiFetch(path, { query, method = 'GET', body, auth = true, signal, headers: extra } = {}) {
  const qs = query
    ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : ''
  const url = `${API_BASE}${path}${qs === '?' ? '' : qs}`
  let headers = auth ? await apiService.getAuthHeaders() : {}
  if (body instanceof FormData) {
    headers = { ...headers }
    delete headers['Content-Type']
  } else if (body !== undefined) {
    headers = { ...headers, 'Content-Type': 'application/json' }
  }
  let res
  try {
    res = await fetch(url, {
      method,
      headers: { ...headers, ...extra },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new HttpError(0, { detail: 'Could not reach Our Family Socials. Check your connection.' }, path)
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text.slice(0, 200) }
  }
  if (!res.ok) throw new HttpError(res.status, data, path)
  return data
}
