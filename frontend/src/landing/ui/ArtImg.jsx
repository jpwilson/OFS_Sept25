import { maybeArt } from '../art/manifest.js'
import { Missing } from './Missing.jsx'

/** Internal: a manifest image (or placeholder) filling its frame. Used by Shot, Print, Device. */
export function ArtImg({ id, alt = '', className, priority, sizes, fit }) {
  const a = maybeArt(id)
  if (!a) return <Missing id={id} alt={alt} className={className} />
  const hasM = a.srcM && a.srcM !== a.src
  return (
    <img
      className={className}
      src={a.src}
      srcSet={hasM ? `${a.srcM} ${a.wM || Math.round(a.w / 2)}w, ${a.src} ${a.w}w` : undefined}
      sizes={hasM ? sizes || '(max-width: 640px) 90vw, 50vw' : undefined}
      width={a.w}
      height={a.h}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      draggable={false}
      style={fit ? { objectFit: fit } : undefined}
      data-art={id}
    />
  )
}
