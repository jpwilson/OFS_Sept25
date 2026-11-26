// HERO: the family, the people who follow them, and the switch that decides who can open
// a story. The crowd is driven by CSS from the checked radio (:has), so it works before
// hydration; the engine only steps the crowd back as the visitor scrolls on.
import { art } from '../../art/manifest.js'
import { HERO as C } from '../../content/film.js'
import { AUDIENCES, AudienceSwitch, Button, Shot, cx } from '../../ui/index.js'
import { HERO as L, STAGE } from '../layout.js'
import { Actor, Air, HeadWords, Scene, Tag } from '../parts.jsx'
import s from '../stage.module.css'
import cr from './crowd.module.css'
import h from './hero.module.css'

// Width of each ghost word in em (measured), so CSS can fit it to the stage without script.
const GW = { private: 2.62, custom: 4.84, close: 4.36, followers: 3.5, public: 2.36 }
const ORDER = ['ruth', 'kate', 'joe', 'marcus', 'sam', 'priya', 'finn', 'deb']

/** The leader from the card to Maya's phone: one thin line, drawn from layout numbers. */
function leaderVars(card, phone, k) {
  // from the card's nearest corner to the phone
  const cx0 = card.x - card.w / 2
  const cy0 = card.y - card.w * 0.27
  const dx = cx0 - phone.x
  const dy = cy0 - phone.y
  const len = Math.hypot(dx, dy)
  const ang = (Math.atan2(-dy, dx) * 180) / Math.PI
  return { [`--x${k}`]: phone.x, [`--y${k}`]: phone.y, [`--len${k}`]: Math.round(len * 100) / 100, [`--ang${k}`]: `${Math.round(ang * 10) / 10}deg` }
}

export function Hero() {
  const stage = STAGE.hero
  return (
    <Scene k="hero" wash="tide" className={cx(h.hero, cr.scope)}>
      <div className={h.ghosts} aria-hidden="true">
        {AUDIENCES.map((a) => (
          <span key={a.slug} className={cx(s.ghost, h.ghost)} data-v={a.slug} style={{ '--gw': GW[a.slug] }}>
            {C.ghost[a.slug]}
          </span>
        ))}
      </div>

      {/* Public: strangers at the edges, as flat silhouettes */}
      {L.strangers.map((a, i) => {
        const src = art(a.art).srcM
        return (
          <Actor key={i} f={`hero:x${i}`} a={{ ...a, sh: 0, clip: true }} className={cx(cr.who, cr.stranger)} i={i} par={6} data-crowd="">
            <span className={cx(cr.mask, a.flip && s.flip)} style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
          </Actor>
        )
      })}
      <Air f="hero:anyL" a={{ d: null, m: { x: -11.5, y: 30.6, w: 21 }, z: 9 }} className={cr.anyone}>
        <Tag solid>{C.anyone}</Tag>
      </Air>
      <Air f="hero:anyR" a={{ d: { x: 69, y: 52, w: 22 }, m: null, z: 9 }} className={cr.anyone}>
        <Tag solid>{C.anyone}</Tag>
      </Air>

      {/* the eight people who follow Maya */}
      {ORDER.map((id, i) => {
        const a = L.crowd[id]
        return <Actor key={id} f={`hero:${id}`} a={{ ...a, clip: true, sh: 0.8 }} stage={stage} className={cr.who} i={i} par={a.z >= 4 ? 10 : 7} data-g={a.g} data-gm={a.gm || a.g} data-crowd="" />
      })}

      {/* the household */}
      <Actor f="hero:family" a={L.family} stage={stage} par={13} />
      <Actor f="hero:maya" a={L.maya} stage={stage} par={13} />
      <Actor f="hero:biscuit" a={L.biscuit} stage={stage} par={15} />

      {/* this story: the real feed card, and a leader to the phone it came from */}
      <i className={h.leader} data-f="hero:leader" style={{ ...leaderVars(L.card.d, L.phone.d, 'd'), ...leaderVars(L.card.m, L.phone.m, 'm') }} aria-hidden="true" />
      <i className={cx(h.leader, h.leaderDot)} data-f="hero:dot" style={{ ...leaderVars(L.card.d, L.phone.d, 'd'), ...leaderVars(L.card.m, L.phone.m, 'm') }} aria-hidden="true" />
      <Air f="hero:card" a={{ ...L.card, z: 12 }} className={h.card} par={18}>
        <Shot id="ui-card-coast" alt={C.card.alt} caption={C.card.caption} priority sizes="(max-aspect-ratio: 9/10) 40vw, 18vw" />
      </Air>

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
        <Button size="lg" variant="ghost" href={C.secondary.href} arrow data-jump="tell">
          {C.secondary.label}
        </Button>
      </div>

      <div className={h.console} data-f="hero:console">
        <AudienceSwitch name="ofsl-film-audience" label={C.switchLabel} hideLabel className={h.switch} />
        <p className={h.labelRow} aria-hidden="true">
          <b>{C.switchLabel}</b>
          <span>{C.switchHint}</span>
        </p>
      </div>
      <p className={h.note} data-f="hero:note">
        {C.note}
      </p>

      <div className={h.can} data-f="hero:can" aria-live="polite">
        <span className={h.canLabel}>{C.canOpen.label}</span>
        {AUDIENCES.map((a) => {
          const v = C.canOpen.values[a.slug]
          return (
            <span key={a.slug} className={h.canVal} data-v={a.slug}>
              <span className={h.canBig}>
                <b>{v.value}</b>
                {v.unit ? <i>{v.unit}</i> : null}
              </span>
              <span className={h.canNote}>{v.note}</span>
            </span>
          )
        })}
      </div>

      <p className={h.small} data-f="hero:small">
        {C.smallPrint}
      </p>
    </Scene>
  )
}
