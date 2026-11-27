import { maybeArt } from '../../../landing/art/manifest.js'
import s from './AuthStage.module.css'

/** One cut-out standing on the floor: feet on the line, a contact shadow under them.
 * Decorative (empty alt). A missing manifest id draws nothing. */
export function Figure({ f, i, priority }) {
  const a = maybeArt(f.id)
  if (!a) return null
  const hasM = a.srcM && a.srcM !== a.src
  return (
    <span
      className={s.fig}
      data-side={f.side}
      data-phone={f.phone ? '' : undefined}
      data-prop={f.prop ? '' : undefined}
      data-art={f.id}
      style={{ '--h': f.h, '--i': i, '--ratio': a.w / a.h, '--below': 1 - a.feet, '--ax': a.ax, '--lift': f.lift || 0 }}
    >
      {!f.prop || !f.lift ? <span className={s.contact} aria-hidden="true" /> : null}
      <img
        src={a.src}
        srcSet={hasM ? `${a.srcM} ${a.wM || Math.round(a.w / 2)}w, ${a.src} ${a.w}w` : undefined}
        sizes={hasM ? '(max-width: 699px) 45vw, 30vw' : undefined}
        width={a.w}
        height={a.h}
        alt=""
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        draggable={false}
      />
    </span>
  )
}
