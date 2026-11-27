import { BRAND } from '../content/common.js'
import { NAV } from '../content/close.js'
import { Sticker, cx } from '../ui/index.js'
import s from './Wordmark.module.css'

/**
 * The logo mark, Journey Pin: a zest map pin at the end of a dotted route, with its ink offset
 * shadow. Same 64-unit art as landing-art/logo/C-journey-pin.svg, cropped to its ink.
 */
export function Pin({ className }) {
  const ink = { stroke: 'var(--l-ink)', strokeLinejoin: 'round', strokeLinecap: 'round' }
  return (
    <svg className={cx(s.pin, className)} viewBox="2 12 57.5 49.5" aria-hidden="true" focusable="false">
      <path
        d="M9 55c6-1 9-5 13-9s7-5 11-4"
        fill="none"
        stroke="var(--l-ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.1 6"
      />
      <circle cx="8" cy="55" r="4" fill="var(--l-white)" strokeWidth="2.5" {...ink} />
      <path d="M44.5 57.5c-3-6-14-14-14-26a14 14 0 0 1 28 0c0 12-11 20-14 26z" fill="var(--l-ink)" />
      <path d="M41 54c-3-6-14-14-14-26a14 14 0 0 1 28 0c0 12-11 20-14 26z" fill="var(--l-zest)" strokeWidth="3" {...ink} />
      <circle cx="41" cy="28" r="6" fill="var(--l-white)" strokeWidth="3" {...ink} />
    </svg>
  )
}

/**
 * The wordmark: the pin, then "Our Family Socials" with Family on a sticker.
 * short: show OFS on a sticker instead (phones); the full name stays for screen readers.
 */
export function Wordmark({ className, short }) {
  const [a, b, c] = BRAND.split(' ')
  return (
    <span className={cx(s.mark, className)} data-short={short || undefined}>
      <Pin />
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
