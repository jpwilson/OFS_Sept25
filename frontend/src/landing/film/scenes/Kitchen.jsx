// 05 KITCHEN: "Six weeks without a kitchen". Maya adds six photos and talks; the story page
// assembles beside her while the kitchen behind her finishes itself, and two followers rise
// to read it. Everything here is drawn at its hold; the engine plays the arrivals.
import { HUD, KITCHEN as C } from '../../content/film.js'
import { KITCHEN, SAMPLE_YEAR } from '../../content/film.sample.js'
import { ArtImg, Cutout, Icon, Sticker, cx } from '../../ui/index.js'
import { KITCHEN as L, STAGE } from '../layout.js'
import { Actor, Air, AudChip, Copy, Counter, Dock, Fact, Ghost, Scene, Tag } from '../parts.jsx'
import t from './kitchen.module.css'

const STAGES = ['r-kitchen-before', 'r-kitchen-gutted', 'r-kitchen-fitted', 'r-kitchen-done']
// A fixed, uneven waveform (no random values at render).
const BARS = [3, 6, 9, 5, 8, 12, 7, 4, 9, 13, 8, 5, 10, 14, 9, 6, 11, 7, 4, 8, 12, 9, 5, 7, 11, 6, 9, 13, 7, 4, 8, 10, 6, 3]

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

function PagePrint({ i, className }) {
  const p = KITCHEN.prints[i]
  return (
    <div className={cx(t.pslot, className)}>
      <div className={t.pmv} data-f={`kitchen:print${i}`} data-par="16">
        <figure className={t.print}>
          <ArtImg id={p.art} alt="" className={t.printImg} sizes="(max-aspect-ratio: 9/10) 22vh, 13vw" />
          <figcaption>{p.caption}</figcaption>
        </figure>
      </div>
    </div>
  )
}

export function Kitchen({ id }) {
  const stage = STAGE.kitchen
  return (
    <Scene k="kitchen" wash="zest" id={id}>
      <Ghost f="kitchen:ghost" gw={1.52} style={{ '--gx': -4 }}>
        {C.ghost}
      </Ghost>

      {/* the kitchen: one room, four registered stages, each wiping up over the last */}
      <Actor f="kitchen:kitchen" a={{ ...L.kitchen, art: 'r-kitchen-done', h: 1, sh: 0 }} par={6} className={t.kitchen}>
        <div className={t.stages}>
          {STAGES.map((id, i) => (
            <div key={id} className={t.stage} data-f={`kitchen:k${i}`}>
              <Cutout id={id} sizes="(max-aspect-ratio: 9/10) 22vh, 36vw" />
            </div>
          ))}
          <div className={t.level} data-f="kitchen:level">
            <Tag solid f="kitchen:leveltag" />
          </div>
        </div>
      </Actor>

      <Actor f="kitchen:swatches" a={L.swatches} stage={stage} par={16} />
      <Air f="kitchen:roller" a={L.roller} par={8} />

      <Actor f="kitchen:kate" a={L.kate} stage={stage} par={9} />
      <Actor f="kitchen:maya" a={L.maya} stage={stage} par={12} />

      {/* the story page: a designed fragment, with the six prints docked into it */}
      <Air a={L.page} className={t.pageSlot} par={0}>
        <div className={t.page}>
          <div className={t.paper} data-f="kitchen:paper" />
          <span className={t.ptagSlot}>
            <Tag solid f="kitchen:ptag">
              {C.pageTag}
            </Tag>
          </span>
          <p className={t.ptitle} data-f="kitchen:ptitle">
            {C.story.title}
          </p>
          <div className={t.pchips} data-f="kitchen:pchips">
            <span className={t.cat}>{C.story.category}</span>
            <span className={t.place}>
              <Icon name="pin" size={13} />
              {C.story.place}
            </span>
            <span className={t.date}>
              {C.story.month} {SAMPLE_YEAR}
            </span>
          </div>
          {KITCHEN.sections.map((sec, i) => (
            <div key={sec.heading} className={t.sec} data-side={i % 2 ? 'r' : 'l'}>
              <PagePrint i={sec.print} />
              <div className={t.secText} data-f={`kitchen:sec${i}`}>
                <p className={t.h}>{sec.heading}</p>
                <p className={t.line}>{sec.text}</p>
              </div>
            </div>
          ))}
          {/* the other three prints: the gallery at the foot of the page */}
          <div className={t.pile}>
            {KITCHEN.gallery.map((pi) => (
              <PagePrint key={pi} i={pi} className={t.gslot} />
            ))}
            <span className={t.count} data-f="kitchen:count">
              <Tag>
                <span data-f="kitchen:gpre">{C.galleryTag} · </span>
                {C.photos} <b data-f="kitchen:countn">{String(KITCHEN.prints.length).padStart(2, '0')}</b>
              </Tag>
            </span>
          </div>
        </div>
      </Air>

      <Actor f="kitchen:ruth" a={L.ruth} stage={stage} par={14} />
      <Actor f="kitchen:pots" a={L.pots} stage={stage} par={18} />

      {/* the ways in: photos alone are enough; words and a voice note are optional; it can ask questions */}
      <Air a={L.ways} className={t.waysSlot} par={15}>
        <div className={t.ways} role="group" aria-label={C.waysLabel}>
          <span className={t.waysLabel} data-f="kitchen:waysLabel">
            {C.waysLabel}
          </span>
          {C.ways.map((w, i) => (
            <span key={w} className={t.way} data-f={`kitchen:way${i}`} data-on={i === C.ways.length - 1 ? '' : undefined}>
              <Icon name={i === 0 ? 'check' : 'plus'} size={13} />
              {w}
            </span>
          ))}
          <span className={cx(t.way, t.ask)} data-f={`kitchen:way${C.ways.length}`}>
            {C.ask}
          </span>
        </div>
      </Air>

      {/* the voice note */}
      <Air f="kitchen:voice" a={L.voice} className={t.voiceSlot} par={15}>
        <div className={t.voice}>
          <div className={t.vtop}>
            <span className={t.rec} aria-hidden="true" />
            <span className={t.vtag}>{C.voiceTag}</span>
            <b className={t.timer} data-f="kitchen:timer">
              {mmss(KITCHEN.voiceSeconds)}
            </b>
          </div>
          <div className={t.wave} aria-hidden="true">
            <div className={t.bars}>
              {BARS.map((b, i) => (
                <i key={i} style={{ '--b': b }} />
              ))}
            </div>
            <div className={cx(t.bars, t.barsOn)} data-f="kitchen:wave">
              {BARS.map((b, i) => (
                <i key={i} style={{ '--b': b }} />
              ))}
            </div>
          </div>
          <p className={t.said}>
            {KITCHEN.transcript.map((word, i) => (
              <span key={i}>
                <span data-f={`kitchen:tw${i}`}>{word}</span>{' '}
              </span>
            ))}
          </p>
        </div>
      </Air>
      <Air f="kitchen:mic" a={L.mic} par={20} />

      <Air f="kitchen:sticker" a={L.sticker} className={t.stickerSlot} par={20}>
        <Sticker className={t.sticker} tilt={0}>
          {C.sticker}
        </Sticker>
      </Air>

      <Copy k="kitchen" slate={C.story.title} title={C.story.place} eyebrow={C.eyebrow} head={C.head} body={C.body} headSize={6.9} breakAfter="reno?" bodyWidth={30} />
      <Counter k="kitchen" />

      <Dock f="kitchen:bl" side="bl">
        <Fact r={C.readouts.draft} />
        <Fact r={C.readouts.ways} />
      </Dock>
      <Dock f="kitchen:br" side="br">
        <AudChip f="kitchen:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
        <Fact r={C.readouts.returns} />
      </Dock>
    </Scene>
  )
}
