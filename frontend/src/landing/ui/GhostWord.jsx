import { cx } from './cx.js'
import s from './GhostWord.module.css'

/** The giant lowercase word behind a scene, in var(--l-wash-deep). Decorative. */
export function GhostWord({ children, center, className, style }) {
  return (
    <span className={cx(s.ghost, center && s.center, className)} style={style} aria-hidden="true">
      {children}
    </span>
  )
}
