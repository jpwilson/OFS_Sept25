// A tall capture inside a fixed-height frame that wheel, drag or touch scrolls (owner: explain).
// start: 0..1, how far down the capture the frame opens (set after mount).
import { useEffect, useRef } from 'react'
import { ArtImg } from '../ui/ArtImg.jsx'
import { cx } from '../ui/index.js'
import s from './ScrollFrame.module.css'

export function ScrollFrame({ id, alt, label, hint, start = 0, sizes, className }) {
  const scroller = useRef(null)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const img = el.querySelector('img')
    const place = () => {
      if (start > 0) el.scrollTop = el.scrollHeight * start
    }
    if (img && !img.complete) img.addEventListener('load', place, { once: true })
    else place()
    let drag = null
    const down = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      drag = { y: e.clientY, top: el.scrollTop }
      el.setPointerCapture(e.pointerId)
      el.setAttribute('data-drag', '')
    }
    const move = (e) => {
      if (drag) el.scrollTop = drag.top - (e.clientY - drag.y)
    }
    const up = () => {
      drag = null
      el.removeAttribute('data-drag')
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      if (img) img.removeEventListener('load', place)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [start])
  return (
    <div className={cx(s.frame, className)}>
      <div ref={scroller} className={s.scroll} tabIndex={0} data-lenis-prevent="" aria-label={label}>
        <ArtImg id={id} alt={alt} className={s.img} sizes={sizes} />
      </div>
      {hint ? (
        <span className={s.hint} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 4v15M6 13l6 6 6-6" />
          </svg>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
