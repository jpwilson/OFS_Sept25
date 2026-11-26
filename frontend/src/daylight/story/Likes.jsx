// Who liked the story, with their faces (owner: STORY). likes: useStoryExtras().likes
// ({like_count, is_liked, recent_likes, all}); every person row links to their profile.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarStack } from '../ui/Avatar.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { cx } from '../ui/cx.js'
import { ReactionGlyph } from './Reactions.jsx'
import s from './Likes.module.css'

const nm = (l) => l.full_name || l.username

export function LikeButton({ likes, onToggle, size = 'md', className }) {
  const n = likes?.like_count || 0
  return (
    <button
      type="button"
      className={cx(s.like, s[size], likes?.is_liked && s.on, className)}
      aria-pressed={!!likes?.is_liked}
      aria-label={`Like this story${n ? `, ${n} ${n === 1 ? 'like' : 'likes'}` : ''}`}
      onClick={onToggle}
      data-ui="like-button"
    >
      <ReactionGlyph type={likes?.is_liked ? 'heart' : 'none'} size={size === 'lg' ? 24 : 20} className={s.heart} />
      <span className={s.likeWord}>{likes?.is_liked ? 'Liked' : 'Like'}</span>
      {n ? <span className={`${s.likeN} a-mono`}>{n}</span> : null}
    </button>
  )
}

export default function Likes({ likes, onToggle, canLike }) {
  const [all, setAll] = useState(false)
  const people = likes.all?.length ? likes.all : likes.recent_likes || []
  const shown = people.slice(0, 3)
  const rest = Math.max(0, (likes.like_count || 0) - shown.length)
  return (
    <section className={s.card} aria-labelledby="ofsa-likes-h" data-ui="likes">
      <h2 id="ofsa-likes-h" className={s.h}>
        {likes.like_count ? `${likes.like_count} ${likes.like_count === 1 ? 'like' : 'likes'}` : 'Likes'}
      </h2>
      {people.length ? (
        <button type="button" className={s.who} onClick={() => setAll(true)} aria-haspopup="dialog">
          <AvatarStack people={people.slice(0, 5).map((p) => ({ name: nm(p), src: p.avatar_url }))} size={34} max={5} />
          <span className={s.whoText}>
            {shown.map(nm).join(', ')}
            {rest ? ` and ${rest} ${rest === 1 ? 'other' : 'others'}` : ''}
          </span>
        </button>
      ) : (
        <p className={s.none}>No likes yet.</p>
      )}
      {canLike !== false ? <LikeButton likes={likes} onToggle={onToggle} size="lg" className={s.big} /> : null}
      <Sheet open={all} onClose={() => setAll(false)} title={`Liked by ${likes.like_count || people.length}`}>
        <ul className={s.list}>
          {people.map((p) => (
            <li key={p.id || p.username}>
              <Link to={`/profile/${p.username}`} className={s.row} onClick={() => setAll(false)}>
                <Avatar name={nm(p)} src={p.avatar_url} size={44} />
                <span className={s.rowText}>
                  <span className={s.rowName}>{nm(p)}</span>
                  <span className="a-mono a-mute a-small">@{p.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  )
}
