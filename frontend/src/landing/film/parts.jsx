// Static pieces of the film's DOM (owner: film). Nothing here animates. Each piece is drawn
// at its HOLD position by CSS from the variables in layout.js; the engine finds elements by
// their data-f names and adds offsets that end at zero.
import { art as getArt } from '../art/manifest.js'
import { Cutout, Icon, Label, Readout, Sticker, cx } from '../ui/index.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { H, airVars, floorVars, stageVars } from './layout.js'
import { ORDER } from './timeline.js'
import s from './stage.module.css'

const off = (a) => ({ 'data-off-d': a.d ? undefined : '', 'data-off-m': a.m ? undefined : '' })

/**
 * Roughly how wide a cut-out is drawn, as a `sizes` value. Figures under about half the
 * stage height are rounded down, so a 2x or 3x screen still takes the phone-size file
 * (760px on the long edge is plenty for them); the scene's subject keeps the full one.
 */
function sizesFor(a, h, ar, stage) {
  const tall = a.d ? h * a.d.s * stage.d.A : 0
  const wd = tall * ar * (tall < 50 ? 0.8 : 1)
  const wm = a.m ? h * a.m.s * stage.m.A * ar : 0
  // 100u = min(100vh, 62.5vw) on desktop, 100vh on a phone.
  return `(max-aspect-ratio: 9/10) ${Math.max(1, Math.round(wm * 0.8))}vh, ${Math.max(1, Math.round(wd * 0.625))}vw`
}

/**
 * One full-screen scene. `k` is its key on the timeline; `wash` its colour.
 * Children are positioned in stage units against the floor line.
 */
export function Scene({ k, wash, id, label, className, children, floor = true }) {
  return (
    <section className={cx(s.scene, className)} data-scene={k} data-wash={wash} id={id} aria-label={label} style={{ ...stageVars(k), zIndex: ORDER.indexOf(k) * 2 + 1 }}>
      {floor ? <div className={s.floor} aria-hidden="true" /> : null}
      {children}
    </section>
  )
}

/** The giant word behind the subject. gw: its width in em, so it can be fitted without script. */
export function Ghost({ f, children, gw = 3, className, ...rest }) {
  return (
    <div className={cx(s.ghostSlot, className)} aria-hidden="true" {...rest}>
      <span className={s.ghost} data-f={f} style={{ '--gw': gw }}>
        {children}
      </span>
    </div>
  )
}

/**
 * A cut-out standing on the floor: contact shadow, then the image inside a clip that ends at
 * the feet, so it can rise from below the floor line. `a` is its entry in layout.js.
 */
export function Actor({ f, a, stage, className, par = 10, i, children, ...rest }) {
  const meta = getArt(a.art)
  const h = a.h ?? H[a.art] ?? 1
  const style = floorVars(a, h, meta)
  if (i != null) style['--i'] = i
  return (
    <div className={cx(s.actor, className)} style={style} {...off(a)} {...rest}>
      <div className={s.mv} data-f={f} data-par={par} data-actor="">
        {a.sh === 0 ? null : <i className={s.shadow} data-shadow="" />}
        <div className={s.clip} data-clip={a.rise || a.clip ? '' : undefined}>
          <div className={s.rise} data-rise="">
            {children || (
              <Cutout
                id={a.art}
                className={cx(s.img, a.flip && s.flip)}
                priority={a.priority}
                sizes={stage ? sizesFor(a, h, meta.w / meta.h, stage) : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Something in the air, positioned by its centre: a prop cut-out or any DOM fragment. */
export function Air({ f, a, className, par = 14, children, ...rest }) {
  return (
    <div className={cx(s.air, className)} style={airVars(a)} {...off(a)} {...rest}>
      <div className={s.amv} data-f={f} data-par={par}>
        {children || <Cutout id={a.art} className={s.airImg} sizes="(max-aspect-ratio: 9/10) 12vh, 8vw" />}
      </div>
    </div>
  )
}

/**
 * A headline cut into words so the engine can land them one after another. The marked word
 * is the sticker. Punctuation in `after` stays glued to the sticker.
 */
export function HeadWords({ id, before = '', mark, after = '', breakAfter }) {
  const words = before.trim().split(/\s+/).filter(Boolean)
  const tail = after.trim()
  const glue = tail && !/^[\p{L}\p{N}]/u.test(tail) ? tail.split(/\s+/)[0] : ''
  const rest = glue ? tail.slice(glue.length).trim() : tail
  const restWords = rest ? rest.split(/\s+/) : []
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className={s.w} data-hw={id}>
            {w}
          </span>{' '}
          {breakAfter === w ? <br data-br="" /> : null}
        </span>
      ))}
      <span className={cx(s.w, s.wMark)} data-hw={id}>
        <Sticker>{mark}</Sticker>
        {glue}
      </span>
      {restWords.map((w, i) => (
        <span key={`r${i}`}>
          {' '}
          <span className={s.w} data-hw={id}>
            {w}
          </span>
        </span>
      ))}
    </>
  )
}

/** A chapter's copy block: slate, eyebrow, head, one sentence. Top left on desktop, top on a phone. */
export function Copy({ k, slate, title, eyebrow, head, body, as: Tag = 'h2', className }) {
  return (
    <div className={cx(s.copy, className)} data-f={`${k}:copy`}>
      <div className={s.copyTop}>
        {slate ? (
          <p className={s.slate}>
            <b>{slate}</b>
            {title ? <span>{title}</span> : null}
          </p>
        ) : null}
        <Label as="p" dot={!slate} className={s.eyebrow}>
          {eyebrow}
        </Label>
      </div>
      <Tag className={cx('l-head', s.head)}>
        <HeadWords id={k} {...head} />
      </Tag>
      {body ? (
        <p className={s.body} data-f={`${k}:body`}>
          {body}
        </p>
      ) : null}
    </div>
  )
}

/** A month label in a scene's top right corner (poster and flow modes; the HUD counter replaces it when pinned). */
export function Month({ children, year }) {
  return (
    <p className={s.month} aria-hidden="true">
      <b>{children}</b>
      {year ? <span>{year}</span> : null}
    </p>
  )
}

/** A corner dock of readouts. side: 'bl' | 'br' | 'tr'. */
export function Dock({ f, side = 'bl', className, children }) {
  return (
    <div className={cx(s.dock, s[side], className)} data-f={f}>
      {children}
    </div>
  )
}

/** One small readout from content: { label, value, unit, note }. */
export function Fact({ r, size = 'sm', className }) {
  return <Readout size={size} label={r.label} value={r.value} unit={r.unit} note={r.note} className={cx(s.fact, className)} />
}

/** Who can open this chapter's story. */
export function AudChip({ f, label, name, note, className }) {
  return (
    <div className={cx(s.aud, className)} data-f={f}>
      <span className={s.audIcon}>
        <Icon name="people" size={18} />
      </span>
      <span className={s.audText}>
        <span className={s.audLabel}>{label}</span>
        <span className={s.audName}>
          <b>{name}</b>
          {note ? <i>{note}</i> : null}
        </span>
      </span>
    </div>
  )
}

/** A small mono tag (white, keylined). */
export function Tag({ children, className, f, solid, ...rest }) {
  return (
    <span className={cx(s.tag, solid && s.tagSolid, className)} data-f={f} {...rest}>
      {children}
    </span>
  )
}

/** A photo as a white-bordered print with a caption in the story voice. Sized by its Air slot. */
export function Photo({ art, caption, alt = '', className, sizes = '(max-aspect-ratio: 9/10) 20vh, 12vw' }) {
  return (
    <figure className={cx(s.photo, className)}>
      <ArtImg id={art} alt={alt} className={s.photoImg} sizes={sizes} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

/**
 * A round face cropped from a cut-out that is already on the page.
 * fx, fy: where the face sits in the image (0..1); zoom: how many faces wide the image is drawn.
 */
export function Avatar({ art, fx = 0.5, fy = 0.07, zoom = 4.6, className }) {
  const a = getArt(art)
  const ih = zoom * (a.h / a.w)
  return (
    <span className={cx(s.avatar, className)} aria-hidden="true">
      {a.missing ? null : (
        <img
          src={a.srcM}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{ width: `${zoom * 100}%`, left: `${(0.5 - fx * zoom) * 100}%`, top: `${(0.5 - fy * ih) * 100}%` }}
        />
      )}
    </span>
  )
}

/** A reaction glyph, drawn (the app's emoji appear only inside real captures). */
export function Glyph({ name, size = 16 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'star')
    return (
      <svg {...common}>
        <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8L8 13.6l-4.3-4 5.8-.7z" fill="currentColor" />
      </svg>
    )
  if (name === 'smile')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.4 13.6c.9 1.5 2.1 2.2 3.6 2.2s2.7-.7 3.6-2.2M9.2 9.6v.4M14.8 9.6v.4" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z" fill="currentColor" />
    </svg>
  )
}
