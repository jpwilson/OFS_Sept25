// The story page's own bars (owner: STORY). On a phone the shell's tab bar and top bar
// step aside (useChrome) and the story brings:
//   <PhoneTop>      a back button floating on the cover, then a slim white bar with the title
//   <PhoneBottom>   in the thumb zone: Contents, where you are (the stop, or the chapter and
//                   reading progress), and Map (or Like when there is no journey)
//   <ShareTop>      the bar for a share link, which opens outside the shell
import { Link } from 'react-router-dom'
import { dayColor } from '../map/RouteSketch.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Button } from '../ui/Button.jsx'
import { cx } from '../ui/cx.js'
import { ReactionGlyph } from './Reactions.jsx'
import { placeHead, splitChapter, wallTime } from './words.js'
import s from './StoryBars.module.css'

export function PhoneTop({ title, past, onBack }) {
  return (
    <>
      <div className={cx(s.float, past && s.hidden)} data-ui="story-float">
        <IconButton icon="arrow-left" label="Back" variant="float" onClick={onBack} className={s.floatBtn} />
      </div>
      <header className={cx(s.mini, past && s.miniOn)} aria-hidden={!past} data-ui="story-minibar">
        <IconButton icon="arrow-left" label="Back" onClick={onBack} tabIndex={past ? 0 : -1} />
        <span className={s.miniTitle}>{title}</span>
      </header>
    </>
  )
}

/** Where you are on the route: "Day 3 · 10:15 AM" over "Hidden Falls", and a line by day. */
function stopStatus(journey, stopId) {
  const i = journey.stops.findIndex((x) => x.id === stopId)
  const st = journey.stops[i]
  const named = journey.stops.filter((x) => x.kind === 'named').length
  const segs = journey.days.map((d) => {
    const idx = d.stopIds.map((id) => journey.stops.findIndex((x) => x.id === id))
    const reached = i < 0 ? 0 : idx.filter((k) => k <= i).length
    return { n: d.stopIds.length, fill: reached / Math.max(1, d.stopIds.length), color: dayColor(d.index) }
  })
  if (!st) return { label: `The journey · ${journey.days.length} ${journey.days.length === 1 ? 'day' : 'days'}`, name: `${named} ${named === 1 ? 'stop' : 'stops'}`, segs }
  const t = wallTime(st.ts)
  return {
    label: [`Day ${st.dayIndex + 1}`, st.n ? `${st.n}/${named}` : null, t].filter(Boolean).join(' · '),
    name: st.name ? placeHead(st.name) : 'Along the way',
    segs,
  }
}

export function PhoneBottom({ journey, activeStopId, chapter, progress, title, onContents, onWhere, onMap, likes, onLike, share }) {
  const status = journey ? stopStatus(journey, activeStopId) : null
  const ch = chapter ? splitChapter(chapter.title) : null
  return (
    <nav className={cx(s.bottom, share && s.bottomShare)} aria-label="Story" data-ui="story-bottombar">
      <IconButton icon="timeline" label="Contents" onClick={onContents} aria-haspopup="dialog" className={s.side} />
      <button type="button" className={s.where} onClick={onWhere} aria-label={status ? `${status.label}, ${status.name}. Open the map` : 'Open the contents'}>
        {status ? (
          <>
            <span className={cx(s.label, 'a-mono')}>{status.label}</span>
            <span className={s.name}>{status.name}</span>
            <span className={s.segs} aria-hidden="true">
              {status.segs.map((g, k) => (
                <span key={k} className={s.seg} style={{ flexGrow: g.n }}>
                  <span style={{ transform: `scaleX(${g.fill})`, background: g.color }} />
                </span>
              ))}
            </span>
          </>
        ) : (
          <>
            <span className={cx(s.label, 'a-mono')}>{ch?.eyebrow || (chapter ? `Chapter ${chapter.index + 1}` : 'Reading')}</span>
            <span className={s.name}>{ch?.title || title || 'The story'}</span>
            <span className={s.segs} aria-hidden="true">
              <span className={s.seg} style={{ flexGrow: 1 }}>
                <span style={{ transform: `scaleX(${progress || 0})`, background: 'var(--a-tide)' }} />
              </span>
            </span>
          </>
        )}
      </button>
      {journey ? (
        <button type="button" className={s.map} onClick={onMap} aria-haspopup="dialog">
          <Icon name="map" size={22} />
          <span>Map</span>
        </button>
      ) : likes ? (
        <button type="button" className={cx(s.likeBtn, likes.is_liked && s.liked)} onClick={onLike} aria-pressed={!!likes.is_liked} aria-label={`Like this story${likes.like_count ? `, ${likes.like_count} likes` : ''}`}>
          <ReactionGlyph type={likes.is_liked ? 'heart' : 'none'} size={22} />
          {likes.like_count ? <span className="a-mono">{likes.like_count}</span> : null}
        </button>
      ) : (
        <span className={s.side} />
      )}
    </nav>
  )
}

export function ShareTop({ user, storyTo }) {
  return (
    <header className={s.share} data-ui="share-bar">
      <div className={s.shareInner}>
        <Link to={user ? '/feed' : '/'} className={s.word} aria-label="Our Family Socials, home">
          <span className={s.mark} aria-hidden="true" />
          <span className={s.wordText}>Our Family Socials</span>
        </Link>
        {user ? (
          storyTo ? <Button size="sm" to={storyTo}>Open in the app</Button> : null
        ) : (
          <span className={s.shareBtns}>
            <Button size="sm" variant="quiet" to="/login">Log in</Button>
            <Button size="sm" to="/login?signup=true">Start free</Button>
          </span>
        )}
      </div>
    </header>
  )
}
