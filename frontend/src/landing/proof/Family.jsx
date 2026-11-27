// 10. Family (lp-family): grow your family tree. (owner: proof)
// Lead: the family tree drawn in the page (FamilyTree.jsx), growing one generation at a time as
// it comes into view, with Ivy, Leo and Biscuit kneeling at the horizon beneath it. Then two
// beats: tag people with no account (Biscuit drawn in the tree's style, and a profile capture),
// and ticks and groups do the sharing (the Sharing page's name and Close Family columns, the
// Run club card).
import { FAMILY } from '../content/proof.js'
import { Head, Label, Cutout, GhostWord, Icon, Reveal, SHOT_CAPTION } from '../ui/index.js'
import { CropShot } from './CropShot.jsx'
import { FamilyTree, TreePerson } from './FamilyTree.jsx'
import { cx } from '../ui/cx.js'
import s from './Family.module.css'

const F = FAMILY
const D = F.demo
const POINT = Object.fromEntries(F.points.map((p) => [p.id, p]))

// Capture crops, as fractions of each capture (measured on the round-three captures;
// re-measure when the Sharing page is re-shot).
const NAMES = { x: 0.03, y: 0.1, w: 0.18, h: 0.49 } // Sharing page: the name column
const TICKS = { x: 0.74, y: 0.1, w: 0.1, h: 0.49 } // ...and the Close Family column, same rows
const CLUB = { x: 0.035, y: 0.72, w: 0.37, h: 0.22 } // the Run club card
const PROFILE = { x: 0.18, y: 0.13, w: 0.64, h: 0.58 }
const PROFILE_M = { x: 0.3, y: 0.13, w: 0.4, h: 0.46 } // a phone: the avatar, name and counts

function Confirmed() {
  return (
    <div className={s.demo} aria-hidden="true">
      <span className={s.node}>{D.a}</span>
      <span className={s.link}>
        <span className={s.linkLine} />
        <span className={s.badge}>
          <Icon name="check" size={14} />
          {D.confirmed}
        </span>
      </span>
      <span className={s.node}>{D.b}</span>
    </div>
  )
}

export function Family() {
  const T = F.tagCard
  return (
    <section id={F.id} data-wash="fizz" className={s.section}>
      <GhostWord className={s.ghost}>{F.ghost}</GhostWord>
      <div className={cx('l-wrap', s.inner)}>
        <div className={s.lead}>
          <div className={s.header}>
            <Label dot>{F.eyebrow}</Label>
            <Head before={F.head.before} mark={F.head.mark} after={F.head.after} className={s.head} />
            <p className={s.sub}>{F.sub}</p>
          </div>
          <div className={s.leadText}>
            <p className={s.lede}>{F.lede}</p>
            <div className={s.leadPoint}>
              <Confirmed />
              <h3 className={s.pointTitle}>{POINT.tree.title}</h3>
              <p className={s.pointText}>{POINT.tree.text}</p>
            </div>
          </div>
        </div>

        <div className={s.treeStage}>
          <FamilyTree />
        </div>
      </div>

      {/* the floor: Ivy, Leo and Biscuit kneel at the horizon; the two beats stand on it */}
      <div className={s.floor}>
        <div className={cx('l-wrap', s.floorInner)}>
          <div className={s.kids}>
            <Cutout id="g-kids-biscuit" alt="Ivy and Leo kneeling with Biscuit the terrier" shadow sizes="(max-width: 760px) 70vw, 420px" />
            <span className={s.dogTag}>
              <span className={s.dogDot} aria-hidden="true" />
              {F.dogTag}
            </span>
          </div>
          <div className={s.beats}>
            <Reveal as="article" className={cx(s.beat, s.beatTag)}>
              <div className={s.beatText}>
                <h3 className={s.beatTitle}>{POINT.tag.title}</h3>
                <p className={s.pointText}>{POINT.tag.text}</p>
              </div>
              <div className={s.beatShots}>
                <div className={s.tagCard}>
                  <TreePerson id="biscuit" name={T.name} rel={T.rel} tag={T.tag} />
                  <span className={s.noAccount}>{T.noAccount}</span>
                </div>
                <CropShot id={F.profile.shot} alt={F.profile.alt} crop={PROFILE} cropM={PROFILE_M} caption={F.profile.caption} className={s.profileShot} width={560} />
              </div>
            </Reveal>

            <Reveal as="article" className={cx(s.beat, s.beatTick)} delay={120}>
              <div className={s.beatText}>
                <h3 className={s.beatTitle}>{POINT.tick.title}</h3>
                <p className={s.pointText}>{POINT.tick.text}</p>
              </div>
              <figure className={s.ticks}>
                <span className={s.ticksFrame}>
                  <CropShot id={F.groups.shot} alt={F.groups.altNames} crop={NAMES} cropM={NAMES} caption={false} frameless className={s.colNames} width={330} />
                  <CropShot id={F.groups.shot} alt={F.groups.altTicks} crop={TICKS} cropM={TICKS} caption={false} frameless className={s.colTicks} width={180} />
                </span>
                <CropShot id={F.groups.shot} alt={F.groups.altClub} crop={CLUB} cropM={CLUB} caption={false} className={s.club} width={520} />
                <figcaption className={s.cap}>
                  {F.groups.caption} {SHOT_CAPTION}
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
