// Where the reader is (owner: STORY): the chapter on the reading line and how far through
// the text they are. One passive scroll listener, read in an animation frame; React state
// changes only when the chapter changes or progress moves by a percent.
//   useReading(bodyRef, deps) -> {chapterId, progress (0..1), past (true once the header is behind)}
import { useEffect, useRef, useState } from 'react'

const LINE = 0.38

export function useReading(bodyRef, key) {
  const [st, setSt] = useState({ chapterId: null, progress: 0, started: false })
  const last = useRef(st)
  useEffect(() => {
    const root = bodyRef?.current
    if (!root) return
    let raf = 0
    const measure = () => {
      raf = 0
      const line = window.innerHeight * LINE
      let ch = null
      for (const el of root.querySelectorAll('[data-chapter-id]')) {
        if (el.getBoundingClientRect().top <= line) ch = el.dataset.chapterId
        else break
      }
      const r = root.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.85 - r.top) / Math.max(1, r.height)))
      const started = r.top < window.innerHeight * 0.6
      const p = last.current
      if (p.chapterId !== ch || Math.abs(p.progress - progress) >= 0.01 || p.started !== started) {
        last.current = { chapterId: ch, progress, started }
        setSt(last.current)
      }
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [bodyRef, key])
  return st
}

/** Scroll so an element sits just under the bar (headings) or on the reading line. */
export function scrollToEl(el, { line = false } = {}) {
  if (!el) return
  const bar = parseFloat(getComputedStyle(el).getPropertyValue('--a-bar-h')) || 64
  const y = window.scrollY + el.getBoundingClientRect().top - (line ? window.innerHeight * LINE : bar + 20)
  window.scrollTo({ top: Math.max(0, y), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}
