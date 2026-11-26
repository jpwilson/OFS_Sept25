import { useEffect, useRef } from 'react'
import { onFrame, stageProgress } from '../lib/scroll.js'
import { cx } from './cx.js'
import s from './Stage.module.css'

/**
 * A pinned scroll stage: a tall wrapper (svh tall) holding a `position: sticky; top: 0;
 * height: 100svh` viewport. onProgress(p, pinEl, frame) runs every frame while the stage is
 * within a viewport of the screen; write styles through refs there, never React state.
 * wash / floor as Section. pinned=false renders the wrapper at its natural height (poster
 * and flow modes) with the same children.
 */
export function Stage({ id, svh = 300, wash, floor, onProgress, pinned = true, className, pinClassName, style, pinStyle, children, stageRef, ...rest }) {
  const wrap = useRef(null)
  const pin = useRef(null)
  const cb = useRef(onProgress)
  cb.current = onProgress

  useEffect(
    () =>
      onFrame((frame) => {
        const w = wrap.current
        const p = pin.current
        const fn = cb.current
        if (!w || !p || !fn) return
        const r = w.getBoundingClientRect()
        if (r.bottom < -frame.vh || r.top > frame.vh * 2) return
        fn(stageProgress(w), p, frame)
      }),
    [],
  )

  const setRef = (el) => {
    wrap.current = el
    if (typeof stageRef === 'function') stageRef(el)
    else if (stageRef) stageRef.current = el
  }

  return (
    <section
      {...rest}
      ref={setRef}
      id={id}
      data-wash={wash}
      data-floor={floor || undefined}
      data-pinned={pinned ? '' : undefined}
      className={cx(s.stage, className)}
      style={pinned ? { height: `${Math.max(100, svh)}svh`, ...style } : style}
    >
      <div ref={pin} className={cx(s.pin, pinClassName)} style={pinStyle}>
        {children}
      </div>
    </section>
  )
}
