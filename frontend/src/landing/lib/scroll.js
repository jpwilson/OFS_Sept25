// The scroll engine (owner: F0). One requestAnimationFrame loop for the whole page:
// Lenis advances first, then every subscriber reads its own position and writes styles
// straight to elements through refs. Scroll NEVER flows through React state.
//
// Server-safe: nothing here touches window at module scope.
import Lenis from 'lenis'
import { clamp } from './math.js'

/** @typedef {{ scrollY: number, vh: number, vw: number, time: number }} FrameInfo */

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribers = new Set()
const failed = new WeakSet()
let lenis = null
let raf = 0
let users = 0
let locked = false
let mq = null
let savedRestoration = null

/** True when the visitor asked for reduced motion. False on the server. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED).matches
}

function makeLenis() {
  if (lenis || prefersReducedMotion()) return
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9, autoRaf: false })
  if (locked) lenis.stop()
}
function dropLenis() {
  if (lenis) lenis.destroy()
  lenis = null
}
const onMotionPref = () => (mq && mq.matches ? dropLenis() : makeLenis())

function loop(time) {
  if (lenis) lenis.raf(time)
  const info = { scrollY: window.scrollY, vh: window.innerHeight, vw: window.innerWidth, time }
  subscribers.forEach((fn) => {
    try {
      fn(info)
    } catch (err) {
      // One broken stage must not stop the page; report it once.
      if (!failed.has(fn)) {
        failed.add(fn)
        console.error('[scroll] onFrame subscriber threw', err)
      }
    }
  })
  raf = requestAnimationFrame(loop)
}

/**
 * Start the engine. Reference-counted (StrictMode mounts twice): every call returns its own
 * stop function, and the last stop cancels the loop, destroys Lenis and restores
 * history.scrollRestoration. Smoothing is off under prefers-reduced-motion; frames still run.
 * @returns {() => void}
 */
export function startScroll() {
  if (typeof window === 'undefined') return () => {}
  users += 1
  if (users === 1) {
    if ('scrollRestoration' in history) {
      savedRestoration = history.scrollRestoration
      history.scrollRestoration = 'manual'
    }
    makeLenis()
    mq = window.matchMedia ? window.matchMedia(REDUCED) : null
    if (mq && mq.addEventListener) mq.addEventListener('change', onMotionPref)
    raf = requestAnimationFrame(loop)
  }
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    users -= 1
    if (users > 0) return
    cancelAnimationFrame(raf)
    raf = 0
    if (mq && mq.removeEventListener) mq.removeEventListener('change', onMotionPref)
    mq = null
    dropLenis()
    if (locked) setScrollLocked(false)
    if (savedRestoration != null && 'scrollRestoration' in history) history.scrollRestoration = savedRestoration
    savedRestoration = null
  }
}

/**
 * Subscribe to every frame. Returns an unsubscribe. Read layout first, then write styles.
 * @param {(t: FrameInfo) => void} fn
 * @returns {() => void}
 */
export function onFrame(fn) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

/**
 * 0..1 across a tall stage whose child is `position: sticky; top: 0; height: 100svh`.
 * 0 when the stage top meets the viewport top, 1 when the sticky child is about to unpin.
 * @param {HTMLElement} el
 */
export function stageProgress(el) {
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  return clamp(-rect.top / Math.max(1, rect.height - vh))
}

/** Glide to an absolute page y. Instant under reduced motion or with {immediate: true}. */
export function scrollToY(y, opts = {}) {
  const immediate = !!opts.immediate || !lenis
  if (lenis) lenis.scrollTo(y, { immediate, force: true, duration: 1.4 })
  else window.scrollTo({ top: y, behavior: 'auto' })
}

/** Glide to the element with this id ('#' optional). offset is added to its top. */
export function scrollToId(id, opts = {}) {
  const el = document.getElementById(String(id).replace(/^#/, ''))
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0)
  scrollToY(Math.max(0, y), { immediate: opts.immediate })
}

/** Pause or resume page scrolling (drawers and dialogs). */
export function setScrollLocked(v) {
  locked = !!v
  if (lenis) (locked ? lenis.stop() : lenis.start())
  if (typeof document !== 'undefined') document.documentElement.style.overflow = locked ? 'hidden' : ''
}

/** Re-measure after a big layout change (Lenis also watches size on its own). */
export function refreshScroll() {
  if (lenis) lenis.resize()
}
