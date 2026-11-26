// The world view's static level (owner: F0, MAP may restyle): stories grouped by place
// name, every row a link. Also the keyboard and screen-reader path beside the map.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { shortPlace, dateRange } from '../lib/format.js'
import { imageSrc } from '../lib/data.js'
import s from './PlacesList.module.css'

export function groupByPlace(events) {
  const m = new Map()
  for (const e of events) {
    const k = shortPlace(e.location_name, 2) || 'No place yet'
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(e)
  }
  return [...m.entries()].sort((a, b) => (a[0] === 'No place yet') - (b[0] === 'No place yet') || b[1].length - a[1].length || a[0].localeCompare(b[0]))
}

/** <PlacesList events selectedId onSelect /> */
export function PlacesList({ events, selectedId, onSelect }) {
  const groups = useMemo(() => groupByPlace(events || []), [events])
  return (
    <div className={s.places} data-ui="places-list">
      {groups.map(([place, list]) => (
        <section key={place} className={s.group}>
          <h3 className={s.place}>
            {place} <span className="a-mono a-mute">{list.length}</span>
          </h3>
          <ul className={s.list}>
            {list.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/event/${e.slug || e.id}`}
                  className={s.row}
                  aria-current={selectedId === e.id ? 'true' : undefined}
                  onMouseEnter={() => onSelect?.(e.id)}
                  onFocus={() => onSelect?.(e.id)}
                >
                  {e.cover_image_url ? <img src={imageSrc(e.cover_image_url, 'micro')} alt="" loading="lazy" width="48" height="48" className={s.thumb} /> : <span className={s.thumb} />}
                  <span className={s.text}>
                    <span className={s.title}>{e.title}</span>
                    <span className={`${s.meta} a-mono`}>{dateRange(e.start_date, e.end_date, { short: true })} · {e.author_full_name || e.author_username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
