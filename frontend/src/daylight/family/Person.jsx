// A face in the family tree's look (owner: FAMILY): the landing's round photo with an ink
// keyline and a hard shadow, initials on a wash when there is no photo, a dashed keyline for
// a tag profile. Used in the tree, its trays, the sheets and the list.
import { useState } from 'react'
import { washFor } from '../styles/tokens.js'
import { initialsOf } from '../ui/Avatar.jsx'
import { cx } from '../ui/cx.js'
import s from './Person.module.css'

/**
 * <Face name src size tag you asked /> a round face, `size` px across. Decorative: the name
 * is always printed or read beside it.
 */
export function Face({ name, src, size = 64, tag, you, asked, className, style }) {
  const [broken, setBroken] = useState(false)
  const photo = src && !broken
  return (
    <span
      className={cx(s.face, tag && s.tag, you && s.you, asked && s.asked, className)}
      style={{ '--fd': `${size}px`, ...style }}
      data-wash={photo ? undefined : washFor(name)}
      aria-hidden="true"
    >
      {photo ? (
        <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" draggable="false" onError={() => setBroken(true)} />
      ) : (
        <span className={s.initials}>{initialsOf(name)}</span>
      )}
    </span>
  )
}

/** The sticker on a face: "You" (lime), "Tag" (dashed), "Asked" (sun). */
export function FaceSticker({ kind, className }) {
  const text = kind === 'you' ? 'You' : kind === 'tag' ? 'Tag' : 'Asked'
  return (
    <span className={cx(s.sticker, s[`st-${kind}`], className)} aria-hidden="true">
      {text}
    </span>
  )
}
