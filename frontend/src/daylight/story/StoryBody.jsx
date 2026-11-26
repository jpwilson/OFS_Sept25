// The story text, rendered from parseStory blocks (owner: STORY). PLAN-DAYLIGHT 2.5.
// Text blocks stay sanitised HTML (Literata); headings, stops and photo runs are React.
// Every stop header and every located photo carries data-stop-id, so useJourneySync can
// follow the reader and scrollToStop can find the place a stop is written about.
import { createContext, useContext, useMemo, useState } from 'react'
import { imageSrc, imageSrcSet } from '../lib/data.js'
import { stopOfPhoto } from '../lib/journey.js'
import { dayColor } from '../map/RouteSketch.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { ReactionButton, ReactionTray, useLongPress } from './Reactions.jsx'
import { placeHead, splitChapter, stripPinEmoji, wallTime } from './words.js'
import s from './StoryBody.module.css'

/** What a photo needs from the story around it: reactions, the lightbox, the journey. */
export const MediaContext = createContext({ stats: {}, react: null, open: null, canReact: false, journey: null, onSignIn: null })

/** Rows for a run of photos: never more than two across, so every photo stays big. */
export function rowsOf(items) {
  const rows = []
  let i = 0
  if (items.length % 2 === 1) rows.push(items.slice(0, (i = 1)))
  for (; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}
const ratio = (m) => (m.w && m.h ? m.w / m.h : 4 / 3)

export default function StoryBody({ parsed, journey, activeStopId, onShowStop, hideMedia, bodyRef }) {
  const dayOfChapter = useMemo(() => {
    const m = new Map()
    for (const st of journey?.stops || []) if (st.chapterId && !m.has(st.chapterId)) m.set(st.chapterId, st.dayIndex)
    return m
  }, [journey])
  const stopOfAnchor = useMemo(() => new Map((journey?.stops || []).filter((x) => x.anchorId).map((x) => [x.anchorId, x])), [journey])
  if (!parsed) return null
  const firstText = parsed.blocks.findIndex((b) => b.type === 'html')
  return (
    <div ref={bodyRef} className={cx(s.body, 'a-story')} data-ui="story-body" data-hide-media={hideMedia || undefined}>
      {parsed.blocks.map((b, i) => {
        if (b.type === 'heading') return <Heading key={i} b={b} day={dayOfChapter.get(b.id)} />
        if (b.type === 'marker') return <StopHeader key={i} marker={b.stop} stop={stopOfAnchor.get(b.stop.anchorId)} active={stopOfAnchor.get(b.stop.anchorId)?.id === activeStopId} onShow={onShowStop} />
        if (b.type === 'media') return hideMedia ? null : <Mosaic key={i} items={b.items} journey={journey} />
        return <div key={i} className={s.html} data-first={i === firstText || undefined} dangerouslySetInnerHTML={{ __html: stripPinEmoji(b.html) }} />
      })}
    </div>
  )
}

function Heading({ b, day }) {
  if (b.level > 1 && b.id !== b.chapterId) return <h3 id={b.id} className={s.h3} data-heading>{b.text}</h3>
  const { eyebrow, title } = splitChapter(b.text)
  return (
    <h2 id={b.id} className={s.h2} data-chapter-id={b.id} data-heading>
      {eyebrow || day != null ? (
        <span className={s.eyebrow}>
          {day != null ? <span className={s.dayDot} style={{ background: dayColor(day) }} aria-hidden="true" /> : null}
          <span className="a-mono">{eyebrow || `Day ${day + 1}`}</span>
          {eyebrow ? <span className="a-sr">: </span> : null}
        </span>
      ) : null}
      <span className={s.h2Text}>{title}</span>
    </h2>
  )
}

function StopHeader({ marker, stop, active, onShow }) {
  const name = marker.name || stop?.name || 'A stop'
  const head = placeHead(name)
  const rest = name.slice(head.length).replace(/^,\s*/, '')
  const time = wallTime(marker.ts || stop?.ts)
  return (
    <div className={cx(s.stop, active && s.stopActive)} id={marker.anchorId} data-stop-id={stop?.id} data-ui="stop-header" style={stop ? { '--day': dayColor(stop.dayIndex) } : undefined}>
      <span className={cx(s.stopN, 'a-mono')} aria-hidden="true">
        {stop?.n ?? <Icon name="pin" size={16} />}
      </span>
      <span className={s.stopText}>
        <span className={s.stopName}>
          {stop?.n ? <span className="a-sr">Stop {stop.n}: </span> : null}
          {head}
          {rest ? <span className={s.stopRest}> {rest}</span> : null}
        </span>
        {time ? <span className={cx(s.stopTime, 'a-mono')}>{time}</span> : null}
      </span>
      {stop && onShow ? (
        <button type="button" className={s.stopShow} onClick={() => onShow(stop.id)} aria-label={`Show ${head} on the map`}>
          <Icon name="map" size={18} />
          <span className={s.stopShowText}>Map</span>
        </button>
      ) : null}
    </div>
  )
}

/** A run of photos and clips: one big, then pairs; captions under each; a reaction chip on each photo. */
export function Mosaic({ items, journey }) {
  const rows = rowsOf(items)
  return (
    <div className={s.mosaic} data-ui="mosaic" data-count={items.length}>
      {rows.map((row, r) => (
        <div key={r} className={s.row} data-n={row.length}>
          {row.map((m) => (
            <Photo key={m.id} m={m} stop={stopOfPhoto(journey, m.id)} single={row.length === 1} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Photo({ m, stop, single }) {
  const ctx = useContext(MediaContext)
  const [tray, setTray] = useState(null)
  const stat = m.imageId != null ? ctx.stats?.[m.imageId] : null
  const canReact = ctx.canReact && m.imageId != null
  const press = useLongPress(
    (el) => (canReact ? setTray(el) : null),
    () => ctx.open?.(m.id),
  )
  const ar = ratio(m)
  const portrait = ar < 0.95
  const pick = (t) => {
    setTray(null)
    if (!ctx.react) return
    ctx.react(m.imageId, t)
  }
  return (
    <figure className={cx(s.fig, single && portrait && s.portrait)} style={{ '--ar': ar, flexGrow: ar }} data-stop-id={stop?.id} data-media-id={m.id}>
      <div className={s.frame}>
        {m.kind === 'video' ? (
          <video className={s.media} src={m.src} poster={m.poster || undefined} controls playsInline preload="metadata" aria-label={m.caption || m.alt || 'Video'} />
        ) : (
          <button type="button" className={s.open} {...press} aria-label={`Open photo${m.caption ? `: ${m.caption}` : ''}`} aria-haspopup="dialog">
            <img
              className={s.media}
              src={imageSrc(m.src, 'medium')}
              srcSet={imageSrcSet(m.src)}
              sizes={single ? '(min-width: 900px) 680px, 100vw' : '(min-width: 900px) 340px, 50vw'}
              alt={m.alt || m.caption || ''}
              width={m.w || undefined}
              height={m.h || undefined}
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>
        )}
        {m.imageId != null && ctx.react && m.kind !== 'video' ? (
          <span className={s.chipSpot}>
            <ReactionButton
              counts={stat?.reaction_counts}
              total={stat?.like_count}
              mine={stat?.user_reaction}
              label="React to this photo"
              disabled={!canReact}
              onDisabled={ctx.onSignIn}
              onPick={(t) => ctx.react(m.imageId, t)}
            />
          </span>
        ) : null}
        {stat?.comment_count ? (
          <span className={cx(s.commentSpot, 'a-mono')} aria-label={`${stat.comment_count} comments on this photo`}>
            <Icon name="comment" size={14} />
            {stat.comment_count}
          </span>
        ) : null}
      </div>
      {m.caption ? <figcaption className={s.cap}>{m.caption}</figcaption> : null}
      <ReactionTray anchor={tray} open={!!tray} value={stat?.user_reaction} label="React to this photo" onClose={() => setTray(null)} onPick={pick} />
    </figure>
  )
}
