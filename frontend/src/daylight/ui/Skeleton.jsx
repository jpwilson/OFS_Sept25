import { cx } from './cx.js'
import s from './Skeleton.module.css'

/** A quiet placeholder block. <Skeleton w="100%" h={20} r={8} /> Hidden from screen readers. */
export function Skeleton({ w = '100%', h = 16, r = 8, className, style }) {
  return <span className={cx(s.sk, className)} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
}
/** Lines of text. The last line is shorter. */
export function SkeletonText({ lines = 3, size = 14, gap = 10 }) {
  return (
    <span className={s.lines} style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} h={size} w={i === lines - 1 && lines > 1 ? '62%' : '100%'} r={size / 2} />
      ))}
    </span>
  )
}
/** A labelled loading region: put skeletons inside; screen readers hear `label`. */
export function Loading({ label = 'Loading', children, className }) {
  return (
    <div className={className} role="status" aria-live="polite" data-ui="loading">
      <span className="a-sr">{label}</span>
      {children}
    </div>
  )
}
