// The story itself (stub by F0; STORY replaces the insides, keeps the props).
// <StoryView event images locations extras mode="read|preview|share" parsed? journey? activeStopId? />
//   event:   GET /events/{id} response, or a local draft in the same shape (CREATE's preview)
//   extras:  useStoryExtras(...) result, or null in preview
//   mode:    read (signed in), preview (creation flow: no likes, comments or counts),
//            share (a share link: likes and comments replaced by the sign-up prompt)
// Renders blocks from parseStory; every marker and every located photo carries
// data-stop-id so useJourneySync can follow the reader.
import { useMemo } from 'react'
import { parseStory } from '../lib/storyBlocks.js'
import { buildJourney, stopOfPhoto } from '../lib/journey.js'
import { dateRange, readTime, shortPlace } from '../lib/format.js'
import { imageSrc, imageSrcSet } from '../lib/data.js'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Label } from '../../landing/ui/Label.jsx'
import s from './StoryView.module.css'

export default function StoryView({ event, images, mode = 'read', parsed: parsedIn, journey: journeyIn, activeStopId }) {
  const parsed = useMemo(() => parsedIn || parseStory(event?.description || '', images || event?.event_images || []), [parsedIn, event, images])
  const journey = useMemo(() => journeyIn !== undefined ? journeyIn : buildJourney(event, parsed), [journeyIn, event, parsed])
  if (!event) return null
  const stopIdOfMarker = (anchorId) => journey?.stops.find((st) => st.anchorId === anchorId)?.id
  return (
    <article className={s.story} data-ui="story-view" data-mode={mode}>
      <header className={s.head}>
        {event.cover_image_url ? (
          <img className={s.cover} src={imageSrc(event.cover_image_url, 'medium')} srcSet={imageSrcSet(event.cover_image_url)} sizes="(min-width: 900px) 1100px, 100vw" alt="" />
        ) : null}
        <Label>{[event.category, mode === 'preview' ? 'Preview' : null].filter(Boolean).join(' · ') || 'Story'}</Label>
        <Head as="h1" size="story" before={event.title || 'Untitled story'} />
        <p className={`${s.meta} a-mono`}>
          {[event.author_full_name || event.author_username, dateRange(event.start_date, event.end_date), shortPlace(event.location_name), `${readTime(event.description)} min read`].filter(Boolean).join(' · ')}
        </p>
      </header>
      <div className={`${s.body} a-story`}>
        {parsed.blocks.map((b, i) => {
          if (b.type === 'heading') {
            const H = b.level === 1 ? 'h2' : 'h3'
            return <H key={i} id={b.id} className={b.level === 1 ? s.h1 : s.h2}>{b.text}</H>
          }
          if (b.type === 'marker') {
            return (
              <p key={i} className={s.marker} data-stop-id={stopIdOfMarker(b.stop.anchorId)} id={b.stop.anchorId}>
                <Icon name="pin" size={16} /> {b.stop.name}
              </p>
            )
          }
          if (b.type === 'media') {
            return (
              <div key={i} className={s.media} data-count={Math.min(b.items.length, 4)}>
                {b.items.map((m) => (
                  <figure key={m.id} className={s.fig} data-stop-id={stopOfPhoto(journey, m.id)?.id}>
                    {m.kind === 'video' ? (
                      <video src={m.src} poster={m.poster || undefined} controls preload="metadata" />
                    ) : (
                      <img src={imageSrc(m.src, 'medium')} srcSet={imageSrcSet(m.src)} sizes="(min-width: 900px) 680px, 100vw" alt={m.alt} loading="lazy" />
                    )}
                    {m.caption ? <figcaption>{m.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            )
          }
          return <div key={i} className={s.html} dangerouslySetInnerHTML={{ __html: b.html }} />
        })}
      </div>
    </article>
  )
}
