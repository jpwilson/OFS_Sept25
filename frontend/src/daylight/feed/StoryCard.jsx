// One story as a card (owner: FEED). Used by the stream, the timeline, the calendar's day
// card and the profile. The title is the link and its ::after covers the card, so a single
// tap anywhere opens the story (today's feed needs two taps on a phone, FeedView.jsx:92-103).
//
// <StoryCard event variant="lead|wide|half|card|side|row|mini" face={{name, avatarUrl}}
//            onOpen={(event, e) => void} eager tags={[...]} footer={node} headingLevel={3} />
// The list item carries no counts, photos or second category (events.py:254-283), so the
// card shows only what is real: cover, category, audience, title, summary, author, dates, place.
import { Link } from 'react-router-dom'
import { imageSrc, imageSrcSet } from '../lib/data.js'
import { dateRange, shortPlace } from '../lib/format.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Card, cardLink } from '../ui/Card.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { audienceTag, categoryInfo } from './query.js'
import s from './StoryCard.module.css'

const SIZES = {
  lead: '(min-width: 900px) 800px, 100vw',
  wide: '(min-width: 900px) 720px, 100vw',
  half: '(min-width: 900px) 600px, 100vw',
  card: '(min-width: 900px) 400px, 100vw',
  side: '(min-width: 900px) 400px, 100vw',
  row: '(min-width: 900px) 300px, 100vw',
  mini: '120px',
}

export function storyPath(e) {
  return `/event/${e.slug || e.id}`
}

export function Cover({ event, variant = 'card', eager, className }) {
  const cat = categoryInfo(event.category)
  const url = event.cover_image_url
  return (
    <div className={cx(s.cover, className)} data-wash={cat.wash || 'tide'}>
      {url ? (
        <img
          src={imageSrc(url, variant === 'mini' ? 'small' : 'medium')}
          srcSet={variant === 'mini' ? undefined : imageSrcSet(url)}
          sizes={SIZES[variant]}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <span className={s.noCover} aria-hidden="true">
          <Icon name="photo" size={variant === 'mini' ? 20 : 32} />
        </span>
      )}
    </div>
  )
}

export default function StoryCard({ event: e, variant = 'card', face, onOpen, eager, tags = [], footer, headingLevel = 3, to, className }) {
  const cat = categoryInfo(e.category)
  const aud = audienceTag(e.privacy_level)
  const H = `h${headingLevel}`
  const long = variant === 'lead' || variant === 'wide' || variant === 'half'
  const summary = (long || variant === 'row') && e.summary ? e.summary : null
  const name = face?.name || e.author_full_name || e.author_username
  const place = shortPlace(e.location_name)
  return (
    <Card as="article" interactive pad="none" className={cx(s.card, s[variant], className)} data-ui="story-card" data-variant={variant}>
      <Cover event={e} variant={variant} eager={eager} />
      <div className={s.body}>
        <p className={s.kicker}>
          {e.category ? (
            <span className={s.cat} data-wash={cat.wash || undefined}>
              <span className={s.dot} aria-hidden="true" />
              {cat.label}
            </span>
          ) : null}
          {aud ? (
            <span className={s.tag}>
              <Icon name="lock" size={12} />
              {aud}
            </span>
          ) : null}
          {tags.map((t) => (
            <span key={t} className={cx(s.tag, s.tagInk)}>
              {t}
            </span>
          ))}
        </p>
        <H className={s.title}>
          {to === false ? (
            e.title || 'Untitled story'
          ) : (
            <Link className={cardLink} to={to || storyPath(e)} onClick={onOpen ? (ev) => onOpen(e, ev) : undefined}>
              {e.title || 'Untitled story'}
            </Link>
          )}
        </H>
        {summary ? <p className={s.summary}>{summary}</p> : null}
        <div className={s.meta}>
          {variant !== 'mini' ? <Avatar name={name} src={face?.avatarUrl} size={long ? 36 : 32} /> : null}
          <p className={s.metaText}>
            <span className={s.who}>{name}</span>
            <span className={s.whenWhere}>
              <span className={cx(s.when, 'a-nowrap')}>{dateRange(e.start_date, e.end_date, { short: !long })}</span>
              {place ? (
                <>
                  <span className={s.sep} aria-hidden="true">
                    {' · '}
                  </span>
                  <span className={s.where}>{place}</span>
                </>
              ) : null}
            </span>
          </p>
        </div>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </div>
    </Card>
  )
}
