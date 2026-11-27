// A ranked list as HTML bars (owner: ADMIN): the top referrers. Bars are shares of the top row.
import { num } from '../api.js'
import s from './charts.module.css'

/** <Ranked rows={[{key, label, value, note}]} color label /> */
export function Ranked({ rows, color = 'var(--a-azure-deep)', label }) {
  const top = Math.max(1, ...rows.map((r) => r.value || 0))
  return (
    <ol className={s.ranked} aria-label={label} data-ui="ranked">
      {rows.map((r) => (
        <li key={r.key} className={s.fRow}>
          <span className={s.fText}>
            {r.label}
            {r.note ? <span className={s.rNote}>{r.note}</span> : null}
          </span>
          <span className={s.fNum}>{num(r.value)}</span>
          <span className={s.track} aria-hidden="true">
            <span className={s.fill} style={{ width: `${Math.max(r.value ? 2 : 0, ((r.value || 0) / top) * 100)}%`, background: color }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

export default Ranked
