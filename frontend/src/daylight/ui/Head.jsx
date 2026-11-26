import { cx } from './cx.js'
import { Sticker } from '../../landing/ui/Sticker.jsx'
import s from './Head.module.css'

/**
 * <Head as="h1" size="page|story|lead|card|section" before mark after />
 * One word may sit on a sticker (`mark`), only in a page title or an empty state.
 * Spaces around the mark are added for you and the mark never wraps apart from the
 * punctuation right after it.
 */
export function Head({ as: Tag = 'h2', size = 'page', before, mark, after, children, className, id }) {
  const tail = after || ''
  const glue = tail.match(/^[.,:;!?)]+/)?.[0] || ''
  const rest = tail.slice(glue.length)
  return (
    <Tag id={id} className={cx(s.head, s[size], className)} data-ui="head">
      {children}
      {before ? `${before}${mark ? ' ' : ''}` : null}
      {mark ? (
        <span className="a-nowrap">
          <Sticker size={size === 'card' || size === 'section' ? 'sm' : 'md'}>{mark}</Sticker>
          {glue}
        </span>
      ) : null}
      {rest ? `${/^\s/.test(rest) ? '' : ' '}${rest.trimStart()}` : null}
    </Tag>
  )
}
