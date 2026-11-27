// 04 WEDDING: "Kate and James get married". The couple under the flower arch, a gallery wall
// with captions, the speeches as a clip, the real lightbox, the family dressed up, and the
// replies underneath.
import { HUD, WEDDING as C } from '../../content/film.js'
import { WEDDING as WS } from '../../content/film.sample.js'
import { ArtImg, Icon, Shot, cx } from '../../ui/index.js'
import { STAGE, WEDDING as L } from '../layout.js'
import { Actor, Air, AudChip, Avatar, Copy, Counter, Dock, Fact, Ghost, Glyph, Photo, Scene, Tag } from '../parts.jsx'
import r from './wedding.module.css'

export function Comment({ c, reply }) {
  return (
    <div className={cx(r.comment, reply && r.reply)}>
      <Avatar art={c.art} fx={c.fx} fy={c.fy} />
      <p>
        <b>{c.name}</b>
        {c.text}
      </p>
    </div>
  )
}

/** A clip: a poster frame, a play mark, and a ring the scroll fills. */
export function Clip({ f, art, tag, length, caption }) {
  return (
    <figure className={r.video}>
      <ArtImg id={art} alt="" className={r.videoImg} sizes="(max-aspect-ratio: 9/10) 12vh, 14vw" />
      <span className={r.play} data-f={f}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle className={r.ringBg} cx="24" cy="24" r="21" />
          <circle className={r.ringOn} cx="24" cy="24" r="21" pathLength="100" />
        </svg>
        <Icon name="play" size={20} />
      </span>
      <figcaption>
        <Tag>
          {tag} {length}
        </Tag>
        <span>{caption}</span>
      </figcaption>
    </figure>
  )
}

export function Wedding({ id }) {
  const stage = STAGE.wedding
  return (
    <Scene k="wedding" wash="fizz" id={id}>
      <Ghost f="wedding:ghost" gw={3.3} style={{ '--gx': -2 }}>
        {C.ghost}
      </Ghost>

      <Actor f="wedding:arch" a={L.arch} stage={stage} par={5} />
      <Actor f="wedding:family" a={L.family} stage={stage} par={8} />
      <Actor f="wedding:joe" a={L.joe} stage={stage} par={9} />
      <Actor f="wedding:finn" a={L.finn} stage={stage} par={9} />
      <Actor f="wedding:ruth" a={L.ruth} stage={stage} par={10} />
      <Actor f="wedding:couple" a={L.couple} stage={stage} par={12} />
      <Actor f="wedding:cake" a={L.cake} stage={stage} par={16} />
      <Actor f="wedding:flutes" a={L.flutes} stage={stage} par={18} />
      <Air f="wedding:bouquet" a={L.bouquet} par={18} />
      <Air f="wedding:confetti" a={L.confetti} par={18} />

      {/* the gallery wall: six prints, each with its caption */}
      {WS.wall.map((p, i) => (
        <Air key={p.art} f={`wedding:w${i}`} a={{ d: L.wall.d[i], m: L.wall.m[i], z: 4 }} className={r.wallSlot} par={9}>
          <Photo art={p.art} caption={p.caption} />
        </Air>
      ))}

      {/* the speeches, with a ring that fills as you scroll */}
      <Air f="wedding:video" a={L.video} className={r.videoSlot} par={12}>
        <Clip f="wedding:ring" art={WS.video.art} tag={C.videoTag} length={WS.video.length} caption={WS.video.caption} />
      </Air>

      {/* the real lightbox */}
      <Air f="wedding:lightbox" a={L.lightbox} className={r.shotSlot} par={12}>
        <Shot id="ui-lightbox-wedding" alt={C.lightbox.alt} caption={C.lightbox.caption} sizes="(max-aspect-ratio: 9/10) 12vh, 14vw" />
      </Air>

      <Air f="wedding:reactions" a={L.reactions} className={r.reactions} par={16}>
        <span className={r.rxTag}>
          <Tag>{C.reactionsTag}</Tag>
        </span>
        {WS.reactions.map((x, i) => (
          <span key={x.icon} className={r.badge} data-icon={x.icon} data-f={`wedding:rx${i}`}>
            <Glyph name={x.icon} size={15} />
            <b>{x.count}</b>
          </span>
        ))}
      </Air>

      {WS.comments.map((c, i) => (
        <Air key={c.who} f={`wedding:c${i}`} a={L.comments[i]} className={r.commentSlot} par={16}>
          <div className={r.card}>
            {c.reply ? (
              <span className={r.replyTag}>
                <Tag solid>{C.repliesTag}</Tag>
              </span>
            ) : null}
            <Comment c={c} />
            {c.reply ? <Comment c={c.reply} reply /> : null}
          </div>
        </Air>
      ))}

      <Copy k="wedding" slate={C.story.title} title={C.story.place} eyebrow={C.eyebrow} head={C.head} body={C.body} bodyWidth={24} />
      <Counter k="wedding" />

      <Dock f="wedding:bl" side="bl">
        <Fact r={C.readouts.photos} />
        <Fact r={C.readouts.clip} />
      </Dock>
      <Dock f="wedding:br" side="br">
        <AudChip f="wedding:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
        <Fact r={C.readouts.reactions} />
      </Dock>
    </Scene>
  )
}
