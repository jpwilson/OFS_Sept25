import { maybeArt } from '../art/manifest.js'
import { Missing } from './Missing.jsx'
import { cx } from './cx.js'
import s from './Cutout.module.css'

/**
 * A cut-out (person, group, object, prop) from the art manifest: <img> with width and height
 * set, phone source under 640px, lazy unless `priority`. A missing id renders a labelled box.
 * shadow: draw an elliptical contact shadow under the feet (wraps the image in a span).
 */
export function Cutout({ id, alt = '', className, style, priority, sizes, shadow, imgRef }) {
  const a = maybeArt(id)
  if (!a) return <Missing id={id} alt={alt} className={className} style={style} />
  const img = (
    <img
      ref={imgRef}
      className={cx(s.cutout, !shadow && className)}
      style={shadow ? undefined : style}
      src={a.src}
      srcSet={a.srcM !== a.src ? `${a.srcM} ${a.wM || Math.round(a.w / 2)}w, ${a.src} ${a.w}w` : undefined}
      sizes={a.srcM !== a.src ? sizes || '(max-width: 640px) 50vw, 33vw' : undefined}
      width={a.w}
      height={a.h}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      draggable={false}
      data-art={id}
    />
  )
  if (!shadow) return img
  return (
    <span className={cx(s.withShadow, className)} style={{ ...style, '--feet': a.feet, '--ax': a.ax }}>
      <span className={s.shadow} aria-hidden="true" />
      {img}
    </span>
  )
}
