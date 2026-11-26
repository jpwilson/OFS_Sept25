// The three vacation scenes.
//   Coast   01: the Maine coast. A dashed route along the floor through a start flag and five
//           numbered pins, each with its photo and the coordinates read from it; then the
//           real journey map.
//   Tetons  02: seven days, thirteen stops. The day chip advances with the scroll, that day's
//           stops light and its prints pop; then the real map of the trip.
//   World   03: the map view. A flat dotted map from Hawaii to Italy with a pin per story,
//           the stories near home grouped, and the relatives' own trips.
import { art as getArt, hasArt } from '../../art/manifest.js'
import { COAST as C, HUD, TETONS as TC, WORLD as W } from '../../content/film.js'
import { COAST as CS, SLATE, TETONS as TS, WORLD_CARDS, WORLD_CLUSTER, WORLD_TRIPS } from '../../content/film.sample.js'
import { ArtImg, Cutout, Icon, Shot, cx } from '../../ui/index.js'
import { COAST as L, STAGE, TETONS as LT, WORLD as LW, WORLD_VIEW } from '../layout.js'
import { Actor, Air, AudChip, Copy, Counter, Dock, Fact, Ghost, Phone, Photo, Scene, Tag } from '../parts.jsx'
import { worldDots } from '../worldmap.js'
import m from './trips.module.css'

const DOTS = worldDots()
const two = (n) => String(n).padStart(2, '0')

// ---------------------------------------------------------------------------------------------
export function Coast({ id }) {
  const stage = STAGE.coast
  return (
    <Scene k="coast" wash="azure" id={id}>
      <Ghost f="coast:ghost" gw={2.56} style={{ '--gx': 3 }}>
        {C.ghost}
      </Ghost>

      <Actor f="coast:van" a={L.van} stage={stage} par={6} />
      <Actor f="coast:lighthouse" a={L.lighthouse} stage={stage} par={6} />
      <Actor f="coast:waymarker" a={L.waymarker} stage={stage} par={8} />

      <svg className={m.route} viewBox="-80 -3 160 12" preserveAspectRatio="none" aria-hidden="true" data-f="coast:route">
        <path className={m.routeD} d={L.route.d} />
        <path className={m.routeM} d={L.route.m} />
      </svg>

      <Actor f="coast:family" a={L.family} stage={stage} par={12} />
      <Actor f="coast:flask" a={L.flask} stage={stage} par={16} />

      {CS.stops.map((stop, i) => (
        <Air key={stop.name} f={`coast:pin${i}`} a={{ d: L.pins.d[i], m: L.pins.m[i], z: 7 }} className={m.pinSlot} par={14}>
          <span className={cx(m.pin, i === 0 && m.pinStart)} title={i === 0 ? C.start : undefined}>
            {i === 0 ? <Icon name="play" size={14} /> : stop.n}
          </span>
        </Air>
      ))}
      {CS.stops.map((stop, i) => (
        <Air key={stop.name} f={`coast:print${i}`} a={{ d: L.prints.d[i], m: L.prints.m[i], z: 8 }} className={m.stopSlot} par={14}>
          <span className={m.coord} data-poponly="">
            <Tag solid>{stop.coord}</Tag>
          </span>
          <Photo art={stop.art} caption={stop.name} />
        </Air>
      ))}

      <Air f="coast:icecream" a={L.icecream} par={18} />
      <Air f="coast:binoculars" a={L.binoculars} par={18} />

      <Air f="coast:journey" a={L.journey} className={m.shotSlot} par={12}>
        <Shot id="ui-story-journey" alt={C.journey.alt} caption={C.journey.caption} sizes="(max-aspect-ratio: 9/10) 20vh, 24vw" />
      </Air>

      <Copy k="coast" slate={SLATE} title={C.story.title} eyebrow={C.eyebrow} head={C.head} body={C.body} />
      <Counter k="coast" />

      <Dock f="coast:bl" side="bl">
        <Fact r={C.readouts.gps} />
        <Fact r={C.readouts.layers} />
      </Dock>
      <Dock f="coast:br" side="br">
        <AudChip f="coast:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
      </Dock>
    </Scene>
  )
}

// ---------------------------------------------------------------------------------------------
/** The range is sized by its width, whatever shape the cut-out arrives in. */
function rangeSlot() {
  const meta = getArt(LT.range.art)
  const ar = meta.w / meta.h
  const one = (k) => ({ x: LT.range[k].x, lift: LT.range[k].lift, s: LT.range[k].wide / ar / STAGE.tetons[k].A })
  return { art: LT.range.art, h: 1, z: LT.range.z, sh: 0, d: one('d'), m: one('m') }
}

export function Tetons({ id }) {
  const stage = STAGE.tetons
  const last = TS.days.length - 1
  return (
    <Scene k="tetons" wash="lime" id={id} className={m.tetons}>
      <Ghost f="tetons:ghost" gw={2.62} style={{ '--gx': 3 }}>
        {TC.ghost}
      </Ghost>

      <Actor f="tetons:range" a={rangeSlot()} par={3} className={m.range} />
      <Actor f="tetons:cabin" a={LT.cabin} stage={stage} par={5} />
      <Actor f="tetons:moose" a={LT.moose} stage={stage} par={6} />
      <Actor f="tetons:lantern" a={LT.lantern} stage={stage} par={6} />
      <Actor f="tetons:suv" a={LT.suv} stage={stage} par={7} />
      <Actor f="tetons:joe" a={LT.joe} stage={stage} par={9} />
      <Actor f="tetons:ruth" a={LT.ruth} stage={stage} par={10} />
      <Actor f="tetons:canoe" a={LT.canoe} stage={stage} par={11} />

      <svg className={m.route} viewBox="-80 -3 160 12" preserveAspectRatio="none" aria-hidden="true" data-f="tetons:route">
        <path className={m.routeD} d={LT.route.d} />
        <path className={m.routeM} d={LT.route.m} />
      </svg>

      <Actor f="tetons:family" a={LT.family} stage={stage} par={12} />
      <Actor f="tetons:boots" a={LT.boots} stage={stage} par={16} />

      {/* thirteen stops; each belongs to a day */}
      {TS.stops.map((name, i) => (
        <Air key={name} f={`tetons:pin${i}`} a={{ d: LT.pins.d[i], m: LT.pins.m[i], z: 7 }} className={m.pinSlot} par={14}>
          <span className={cx(m.pin, m.pinDay)} data-on="" title={name}>
            {i + 1}
          </span>
        </Air>
      ))}
      {/* two prints a day */}
      {TS.days.flatMap((day, d) =>
        day.prints.map((p, j) => {
          const i = d * 2 + j
          return (
            <Air key={p.art} f={`tetons:print${i}`} a={{ d: LT.prints.d[i], m: LT.prints.m[i], z: 8 + d }} className={m.daySlot} par={14}>
              <Photo art={p.art} caption={p.caption} sizes="(max-aspect-ratio: 9/10) 22vh, 14vw" />
            </Air>
          )
        }),
      )}

      {/* the seven days */}
      <div className={m.days} data-f="tetons:days">
        <ol className={m.dayRow}>
          {TS.days.map((day, d) => (
            <li key={day.place} className={m.day} data-f={`tetons:day${d}`} data-on={d === last ? '' : undefined}>
              <span>{TC.day}</span> {d + 1}
            </li>
          ))}
        </ol>
        <p className={m.dayPlace}>
          <b className={m.dayN} data-f="tetons:dayn">
            {TC.day} {two(last + 1)}
          </b>
          <span data-f="tetons:place">{TS.days[last].place}</span>
        </p>
      </div>

      <Air f="tetons:journey" a={LT.journey} className={m.shotSlot} par={12}>
        <Shot id="ui-story-tetons-journey" alt={TC.journey.alt} caption={TC.journey.caption} sizes="(max-aspect-ratio: 9/10) 20vh, 24vw" />
      </Air>

      <Copy k="tetons" slate={SLATE} title={TC.story.title} eyebrow={TC.eyebrow} head={TC.head} body={TC.body} bodyWidth={25} />
      <Counter k="tetons" />

      <Dock f="tetons:bl" side="bl">
        <Fact r={TC.readouts.trip} />
        <Fact r={TC.readouts.tap} />
      </Dock>
      <Dock f="tetons:br" side="br">
        <AudChip f="tetons:aud" label={HUD.whoLabel} name={TC.audience.name} note={TC.audience.note} />
        <Fact r={TC.readouts.layers} />
      </Dock>
    </Scene>
  )
}

// ---------------------------------------------------------------------------------------------
/** A leader from a pin to something, as one thin line drawn from layout numbers. */
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
/** The corner of a card nearest a pin. */
const nearest = (card, pin) => ({ x: card.x + (pin.x < card.x ? -card.w * 0.46 : card.w * 0.46), y: card.y + (pin.y > card.y ? card.w * 0.3 : -card.w * 0.3) })
const VB = `${WORLD_VIEW.lon0 + 180} 0 ${WORLD_VIEW.lon1 - WORLD_VIEW.lon0} ${WORLD_VIEW.lat0 - WORLD_VIEW.lat1}`
const RATIO = (WORLD_VIEW.lat0 - WORLD_VIEW.lat1) / (WORLD_VIEW.lon1 - WORLD_VIEW.lon0)

export function World() {
  const stage = STAGE.world
  const box = LW.box
  return (
    <Scene k="world" wash="azure" className={m.world}>
      <Ghost f="world:ghost" gw={2.75}>
        {W.ghost}
      </Ghost>

      <svg
        className={m.dots}
        viewBox={VB}
        aria-hidden="true"
        data-f="world:map"
        style={{ '--x0d': box.d.x0, '--wd': box.d.w, '--topd': box.d.top, '--x0m': box.m.x0, '--wm': box.m.w, '--topm': box.m.top, '--ratio': RATIO }}
      >
        <path d={DOTS} />
      </svg>

      {/* leaders from each relative's pin to their postcard, and from the family up to home */}
      {WORLD_CARDS.map((p) => {
        const c = LW.cards[p.who]
        return (
          <i
            key={p.who}
            className={m.leader}
            data-f={`world:l-${p.who}`}
            style={{ ...lineVars(c.pin.d, nearest(c.d, c.pin.d), 'd'), ...lineVars(c.pin.m, nearest(c.m, c.pin.m), 'm') }}
            aria-hidden="true"
          />
        )
      })}
      <i className={cx(m.leader, m.homeLine)} data-f="world:l-home" style={{ ...lineVars(LW.home.d, { x: 7, y: 35.5 }, 'd'), ...lineVars(LW.home.m, { x: -6.5, y: 16.5 }, 'm') }} aria-hidden="true" />

      <Actor f="world:family" a={{ ...LW.family, art: hasArt(LW.family.art) ? LW.family.art : LW.family.standIn }} stage={stage} par={12} />

      {/* the same stories, in date order: the real timeline view */}
      <Air f="world:timeline" a={LW.timeline} par={12}>
        <Phone caption={W.timeline.caption}>
          <ArtImg id="ui-timeline" alt={W.timeline.alt} sizes="(max-aspect-ratio: 9/10) 12vh, 12vw" />
        </Phone>
      </Air>

      {/* the family's own trips: a pin and a small print each */}
      {WORLD_TRIPS.map((t) => {
        const tr = LW.trips[t.id]
        const pr = (k) => ({ x: tr.pin[k].x + tr.print[k].dx, y: tr.pin[k].y + tr.print[k].dy, w: tr.print[k].w, r: tr.print[k].r })
        return (
          <Air key={`p-${t.id}`} f={`world:trip-${t.id}`} a={{ d: pr('d'), m: pr('m'), z: 6 }} className={m.tripSlot} par={12}>
            <Photo art={t.photo} caption={t.place} sizes="(max-aspect-ratio: 9/10) 9vh, 7vw" />
          </Air>
        )
      })}
      {WORLD_TRIPS.map((t) => {
        const tr = LW.trips[t.id]
        return (
          <Air key={t.id} f={`world:pin-${t.id}`} a={{ d: { ...tr.pin.d, w: 3.4 }, m: { ...tr.pin.m, w: 2.6 }, z: 8 }} className={m.pinSlot} par={10}>
            {t.count ? (
              <span className={cx(m.cluster, m.clusterSm)}>
                <b>{t.count}</b>
              </span>
            ) : (
              <span className={cx(m.pin, m.pinFar)} />
            )}
            <span className={m.pinName}>
              <Tag>{t.place}</Tag>
            </span>
          </Air>
        )
      })}
      {WORLD_CARDS.map((p) => {
        const c = LW.cards[p.who]
        return (
          <Air key={p.who} f={`world:pin-${p.who}`} a={{ d: { ...c.pin.d, w: 3.4 }, m: { ...c.pin.m, w: 2.6 }, z: 8 }} className={m.pinSlot} par={10}>
            <span className={cx(m.pin, m.pinFar)} />
          </Air>
        )
      })}
      <Air f="world:cluster" a={{ d: { ...LW.home.d, w: 7 }, m: { ...LW.home.m, w: 5.4 }, z: 9 }} className={m.clusterSlot} par={10}>
        <span className={m.cluster}>
          <b>{WORLD_CLUSTER}</b>
        </span>
        <span className={m.clusterTag}>
          <Tag>{W.clusterTag}</Tag>
        </span>
      </Air>

      {/* the relatives' own stories */}
      {WORLD_CARDS.map((p) => {
        const c = LW.cards[p.who]
        const meta = getArt(p.art)
        return (
          <Air key={p.who} f={`world:card-${p.who}`} a={{ d: c.d, m: c.m, z: 7 }} className={m.postcard} par={14}>
            <Photo art={p.photo} caption={p.place} sizes="(max-aspect-ratio: 9/10) 14vh, 10vw" />
            <span className={m.who} style={{ '--wh': c.who.h, '--whm': c.who.hm, '--ar': meta.w / meta.h }}>
              <Cutout id={p.art} sizes="(max-aspect-ratio: 9/10) 6vh, 5vw" />
            </span>
            <span className={m.whoTag}>
              <Tag solid>{p.name}</Tag>
            </span>
          </Air>
        )
      })}

      <Copy k="world" eyebrow={W.eyebrow} head={W.head} body={W.body} headSize={5.2} breakAfter={['event.', 'timeline']} bodyWidth={27} className={m.worldCopy} />
      <Counter k="world" />

      <Dock f="world:bl" side="bl">
        <Fact r={W.readouts.pins} />
        <Fact r={W.readouts.timeline} />
      </Dock>
    </Scene>
  )
}
