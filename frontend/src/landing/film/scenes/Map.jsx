// 03 MAP: "A week on the coast path". Two scenes on the same wash.
//   MapScene  the route: a dashed line along the floor through a start flag and five numbered
//             pins, each with its photo and the coordinates read from it; then the real journey map.
//   World     the map view: the scene eases back, the route becomes one pin on a flat dotted
//             world map, and the relatives' own stories appear on it.
import { art as getArt } from '../../art/manifest.js'
import { MAP as C, WORLD as W, HUD } from '../../content/film.js'
import { COAST, SAMPLE_YEAR, SLATE, WORLD_CLUSTER, WORLD_PINS } from '../../content/film.sample.js'
import { Cutout, Icon, Shot, cx } from '../../ui/index.js'
import { MAP as L, STAGE, WORLD as LW } from '../layout.js'
import { Actor, Air, AudChip, Copy, Dock, Fact, Ghost, Month, Photo, Scene, Tag } from '../parts.jsx'
import { WORLD_VIEWBOX, worldDots } from '../worldmap.js'
import m from './map.module.css'

const DOTS = worldDots()

export function MapScene({ id }) {
  const stage = STAGE.map
  return (
    <Scene k="map" wash="azure" id={id} className={m.map}>
      <Ghost f="map:ghost" gw={2.1} style={{ '--gx': 2 }}>
        {C.ghost}
      </Ghost>

      {/* everything on the stage eases back together when the world arrives */}
      <div className={m.group} data-f="map:group">
        <Actor f="map:van" a={L.van} stage={stage} par={6} />
        <Actor f="map:lighthouse" a={L.lighthouse} stage={stage} par={6} />
        <Actor f="map:waymarker" a={L.waymarker} stage={stage} par={8} />

        <svg className={m.route} viewBox="-80 -3 160 12" preserveAspectRatio="none" aria-hidden="true" data-f="map:route">
          <path className={m.routeD} d={L.route.d} />
          <path className={m.routeM} d={L.route.m} />
        </svg>

        <Actor f="map:family" a={L.family} stage={stage} par={12} />
        <Actor f="map:flask" a={L.flask} stage={stage} par={16} />

        {COAST.stops.map((stop, i) => (
          <Air key={stop.name} f={`map:pin${i}`} a={{ d: L.pins.d[i], m: L.pins.m[i], z: 7 }} className={m.pinSlot} par={14}>
            <span className={cx(m.pin, i === 0 && m.pinStart)} title={i === 0 ? C.start : undefined}>
              {i === 0 ? <Icon name="play" size={14} /> : stop.n}
            </span>
          </Air>
        ))}
        {COAST.stops.map((stop, i) => (
          <Air key={stop.name} f={`map:print${i}`} a={{ d: L.prints.d[i], m: L.prints.m[i], z: 6 }} className={m.stopSlot} par={14}>
            <span className={m.coord}>
              <Tag solid>{stop.coord}</Tag>
            </span>
            <Photo art={stop.art} caption={stop.name} />
          </Air>
        ))}

        <Air f="map:icecream" a={L.icecream} par={18} />
        <Air f="map:binoculars" a={L.binoculars} par={18} />

        <Air f="map:journey" a={L.journey} className={m.shotSlot} par={12}>
          <Shot id="ui-story-journey" alt={C.journey.alt} caption={C.journey.caption} sizes="(max-aspect-ratio: 9/10) 20vh, 24vw" />
        </Air>
      </div>

      <Copy k="map" slate={SLATE.map} title={C.story.title} eyebrow={C.eyebrow} head={C.head} body={C.body} />
      <Month year={SAMPLE_YEAR}>{C.story.month}</Month>

      <Dock f="map:bl" side="bl">
        <Fact r={C.readouts.gps} />
        <Fact r={C.readouts.layers} />
      </Dock>
      <Dock f="map:br" side="br">
        <AudChip f="map:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
      </Dock>
    </Scene>
  )
}

/** A leader from a pin to its postcard, as one thin line drawn from layout numbers. */
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
const edge = (card) => ({ x: card.x + (card.x > 10 ? -card.w / 2 : card.w / 2), y: card.y + card.w * 0.2 })
const WHO_H = { joe: 'p-joe-suitcase', kate: 'p-kate-pack', marcus: 'p-marcus-camera', ruth: 'p-ruth-sunhat' }

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
        viewBox={WORLD_VIEWBOX}
        aria-hidden="true"
        data-f="world:map"
        style={{ '--x0d': box.d.x0, '--wd': box.d.w, '--topd': box.d.top, '--x0m': box.m.x0, '--wm': box.m.w, '--topm': box.m.top }}
      >
        <path d={DOTS} />
      </svg>

      {/* leaders from each pin to its postcard */}
      {WORLD_PINS.map((p) => {
        const c = LW.cards[p.who]
        const from = LW[c.to]
        return (
          <i
            key={p.who}
            className={m.leader}
            data-f={`world:l-${p.who}`}
            data-off-m={c.m ? undefined : ''}
            style={{ ...lineVars(from.d, edge(c.d), 'd'), ...(c.m ? lineVars(from.m, edge(c.m), 'm') : null) }}
            aria-hidden="true"
          />
        )
      })}
      <i className={cx(m.leader, m.homeLine)} data-f="world:l-home" style={{ ...lineVars(LW.home.d, { x: 0.5, y: 34 }, 'd'), ...lineVars(LW.home.m, { x: -1.4, y: 24 }, 'm') }} aria-hidden="true" />

      <Actor f="world:van" a={LW.van} stage={stage} par={6} />
      <Actor f="world:lighthouse" a={LW.lighthouse} stage={stage} par={6} />
      <Actor f="world:family" a={LW.family} stage={stage} par={12} />

      {/* two far pins, and the bubble where nearby stories group */}
      <Air f="world:pin-madeira" a={{ d: { ...LW.madeira.d, w: 3.6 }, m: { ...LW.madeira.m, w: 2.8 }, z: 7 }} className={m.pinSlot} par={10}>
        <span className={cx(m.pin, m.pinFar)} />
      </Air>
      <Air f="world:pin-osaka" a={{ d: { ...LW.osaka.d, w: 3.6 }, m: { ...LW.osaka.m, w: 2.8 }, z: 7 }} className={m.pinSlot} par={10}>
        <span className={cx(m.pin, m.pinFar)} />
      </Air>
      <Air f="world:cluster" a={{ d: { ...LW.home.d, w: 7.4 }, m: { ...LW.home.m, w: 6 }, z: 8 }} className={m.clusterSlot} par={10}>
        <span className={m.cluster}>
          <b data-f="world:count">{WORLD_CLUSTER}</b>
        </span>
        <span className={m.clusterTag}>
          <Tag>{W.clusterTag}</Tag>
        </span>
      </Air>

      {/* the relatives' own stories */}
      {WORLD_PINS.map((p) => {
        const c = LW.cards[p.who]
        const meta = getArt(WHO_H[p.who])
        return (
          <Air key={p.who} f={`world:card-${p.who}`} a={{ d: c.d, m: c.m, z: 6 }} className={m.postcard} par={14}>
            <Photo art={p.photo} caption={p.place} />
            <span className={m.who} style={{ '--wh': c.who.h, '--whm': c.who.hm, '--ar': meta.w / meta.h }}>
              <Cutout id={p.art} sizes="(max-aspect-ratio: 9/10) 6vh, 5vw" />
            </span>
            <span className={m.whoTag}>
              <Tag solid>{p.name}</Tag>
            </span>
          </Air>
        )
      })}

      <Copy k="world" eyebrow={W.eyebrow} head={W.head} body={W.body} />
      <Month year={SAMPLE_YEAR}>{C.story.month}</Month>

      <Dock f="world:bl" side="bl">
        <Fact r={W.readouts.pins} />
        <Fact r={W.readouts.flat} />
      </Dock>
    </Scene>
  )
}
