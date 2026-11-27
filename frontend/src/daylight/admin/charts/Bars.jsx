// A bar chart in hand-written SVG (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Charts".
// The bars stretch (viewBox, preserveAspectRatio="none"); every word is HTML outside the
// SVG. The y-axis shows its top and its baseline, the x-axis the first, middle and last
// buckets. A partial bucket is drawn at half strength and labelled "so far". Selecting a bar
// (tap, hover, or arrow keys on the focused chart) writes a line ABOVE the chart, never a
// floating tooltip. A "Show as table" holds every number.
//
// <Bars title action series keys extra interval summary legend ui />
//   series: [{t, partial, ...numbers}]   keys: [{key, label, color}] stacked bottom up
//   extra: [{key, label}] shown in the readout and the table, not drawn
//   summary: the readout line while nothing is selected
import { useId, useRef, useState } from 'react'
import { bucketLabel, tickLabel } from '../time.js'
import { num } from '../api.js'
import { cx } from '../../ui/cx.js'
import s from './charts.module.css'

/** A round number at or above n (never 0, so an empty chart still has a scale). */
export function niceMax(n) {
  if (!(n > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  for (const m of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) if (m * p >= n) return m * p
  return 10 * p
}

const total = (b, keys) => keys.reduce((a, k) => a + (b[k.key] || 0), 0)

export function Bars({ title, action, series, keys, extra = [], interval, summary, legend = keys.length > 1, ui }) {
  const id = useId()
  const [sel, setSel] = useState(null)
  const areaRef = useRef(null)
  const n = series.length
  const max = niceMax(Math.max(0, ...series.map((b) => total(b, keys))))
  const at = sel != null && sel < n ? sel : null
  const many = n > 60
  const w = many ? 0.86 : n > 20 ? 0.74 : 0.62
  // over a week of hours, the ticks name days
  const tickInterval = interval === 'hour' && n > 30 ? 'day' : interval
  const ticks = n ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : []

  const indexAt = (clientX) => {
    const r = areaRef.current?.getBoundingClientRect()
    if (!r || !n) return null
    return Math.max(0, Math.min(n - 1, Math.floor(((clientX - r.left) / r.width) * n)))
  }
  const onKeyDown = (e) => {
    if (!n) return
    const cur = at ?? n
    let j = null
    if (e.key === 'ArrowRight') j = Math.min(n - 1, cur + 1)
    if (e.key === 'ArrowLeft') j = Math.max(0, (at ?? n) - 1)
    if (e.key === 'Home') j = 0
    if (e.key === 'End') j = n - 1
    if (e.key === 'Escape') {
      if (at == null) return
      e.preventDefault()
      setSel(null)
      return
    }
    if (j == null) return
    e.preventDefault()
    setSel(j)
  }

  const line = (b) => {
    const parts = [...keys, ...extra].map((k) => `${num(b[k.key])} ${k.label}`)
    if (keys.length > 1) parts.unshift(`${num(total(b, keys))} in all`)
    return `${bucketLabel(b.t, interval)}${b.partial ? ' (so far)' : ''} · ${parts.join(' · ')}`
  }

  return (
    <figure className={s.figure} aria-labelledby={`${id}-cap`} data-ui={ui || 'chart'}>
      <figcaption className={s.cap}>
        <h3 id={`${id}-cap`} className={s.title}>{title}</h3>
        {action ? <div className={s.action}>{action}</div> : null}
      </figcaption>
      {legend ? (
        <ul className={s.legend} aria-label="Colours">
          {keys.map((k) => (
            <li key={k.key}>
              <span className={s.swatch} style={{ background: k.color }} aria-hidden="true" />
              {k.label}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={cx(s.readout, at != null && s.readoutOn)} aria-live="polite" id={`${id}-ro`} data-ui="chart-readout">
        {at != null ? line(series[at]) : summary}
      </p>
      <div className={s.plot}>
        <div className={s.yaxis} aria-hidden="true">
          <span>{num(max)}</span>
          <span>0</span>
        </div>
        <div
          ref={areaRef}
          className={s.area}
          tabIndex={n ? 0 : -1}
          role="group"
          aria-roledescription="bar chart"
          aria-label={`${title}. Arrow keys move between ${n} bars.`}
          aria-describedby={`${id}-ro`}
          onKeyDown={onKeyDown}
          onPointerMove={(e) => e.pointerType === 'mouse' && setSel(indexAt(e.clientX))}
          onClick={(e) => setSel(indexAt(e.clientX))}
          data-ui="chart-area"
        >
          <svg className={s.svg} viewBox={`0 0 ${Math.max(1, n)} 100`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <line x1="0" x2={Math.max(1, n)} y1="100" y2="100" className={s.base} vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={Math.max(1, n)} y1="0" y2="0" className={s.grid} vectorEffect="non-scaling-stroke" />
            {at != null ? <rect x={at} y="0" width="1" height="100" className={s.hilite} /> : null}
            {series.map((b, i) => {
              let y = 100
              return (
                <g key={b.t} opacity={b.partial ? 0.5 : 1}>
                  {keys.map((k) => {
                    const v = b[k.key] || 0
                    if (!v) return null
                    const h = (v / max) * 100
                    y -= h
                    return <rect key={k.key} x={i + (1 - w) / 2} y={y} width={w} height={h} style={{ fill: k.color }} />
                  })}
                </g>
              )
            })}
          </svg>
        </div>
        <span aria-hidden="true" />
        <div className={s.xaxis} aria-hidden="true">
          {ticks.map((i) => {
            const edge = i === 0 ? 'first' : i === n - 1 ? 'last' : 'mid'
            return (
              <span key={i} className={cx(s.tick, s[edge])} style={edge === 'mid' ? { left: `${((i + 0.5) / n) * 100}%` } : undefined}>
                {tickLabel(series[i].t, tickInterval)}
                {series[i].partial ? <span className={s.soFar}> · so far</span> : null}
              </span>
            )
          })}
        </div>
      </div>
      <details className={s.table}>
        <summary>Show as table</summary>
        <div className={s.tableScroll}>
          <table>
            <caption className="a-sr">{title}</caption>
            <thead>
              <tr>
                <th scope="col">{interval === 'hour' ? 'Hour' : interval === 'month' ? 'Month' : 'Day'}</th>
                {[...keys, ...extra].map((k) => <th key={k.key} scope="col">{k.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {series.map((b) => (
                <tr key={b.t}>
                  <th scope="row">{bucketLabel(b.t, interval)}{b.partial ? ' (so far)' : ''}</th>
                  {[...keys, ...extra].map((k) => <td key={k.key}>{num(b[k.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

export default Bars
