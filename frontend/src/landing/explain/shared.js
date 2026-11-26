// Small helpers shared by the explain sections (owner: explain). Server-safe: nothing runs
// at module scope or during render.
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/scroll.js'

/**
 * 'flow' on the server, without script and under reduced motion (plain stacked content);
 * 'pinned' once mounted with motion allowed. The first client render matches the server.
 */
export function usePinnedMode() {
  const [mode, setMode] = useState('flow')
  useEffect(() => {
    if (!prefersReducedMotion()) setMode('pinned')
  }, [])
  return mode
}

/** Run cb once, the first time el is at least `ratio` on screen. Returns a cleanup. */
export function onceInView(el, cb, ratio = 0.35) {
  if (!el) return () => {}
  if (typeof IntersectionObserver === 'undefined') {
    cb()
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.disconnect()
        cb()
      }
    },
    { threshold: ratio },
  )
  io.observe(el)
  return () => io.disconnect()
}

/** Two-digit step number for display ("01"). Code, not copy. */
export const two = (n) => String(n).padStart(2, '0')
