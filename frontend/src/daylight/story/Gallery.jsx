// Every photo and clip of the story, as a justified grid (owner: STORY): the ones placed in
// the text and the ones attached but not placed (parseStory media with inBody false).
import { imageSrc } from '../lib/data.js'
import { Icon } from '../ui/Icon.jsx'
import { ReactionGlyph } from './Reactions.jsx'
import s from './Gallery.module.css'

export default function Gallery({ media, onOpen, stats }) {
  if (!media?.length) return null
  return (
    <ul className={s.grid} data-ui="gallery">
      {media.map((m, i) => {
        const ar = m.w && m.h ? m.w / m.h : 4 / 3
        const n = m.imageId != null ? stats?.[m.imageId]?.like_count : 0
        return (
          <li key={m.id} className={s.cell} style={{ '--ar': ar }}>
            <button type="button" className={s.btn} onClick={() => onOpen(i)} aria-label={`Open ${m.kind === 'video' ? 'video' : 'photo'} ${i + 1} of ${media.length}${m.caption ? `: ${m.caption}` : ''}`}>
              {m.kind === 'video' ? (
                m.poster ? <img src={imageSrc(m.poster, 'small')} alt="" loading="lazy" /> : <video src={m.src} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
              ) : (
                <img src={imageSrc(m.src, 'small')} alt="" loading="lazy" decoding="async" />
              )}
              {m.kind === 'video' ? (
                <span className={s.play} aria-hidden="true">
                  <Icon name="play" size={18} />
                </span>
              ) : null}
              {n ? <span className={`${s.n} a-mono`} aria-hidden="true"><ReactionGlyph type="heart" size={12} />{n}</span> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
