import { ArtImg } from './ArtImg.jsx'
import { cx } from './cx.js'
import s from './Shot.module.css'

export const SHOT_CAPTION = 'The real app.'

/**
 * A real-interface capture (manifest kind 'ui') in a keylined frame. caption: a string is
 * printed as the caption; left out, the caption is SHOT_CAPTION; false hides it.
 * Parts: data-part="frame|caption|caption-own".
 */
export function Shot({ id, alt, caption, className, style, priority, sizes }) {
  return (
    <figure className={cx(s.shot, className)} style={style} data-shot="">
      <span className={s.frame} data-part="frame">
        <ArtImg id={id} alt={alt || ''} className={s.img} priority={priority} sizes={sizes} />
      </span>
      {caption === false ? null : (
        <figcaption className={s.caption} data-part="caption">
          {typeof caption === 'string' && caption ? <span className={s.own} data-part="caption-own">{caption}</span> : SHOT_CAPTION}
        </figcaption>
      )}
    </figure>
  )
}
