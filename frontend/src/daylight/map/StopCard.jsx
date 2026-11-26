// One stop of a journey as a card (owner: MAP): its number, name, the time on the watch
// there, its day, and its photos with the caption of the one in front. Used as the dock
// under the desktop panel's map, as the phone sheet's swipeable cards, and as what
// playback shows at each stop.
import { imageSrc } from '../lib/data.js'
import { cx } from '../ui/cx.js'
import { dayColor } from './colors.js'
import { stopName } from './labels.js'
import { wallDayLabel, wallTime } from '../lib/format.js'
import s from './StopCard.module.css'

export const dayOf = (journey, stop) => journey.days[stop.dayIndex]
// A chapter title such as "Day 3: Jenny Lake and Inspiration Point" is already the heading
// above; the card keeps its "Day 3" so the weekday and date fit on one line.
const shortDay = (label) => String(label || '').match(/^Day\s+\w+(?=\s*[:.–—-])/i)?.[0] || label
export const dayTitle = (journey, stop) => [shortDay(dayOf(journey, stop)?.label), wallDayLabel(stop.ts)].filter(Boolean).join(' · ')

/** <StopCard journey stop photo={0} compact action footer />  action sits at the right of the head row */
export function StopCard({ journey, stop, photo = 0, compact = false, action, footer, className, as: Tag = 'div', ...rest }) {
  if (!stop) return null
  const photos = stop.photoIds.map((id) => journey.photos[id]).filter((p) => p?.src)
  const front = photos[Math.min(photo, photos.length - 1)] || null
  const name = stopName(stop) || (stop.kind === 'photo' ? 'A photo on the way' : 'A stop')
  const time = wallTime(stop.ts)
  return (
    <Tag className={cx(s.card, compact && s.compact, className)} data-ui="stop-card" data-stop={stop.id} style={{ '--day': dayColor(stop.dayIndex) }} {...rest}>
      <div className={s.head}>
        <span className={cx(s.n, stop.n == null && s.nDot, 'a-mono')} aria-hidden="true">
          {stop.n ?? ''}
        </span>
        <div className={s.names}>
          <p className={s.name}>
            {stop.n != null ? <span className="a-sr">Stop {stop.n}: </span> : null}
            {name}
          </p>
          <p className={cx(s.when, 'a-mono')}>
            <span>{dayTitle(journey, stop)}</span>
            {time ? <span className={s.time}>{time}</span> : null}
          </p>
        </div>
        {action}
      </div>
      {front ? (
        <div className={s.body}>
          <div className={s.photos} data-count={Math.min(photos.length, 3)}>
            {photos.slice(0, 3).map((p, i) => (
              <img key={p.id} className={s.photo} data-front={p === front || undefined} src={imageSrc(p.src, 'small')} alt="" loading="lazy" style={{ '--i': i }} />
            ))}
          </div>
          {front.caption ? (
            <p className={s.caption} key={front.id}>
              {front.caption}
            </p>
          ) : null}
        </div>
      ) : null}
      {footer}
    </Tag>
  )
}
