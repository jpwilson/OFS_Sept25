import { ArtImg } from './ArtImg.jsx'
import { SHOT_CAPTION } from './Shot.jsx'
import { cx } from './cx.js'
import s from './Device.module.css'

/**
 * A CSS phone frame (keyline, radius, notch) holding a real capture. The capture fills the
 * screen from the top. caption: as Shot (a string is the caption; left out, SHOT_CAPTION; false hides it).
 * width: px number or any CSS length (default 320px); it never exceeds the container.
 */
export function Device({ id, alt, caption, className, style, priority, width }) {
  const st = width != null ? { ...style, '--l-device-w': typeof width === 'number' ? `${width}px` : width } : style
  return (
    <figure className={cx(s.device, className)} style={st}>
      <span className={s.body} data-part="frame">
        <span className={s.screen}>
          <ArtImg id={id} alt={alt || ''} className={s.img} priority={priority} sizes="(max-width: 640px) 70vw, 320px" />
        </span>
        <span className={s.notch} aria-hidden="true" />
      </span>
      {caption === false ? null : (
        <figcaption className={s.caption} data-part="caption">
          {typeof caption === 'string' && caption ? caption : SHOT_CAPTION}
        </figcaption>
      )}
    </figure>
  )
}
