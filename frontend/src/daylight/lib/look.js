// Which look this person sees (owner: F0). docs/app/SPEC.md decision 1.
//
//   useLook() -> 'daylight' | 'classic'      setLook('daylight' | 'classic')      getLook()
//   BUILD_LOOK: the build's look, 'classic' | 'optin' | 'daylight' (from __APP_LOOK__)
//
// optin builds: classic unless this browser chose Daylight (?look=daylight or the switch).
// daylight builds: Daylight unless this browser chose classic (?look=classic or
// "Use the previous look"). The choice lives in localStorage['ofs.look'].
import { useSyncExternalStore } from 'react'

export const BUILD_LOOK = typeof __APP_LOOK__ !== 'undefined' ? __APP_LOOK__ : 'classic'
export const LOOK_KEY = 'ofs.look'

function readChoice() {
  try {
    return localStorage.getItem(LOOK_KEY)
  } catch {
    return null
  }
}
function writeChoice(v) {
  try {
    localStorage.setItem(LOOK_KEY, v)
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

let memoryChoice = null
function resolve() {
  if (BUILD_LOOK === 'classic') return 'classic'
  const c = readChoice() ?? memoryChoice
  if (BUILD_LOOK === 'optin') return c === 'daylight' ? 'daylight' : 'classic'
  return c === 'classic' ? 'classic' : 'daylight'
}

const subs = new Set()
let current = 'classic'

/** Reads ?look= from a search string and stores it. Returns true when it changed the look. */
export function applyLookQuery(search) {
  if (BUILD_LOOK === 'classic') return false
  const v = new URLSearchParams(search || '').get('look')
  if (v !== 'daylight' && v !== 'classic') return false
  const before = current
  memoryChoice = v
  writeChoice(v)
  current = resolve()
  if (current !== before) subs.forEach((f) => f())
  return current !== before
}

if (typeof window !== 'undefined') {
  applyLookQuery(window.location.search)
  current = resolve()
  window.addEventListener('storage', (e) => {
    if (e.key !== LOOK_KEY) return
    const next = resolve()
    if (next !== current) {
      current = next
      subs.forEach((f) => f())
    }
  })
}

export function getLook() {
  return current
}

export function setLook(value) {
  if (value !== 'daylight' && value !== 'classic') throw new Error(`setLook: expected daylight or classic, got ${value}`)
  memoryChoice = value
  writeChoice(value)
  const next = resolve()
  if (next === current) return
  current = next
  subs.forEach((f) => f())
}

function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

/** The look to render now. Every seam calls this, so all six switch together. */
export function useLook() {
  return useSyncExternalStore(subscribe, getLook, () => 'classic')
}
