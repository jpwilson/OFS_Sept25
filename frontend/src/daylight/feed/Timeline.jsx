// The timeline view (owner: FEED). PLAN-DAYLIGHT 2.4.
// One vertical rail with a sticker per year and a tick per month; cards in one column to
// the right; dates in DM Mono on the rail. A sticky year index jumps between years and
// lights the one you are reading. Always ordered by the date it happened (newest or
// oldest first from the filter). On a phone the rail runs 20px from the left edge.
import { useEffect, useMemo, useRef, useState } from 'react'
import { dateRange, parseBackendDate, plural } from '../lib/format.js'
import { cx } from '../ui/cx.js'
import StoryCard from './StoryCard.jsx'
import s from './Timeline.module.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function yearsOf(items, dir) {
  const sorted = [...items].sort((a, b) => (dir === 'old' ? -1 : 1) * ((parseBackendDate(b.start_date) || 0) - (parseBackendDate(a.start_date) || 0)))
  const years = []
  let y = null, m = null
  for (const e of sorted) {
    const d = parseBackendDate(e.start_date)
    if (!d) continue
    if (!y || y.year !== d.getFullYear()) {
      y = { year: d.getFullYear(), months: [], count: 0 }
      years.push(y)
      m = null
    }
    if (!m || m.month !== d.getMonth()) {
      m = { month: d.getMonth(), items: [] }
      y.months.push(m)
    }
    m.items.push(e)
    y.count++
  }
  return years
}

export default function Timeline({ items, q, faceFor, onOpen }) {
  const years = useMemo(() => yearsOf(items, q.dir), [items, q.dir])
  const [current, setCurrent] = useState(years[0]?.year)
  const refs = useRef({})

  useEffect(() => {
    setCurrent((c) => (years.some((y) => y.year === c) ? c : years[0]?.year))
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setCurrent(Number(vis[0].target.dataset.year))
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    Object.values(refs.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [years])

  const jump = (y) => {
    const el = refs.current[y]
    if (!el) return
    setCurrent(y)
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = el.getBoundingClientRect().top + window.scrollY - 140
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    el.querySelector('h2')?.focus({ preventScroll: true })
  }

  return (
    <div className={s.wrap} data-ui="timeline">
      <nav className={s.index} aria-label="Years">
        <span className={s.indexLabel}>Years</span>
        <ul className={s.indexList}>
          {years.map((y) => (
            <li key={y.year}>
              <button type="button" className={cx(s.yearBtn, current === y.year && s.on)} aria-current={current === y.year ? 'true' : undefined} onClick={() => jump(y.year)}>
                <span className={s.yearNum}>{y.year}</span>
                <span className={s.yearN}>{y.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ol className={s.rail}>
        {years.map((y) => (
          <li key={y.year} className={s.year} data-year={y.year} ref={(el) => (refs.current[y.year] = el)}>
            <h2 className={s.yearHead} tabIndex={-1}>
              <span className={s.sticker}>{y.year}</span>
              <span className={s.yearCount}>{plural(y.count, 'story', 'stories')}</span>
            </h2>
            <ol className={s.months}>
              {y.months.map((m) => (
                <li key={m.month} className={s.month}>
                  <h3 className={s.tick}>{MONTHS[m.month]}</h3>
                  <ol className={s.entries}>
                    {m.items.map((e) => (
                      <li key={e.id} className={s.entry}>
                        <span className={s.dot} aria-hidden="true" />
                        <span className={s.date}>{dateRange(e.start_date, e.end_date, { short: true })}</span>
                        <StoryCard event={e} variant="row" face={faceFor(e.author_username, e.author_full_name)} onOpen={onOpen} headingLevel={4} />
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  )
}
