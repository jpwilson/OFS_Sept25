// 04 YEAR: "Ivy turns nine". The eight categories, four ways to look at the same year, and
// the scroll stepping through four of the family's stories before it rests on the birthday.
import { YEAR as C, HUD } from '../../content/film.js'
import { SAMPLE_YEAR, SLATE, YEAR_CARDS } from '../../content/film.sample.js'
import { SHOT_CAPTION, Shot, cx } from '../../ui/index.js'
import { ArtImg } from '../../ui/ArtImg.jsx'
import { STAGE, YEAR as L } from '../layout.js'
import { Actor, Air, AudChip, Copy, Dock, Fact, Ghost, Month, Scene } from '../parts.jsx'
import y from './year.module.css'

const SETS = Object.keys(L.sets)
const REST = C.steps[C.steps.length - 1]
const VIEW_ART = { Feed: 'ui-feed-m', Calendar: 'ui-calendar', Map: 'ui-worldmap', Timeline: 'ui-timeline' }
// deal order: the story the chapter rests on is dealt last, so it is on top
const DEAL = [...SETS.filter((c) => c !== REST), REST]

export function Year({ id }) {
  const stage = STAGE.year
  return (
    <Scene k="year" wash="lime" id={id} className={y.year}>
      <Ghost f="year:ghost" gw={2.1} style={{ '--gx': 3 }}>
        {C.ghost}
      </Ghost>

      <Actor f="year:ruth" a={L.ruth} stage={stage} par={8} />
      <Actor f="year:joe" a={L.joe} stage={stage} par={8} />

      {/* one set of kids per category; only the resting one is drawn in the poster */}
      {SETS.map((cat) =>
        L.sets[cat].map((a) => <Actor key={a.key} f={`year:k-${a.key}`} a={a} stage={stage} par={12} className={cat === REST ? undefined : y.alt} data-set={cat} />),
      )}
      {SETS.map((cat) =>
        L.props[cat].map((a) =>
          a.air ? (
            <Air key={a.key} f={`year:p-${a.key}`} a={a} par={18} className={cat === REST ? undefined : y.alt} />
          ) : (
            <Actor key={a.key} f={`year:p-${a.key}`} a={a} stage={stage} par={18} className={cat === REST ? undefined : y.alt} />
          ),
        ),
      )}

      {/* the eight categories, with the app's own names */}
      <ul className={y.tabs} aria-label={C.readouts.categories.label}>
        {C.categories.map((name, i) => (
          <li key={name} className={y.tab} data-f={`year:tab${i}`} data-on={name === REST ? '' : undefined}>
            {name}
          </li>
        ))}
      </ul>

      {/* the matching feed cards deal into a pile */}
      {DEAL.map((cat, i) => (
        <Air key={cat} f={`year:card-${cat}`} a={{ ...L.cards[i], z: 6 + i }} className={y.cardSlot} par={14}>
          <Shot id={YEAR_CARDS[cat].card} alt={`${C.cardAlt}: ${YEAR_CARDS[cat].title}`} caption={i === DEAL.length - 1 ? undefined : false} sizes="(max-aspect-ratio: 9/10) 16vh, 20vw" />
        </Air>
      ))}

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
            {C.device.caption} {SHOT_CAPTION}
          </figcaption>
        </figure>
      </Air>

      <Copy k="year" slate={SLATE.year} title={C.story.title} eyebrow={C.eyebrow} head={C.head} body={C.body} />
      <Month year={SAMPLE_YEAR}>{C.story.month}</Month>

      <Dock f="year:bl" side="bl">
        <Fact r={C.readouts.views} />
        <Fact r={C.readouts.categories} />
      </Dock>
      <Dock f="year:br" side="br">
        <AudChip f="year:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
        <Fact r={C.readouts.order} />
      </Dock>
    </Scene>
  )
}
