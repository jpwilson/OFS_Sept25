// The calendar view (owner: FEED). PLAN-DAYLIGHT 2.3.
// A year at a glance by default, opening on the year of the most recent story: twelve
// mini-months (4 by 3 on desktop, a list on a phone). A day where a story starts shows its
// cover; a story that spans days is one bar from its first day to its last, in its
// category colour. A day or a bar opens the story card (a centred card on desktop, a
// bottom sheet on a phone). A month name zooms to that month. Arrow keys move day by day
// (up and down by a week), Enter opens. ?year= and ?month= keep the place for Back.
import { useCallback, useMemo, useRef, useState } from 'react'
import { useDesktop } from '../lib/capability.js'
import { imageSrc } from '../lib/data.js'
import { dateRange, dayLabel, localDay, parseBackendDate, plural } from '../lib/format.js'
import { Button } from '../ui/Button.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { cx } from '../ui/cx.js'
import StoryCard from './StoryCard.jsx'
import { categoryInfo } from './query.js'
import s from './CalendarYear.module.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAYS_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY = 86400000

const dayOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Stories as day spans: [{e, a: Date, b: Date, multi}] */
function spansOf(events) {
  const out = []
  for (const e of events) {
    const a0 = parseBackendDate(e.start_date)
    if (!a0) continue
    const b0 = parseBackendDate(e.end_date) || a0
    const a = dayOf(a0), b = dayOf(b0 < a0 ? a0 : b0)
    out.push({ e, a, b, multi: b - a >= DAY })
  }
  return out.sort((x, y) => x.a - y.a || y.b - x.b)
}

/** Everything one month needs: weeks of days, the stories starting on each day, bars with lanes. */
function monthModel(year, m, spans) {
  const first = new Date(year, m, 1)
  const last = new Date(year, m + 1, 0)
  const offset = first.getDay()
  const inMonth = spans.filter((x) => x.a <= last && x.b >= first)
  const starts = new Map()
  const covers = new Map()
  for (const x of inMonth) {
    for (let d = x.a < first ? first : x.a; d <= x.b && d <= last; d = addDays(d, 1)) {
      const k = localDay(d)
      if (!covers.has(k)) covers.set(k, [])
      covers.get(k).push(x.e)
    }
    if (x.a >= first) {
      const k = localDay(x.a)
      if (!starts.has(k)) starts.set(k, [])
      starts.get(k).push(x)
    }
  }
  // lanes for multi-day stories, so a trip keeps one row across the weeks of the month
  const lanes = []
  const laneOf = new Map()
  for (const x of inMonth.filter((y) => y.multi)) {
    let l = lanes.findIndex((end) => end < x.a)
    if (l === -1) l = lanes.length
    lanes[l] = x.b
    laneOf.set(x.e.id, l)
  }
  const weeks = []
  const nWeeks = Math.ceil((offset + last.getDate()) / 7)
  for (let w = 0; w < nWeeks; w++) {
    const days = []
    for (let c = 0; c < 7; c++) {
      const n = w * 7 + c - offset + 1
      days.push(n >= 1 && n <= last.getDate() ? new Date(year, m, n) : null)
    }
    const real = days.filter(Boolean)
    const ws = real[0], we = real[real.length - 1]
    const bars = []
    for (const x of inMonth) {
      if (!x.multi || x.a > we || x.b < ws) continue
      const sa = x.a < ws ? ws : x.a
      const sb = x.b > we ? we : x.b
      bars.push({ x, lane: laneOf.get(x.e.id), c0: sa.getDay(), c1: sb.getDay(), head: +sa === +x.a, tail: +sb === +x.b })
    }
    weeks.push({ days, bars })
  }
  return { first, last, weeks, starts, covers, lanes: lanes.length, count: inMonth.length }
}

function DayCell({ d, model, big, todayKey, activeKey, onPick }) {
  if (!d) return <div className={s.blank} role="gridcell" aria-hidden="true" />
  const k = localDay(d)
  const starts = model.starts.get(k) || []
  const covers = model.covers.get(k) || []
  const lead = starts[0]?.e
  const has = covers.length > 0
  const label = `${dayLabel(d)}${has ? `, ${covers.map((e) => e.title).join('; ')}` : ', no stories'}`
  return (
    <div role="gridcell" className={s.cellWrap}>
      <button
        type="button"
        className={cx(s.cell, has && s.has, lead && s.photo, k === todayKey && s.today)}
        data-day={k}
        tabIndex={k === activeKey ? 0 : -1}
        aria-label={label}
        aria-disabled={!has || undefined}
        onClick={() => has && onPick({ kind: 'day', key: k })}
      >
        {lead ? (
          <img className={s.thumb} src={imageSrc(lead.cover_image_url, 'small')} alt="" loading="lazy" decoding="async" data-wash={categoryInfo(lead.category).wash || 'tide'} />
        ) : null}
        <span className={s.num}>{d.getDate()}</span>
        {starts.length > 1 ? <span className={s.more}>+{starts.length - 1}</span> : null}
        {big && lead ? <span className={s.cellTitle}>{lead.title}</span> : null}
      </button>
    </div>
  )
}

function MonthGrid({ year, m, model, big, todayKey, activeKey, onPick, onZoom, desktop }) {
  const empty = model.count === 0
  const titleId = `cal-${year}-${m}`
  if (!big && empty && !desktop) {
    return (
      <div className={s.emptyMonth} data-ui="cal-month-empty">
        <span className={s.emptyName}>{MONTHS[m]}</span>
        <span className="a-label a-mute">No stories</span>
      </div>
    )
  }
  return (
    <section className={cx(s.month, big && s.big, empty && s.quiet)} aria-labelledby={titleId} data-ui="cal-month">
      {big ? null : (
        <header className={s.monthHead}>
          <h3 id={titleId} className={s.monthName}>
            <button type="button" className={s.monthLink} onClick={() => onZoom(m)} aria-label={`Open ${MONTHS[m]} ${year}`}>
              {MONTHS[m]}
            </button>
          </h3>
          {model.count ? <span className={s.monthCount}>{plural(model.count, 'story', 'stories')}</span> : null}
        </header>
      )}
      {big ? <h3 id={titleId} className="a-sr">{`${MONTHS[m]} ${year}`}</h3> : null}
      <div role="grid" aria-labelledby={titleId} className={s.grid}>
        <div role="row" className={s.weekdays}>
          {(big && desktop ? WEEKDAYS_LONG : WEEKDAYS).map((w, i) => (
            <span role="columnheader" key={i} className={s.wd}>
              {w}
            </span>
          ))}
        </div>
        {model.weeks.map((wk, wi) => (
          <div role="row" key={wi} className={s.week}>
            {wk.days.map((d, ci) => (
              <DayCell key={ci} d={d} model={model} big={big} todayKey={todayKey} activeKey={activeKey} onPick={onPick} />
            ))}
            {wk.bars.length ? (
              <div className={s.bars} aria-hidden="true">
                {wk.bars.map((b) => {
                  const cat = categoryInfo(b.x.e.category)
                  return (
                    <button
                      key={b.x.e.id}
                      type="button"
                      tabIndex={-1}
                      className={cx(s.bar, b.head && s.head, b.tail && s.tail)}
                      data-wash={cat.wash || 'tide'}
                      style={{ gridColumn: `${b.c0 + 1} / ${b.c1 + 2}`, gridRow: b.lane + 1 }}
                      onClick={() => onPick({ kind: 'story', id: b.x.e.id })}
                      aria-label={`${b.x.e.title}, ${dateRange(b.x.e.start_date, b.x.e.end_date)}`}
                      title={`${b.x.e.title} · ${dateRange(b.x.e.start_date, b.x.e.end_date, { short: true })}`}
                    >
                      {big && (b.head || b.c0 === 0) ? <span className={s.barText}>{b.x.e.title}</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function CalendarYear({ events, q, set, faceFor, onOpen, loadingAll }) {
  const desktop = useDesktop()
  const spans = useMemo(() => spansOf(events), [events])
  const years = useMemo(() => {
    const ys = new Set()
    for (const x of spans) for (let y = x.a.getFullYear(); y <= x.b.getFullYear(); y++) ys.add(y)
    return [...ys].sort((a, b) => a - b)
  }, [spans])
  const latest = spans.length ? spans.reduce((m, x) => (x.a > m ? x.a : m), spans[0].a).getFullYear() : new Date().getFullYear()
  const year = q.year || latest
  const zoom = q.month && Number(q.month.slice(0, 4)) === year ? Number(q.month.slice(5, 7)) - 1 : null
  const models = useMemo(() => MONTHS.map((_, m) => monthModel(year, m, spans)), [year, spans])
  const todayKey = localDay(new Date())
  const yearCount = useMemo(() => spans.filter((x) => x.a.getFullYear() <= year && x.b.getFullYear() >= year).length, [spans, year])
  const legend = useMemo(() => {
    const lo = zoom != null ? new Date(year, zoom, 1) : new Date(year, 0, 1)
    const hi = zoom != null ? new Date(year, zoom + 1, 0) : new Date(year, 11, 31)
    const seen = new Map()
    for (const x of spans) if (x.a <= hi && x.b >= lo) seen.set(x.e.category || '', categoryInfo(x.e.category))
    return [...seen.values()].filter((c) => c.value)
  }, [spans, year, zoom])

  // roving focus: one day in the year is the tab stop
  const firstStoryDay = useMemo(() => {
    const ms = zoom != null ? [models[zoom]] : models
    for (const md of ms) for (const k of [...md.covers.keys()].sort()) return k
    return localDay(new Date(year, zoom ?? 0, 1))
  }, [models, zoom, year])
  const [active, setActive] = useState(null)
  const activeKey = active && active.startsWith(String(year)) ? active : firstStoryDay
  const ref = useRef(null)
  const onKeyDown = useCallback(
    (ev) => {
      const k = ev.target?.dataset?.day
      if (!k) return
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key]
      if (!step) return
      ev.preventDefault()
      const next = localDay(addDays(parseBackendDate(k), step))
      const el = ref.current?.querySelector(`[data-day="${next}"]`)
      if (el) {
        setActive(next)
        el.focus()
      }
    },
    [],
  )

  const [pick, setPick] = useState(null)
  const picked = useMemo(() => {
    if (!pick) return null
    if (pick.kind === 'story') {
      const e = events.find((x) => x.id === pick.id)
      return e ? { title: dateRange(e.start_date, e.end_date), items: [e] } : null
    }
    const d = parseBackendDate(pick.key)
    const items = models[d.getMonth()].covers.get(pick.key) || []
    return { title: `${dayLabel(d)}, ${d.getFullYear()}`, items }
  }, [pick, events, models])

  const goYear = (y) => set({ year: y === latest ? null : y, month: null }, { push: true })
  const prevY = years.filter((y) => y < year).pop()
  const nextY = years.find((y) => y > year)
  const zoomTo = (m) => set({ year: year === latest ? null : year, month: m == null ? null : `${year}-${String(m + 1).padStart(2, '0')}` }, { push: true })
  const monthStories = zoom != null ? spans.filter((x) => x.a <= models[zoom].last && x.b >= models[zoom].first).map((x) => x.e) : []

  return (
    <div className={s.cal} data-ui="calendar">
      <div className={s.top}>
        {zoom != null ? (
          <>
            <Button variant="quiet" icon="chevron-left" onClick={() => zoomTo(null)} className={s.back}>
              {year}
            </Button>
            <h2 className={cx(s.yearTitle, s.zoomTitle)}>
              {MONTHS[zoom]} <span className={s.yearSmall}>{year}</span>
            </h2>
            <div className={s.stepper}>
              <IconButton icon="chevron-left" variant="keyline" label="Previous month" onClick={() => (zoom > 0 ? zoomTo(zoom - 1) : null)} disabled={zoom === 0} />
              <IconButton icon="chevron-right" variant="keyline" label="Next month" onClick={() => (zoom < 11 ? zoomTo(zoom + 1) : null)} disabled={zoom === 11} />
            </div>
          </>
        ) : (
          <>
            <h2 className={s.yearTitle}>{year}</h2>
            <span className={s.yearCount}>{loadingAll ? 'Loading every story…' : plural(yearCount, 'story', 'stories')}</span>
            <div className={s.stepper}>
              <IconButton icon="chevron-left" variant="keyline" label={prevY ? `Go to ${prevY}` : 'No earlier stories'} onClick={() => prevY && goYear(prevY)} disabled={!prevY} />
              <IconButton icon="chevron-right" variant="keyline" label={nextY ? `Go to ${nextY}` : 'No later stories'} onClick={() => nextY && goYear(nextY)} disabled={!nextY} />
            </div>
          </>
        )}
      </div>
      {legend.length ? (
        <ul className={s.legend} aria-label="Category colors">
          {legend.map((c) => (
            <li key={c.value} className={s.legendItem}>
              <span className={s.legendDot} data-wash={c.wash || undefined} />
              {c.label}
            </li>
          ))}
          <li className={cx(s.legendItem, s.legendHint)}>A bar is a story that spans days</li>
        </ul>
      ) : null}

      <div ref={ref} onKeyDown={onKeyDown} onFocus={(ev) => ev.target?.dataset?.day && setActive(ev.target.dataset.day)}>
        {zoom != null ? (
          <MonthGrid year={year} m={zoom} model={models[zoom]} big desktop={desktop} todayKey={todayKey} activeKey={activeKey} onPick={setPick} onZoom={zoomTo} />
        ) : (
          <div className={s.months}>
            {models.map((md, m) => (
              <MonthGrid key={m} year={year} m={m} model={md} desktop={desktop} todayKey={todayKey} activeKey={activeKey} onPick={setPick} onZoom={zoomTo} />
            ))}
          </div>
        )}
      </div>

      {zoom != null ? (
        monthStories.length ? (
          <section className={s.monthList} aria-label={`Stories in ${MONTHS[zoom]}`}>
            <h3 className={s.listHead}>
              In {MONTHS[zoom]} · {plural(monthStories.length, 'story', 'stories')}
            </h3>
            <ul className={s.cards}>
              {monthStories.map((e) => (
                <li key={e.id}>
                  <StoryCard event={e} variant="card" face={faceFor(e.author_username, e.author_full_name)} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className={s.none}>No stories in {MONTHS[zoom]} {year}.</p>
        )
      ) : null}

      <Sheet open={!!picked} onClose={() => setPick(null)} title={picked?.title || ''} placement="auto">
        <ul className={s.sheetList} data-ui="cal-sheet">
          {(picked?.items || []).map((e) => (
            <li key={e.id}>
              <StoryCard event={e} variant="mini" face={faceFor(e.author_username, e.author_full_name)} onOpen={onOpen} headingLevel={3} />
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
