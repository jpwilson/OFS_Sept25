// ?only=<pkg> isolation (owner: F0). Development and sample builds only.
//   ?only=feed|story|map|create|auth|family   that package's pages render; every other Daylight page
//                                 shows a labelled stub, so a half-written sibling cannot
//                                 break your view
//   ?only=ui                      the primitives sheet in the shell
//   ?only=spike                   the MapLibre spike (globe and terrain)
//   ?only=all (or ?only=)         back to everything
// The choice is kept in sessionStorage, so in-app links keep it.
import { useLocation } from 'react-router-dom'

export const ONLY_ENABLED = !!(import.meta.env.DEV || import.meta.env.VITE_DAYLIGHT_SAMPLE === '1')
export const ONLY_PACKAGES = ['ui', 'spike', 'feed', 'story', 'map', 'create', 'auth', 'family']
const KEY = 'ofs.only'

export function readOnly(search) {
  if (!ONLY_ENABLED || typeof window === 'undefined') return null
  const q = new URLSearchParams(search ?? window.location.search)
  try {
    if (q.has('only')) {
      const v = q.get('only')
      if (!v || v === 'all') sessionStorage.removeItem(KEY)
      else if (ONLY_PACKAGES.includes(v)) sessionStorage.setItem(KEY, v)
    }
    return sessionStorage.getItem(KEY)
  } catch {
    return q.get('only') || null
  }
}

/** The isolated package, or null. Re-reads on every navigation. */
export function useOnly() {
  const loc = useLocation()
  return readOnly(loc.search)
}

/** True when `pkg` should render a stub because another package is isolated. */
export function blockedBy(only, pkg) {
  return !!only && only !== pkg
}
