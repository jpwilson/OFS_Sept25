import { BRAND } from '../content/common.js'
import { NAV } from '../content/close.js'
import { Sticker, cx } from '../ui/index.js'
import s from './Wordmark.module.css'

/** Three overlapping dots: tide, zest, fizz. */
export function Dots({ className }) {
  return (
    <svg className={cx(s.dots, className)} viewBox="0 0 44 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="12" r="9" fill="var(--l-tide)" stroke="var(--l-ink)" strokeWidth="2" />
      <circle cx="22" cy="12" r="9" fill="var(--l-zest)" stroke="var(--l-ink)" strokeWidth="2" />
      <circle cx="33" cy="12" r="9" fill="var(--l-fizz)" stroke="var(--l-ink)" strokeWidth="2" />
    </svg>
  )
}

/**
 * The wordmark: dots, then "Our Family Socials" with Family on a sticker.
 * short: show OFS on a sticker instead (phones); the full name stays for screen readers.
 */
export function Wordmark({ className, short }) {
  const [a, b, c] = BRAND.split(' ')
  return (
    <span className={cx(s.mark, className)} data-short={short || undefined}>
      <Dots />
      <span className={s.full}>
        {a} <Sticker size="sm">{b}</Sticker> {c}
      </span>
      {short ? (
        <span className={s.short} aria-hidden="true">
          <Sticker size="sm">{NAV.short}</Sticker>
        </span>
      ) : null}
    </span>
  )
}
