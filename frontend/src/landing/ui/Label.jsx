import { cx } from './cx.js'
import s from './Label.module.css'

/** Mono, uppercase, tracked: eyebrows, readout labels, instrument captions. */
export function Label({ children, as: Tag = 'span', strong, dot, className, style, id, htmlFor }) {
  return (
    <Tag id={id} htmlFor={htmlFor} className={cx(s.label, className)} data-strong={strong || undefined} style={style}>
      {dot ? <span className={s.dot} aria-hidden="true" /> : null}
      {children}
    </Tag>
  )
}
