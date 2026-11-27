// Cleans every URL-like property before an event leaves the browser for PostHog.
// Used as posthog-js `before_send` (posthog-js >= 1.187) by config/posthogOptions.js,
// so it covers the app and the landing page, and PostHog's automatic properties
// ($current_url, $pathname, $referrer and their $initial_ / $session_entry_ copies)
// as well as our own.
//
// Rules: the query string and the hash are dropped (sign-in codes, invite tokens and
// Supabase access tokens travel there), and path segments that are secrets or
// identify a person are masked. Pure module (no import.meta), so node can test it:
//   cd frontend && node --test src/config/posthogPrivacy.test.js

// Path segment after these routes is replaced with the given placeholder.
const MASKED_SEGMENTS = [
  ['share', ':token'], // /share/<share-link token>
  ['join', ':token'], // /join/<invite token>
  ['event', ':id'],
  ['profile', ':username'],
  ['tag-profile', ':id'],
]

// Keys holding a URL or a path: current_url, pathname, referrer, path, href, and
// prefixed copies such as $initial_current_url or $session_entry_pathname.
const URL_KEY = /(^|_)(url|href|pathname|path|referrer)$/

export function cleanPath(path) {
  let clean = path.split(/[?#]/)[0]
  for (const [route, placeholder] of MASKED_SEGMENTS) {
    clean = clean.replace(new RegExp(`/${route}/[^/]+`, 'g'), `/${route}/${placeholder}`)
  }
  return clean
}

export function cleanUrl(value) {
  if (typeof value !== 'string' || value === '') return value
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      return url.origin + cleanPath(url.pathname)
    } catch {
      return value.split(/[?#]/)[0]
    }
  }
  if (value.startsWith('/')) return cleanPath(value)
  return value // e.g. '$direct' for $referrer
}

function cleanProps(props) {
  if (!props || typeof props !== 'object') return
  for (const key of Object.keys(props)) {
    if (URL_KEY.test(key.replace(/^\$/, ''))) props[key] = cleanUrl(props[key])
  }
}

// posthog-js before_send: receives { event, properties, $set, $set_once, ... }.
export function posthogBeforeSend(event) {
  if (!event) return event
  cleanProps(event.properties)
  cleanProps(event.properties?.$set)
  cleanProps(event.properties?.$set_once)
  cleanProps(event.$set)
  cleanProps(event.$set_once)
  return event
}
