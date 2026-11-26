// 02 READ: "Dad's first marathon". A long story with a gallery wall, a video clip, the real
// lightbox, a cheer squad, reactions and comments from the people in its custom group.
import { READ as C, HUD } from '../../content/film.js'
import { RACE, SAMPLE_YEAR, SLATE } from '../../content/film.sample.js'
import { Icon, Shot, cx } from '../../ui/index.js'
import { ArtImg } from '../../ui/ArtImg.jsx'
import { READ as L, STAGE } from '../layout.js'
import { Actor, Air, AudChip, Avatar, Copy, Dock, Fact, Ghost, Glyph, Month, Photo, Scene, Tag } from '../parts.jsx'
import r from './read.module.css'

function Comment({ c, reply }) {
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

export function Read({ id }) {
  const stage = STAGE.read
  return (
    <Scene k="read" wash="zest" id={id}>
      <Ghost f="read:ghost" gw={1.82} style={{ '--gx': -3 }}>
        {C.ghost}
      </Ghost>

      <Actor f="read:arch" a={L.arch} stage={stage} par={5} />
      <Actor f="read:maya" a={L.maya} stage={stage} par={8} />
      <Actor f="read:ivy" a={L.ivy} stage={stage} par={8} />
      <Actor f="read:leo" a={L.leo} stage={stage} par={8} />
      <Actor f="read:sam" a={L.sam} stage={stage} par={10} />
      <Actor f="read:barrier" a={L.barrier} stage={stage} par={13} />
      <Actor f="read:tom" a={L.tom} stage={stage} par={12} />
      <Actor f="read:shoe" a={L.shoe} stage={stage} par={18} />
      <Actor f="read:cowbell" a={L.cowbell} stage={stage} par={18} />
      <Air f="read:medal" a={L.medal} par={18} />
      <Air f="read:banana" a={L.banana} par={18} />

      {/* the gallery wall: six prints, each with its caption */}
      {RACE.wall.map((p, i) => (
        <Air key={p.art} f={`read:w${i}`} a={{ d: L.wall.d[i], m: L.wall.m[i], z: 4 }} className={r.wallSlot} par={9}>
          <Photo art={p.art} caption={p.caption} />
        </Air>
      ))}

      {/* a clip, with a ring that fills as you scroll */}
      <Air f="read:video" a={L.video} className={r.videoSlot} par={12}>
        <figure className={r.video}>
          <ArtImg id={RACE.video.art} alt="" className={r.videoImg} sizes="(max-aspect-ratio: 9/10) 12vh, 14vw" />
          <span className={r.play} data-f="read:ring">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle className={r.ringBg} cx="24" cy="24" r="21" />
              <circle className={r.ringOn} cx="24" cy="24" r="21" pathLength="100" />
            </svg>
            <Icon name="play" size={20} />
          </span>
          <figcaption>
            <Tag>
              {C.videoTag} {RACE.video.length}
            </Tag>
            <span>{RACE.video.caption}</span>
          </figcaption>
        </figure>
      </Air>

      {/* the real lightbox */}
      <Air f="read:lightbox" a={L.lightbox} className={r.shotSlot} par={12}>
        <Shot id="ui-lightbox" alt={C.lightbox.alt} caption={C.lightbox.caption} sizes="(max-aspect-ratio: 9/10) 12vh, 14vw" />
      </Air>

      <Air f="read:reactions" a={L.reactions} className={r.reactions} par={16}>
        <span className={r.rxTag}>
          <Tag>{C.reactionsTag}</Tag>
        </span>
        {RACE.reactions.map((x, i) => (
          <span key={x.icon} className={r.badge} data-f={`read:rx${i}`}>
            <Glyph name={x.icon} size={15} />
            <b>{x.count}</b>
          </span>
        ))}
      </Air>

      {RACE.comments.map((c, i) => (
        <Air key={c.who} f={`read:c${i}`} a={L.comments[i]} className={r.commentSlot} par={16}>
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

      <Copy k="read" slate={SLATE.read} title={C.story.title} eyebrow={C.eyebrow} head={C.head} body={C.body} />
      <Month year={SAMPLE_YEAR}>{C.story.month}</Month>

      <Dock f="read:bl" side="bl">
        <Fact r={C.readouts.photos} />
        <Fact r={C.readouts.clip} />
      </Dock>
      <Dock f="read:br" side="br">
        <AudChip f="read:aud" label={HUD.whoLabel} name={C.audience.name} note={C.audience.note} />
        <Fact r={C.readouts.reactions} />
      </Dock>
    </Scene>
  )
}
