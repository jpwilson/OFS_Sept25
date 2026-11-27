// Story and map in step (owner: F0 ships a working version; MAP may refine). PLAN 3.5.
// useJourneySync({journey, containerRef}) -> {activeStopId, scrollToStop(stopId)}
// Anchors are elements inside containerRef with data-stop-id. A passive scroll listener,
// throttled to animation frames, finds the last anchor above a reading line at 38% of the
// viewport (24px hysteresis); React state changes only when the active stop changes.
import { useCallback, useEffect, useRef, useState } from 'react'

const LINE = 0.38
const HYST = 24

export function useJourneySync({ journey, containerRef }) {
  const [activeStopId, setActive] = useState(null)
  const cur = useRef(null)
  useEffect(() => {
    const root = containerRef?.current
    if (!journey || !root) return
    let raf = 0
    const measure = () => {
      raf = 0
      const line = window.innerHeight * LINE
      let best = null
      for (const el of root.querySelectorAll('[data-stop-id]')) {
        const top = el.getBoundingClientRect().top
        const slack = el.dataset.stopId === cur.current ? HYST : 0
        if (top - slack <= line) best = el.dataset.stopId
        else break
      }
      if (best !== cur.current) {
        cur.current = best
        setActive(best)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [journey, containerRef])
  const scrollToStop = useCallback(
    (stopId) => {
      const el = containerRef?.current?.querySelector(`[data-stop-id="${CSS.escape(stopId)}"]`)
      if (!el) return false
      const y = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * LINE + 2
      window.scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      el.animate?.([{ outlineColor: 'rgba(16,27,59,1)' }, { outlineColor: 'rgba(16,27,59,0)' }], { duration: 1200 })
      return true
    },
    [containerRef],
  )
  return { activeStopId, scrollToStop }
}
export default useJourneySync
