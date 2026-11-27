import { cx } from './cx.js'
import s from './Sticker.module.css'

/**
 * The emphasised word: a white tilted label with an ink keyline and a hard shadow.
 * size: 'md' (default, headline sizes) | 'sm' (nav and label sizes: 2px shadow, tighter padding).
 */
export function Sticker({ children, className, style, tilt, size = 'md' }) {
  const st = tilt != null ? { ...style, '--l-sticker-tilt': `${tilt}deg` } : style
  return (
    <span className={cx(s.sticker, size === 'sm' && s.sm, className)} style={st}>
      {children}
    </span>
  )
}
