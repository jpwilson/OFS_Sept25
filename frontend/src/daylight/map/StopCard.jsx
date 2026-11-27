// One stop of a journey as a card (owner: MAP): its number, name, the time on the watch
// there, its day, and its photos with the caption of the one in front. Used as the phone
// sheet's swipeable cards and as what playback shows at each stop. `line` is the compact
// form the desktop panel's dock uses: one row of place and time and a small photo strip, so
// the map above it stays the main thing.
import { imageSrc } from '../lib/data.js'
import { cx } from '../ui/cx.js'
import { dayColor } from './colors.js'
import { stopName } from './labels.js'
import { wallDayLabel, wallTime, wallTripDate } from '../lib/format.js'
import s from './StopCard.module.css'

export const dayOf = (journey, stop) => journey.days[stop.dayIndex]
// A chapter title such as "Day 3: Jenny Lake and Inspiration Point" is already the heading
// above; the card keeps its "Day 3". A chapter called something else ("Sunrise on Mormon
// Row") gives no number, and the weekday and date say the day on their own.
const dayNumber = (label) => String(label || '').match(/^Day\s+\w+(?=\s*[:.·–—-]|\s*$)/i)?.[0] || null
export const dayTitle = (journey, stop) => [dayNumber(dayOf(journey, stop)?.label), wallDayLabel(stop.ts)].filter(Boolean).join(' · ')
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "Day 3 · Tue, Jun 16": the line card's shorter day, so it fits beside the photos. */
const shortDayTitle = (journey, stop) => {
  const d = wallTripDate(stop.ts)
  return [dayNumber(dayOf(journey, stop)?.label), d ? `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}` : null].filter(Boolean).join(' · ')
}

/** <StopCard journey stop photo={0} compact line action footer />  action sits at the right of the head row */
export function StopCard({ journey, stop, photo = 0, compact = false, line = false, action, footer, className, as: Tag = 'div', ...rest }) {
  if (!stop) return null
  const photos = stop.photoIds.map((id) => journey.photos[id]).filter((p) => p?.src)
  const front = photos[Math.min(photo, photos.length - 1)] || null
  const name = stopName(stop) || (stop.kind === 'photo' ? 'A photo on the way' : 'A stop')
  const time = wallTime(stop.ts)
  // a draft's stop with no place name yet is called by its time: say the time once
  const showTime = time && !name.includes(time)
  const head = (
    <>
      <span className={cx(s.n, stop.n == null && s.nDot, 'a-mono')} aria-hidden="true">
        {stop.n ?? ''}
      </span>
      <div className={s.names}>
        <p className={s.name}>
          {stop.n != null ? <span className="a-sr">Stop {stop.n}: </span> : null}
          {name}
        </p>
        <p className={cx(s.when, 'a-mono')}>
          <span>{line ? shortDayTitle(journey, stop) : dayTitle(journey, stop)}</span>
          {showTime ? <span className={s.time}>{time}</span> : null}
        </p>
      </div>
    </>
  )
  if (line) {
    const strip = photos.slice(0, 3)
    return (
      <Tag className={cx(s.card, s.line, className)} data-ui="stop-card" data-stop={stop.id} style={{ '--day': dayColor(stop.dayIndex) }} {...rest}>
        {head}
        {strip.length ? (
          <div className={s.strip} data-count={strip.length} aria-hidden="true">
            {strip.map((p) => (
              <img key={p.id} className={s.thumb} data-front={(p === front && photos.length > 1) || undefined} src={imageSrc(p.src, 'small')} alt="" loading="lazy" />
            ))}
          </div>
        ) : null}
        {action}
        {footer}
      </Tag>
    )
  }
  return (
    <Tag className={cx(s.card, compact && s.compact, className)} data-ui="stop-card" data-stop={stop.id} style={{ '--day': dayColor(stop.dayIndex) }} {...rest}>
      <div className={s.head}>
        {head}
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
