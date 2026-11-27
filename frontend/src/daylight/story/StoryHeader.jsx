// The top of a story (owner: STORY): cover, title, standfirst, byline, tagged people and
// the action row. The title never sits on the photo (EventDetail.jsx:1390-1399 did), so it
// reads the same whatever the picture. Only what the detail response returns is shown.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dateRange, readTime, shortPlace } from '../lib/format.js'
import { imageSrc, imageSrcSet } from '../lib/data.js'
import { CATEGORY_WASH } from '../styles/tokens.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Menu, MenuList } from '../ui/Menu.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useDesktop } from '../lib/capability.js'
import { cx } from '../ui/cx.js'
import { LikeButton } from './Likes.jsx'
import { audienceWords, firstName } from './words.js'
import s from './StoryHeader.module.css'

/** Tags a reader may see: the author sees pending ones too (EventDetail.jsx:1501-1506). */
export function visibleTags(tags, isAuthor) {
  return (tags || []).filter((t) => (isAuthor ? t.status !== 'rejected' : t.status === 'accepted'))
}
const tagName = (t) => t.tagged_user_display_name || t.tagged_user_username || t.tag_profile_name || 'Someone'
const tagLink = (t) => (t.tagged_user_id != null ? `/profile/${t.tagged_user_username}` : t.tag_profile_id != null ? `/tag-profile/${t.tag_profile_id}` : null)
const tagFace = (t) => t.tagged_user_avatar_url || t.tag_profile_photo_url || null

export default function StoryHeader({ event, mode, extras, isAuthor, authorItems, onShare, onComments, onContents, onSignIn, coverRef, authorFace }) {
  const preview = mode === 'preview'
  const author = event.author_full_name || event.author_username || 'Someone'
  const first = firstName(event.author_full_name, event.author_username)
  const place = shortPlace(event.location_name)
  const audience = audienceWords(event.privacy_level, first, isAuthor)
  const tags = visibleTags(extras?.tags, isAuthor)
  const commentsN = extras?.comments?.length || 0
  const wash = CATEGORY_WASH[event.category]
  const draft = event.is_published === false
  const cover = event.cover_image_url
  const desktop = useDesktop()
  const [opts, setOpts] = useState(false)
  return (
    <header className={s.head} data-ui="story-header" data-preview={preview || undefined}>
      {cover ? (
        <div className={s.coverWrap} ref={coverRef}>
          <img className={s.cover} src={imageSrc(cover, 'medium')} srcSet={imageSrcSet(cover)} sizes="(min-width: 900px) 1240px, 100vw" alt="" fetchPriority="high" decoding="async" />
        </div>
      ) : (
        <div ref={coverRef} className={s.noCover} aria-hidden="true" />
      )}
      <div className={s.text}>
        <p className={s.eyebrow}>
          {event.category ? (
            <span className={s.cat} data-wash={wash}>
              <span className={s.catDot} aria-hidden="true" />
              {event.category}
            </span>
          ) : null}
          {draft ? <span className={s.draft}>Draft</span> : null}
          {preview ? <span className={s.draft}>Preview</span> : null}
        </p>
        <h1 className={s.title} data-long={(event.title || '').length > 56 || undefined}>{event.title || 'Untitled story'}</h1>
        {event.summary ? <p className={s.summary}>{event.summary}</p> : null}

        <div className={s.byline}>
          <Link to={`/profile/${event.author_username}`} className={s.author} tabIndex={preview ? -1 : undefined}>
            <Avatar name={author} src={authorFace} size={44} />
            <span className={s.authorText}>
              <span className={s.authorName}>{author}</span>
              <span className={cx(s.when, 'a-mono')}>{dateRange(event.start_date, event.end_date)}</span>
            </span>
          </Link>
          <ul className={s.facts} aria-label="About this story">
            {place ? (
              <li>
                <Icon name="pin" size={16} />
                {place}
              </li>
            ) : null}
            <li>
              <Icon name="stories" size={16} />
              {readTime(event.description)} min read
            </li>
            {audience ? (
              <li>
                <Icon name={event.privacy_level === 'public' ? 'globe' : event.privacy_level === 'private' ? 'lock' : 'people'} size={16} />
                <span className="a-sr">Shared with </span>
                {audience}
              </li>
            ) : null}
          </ul>
        </div>

        {tags.length ? (
          <div className={s.people}>
            <span className={cx(s.withLabel, 'a-mono')}>With</span>
            <ul className={s.tagList}>
              {tags.map((t) => {
                const to = tagLink(t)
                const inner = (
                  <>
                    <Avatar name={tagName(t)} src={tagFace(t)} size={28} />
                    <span>{firstName(tagName(t))}</span>
                    {t.status === 'pending' ? <span className={s.pending}>asked</span> : null}
                  </>
                )
                return (
                  <li key={t.id}>
                    {to ? (
                      <Link to={to} className={cx(s.tag, t.status === 'pending' && s.tagPending)} title={t.status === 'pending' ? `${tagName(t)} has not accepted this tag yet` : tagName(t)}>
                        {inner}
                      </Link>
                    ) : (
                      <span className={s.tag}>{inner}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {!preview && extras ? (
          <div className={s.actions} data-ui="action-row">
            <LikeButton likes={extras.likes} onToggle={mode === 'read' ? extras.onLike : onSignIn} />
            <button type="button" className={s.act} onClick={onComments}>
              <Icon name="comment" size={20} />
              <span>{commentsN ? `${commentsN} ${commentsN === 1 ? 'comment' : 'comments'}` : 'Comment'}</span>
            </button>
            {onContents ? (
              <button type="button" className={cx(s.act, s.deskOnly)} onClick={onContents} aria-haspopup="dialog">
                <Icon name="timeline" size={20} />
                <span>Contents</span>
              </button>
            ) : null}
            <span className={s.grow} />
            {isAuthor && onShare ? (
              <button type="button" className={s.act} onClick={onShare} aria-haspopup="dialog">
                <Icon name="share" size={20} />
                <span>Share</span>
              </button>
            ) : null}
            {isAuthor && authorItems?.length ? (
              desktop ? (
                <Menu label="Story options" align="end" items={authorItems} trigger={(p) => <IconButton {...p} icon="more" label="Story options" variant="keyline" />} />
              ) : (
                <>
                  <IconButton icon="more" label="Story options" variant="keyline" onClick={() => setOpts(true)} aria-haspopup="dialog" />
                  <Sheet open={opts} onClose={() => setOpts(false)} title="This story">
                    <MenuList items={authorItems} onDone={() => setOpts(false)} />
                  </Sheet>
                </>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
