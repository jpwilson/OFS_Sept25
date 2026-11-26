// A snap-scrolling row of cards whose centred card is the selection (owner: MAP). Used by
// the world view's story cards and the journey sheet's stop cards.
//   const row = useSnapRow({selected, onSelect, count})   ->  <ul {...row}> with children
//   that carry data-key. Swiping settles on a card and onSelect(key) fires; a selection
//   made elsewhere scrolls its card to the middle. A scroll only counts when a finger, a
//   wheel or a key caused it, so a re-layout can never select a card by itself.
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/capability.js'

export function useSnapRow({ selected, onSelect, count }) {
  const ref = useRef(null)
  const quiet = useRef(0)
  const timer = useRef(0)
  const touched = useRef(0)
  const sel = useRef(selected)
  sel.current = selected
  const cb = useRef(onSelect)
  cb.current = onSelect

  const touch = useCallback(() => {
    touched.current = performance.now()
  }, [])
  const settle = useCallback(() => {
    const box = ref.current
    const now = performance.now()
    if (!box || now < quiet.current || now - touched.current > 4000) return
    const mid = box.scrollLeft + box.clientWidth / 2
    let best = null, bd = Infinity
    for (const c of box.children) {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
      if (d < bd) {
        bd = d
        best = c
      }
    }
    const key = best?.dataset.key
    if (key != null && String(sel.current) !== key) cb.current?.(key)
  }, [])
  const onScroll = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(settle, 110)
  }, [settle])
  useEffect(() => () => clearTimeout(timer.current), [])

  useLayoutEffect(() => {
    const box = ref.current
    if (!box || selected == null) return
    const card = [...box.children].find((c) => c.dataset.key === String(selected))
    if (!card) return
    const left = card.offsetLeft - (box.clientWidth - card.offsetWidth) / 2
    if (Math.abs(box.scrollLeft - left) < 4) return
    quiet.current = performance.now() + 700
    box.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [selected, count])

  return { ref, onScroll, onPointerDown: touch, onTouchStart: touch, onWheel: touch, onKeyDown: touch }
}
