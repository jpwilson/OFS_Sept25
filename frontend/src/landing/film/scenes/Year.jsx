// 07 THROUGH THE YEARS. The same two children at five ages: as the scroll goes on they grow
// from one floor line, a pencil mark lands on the height chart for each age, and that year's
// two photographs stand beside them. At rest only one pair is on stage.
//
// Stages are labelled by age, never by calendar year: these are illustrations of a sample
// family, and the page must not suggest the product has years of history.
import { hasArt } from '../../art/manifest.js'
import { YEAR as C } from '../../content/film.js'
import { YEARS, YEARS_NOTE, ageLabel } from '../../content/film.sample.js'
import { ArtImg, cx } from '../../ui/index.js'
import { STAGE, YEARS as L } from '../layout.js'
import { Actor, Air, Copy, Counter, Dock, Fact, Ghost, Photo, Scene } from '../parts.jsx'
import { AGES, HALF, TOP } from '../years.js'
import y from './year.module.css'

const VIEW_ART = { Feed: 'ui-feed-m', Calendar: 'ui-calendar', Map: 'ui-worldmap', Timeline: 'ui-timeline' }
const LAST = YEARS.length - 1
const photoArt = (p) => (hasArt(p.art) || !p.fallback ? p.art : p.fallback)
/** The categories a phone shows (the four the five ages use); wider screens show all eight. */
const USED = new Set(YEARS.flatMap((s) => s.photos.map((p) => p.category)))

/** One column of pencil marks: a child's height at each age. */
function Marks({ who, name, heights, side }) {
  return (
    <div className={y.marks} data-side={side} data-f={`year:marks-${who}`} style={{ '--rh': Math.round((heights[heights.length - 1] + 0.06) * 1000) / 1000 }}>
      <i className={y.rail} />
      <b className={y.who}>{name}</b>
      {heights.map((h, i) => (
        <span key={i} className={y.mark} data-f={`year:mk-${who}${i}`} style={{ '--mh': h }}>
          <i />
          <b>{YEARS[i][who]}</b>
        </span>
      ))}
    </div>
  )
}

export function Year({ id }) {
  const stage = STAGE.year
  const now = new Set(YEARS[LAST].photos.map((p) => p.category))
  const px = { '--pxd': L.pair.d.x, '--pxm': L.pair.m.x, '--pxt': L.pair.t.x, '--half': HALF, '--top': TOP }
  return (
    <Scene k="year" wash="sun" id={id} className={y.year}>
      <Ghost f="year:ghost" gw={2.1} style={{ '--gx': 3 }}>
        {C.ghost}
      </Ghost>

      {/* the height chart: one column of marks for each child, either side of them */}
      <div className={y.chart} style={px} role="img" aria-label={C.chartLabel}>
        <Marks who="ivy" name="Ivy" heights={AGES.map((g) => g.ivy)} side="l" />
        <Marks who="leo" name="Leo" heights={AGES.map((g) => g.leo)} side="r" />
        <i className={y.level} data-f="year:level" />
      </div>

      {/* the five pairs share one spot and one floor line; only the grown-up one is drawn at rest */}
      {YEARS.map((s, i) => (
        <Actor
          key={i}
          f={`year:pair${i}`}
          a={{ ...L.pair, art: AGES[i].art, h: AGES[i].h }}
          stage={stage}
          par={12}
          className={i === LAST ? undefined : y.alt}
        />
      ))}

      {/* how old they are, riding just above their heads */}
      <div className={y.ageSlot} style={px}>
        <p className={y.age} data-f="year:age">
          <span data-f="year:agetext">{ageLabel(YEARS[LAST])}</span>
        </p>
      </div>

      {/* that year's two photographs */}
      {YEARS.map((s, i) =>
        s.photos.map((p, j) => (
          <Air key={p.art} f={`year:photo${i}-${j}`} a={{ ...L.photos[j], z: 7 + j }} className={cx(y.photoSlot, i === LAST ? undefined : y.alt)} par={14}>
            <Photo art={photoArt(p)} caption={p.title} sizes="(max-aspect-ratio: 9/10) 22vh, 24vw" />
          </Air>
        )),
      )}

      {/* the eight categories, with the app's own names; that year's are lit */}
      <ul className={y.tabs} aria-label={C.readouts.categories.label}>
        {C.categories.map((name, i) => (
          <li key={name} className={cx(y.tab, USED.has(name) ? undefined : y.tabMinor)} data-f={`year:tab${i}`} data-on={now.has(name) ? '' : undefined}>
            {name}
          </li>
        ))}
      </ul>

      {/* four views of the same stories, in a phone */}
      <Air f="year:toggle" a={L.toggle} className={y.toggleSlot} par={12}>
        <ul className={y.toggle}>
          {C.views.map((v, i) => (
            <li key={v} data-f={`year:view${i}`} data-on={i === 0 ? '' : undefined}>
              {v}
            </li>
          ))}
        </ul>
      </Air>
      <Air f="year:device" a={L.device} className={y.deviceSlot} par={12}>
        <figure className={y.device}>
          <span className={y.body}>
            <span className={y.screen}>
              {C.views.map((v, i) => (
                <span key={v} className={cx(y.shot, i === 0 && y.shotOn)} data-f={`year:screen${i}`}>
                  <ArtImg id={VIEW_ART[v]} alt={i === 0 ? C.device.alt : ''} sizes="(max-aspect-ratio: 9/10) 14vh, 13vw" />
                </span>
              ))}
            </span>
            <span className={y.notch} aria-hidden="true" />
          </span>
          <figcaption>
            {C.device.caption}
          </figcaption>
        </figure>
      </Air>

      <Copy k="year" slate={C.slate} title={YEARS_NOTE} eyebrow={C.eyebrow} head={C.head} body={C.body} headSize={5.6} breakAfter="most" bodyWidth={24} className={y.yearCopy} />
      <Counter k="year" />

      <Dock f="year:bl" side="bl">
        <Fact r={C.readouts.views} />
        {/* the categories readout sits in the left dock on portrait screens and in the right one on wide screens */}
        <Fact r={C.readouts.categories} className={y.portraitOnly} />
      </Dock>
      <Dock f="year:br" side="br">
        <Fact r={C.readouts.order} />
        <Fact r={C.readouts.categories} className={y.landscapeOnly} />
      </Dock>
    </Scene>
  )
}
