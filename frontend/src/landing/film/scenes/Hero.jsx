// HERO: the household, and a walk through the five audiences. It opens on Private (the
// family and their own albums), and the scroll brings each audience in beside them while the
// big word and the readout change with the people.
//
// Two drivers, one DOM. Pinned: the engine places everyone from the scroll and the switch
// follows it. Poster (reduced motion, no script): the checked radio drives it from CSS
// through :has(), resting on Followers.
import { art } from '../../art/manifest.js'
import { HERO as C } from '../../content/film.js'
import { ArtImg, AUDIENCES, AudienceSwitch, Button, cx } from '../../ui/index.js'
import { HERO as L, STAGE } from '../layout.js'
import { Actor, Air, HeadWords, Scene, Tag } from '../parts.jsx'
import s from '../stage.module.css'
import cr from './crowd.module.css'
import h from './hero.module.css'

// Width of each word in em (measured), so CSS can fit it to the stage without script.
const GW = { private: 2.62, custom: 4.84, close: 4.36, followers: 3.5, public: 2.36 }
const CROWD = ['ruth', 'kate', 'joe', 'marcus', 'finn', 'priya', 'sam', 'deb']
const r3 = (v) => Math.round(v * 1000) / 1000

/** Depth order from how far back someone stands: nearer the camera is drawn on top. */
const zOf = (lift) => Math.round(50 - lift * 3)

/** A crowd member's Custom Group position, as offsets from where they stand on the poster. */
function customVars(p) {
  const out = {}
  for (const k of ['d', 'm', 't']) {
    const f = p.f[k]
    const c = p.c[k]
    out[`--cx${k}`] = r3(c.x - f.x)
    out[`--cy${k}`] = r3(-(c.lift - f.lift))
    out[`--cs${k}`] = r3(c.s / f.s)
  }
  return out
}

/** The camera's scale at each step, for the poster's CSS (the engine reads layout.js directly). */
const CAM = Object.fromEntries(['d', 'm', 't'].flatMap((k) => ['private', 'close', 'public'].map((step) => [`--cam-${step}-${k}`, L.camera[k][step]])))

export function Hero() {
  const stage = STAGE.hero
  return (
    <Scene k="hero" wash="tide" className={cx(h.hero, cr.scopeHero)}>
      {/* the big word: the chosen audience, changing with the people */}
      <div className={h.words} data-f="hero:words" aria-hidden="true">
        {AUDIENCES.map((a) => (
          <span key={a.slug} className={h.word} data-v={a.slug} data-f={`hero:w-${a.slug}`} style={{ '--gw': GW[a.slug] }}>
            {C.steps[a.slug].word}
          </span>
        ))}
      </div>

      {/* Private: the family's own albums, as real feed cards */}
      {L.albums.map((a, i) => (
        <Air key={a.id} f={`hero:album${i}`} a={{ d: a.d, m: a.m, t: a.t, z: 4 }} className={cx(h.album, cr.album)} par={12} data-i={i}>
          {/* the capture cropped to its photograph (with the title on it): no strip of card shadow underneath */}
          <figure className={h.card}>
            <span className={h.cardFrame} style={{ aspectRatio: `${art(a.id).w} / ${Math.round(art(a.id).h * L.cardPhoto)}` }}>
              <ArtImg id={a.id} alt={C.albums.alt} className={h.cardImg} priority={i < 2} sizes="(max-aspect-ratio: 9/10) 30vw, 14vw" />
            </span>
            {i === 2 ? (
              <figcaption className={h.cardCap}>
                {C.albums.caption}
              </figcaption>
            ) : null}
          </figure>
        </Air>
      ))}

      {/* everyone stands in one group, so the camera can ease back as it grows */}
      <div className={cx(h.group, cr.group)} data-f="hero:group" style={CAM}>
        {L.strangers.map((a, i) => {
          const src = art(a.art).srcM
          return (
            <Actor key={i} f={`hero:x${i}`} a={{ ...a, z: zOf((a.d || a.m).lift) - 4, sh: 0, clip: true }} className={cx(cr.who, cr.stranger)} i={i} par={6}>
              <span className={cx(cr.mask, a.flip && s.flip)} style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
            </Actor>
          )
        })}
        {CROWD.map((id, i) => {
          const p = L.crowd[id]
          return (
            <Actor
              key={id}
              f={`hero:${id}`}
              a={{ art: p.art, flip: p.flip, d: p.f.d, m: p.f.m, t: p.f.t, z: zOf(p.f.d.lift), clip: true, sh: 0.8 }}
              stage={stage}
              className={cr.who}
              vars={customVars(p)}
              i={i}
              par={8}
              tint
              data-g={p.g}
            />
          )
        })}
        <Actor f="hero:family" a={{ ...L.family, z: zOf(0) }} stage={stage} par={11} />
        {L.anyone.map((a, i) => (
          <Air key={i} f={`hero:any${i}`} a={{ ...a, z: 70 }} className={cr.anyone}>
            <Tag solid>{C.anyone}</Tag>
          </Air>
        ))}
      </div>

      <div className={h.top} data-f="hero:top">
        <h1 className={h.h1}>
          <span className={h.eyebrow}>{C.eyebrow}</span>{' '}
          <span className={cx('l-hero', h.display)}>
            <HeadWords id="hero" {...C.display} breakAfter="people" />
          </span>
        </h1>
      </div>

      <p className={h.sub} data-f="hero:sub">
        {C.sub}
      </p>
      <div className={h.cta} data-f="hero:cta">
        <Button size="lg" href={C.primary.href} trackAs="landing_start_free">
          {C.primary.label}
        </Button>
        <Button size="lg" variant="ghost" href={C.secondary.href} arrow>
          {C.secondary.label}
        </Button>
      </div>
      <p className={h.note} data-f="hero:note">
        {C.note}
      </p>

      {/* who can open it: the count and the line, changing with the step */}
      <div className={h.can} data-f="hero:can" aria-live="polite">
        <span className={h.canLabel}>{C.canOpen}</span>
        <span className={h.canBox}>
          {AUDIENCES.map((a) => {
            const v = C.steps[a.slug]
            return (
              <span key={a.slug} className={h.canVal} data-v={a.slug} data-f={`hero:c-${a.slug}`}>
                <span className={h.canBig}>
                  <b>{v.value}</b>
                  {v.unit ? <i>{v.unit}</i> : null}
                </span>
                <span className={h.canNote}>{v.line}</span>
              </span>
            )
          })}
        </span>
      </div>

      <div className={h.console} data-f="hero:console">
        <p className={h.labelRow} aria-hidden="true">
          <b>{C.switchLabel}</b>
          <span>{C.switchHint}</span>
        </p>
        <AudienceSwitch name="ofsl-film-audience" label={C.switchLabel} hideLabel size="lg" className={h.switch} />
      </div>

    </Scene>
  )
}
