// Return paths and the pending sign-in record (owner: AUTH). docs/app/AUTH.md decision 7.
// Pure apart from the storage helpers, which take the storage as an argument (tests pass a Map
// wrapper) and never throw.
//
//   safeNext(value, fallback = '/feed') -> a same-origin path, never an auth route
//   savePending({next, invite, intent, wash}, storage?)  readPending(storage?)  clearPending(storage?)
//   hasPending(storage?)        a fresh pending record exists (15 minutes)
//   rememberPath(path, storage?)  lastPath(storage?)     the last in-app path (10 minutes)

export const PENDING_KEY = 'ofs.auth.pending'
export const LAST_KEY = 'ofs.auth.last'
export const PENDING_LIFE_MS = 15 * 60 * 1000
export const LAST_LIFE_MS = 10 * 60 * 1000
export const MAX_NEXT = 512

// Routes a return path may never point at: the sign-in pages themselves and the dev servers.
const AUTH_ROUTE = /^\/(login|signup|auth|reset-password|join|demo-login|__fx|__sb)(\/|$)/i
const BASE = 'https://ofs.invalid'

/** A same-origin relative path (one leading slash, no backslash or control characters, at most
 * 512 characters, never an auth route), returned as path + search + hash; else `fallback`. */
export function safeNext(value, fallback = '/feed') {
  if (typeof value !== 'string' || !value || value.length > MAX_NEXT) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback
  if (value[0] !== '/' || value[1] === '/') return fallback
  let u
  try {
    u = new URL(value, BASE)
  } catch {
    return fallback
  }
  if (u.origin !== BASE) return fallback
  if (AUTH_ROUTE.test(u.pathname)) return fallback
  return u.pathname + u.search + u.hash
}

function store(storage) {
  if (storage) return storage
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}
function session(storage) {
  if (storage) return storage
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null
  } catch {
    return null
  }
}
function readJson(s, key) {
  try {
    const t = s?.getItem(key)
    return t ? JSON.parse(t) : null
  } catch {
    return null
  }
}
function write(s, key, value) {
  try {
    if (value == null) s?.removeItem(key)
    else s?.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or full: the flow still works in this tab */
  }
}

/** Saved before leaving for Google or an email link. Never holds a token or an address. */
export function savePending({ next, invite = null, intent = 'login', wash = 'tide' } = {}, storage, at = Date.now()) {
  write(store(storage), PENDING_KEY, { next: safeNext(next), invite: invite ? String(invite).slice(0, 128) : null, intent, wash, at })
}

export function readPending(storage, at = Date.now()) {
  const p = readJson(store(storage), PENDING_KEY)
  if (!p || typeof p.at !== 'number' || at - p.at > PENDING_LIFE_MS || at < p.at - 60000) return null
  return { ...p, next: safeNext(p.next) }
}

export function hasPending(storage, at = Date.now()) {
  return !!readPending(storage, at)
}

export function clearPending(storage) {
  write(store(storage), PENDING_KEY, null)
}

export function rememberPath(path, storage, at = Date.now()) {
  const p = safeNext(path, null)
  if (p) write(session(storage), LAST_KEY, { path: p, at })
}

export function lastPath(storage, at = Date.now()) {
  const l = readJson(session(storage), LAST_KEY)
  if (!l || typeof l.at !== 'number' || at - l.at > LAST_LIFE_MS) return null
  return safeNext(l.path, null)
}
