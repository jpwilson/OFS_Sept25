// The selected story's card on the world map (owner: MAP). PLAN-DAYLIGHT 2.6: cover,
// title, author, date, place, "Open story". Built only from the list item, because
// GET /events/{id} counts a view. With `spot` it lists the stories that share one place.
import { Link } from 'react-router-dom'
import { imageSrc } from '../lib/data.js'
import { dateRange, shortPlace } from '../lib/format.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import s from './StoryPeek.module.css'

export const storyTo = (e) => `/event/${e.slug || e.id}`

/** <StoryPeek event faceFor onClose spot={[events]} anchored /> */
export function StoryPeek({ event, faceFor, onClose, spot, anchored, className }) {
  if (!event) return null
  const many = spot && spot.length > 1
  const face = faceFor?.(event.author_username, event.author_full_name) || { name: event.author_full_name || event.author_username }
  return (
    <div className={cx(s.peek, anchored && s.anchored, className)} data-ui="story-peek" role="group" aria-label={many ? `${spot.length} stories at this place` : event.title}>
      <button type="button" className={s.close} onClick={onClose} aria-label="Close this card">
        <Icon name="close" size={18} />
      </button>
      {many ? (
        <>
          <p className={`${s.spotHead} a-label`}>
            {spot.length} stories · {shortPlace(event.location_name) || 'one place'}
          </p>
          <ul className={s.spotList}>
            {spot.map((e) => (
              <li key={e.id}>
                <Link to={storyTo(e)} className={s.spotRow}>
                  {e.cover_image_url ? <img src={imageSrc(e.cover_image_url, 'micro')} alt="" width="44" height="44" className={s.spotThumb} /> : <span className={s.spotThumb} />}
                  <span className={s.spotText}>
                    <span className={s.spotTitle}>{e.title}</span>
                    <span className={`${s.date} a-mono`}>{dateRange(e.start_date, e.end_date, { short: true })}</span>
                  </span>
                  <Icon name="chevron-right" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {event.cover_image_url ? <img className={s.cover} src={imageSrc(event.cover_image_url, 'small')} alt="" /> : <div className={s.cover} data-empty="" />}
          <div className={s.text}>
            <p className={`${s.date} a-mono`}>{dateRange(event.start_date, event.end_date)}</p>
            <h3 className={s.title}>{event.title}</h3>
            <p className={s.meta}>
              <Avatar name={face.name} src={face.avatarUrl} size={22} />
              <span>{face.name}</span>
              {event.location_name ? (
                <>
                  <span className={s.sep} aria-hidden="true">·</span>
                  <span className={s.place}>{shortPlace(event.location_name)}</span>
                </>
              ) : null}
            </p>
            <Button to={storyTo(event)} iconAfter="arrow" full size="sm" className={s.open}>
              Open story
            </Button>
          </div>
        </>
      )}
      {anchored ? <span className={s.tail} aria-hidden="true" /> : null}
    </div>
  )
}
