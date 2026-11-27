import { cx } from './cx.js'
import s from './Missing.module.css'

/** Neutral labelled placeholder with the right aspect, for an art id not in the manifest yet. */
export function Missing({ id, w = 3, h = 4, alt, className, style }) {
  return (
    <span
      className={cx(s.missing, className)}
      style={{ aspectRatio: `${w} / ${h}`, ...style }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      data-art-missing={id}
    >
      <span className={s.tag}>{id}</span>
    </span>
  )
}
