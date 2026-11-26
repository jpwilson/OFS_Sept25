// 06 MARATHON: "Dad's first marathon", staged around who can open it. Tom at the finish, the
// family cheering behind the barrier, the photos and the clip of the last mile, and the one
// group this story went to: the Run club, named on a card and standing under it.
import { RACE as C } from '../../content/film.js'
import { RACE as RS, SLATE } from '../../content/film.sample.js'
import { Icon, Shot } from '../../ui/index.js'
import { RACE as L, STAGE } from '../layout.js'
import { Actor, Air, Avatar, Copy, Counter, Dock, Fact, Ghost, Photo, Scene } from '../parts.jsx'
import { Clip } from './Wedding.jsx'
import r from './race.module.css'
import w from './wedding.module.css'

export function Race({ id }) {
  const stage = STAGE.race
  return (
    <Scene k="race" wash="violet" id={id}>
      <Ghost f="race:ghost" gw={1.86} style={{ '--gx': -6 }}>
        {C.ghost}
      </Ghost>

      <Actor f="race:arch" a={L.arch} stage={stage} par={5} />
      <Actor f="race:maya" a={L.maya} stage={stage} par={8} />
      <Actor f="race:ivy" a={L.ivy} stage={stage} par={8} />
      <Actor f="race:leo" a={L.leo} stage={stage} par={8} />
      <Actor f="race:barrier" a={L.barrier} stage={stage} par={13} />
      {/* the Run club: the people this story went to */}
      {C.chip.members.map((m) => (
        <Actor key={m.id} f={`race:${m.id}`} a={L.club[m.id]} stage={stage} par={11} />
      ))}
      <Actor f="race:tom" a={L.tom} stage={stage} par={12} />
      <Actor f="race:shoe" a={L.shoe} stage={stage} par={18} />
      <Actor f="race:cowbell" a={L.cowbell} stage={stage} par={18} />
      <Air f="race:medal" a={L.medal} par={18} />
      <Air f="race:banana" a={L.banana} par={18} />

      {RS.prints.map((p, i) => (
        <Air key={p.art} f={`race:print${i}`} a={{ ...L.prints[i], z: 7 }} className={w.wallSlot} par={10}>
          <Photo art={p.art} caption={p.caption} />
        </Air>
      ))}
      <Air f="race:video" a={L.video} className={w.videoSlot} par={12}>
        <Clip f="race:ring" art={RS.video.art} tag={C.videoTag} length={RS.video.length} caption={RS.video.caption} />
      </Air>
      <Air f="race:lightbox" a={L.lightbox} className={w.shotSlot} par={12}>
        <Shot id="ui-lightbox" alt={C.lightbox.alt} sizes="(max-aspect-ratio: 9/10) 14vh, 12vw" />
      </Air>

      {/* who can open it, as the scene's centrepiece */}
      <Air f="race:chip" a={L.chip} className={r.chipSlot} par={14}>
        <div className={r.card}>
          <div className={r.top}>
            <span className={r.icon}>
              <Icon name="people" size={22} />
            </span>
            <span className={r.title}>
              <span className={r.label}>{C.chip.label}</span>
              <span className={r.name}>
                <b>{C.chip.name}</b>
                <i>
                  {C.chip.group} · {C.chip.count}
                </i>
              </span>
            </span>
          </div>
          <ul className={r.members}>
            {C.chip.members.map((m) => (
              <li key={m.id} data-f={`race:m-${m.id}`}>
                <Avatar {...RS.faces[m.id]} />
                <b>{m.name}</b>
                <span>
                  <Icon name="check" size={13} />
                  {C.chip.canOpen}
                </span>
              </li>
            ))}
          </ul>
          <p className={r.note}>{C.chip.note}</p>
        </div>
      </Air>

      <Copy k="race" slate={SLATE} title={C.story.title} eyebrow={C.eyebrow} head={C.head} body={C.body} wide={51} headSize={6.9} breakAfter="start" />
      <Counter k="race" />

      <Dock f="race:bl" side="bl">
        <Fact r={C.readouts.audiences} />
        <Fact r={C.readouts.clip} />
      </Dock>
    </Scene>
  )
}
