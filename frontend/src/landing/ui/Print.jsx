import { ArtImg } from './ArtImg.jsx'
import { cx } from './cx.js'
import s from './Print.module.css'

/** A photo from the manifest as a white-bordered print, slightly rotated (tilt in degrees). */
export function Print({ id, alt, caption, tilt = -2, className, style, priority, sizes }) {
  return (
    <figure className={cx(s.print, className)} style={{ '--tilt': `${tilt}deg`, ...style }}>
      <ArtImg id={id} alt={alt || ''} className={s.img} priority={priority} sizes={sizes} />
      {caption ? <figcaption className={s.caption}>{caption}</figcaption> : null}
    </figure>
  )
}
