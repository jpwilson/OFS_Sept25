import { cx } from './cx.js'
import s from './Readout.module.css'

/** <Readout label="Stories" value={12} unit note size="sm|md" />: a mono label over a number. */
export function Readout({ label, value, unit, note, size = 'md', className }) {
  return (
    <div className={cx(s.ro, s[size], className)} data-ui="readout">
      <span className={s.label}>{label}</span>
      <span className={s.value}>
        {value}
        {unit ? <span className={s.unit}>{unit}</span> : null}
      </span>
      {note ? <span className={s.note}>{note}</span> : null}
    </div>
  )
}
