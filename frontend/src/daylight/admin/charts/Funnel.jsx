// The sign-up funnel as HTML bars (owner: ADMIN). Each step's bar is its share of the first
// step shown; a step the server could not count (null, no auth schema) is left out, so the
// funnel then starts at profiles.
import { num, pct } from '../api.js'
import s from './charts.module.css'

export const FUNNEL_STEPS = [
  ['accounts', 'Started an account'],
  ['confirmed', 'Confirmed their email'],
  ['profiles', 'Made a profile'],
  ['with_story', 'Wrote a story'],
  ['with_published', 'Published a story'],
]

export function Funnel({ steps, color = 'var(--a-ink)', label }) {
  const rows = FUNNEL_STEPS.filter(([k]) => steps?.[k] != null)
  const first = rows.length ? steps[rows[0][0]] : 0
  return (
    <ol className={s.funnel} aria-label={label} data-ui="funnel">
      {rows.map(([k, text], i) => {
        const v = steps[k]
        const share = first ? v / first : 0
        return (
          <li key={k} className={s.fRow}>
            <span className={s.fText}>{text}</span>
            <span className={s.fNum}>
              {num(v)}
              {i ? <span className={s.fPct}>{pct(v, first) || '0%'}</span> : null}
            </span>
            <span className={s.track} aria-hidden="true">
              <span className={s.fill} style={{ width: `${Math.max(v ? 2 : 0, share * 100)}%`, background: color }} />
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default Funnel
