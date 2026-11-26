// 10. Family (lp-family): the family tree and tag profiles. (owner: proof)
// Lead: the real family tree, large enough to read every name, with Ivy, Leo and Biscuit in
// front of it (Biscuit is in the tree as a tag profile). Then two beats, each proved by a
// capture cropped to the part that proves it: tag people with no account (Biscuit's tree card,
// a profile), and ticks and groups do the sharing (the Close Family column, the Run club).
// On a phone the tree pans sideways inside its frame, starting on Maya.
import { useEffect, useRef } from 'react'
import { FAMILY } from '../content/proof.js'
import { Head, Label, Cutout, GhostWord, Icon, Reveal, SHOT_CAPTION } from '../ui/index.js'
import { CropShot } from './CropShot.jsx'
import { cx } from '../ui/cx.js'
import s from './Family.module.css'

const F = FAMILY
const D = F.demo
const POINT = Object.fromEntries(F.points.map((p) => [p.id, p]))

// Crops, as fractions of each capture (measured on the round-three captures).
const TREE = { x: 0.08, y: 0.42, w: 0.88, h: 0.46 } // every card in the tree
const MAYA_AT = 0.61 // Maya's card, across the tree crop
const BISCUIT = { x: 0.525, y: 0.735, w: 0.175, h: 0.13 } // Biscuit's dashed TAG card
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

/** The tree, panning sideways on a phone and starting on Maya. */
function Tree() {
  const panRef = useRef(null)
  useEffect(() => {
    const el = panRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = MAYA_AT * el.scrollWidth - el.clientWidth / 2
  }, [])
  return (
    <figure className={s.treeFig}>
      <div className={s.pan} ref={panRef} tabIndex={0} aria-label={F.tree.alt}>
        <CropShot id={F.tree.shot} alt={F.tree.alt} crop={TREE} cropM={TREE} caption={false} className={s.treeShot} width={1240} />
      </div>
      <figcaption className={s.cap}>
        <span className={s.panHint}>{F.panHint} · </span>
        {F.tree.caption} {SHOT_CAPTION}
      </figcaption>
    </figure>
  )
}

export function Family() {
  return (
    <section id={F.id} data-wash="fizz" className={s.section}>
      <GhostWord className={s.ghost}>{F.ghost}</GhostWord>
      <div className={cx('l-wrap', s.inner)}>
        <div className={s.lead}>
          <div className={s.header}>
            <Label dot>{F.eyebrow}</Label>
            <Head before={F.head.before} mark={F.head.mark} after={F.head.after} className={s.head} />
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

        <Reveal className={s.treeStage}>
          <Tree />
        </Reveal>
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
                <CropShot id={F.tree.shot} alt={F.biscuit.alt} crop={BISCUIT} cropM={BISCUIT} caption={F.biscuit.caption} className={s.biscuitShot} width={360} />
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
