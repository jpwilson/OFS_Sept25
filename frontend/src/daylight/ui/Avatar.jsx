import { useState } from 'react'
import { cx } from './cx.js'
import { washFor } from '../styles/tokens.js'
import s from './Avatar.module.css'

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * <Avatar name="Maya Hartley" src={url|null} size={40} ring />
 * A real photo when there is one; otherwise initials on a wash disc chosen from the
 * name (stable). Decorative by default (the name is usually printed next to it); pass
 * label to give it an accessible name.
 */
export function Avatar({ name, src, size = 40, ring, label, className, style }) {
  const [broken, setBroken] = useState(false)
  const showImg = src && !broken
  const st = { '--av': `${size}px`, ...style }
  return (
    <span
      className={cx(s.av, ring && s.ring, className)}
      style={st}
      data-wash={showImg ? undefined : washFor(name)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-ui="avatar"
    >
      {showImg ? (
        <img src={src} alt="" loading="lazy" decoding="async" width={size} height={size} onError={() => setBroken(true)} />
      ) : (
        <span className={s.initials} style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  )
}

/** Overlapping faces, at most `max`, then a "+n" disc. people: [{name, src}] */
export function AvatarStack({ people, size = 28, max = 4, className }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <span className={cx(s.stack, className)} style={{ '--av': `${size}px` }} aria-hidden="true">
      {shown.map((p, i) => (
        <Avatar key={p.name + i} name={p.name} src={p.src} size={size} ring />
      ))}
      {extra > 0 ? <span className={cx(s.av, s.ring, s.more)}>+{extra}</span> : null}
    </span>
  )
}
