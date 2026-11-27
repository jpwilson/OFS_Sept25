// What this device can do (owner: F0). PLAN-DAYLIGHT 3.6. Browser only.
//
//   mapLevel() -> 'full' | 'lite' | 'static'    (the starting level; a map may step down
//                                                 later on slow frames or missing tiles)
//   hasWebGL2()  prefersReducedMotion()  saveData()  isPhone()  useMedia(query)
import { useSyncExternalStore } from 'react'

let webgl2 = null
export function hasWebGL2() {
  if (webgl2 != null) return webgl2
  try {
    const c = document.createElement('canvas')
    webgl2 = !!c.getContext('webgl2')
  } catch {
    webgl2 = false
  }
  return webgl2
}
export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const saveData = () => !!(typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData)
export const deviceMemory = () => (typeof navigator !== 'undefined' && navigator.deviceMemory) || null
export const isPhone = () => typeof matchMedia !== 'undefined' && !matchMedia('(min-width: 900px)').matches

/** Full: WebGL2, 4GB+ (or unreported), no Save-Data. Lite: low memory or Save-Data. Static: no WebGL2. */
export function mapLevel() {
  if (typeof window === 'undefined' || !hasWebGL2()) return 'static'
  const forced = new URLSearchParams(window.location.search).get('maplevel')
  if (forced === 'full' || forced === 'lite' || forced === 'static') return forced
  const mem = deviceMemory()
  if (saveData() || (mem != null && mem < 4)) return 'lite'
  return 'full'
}

/** A live media query: useMedia('(min-width: 900px)'). */
export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}
export const useDesktop = () => useMedia('(min-width: 900px)')
