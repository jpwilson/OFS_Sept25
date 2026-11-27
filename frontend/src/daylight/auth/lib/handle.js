// Handles: the rules, the reserved list and suggestions (owner: AUTH). PLAN-AUTH section 2.
// A handle is permanent (it is the profile address), so it is asked, not assigned.
//
//   cleanHandle(typed) -> lowercase, spaces to underscores, leading @ dropped
//   checkHandle(h) -> null | { reason: 'short'|'long'|'chars'|'reserved', line }
//   suggestHandle({ name, email }) -> 'maya_hartley'
//   alternatives(h, { name }) -> ['maya_h', 'mayahartley', 'maya_hartley2', ...]  (all valid)

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/
export const HANDLE_MIN = 3
export const HANDLE_MAX = 20

// Route words and words that would mislead (GET /users/me and /users/search are real routes).
export const RESERVED = new Set([
  'me', 'search', 'admin', 'administrator', 'api', 'auth', 'login', 'logout', 'signup', 'signin', 'join', 'settings',
  'feed', 'profile', 'profiles', 'users', 'user', 'event', 'events', 'create', 'import', 'new', 'edit', 'billing',
  'pricing', 'help', 'support', 'about', 'faq', 'blog', 'contact', 'privacy', 'terms', 'root', 'system', 'null',
  'undefined', 'ofs', 'ourfamilysocials', 'official', 'staff', 'team', 'moderator', 'notifications', 'share',
])

export function cleanHandle(typed) {
  return String(typed || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export function checkHandle(h) {
  if (!h || h.length < HANDLE_MIN) return { reason: 'short', line: `Use at least ${HANDLE_MIN} characters.` }
  if (h.length > HANDLE_MAX) return { reason: 'long', line: `Keep it to ${HANDLE_MAX} characters or fewer.` }
  if (!HANDLE_RE.test(h)) return { reason: 'chars', line: 'Use lowercase letters, numbers and underscores.' }
  if (RESERVED.has(h)) return { reason: 'reserved', line: `@${h} is taken.` }
  return null
}

function ascii(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
function words(name) {
  return ascii(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}
const fit = (h) => h.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, HANDLE_MAX).replace(/_$/, '')
const valid = (h) => !checkHandle(h)

export function suggestHandle({ name, email } = {}) {
  const w = words(name)
  const tries = []
  if (w.length >= 2) tries.push(`${w[0]}_${w[w.length - 1]}`, `${w[0]}${w[w.length - 1]}`)
  if (w.length) tries.push(w[0])
  const local = ascii(String(email || '').split('@')[0]).replace(/[^a-z0-9_]+/g, '_')
  if (local) tries.push(local)
  for (const t of tries.map(fit)) if (valid(t)) return t
  return ''
}

/** Valid handles to offer when `h` is taken, most natural first, never `h` itself. */
export function alternatives(h, { name } = {}) {
  const base = fit(cleanHandle(h)).slice(0, HANDLE_MAX - 3) || 'family'
  const w = words(name)
  const last = w.length >= 2 ? w[w.length - 1] : ''
  const out = []
  if (last && !base.includes(last)) out.push(`${base}_${last[0]}`, `${base}_${last}`, `${base}${last}`)
  if (w[0] && !base.startsWith(w[0])) out.push(`${w[0]}_${base}`)
  for (let i = 2; i <= 9; i++) out.push(`${base}${i}`)
  out.push(`${base}_family`, `the_${base}`)
  return [...new Set(out.map(fit))].filter((x) => x !== h && valid(x))
}
