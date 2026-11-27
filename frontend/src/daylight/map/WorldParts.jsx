// The pieces around the world map (owner: MAP): the filters, the story list (the
// keyboard and screen-reader path), the phone's swipeable cards and its three-height sheet.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { imageSrc } from '../lib/data.js'
import { dateRange, plural, shortPlace } from '../lib/format.js'
import { prefersReducedMotion } from '../lib/capability.js'
import { CATEGORY_WASH } from '../styles/tokens.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { SCOPES, firstName } from './worldFilters.js'
import { storyTo } from './StoryPeek.jsx'
import { useSnapRow } from './useSnapRow.js'
import s from './WorldPage.module.css'

// ---------------------------------------------------------------- filters
/**
 * <WorldFilters filters facets onChange(key, value) compact />
 * The same controls in the phone's filter sheet (chips) and the desktop panel (compact:
 * the scope is one select, so the list of stories keeps most of the panel).
 */
export function WorldFilters({ filters, facets, onChange, compact }) {
  return (
    <div className={cx(s.filters, compact && s.filtersCompact)} data-ui="world-filters">
      {compact ? (
        <label className={s.scope}>
          <span className="a-sr">Whose stories</span>
          <select className={s.scopeSelect} value={filters.who} onChange={(e) => onChange('who', e.target.value)}>
            {SCOPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={18} />
        </label>
      ) : (
        <fieldset className={s.group}>
          <legend className="a-label">Whose stories</legend>
          <div className={s.chips} role="radiogroup" aria-label="Whose stories">
            {SCOPES.map((o) => (
              <Chip key={o.value} role="radio" aria-checked={filters.who === o.value} aria-pressed={undefined} selected={filters.who === o.value} onClick={() => onChange('who', o.value)} title={o.hint}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      {facets.people.length > 1 ? (
        <fieldset className={s.group}>
          <legend className="a-label">By</legend>
          <div className={s.chips}>
            {facets.people.map((p) => (
              <button key={p.username} type="button" className={s.face} aria-pressed={filters.person === p.username} onClick={() => onChange('person', filters.person === p.username ? null : p.username)}>
                <Avatar name={p.name} src={p.avatarUrl} size={compact ? 22 : 26} />
                <span>{firstName(p.name)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {facets.cats.length > 1 ? (
        <fieldset className={s.group}>
          <legend className="a-label">Kind</legend>
          <div className={s.chips}>
            {facets.cats.map((c) => (
              <Chip key={c.name} size="sm" dot wash={CATEGORY_WASH[c.name] || 'tide'} selected={filters.cat === c.name} onClick={() => onChange('cat', filters.cat === c.name ? null : c.name)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}
      {facets.years.length > 1 ? (
        <fieldset className={s.group}>
          <legend className="a-label">Year</legend>
          <div className={s.chips}>
            {facets.years.map((y) => (
              <Chip key={y} size="sm" selected={filters.year === y} onClick={() => onChange('year', filters.year === y ? null : y)}>
                <span className="a-mono">{y}</span>
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- the list
function Thumb({ event, face }) {
  return (
    <span className={s.thumb}>
      {event.cover_image_url ? <img src={imageSrc(event.cover_image_url, 'micro')} alt="" loading="lazy" width="52" height="52" /> : <span className={s.thumbEmpty} />}
      <Avatar name={face.name} src={face.avatarUrl} size={22} ring className={s.thumbFace} />
    </span>
  )
}

/**
 * Every pin is also a row here. The row's main button shows the story on the map; the
 * arrow opens it. Rows for stories with no place are plain links under "Not on the map yet".
 */
export function StoryRows({ events, unplaced = [], selectedId, hoverId, onSelect, onHover, faceFor, empty }) {
  const ref = useRef(null)
  useEffect(() => {
    if (selectedId == null) return
    const row = ref.current?.querySelector(`[data-story="${selectedId}"]`)
    row?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [selectedId])
  const face = (e) => faceFor?.(e.author_username, e.author_full_name) || { name: e.author_full_name || e.author_username }
  if (!events.length && !unplaced.length) return empty || null
  return (
    <div ref={ref} className={s.rows} data-ui="world-list">
      {events.length ? (
        <ul className={s.rowList} aria-label="Stories on the map">
          {events.map((e) => (
            <li key={e.id} className={s.row} data-story={e.id} data-selected={selectedId === e.id || undefined} data-hover={hoverId === e.id || undefined} onMouseEnter={() => onHover?.(e.id)} onMouseLeave={() => onHover?.(null)}>
              <button type="button" className={s.rowMain} aria-pressed={selectedId === e.id} onClick={() => onSelect?.(e.id)} onFocus={() => onHover?.(e.id)} onBlur={() => onHover?.(null)}>
                <Thumb event={e} face={face(e)} />
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{e.title}</span>
                  <span className={`${s.rowMeta} a-mono`}>
                    {dateRange(e.start_date, e.end_date, { short: true })}
                    {e.location_name ? ` · ${shortPlace(e.location_name, 1)}` : ''}
                  </span>
                  <span className="a-sr">. Show on the map.</span>
                </span>
              </button>
              <Link to={storyTo(e)} className={s.rowOpen} aria-label={`Open ${e.title}`} title="Open story">
                <Icon name="arrow" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {unplaced.length ? (
        <section className={s.unplaced} data-ui="world-unplaced">
          <h3 className="a-label">Not on the map yet · {unplaced.length}</h3>
          <p className={s.unplacedNote}>{unplaced.length === 1 ? 'This story has' : 'These stories have'} no place.</p>
          <ul className={s.rowList}>
            {unplaced.map((e) => (
              <li key={e.id} className={s.row}>
                <Link to={storyTo(e)} className={s.rowMain}>
                  <Thumb event={e} face={face(e)} />
                  <span className={s.rowText}>
                    <span className={s.rowTitle}>{e.title}</span>
                    <span className={`${s.rowMeta} a-mono`}>{dateRange(e.start_date, e.end_date, { short: true })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- the phone's cards
/**
 * Snap-scrolling story cards. Swiping settles on a card and that story is selected, so
 * the map flies to it: the whole view works with one thumb. Tapping a card opens it.
 */
export function StoryCarousel({ events, selectedId, onSelect, faceFor }) {
  const row = useSnapRow({ selected: selectedId, count: events.length, onSelect: (key) => onSelect?.(events.find((e) => String(e.id) === key)?.id) })
  return (
    <ul {...row} className={s.carousel} data-ui="world-carousel" aria-label="Stories on the map. Swipe to move the map.">
      {events.map((e) => {
        const face = faceFor?.(e.author_username, e.author_full_name) || { name: e.author_full_name || e.author_username }
        return (
          <li key={e.id} className={s.card} data-key={e.id} data-story={e.id} data-selected={selectedId === e.id || undefined}>
            {e.cover_image_url ? <img className={s.cardCover} src={imageSrc(e.cover_image_url, 'small')} alt="" loading="lazy" /> : <span className={s.cardCover} />}
            <span className={s.cardText}>
              <span className={`${s.cardDate} a-mono`}>
                {dateRange(e.start_date, e.end_date, { short: true })}
                {e.location_name ? ` · ${shortPlace(e.location_name, 1)}` : ''}
              </span>
              <Link to={storyTo(e)} className={s.cardTitle}>
                {e.title}
              </Link>
              <span className={s.cardBy}>
                <Avatar name={face.name} src={face.avatarUrl} size={22} />
                <span>{face.name}</span>
                <span className={s.cardGo} aria-hidden="true">
                  Open <Icon name="arrow" size={16} />
                </span>
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------- the phone's sheet
export const SNAPS = ['peek', 'half', 'full']
const HEAD_H = 96 // the sheet's head is exactly the peek height
export const sheetHeights = (areaH, peek = 96) => ({ peek, half: Math.max(peek + 120, Math.round(areaH * 0.45)), full: Math.max(peek + 160, Math.round(areaH * 0.92)) })

/**
 * A bottom sheet with three heights (96px peek, 45%, 92% of the map area). Drag the grip
 * or the header; a flick goes one step. The grip is also a button: it steps up, and from
 * full it goes back to peek. onHeight(px) reports the live height while dragging, so the
 * map's own controls ride above it.
 */
export function WorldSheet({ snap, onSnap, areaH, onHeight, title, sub, action, children, dragBody }) {
  const el = useRef(null)
  const drag = useRef(null)
  const hs = sheetHeights(areaH)
  const h = hs[snap]
  const moved = useRef(false)

  useLayoutEffect(() => {
    onHeight?.(h, false)
  }, [h])

  const place = (px, live) => {
    if (!el.current) return
    el.current.style.transition = live ? 'none' : ''
    el.current.style.transform = `translateY(${hs.full - px}px)`
    onHeight?.(px, live)
  }
  const down = (e) => {
    if (e.button != null && e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, h0: h, last: e.clientY, t: performance.now(), v: 0, on: false, target: e.currentTarget }
    moved.current = false
  }
  const move = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = d.y - e.clientY, dx = e.clientX - d.x
    if (!d.on) {
      if (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx)) return
      d.on = true
      moved.current = true
      try {
        d.target.setPointerCapture(e.pointerId)
      } catch {
        /* not capturable */
      }
    }
    const now = performance.now()
    d.v = (d.last - e.clientY) / Math.max(1, now - d.t)
    d.last = e.clientY
    d.t = now
    place(Math.max(hs.peek - 12, Math.min(hs.full, d.h0 + dy)), true)
  }
  const up = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.on) return
    const cur = Math.max(hs.peek, Math.min(hs.full, d.h0 + (d.y - e.clientY)))
    let i = SNAPS.indexOf(snap)
    if (Math.abs(d.v) > 0.45) i = Math.max(0, Math.min(2, i + (d.v > 0 ? 1 : -1)))
    else i = SNAPS.map((k) => Math.abs(hs[k] - cur)).reduce((b, v, k, a) => (v < a[b] ? k : b), 0)
    const next = SNAPS[i]
    place(hs[next], false)
    if (next !== snap) onSnap(next)
  }
  const step = () => {
    if (moved.current) return
    onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')
  }
  const handlers = { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }

  return (
    <section ref={el} className={s.sheet} style={{ height: hs.full, transform: `translateY(${hs.full - h}px)` }} data-ui="world-sheet" data-snap={snap} aria-label="Stories on the map">
      <div className={s.sheetHead} {...handlers}>
        <button type="button" className={s.grip} onClick={step} aria-expanded={snap !== 'peek'} aria-label={snap === 'peek' ? 'Show the story cards' : snap === 'half' ? 'Show the whole list' : 'Lower the list'}>
          <span aria-hidden="true" />
        </button>
        <div className={s.sheetTitle}>
          <div className={s.sheetTitleText}>
            <h2>{title}</h2>
            {sub ? <p className="a-mono">{sub}</p> : null}
          </div>
          {action}
        </div>
      </div>
      <div className={cx(s.sheetBody, snap === 'full' && s.sheetScroll)} style={{ height: (snap === 'full' ? hs.full : hs.half) - HEAD_H }} {...(dragBody && snap !== 'full' ? handlers : {})} inert={snap === 'peek'}>
        {children}
      </div>
    </section>
  )
}

export const storiesCount = (n) => plural(n, 'story', 'stories')
