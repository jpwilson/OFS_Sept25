import { cx } from './cx.js'
import s from './Readout.module.css'

/**
 * A small instrument card: mono label, big tabular value, optional note.
 * valueRef: write a scroll-driven value straight into this span (textContent) from onFrame.
 */
export function Readout({ label, value, note, unit, size = 'md', valueRef, className, style, id }) {
  return (
    <div id={id} className={cx(s.readout, s[size], className)} style={style}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>
        <span ref={valueRef}>{value}</span>
        {unit ? <span className={s.unit}>{unit}</span> : null}
      </span>
      {note ? <span className={s.note}>{note}</span> : null}
    </div>
  )
}
