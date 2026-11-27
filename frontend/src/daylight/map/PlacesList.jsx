// The world view's static level (owner: MAP): stories grouped by place name, every row a
// link to its story. Shown when the live map cannot run (PLAN-DAYLIGHT 3.6); it uses no
// map data, so it needs no attribution.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { shortPlace, dateRange } from '../lib/format.js'
import { imageSrc } from '../lib/data.js'
import { Icon } from '../ui/Icon.jsx'
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
            <Icon name="pin" size={18} />
            <span>{place}</span>
            <span className={`${s.count} a-mono`}>{list.length}</span>
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
                  {e.cover_image_url ? <img src={imageSrc(e.cover_image_url, 'micro')} alt="" loading="lazy" width="52" height="52" className={s.thumb} /> : <span className={s.thumb} />}
                  <span className={s.text}>
                    <span className={s.title}>{e.title}</span>
                    <span className={`${s.meta} a-mono`}>{dateRange(e.start_date, e.end_date, { short: true })} · {e.author_full_name || e.author_username}</span>
                  </span>
                  <Icon name="arrow" size={20} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
