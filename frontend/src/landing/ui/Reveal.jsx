import { createElement, useEffect, useRef } from 'react'
import { cx } from './cx.js'
import s from './Reveal.module.css'

// One shared IntersectionObserver for every reveal on the page.
let io = null
function observer() {
  if (typeof IntersectionObserver === 'undefined') return null
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target) // once; never replays on the way back up
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
  }
  return io
}

/**
 * Start watching one element. Anything already on screen when it mounts is shown at once
 * with no transition, so the server-rendered first screen never blinks out and back in.
 */
export function watchReveal(el) {
  const o = observer()
  const r = el.getBoundingClientRect()
  if (!o || (r.top < window.innerHeight && r.bottom > 0)) {
    el.setAttribute('data-instant', '')
    el.classList.add('is-in')
    return () => {}
  }
  o.observe(el)
  return () => o.unobserve(el)
}

/**
 * A quiet entrance the first time it is seen. Content is visible in the static HTML and
 * without script; it is only held back while the landing is mounted (html.ofsl-on) and
 * never under reduced motion. delay in ms; i is a stagger index (70ms a step).
 * Any other prop (id, data-*, aria-*) is passed to the element; style is merged.
 */
export function Reveal({ as = 'div', delay = 0, i, children, className, style, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    return el ? watchReveal(el) : undefined
  }, [])
  const vars = { ...style, '--d': `${delay + (i || 0) * 70}ms` }
  // Extra props (id, data-*, aria-*, role...) pass through to the element.
  return createElement(as, { ...rest, ref, className: cx(s.reveal, className), style: vars, 'data-reveal': '' }, children)
}
