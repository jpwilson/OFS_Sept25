// FINALE, in three scenes.
//   Ours  everyone in one portrait; each story tagged with its audience; the switch works again.
//   App   the portrait becomes a print and the real feed opens from it, with two readers.
//   End   the year's last photograph, full bleed, with the closing line and the two buttons.
import { art as getArt } from '../../art/manifest.js'
import { APP as A, END as E, OURS as C } from '../../content/film.js'
import { ArtImg, AudienceSwitch, Button, Shot, cx } from '../../ui/index.js'
import { APP as LA, OURS as L, STAGE } from '../layout.js'
import { Actor, Air, Copy, Ghost, HeadWords, Scene, Tag } from '../parts.jsx'
import cr from './crowd.module.css'
import f from './finale.module.css'

const ORDER = ['ruth', 'sam', 'marcus', 'joe', 'kate', 'priya', 'finn', 'deb']

function lineVars(from, to, k) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return {
    [`--x${k}`]: Math.round(from.x * 100) / 100,
    [`--y${k}`]: Math.round(from.y * 100) / 100,
    [`--len${k}`]: Math.round(Math.hypot(dx, dy) * 100) / 100,
    [`--ang${k}`]: `${Math.round(((Math.atan2(-dy, dx) * 180) / Math.PI) * 10) / 10}deg`,
  }
}
/** Where a tag's leader leaves it: the end of the tag nearest its target. */
function tagEdge(t) {
  const d = t.d
  const side = t.to.x > d.x + d.w * 0.25 ? d.w / 2 : t.to.x < d.x - d.w * 0.25 ? -d.w / 2 : 0
  return { x: d.x + side * 0.9, y: d.y + (side === 0 ? (t.to.y > d.y ? 1.4 : -1.4) : 0) }
}

export function Ours({ id }) {
  const stage = STAGE.ours
  return (
    <Scene k="ours" wash="tide" id={id} className={cx(f.ours, cr.scope)}>
      <Ghost f="ours:ghost" gw={2.1} style={{ '--gx': 4 }}>
        {C.ghost}
      </Ghost>

      <div className={f.group} data-f="ours:group">
        <div className={f.printBg} data-f="ours:print" aria-hidden="true" />
        <Actor f="ours:van" a={L.van} stage={stage} par={6} />
        <Actor f="ours:arch" a={L.arch} stage={stage} par={6} />
        <Actor f="ours:cabin" a={L.cabin} stage={stage} par={6} />
        {ORDER.map((who, i) => {
          const a = L.crowd[who]
          return <Actor key={who} f={`ours:${who}`} a={{ ...a, clip: true, sh: 0.8 }} stage={stage} className={cr.who} i={i} par={a.z >= 4 ? 10 : 7} data-g={a.g} data-gm={a.g} />
        })}
        <Actor f="ours:family" a={L.family} stage={stage} par={13} />
        <Actor f="ours:pots" a={L.pots} stage={stage} par={16} />
        <Actor f="ours:bucket" a={L.bucket} stage={stage} par={16} />
        <Air f="ours:balloons" a={L.balloons} par={16} />

        {/* each story, tagged with the audience it was shared with */}
        {C.tags.map((t) => {
          const l = L.tags[t.id]
          return <i key={t.id} className={f.leader} data-f={`ours:l-${t.id}`} style={lineVars(tagEdge(l), l.to, 'd')} aria-hidden="true" />
        })}
        {C.tags.map((t) => {
          const l = L.tags[t.id]
          return (
            <Air key={t.id} f={`ours:t-${t.id}`} a={{ d: l.d, m: l.m, t: l.t, z: 9 }} className={f.tagSlot} par={18}>
              <span className={f.storyTag}>
                <b>{t.title}</b>
                <i>{t.audience}</i>
              </span>
            </Air>
          )
        })}
      </div>

      <Copy k="ours" eyebrow={C.eyebrow} head={C.head} body={C.body} />

      <div className={f.console} data-f="ours:console">
        <AudienceSwitch name="ofsl-film-audience-ours" label={C.switchLabel} hideLabel size="lg" className={f.switch} />
        <p className={f.labelRow} aria-hidden="true">
          <b>{C.switchLabel}</b>
        </p>
      </div>
    </Scene>
  )
}

export function App({ id }) {
  const stage = STAGE.app
  return (
    <Scene k="app" wash="paper" id={id} className={f.app}>
      <Ghost f="app:ghost" gw={2} style={{ '--gx': -8 }}>
        {A.ghost}
      </Ghost>
      <Actor f="app:joe" a={LA.joe} stage={stage} par={9} />
      <Actor f="app:ruth" a={LA.ruth} stage={stage} par={11} />
      <Actor f="app:sam" a={LA.sam} stage={stage} par={11} />

      {/* the other screens, fanned out behind the feed */}
      {A.fan.map((x, i) => (
        <Air key={x.id} f={`app:r${i}`} a={{ ...LA.fan[i], z: 4 }} className={f.fanSlot} par={12}>
          <span className={f.fanTag}>
            <Tag solid>{x.label}</Tag>
          </span>
          <Shot id={x.id} alt={x.alt} caption={false} sizes="(max-aspect-ratio: 9/10) 16vh, 18vw" />
        </Air>
      ))}

      {/* the feed: large, tilted, in a keylined frame */}
      <Air f="app:feed" a={LA.feed} className={f.feedSlot} par={10}>
        <figure className={f.window}>
          <span className={f.bar} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={f.frame}>
            <ArtImg id="ui-feed-d" alt={A.feed.alt} className={f.feedD} sizes="(max-aspect-ratio: 9/10) 1px, 42vw" />
            <ArtImg id="ui-feed-m" alt="" className={f.feedM} sizes="(max-aspect-ratio: 9/10) 30vh, 1px" />
          </span>
          <figcaption>
            {A.feed.caption}
          </figcaption>
        </figure>
      </Air>

      <Copy k="app" eyebrow={A.eyebrow} head={A.head} body={A.body} />
    </Scene>
  )
}

export function End() {
  const d = getArt('plate-year-d')
  const m = getArt('plate-year-m')
  return (
    <Scene k="end" wash="paper" floor={false} className={f.end}>
      <div className={f.plate} data-f="end:plate">
        {d.missing ? null : <img className={f.plateD} src={d.src} width={d.w} height={d.h} alt={E.plateAlt} loading="lazy" decoding="async" draggable={false} />}
        {m.missing ? null : <img className={f.plateM} src={m.src} width={m.w} height={m.h} alt="" loading="lazy" decoding="async" draggable={false} />}
      </div>
      {/* the print's wide bottom border carries the closing line */}
      <div className={f.endBand} data-f="end:band">
        <h2 className={cx('l-head', f.endH)}>
          <HeadWords id="end" {...E.head} />
        </h2>
        <div className={f.endSide} data-f="end:card">
          <p className={f.endLine}>{E.line}</p>
          <div className={f.endCta}>
            <Button size="lg" href={E.primary.href} trackAs="landing_start_free_film">
              {E.primary.label}
            </Button>
            <Button size="lg" variant="ghost" href={E.secondary.href} arrow>
              {E.secondary.label}
            </Button>
          </div>
        </div>
      </div>
    </Scene>
  )
}
