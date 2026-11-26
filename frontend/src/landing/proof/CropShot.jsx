// A real capture shown through a crop (owner: proof). Same frame and mandatory caption as
// ui/Shot, but it can show only a rectangle of the capture: `crop` on every screen, and
// `cropM` at 700px wide and below (desktop captures shrunk to phone width are unreadable, so
// the phone shows their central part at a readable size). Rectangles are fractions of the
// capture: { x, y, w, h }. Pure CSS (custom properties + one media query), so it server-renders.
import { maybeArt } from '../art/manifest.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { SHOT_CAPTION } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import s from './CropShot.module.css'

/** Crops for the desktop captures, by id. m: phone (<=700px). d: every screen. */
export const CROPS = {
  'ui-share': { d: { x: 0, y: 0.41, w: 1, h: 0.29 } }, // "Link expires in" to "Create Share Link" only
  'ui-tree': { m: { x: 0.26, y: 0.4, w: 0.5, h: 0.46 } },
  'ui-groups': { m: { x: 0, y: 0, w: 0.92, h: 0.6 } },
  'ui-profile': { m: { x: 0.28, y: 0.06, w: 0.44, h: 0.82 } },
  'ui-story-head': { m: { x: 0, y: 0.05, w: 0.7, h: 0.95 } },
  'ui-story-text': { d: { x: 0, y: 0, w: 1, h: 0.62 }, m: { x: 0.03, y: 0, w: 0.9, h: 0.62 } },
  'ui-story-toc': { d: { x: 0, y: 0, w: 1, h: 0.58 } },
  'ui-story-journey': { m: { x: 0.25, y: 0.15, w: 0.55, h: 0.7 } },
  'ui-story-gallery': { m: { x: 0, y: 0, w: 0.62, h: 0.9 } },
  'ui-story-comments': { m: { x: 0, y: 0.05, w: 0.85, h: 0.9 } },
  'ui-lightbox': { m: { x: 0.14, y: 0, w: 0.72, h: 1 } },
  'ui-privacy': { m: { x: 0, y: 0, w: 0.62, h: 1 } },
  'ui-worldmap-d': { m: { x: 0.33, y: 0.12, w: 0.58, h: 0.78 } },
}

const FULL = { x: 0, y: 0, w: 1, h: 1 }

function vars(c, W, H, sfx) {
  return {
    [`--ar${sfx}`]: `${(c.w * W) / (c.h * H)}`,
    [`--iw${sfx}`]: `${100 / c.w}%`,
    [`--il${sfx}`]: `${(-c.x / c.w) * 100}%`,
    [`--it${sfx}`]: `${(-c.y / c.h) * 100}%`,
  }
}

export function CropShot({ id, alt, caption, crop, cropM, className, style, width = 640, frameless }) {
  const a = maybeArt(id)
  const preset = CROPS[id] || {}
  const d = crop || preset.d || FULL
  const m = cropM || preset.m || d
  const W = a ? a.w : 4
  const H = a ? a.h : 3
  const st = { ...vars(d, W, H, ''), ...vars(m, W, H, 'M'), ...style }
  // The image is wider than its box by 1/w, so ask for a source that large.
  const sizes = `(max-width: 700px) ${Math.round(95 / m.w)}vw, ${Math.round(width / d.w)}px`
  return (
    <figure className={cx(s.shot, className)} style={st}>
      <span className={cx(s.frame, frameless && s.frameless)}>
        <span className={s.box}>
          <ArtImg id={id} alt={alt || ''} className={s.img} sizes={sizes} />
        </span>
      </span>
      {caption === false ? null : (
        <figcaption className={s.caption}>
          {typeof caption === 'string' && caption ? <span>{caption} </span> : null}
          {SHOT_CAPTION}
        </figcaption>
      )}
    </figure>
  )
}
