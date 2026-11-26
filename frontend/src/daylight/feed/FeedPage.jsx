// The Stories page, /feed (stub by F0; FEED owns this file). Proves useFeed and usePeople.
import { Link } from 'react-router-dom'
import { useFeed, usePeople, imageSrc } from '../lib/data.js'
import { dateRange, shortPlace, monthLabel } from '../lib/format.js'
import { Head } from '../ui/Head.jsx'
import { Card, cardLink } from '../ui/Card.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { Stub } from '../ui/Stub.jsx'
import s from './FeedPage.module.css'

export default function FeedPage() {
  const { events, loading, error, hasMore, loadMore, refresh } = useFeed()
  const { faceFor } = usePeople()
  return (
    <div className={`a-wrap ${s.page}`} data-wash="tide">
      <Head as="h1" before="Stories" />
      <Stub pkg="feed" name="Stories" note="Stub. Month groups, lead cards, filters, calendar and timeline arrive with FEED." />
      {error ? (
        <EmptyState tone="error" icon="warning" title="The stories did not load." body={error.message} action={<Button onClick={refresh}>Retry</Button>} />
      ) : loading && !events.length ? (
        <Loading label="Loading stories" className={s.grid}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={280} r={20} />)}
        </Loading>
      ) : !events.length ? (
        <EmptyState wash="tide" icon="stories" before="No stories" mark="yet" after="." body="Stories from you and the people you follow show up here." action={<Button to="/create?from=photos">Make one from photos</Button>} />
      ) : (
        <ul className={s.grid}>
          {events.map((e) => {
            const face = faceFor(e.author_username, e.author_full_name)
            return (
              <li key={e.id}>
                <Card as="article" interactive pad="none" className={s.card}>
                  {e.cover_image_url ? <img src={imageSrc(e.cover_image_url, 'small')} alt="" loading="lazy" className={s.cover} /> : <div className={s.cover} />}
                  <div className={s.text}>
                    <span className="a-label a-mute">{monthLabel(e.start_date)}</span>
                    <h2 className={s.title}>
                      <Link className={cardLink} to={`/event/${e.slug || e.id}`}>{e.title}</Link>
                    </h2>
                    <p className={s.meta}>
                      <Avatar name={face.name} src={face.avatarUrl} size={24} /> {face.name} · {dateRange(e.start_date, e.end_date, { short: true })}
                      {e.location_name ? ` · ${shortPlace(e.location_name)}` : ''}
                    </p>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      {hasMore && events.length ? <Button variant="ghost" onClick={loadMore} busy={loading}>Show more</Button> : null}
    </div>
  )
}
