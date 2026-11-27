import { Sticker } from './Sticker.jsx'
import { cx } from './cx.js'

const needsSpaceBefore = (t) => t && !/\s$/.test(t)
const startsWithWord = (t) => t && /^[\p{L}\p{N}]/u.test(t)
const SIZE = { hero: 'l-hero', head: 'l-head', sm: 'l-head-sm' }

/**
 * A headline with one sticker word: before + <Sticker>mark</Sticker> + after.
 * Spaces around the mark are added for you (none before punctuation in `after`), and the
 * sticker stays on one line with the punctuation that follows it.
 * as: the tag (default h2). size: 'head' (section head, default) | 'hero' | 'sm' | 'none'.
 * className can set font-size or line-height: the built-in size class is one class strong.
 */
export function Head({ as: Tag = 'h2', before = '', mark, after = '', size = 'head', className, id, style, children }) {
  const punct = (after.match(/^[^\s\p{L}\p{N}]+/u) || [''])[0]
  const rest = after.slice(punct.length)
  return (
    <Tag id={id} className={cx(SIZE[size], className)} style={style}>
      {before}
      {needsSpaceBefore(before) && mark ? ' ' : null}
      {mark ? (
        <span className="l-nowrap">
          <Sticker>{mark}</Sticker>
          {punct}
        </span>
      ) : (
        punct
      )}
      {startsWithWord(rest) ? ' ' : null}
      {rest}
      {children}
    </Tag>
  )
}
