// 10. Family (lp-family): the family tree and tag profiles. (owner: proof)
import { FAMILY } from '../content/proof.js'
import { CLOSE_FAMILY, RUN_CLUB, person } from '../content/cast.js'
import { Head, Label, Cutout, GhostWord, Icon, Reveal } from '../ui/index.js'
import { CropShot } from './CropShot.jsx'
import { cx } from '../ui/cx.js'
import s from './Family.module.css'

const F = FAMILY
const D = F.demo

/** Tiny drawn diagrams, one per point; they play once when the card enters. */
function Demo({ id }) {
  if (id === 'tree') {
    return (
      <div className={cx(s.demo, s.demoTree)} aria-hidden="true">
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
  if (id === 'tag') {
    return (
      <div className={cx(s.demo, s.demoTag)} aria-hidden="true">
        <span className={s.tagChip}>
          <Icon name="people" size={14} />
          {D.tagName}
          <span className={s.tagNote}>{D.tagNote}</span>
        </span>
        <span className={s.claim}>
          {D.claim}
          <Icon name="arrow" size={14} />
        </span>
      </div>
    )
  }
  return (
    <div className={cx(s.demo, s.demoTick)} aria-hidden="true">
      {CLOSE_FAMILY.slice(0, 2).map((id, i) => (
        <span key={id} className={s.tickRow} style={{ '--i': i }}>
          <span className={s.box}>
            <Icon name="check" size={14} />
          </span>
          {person(id).short}
          <span className={s.tickNote}>{D.close}</span>
        </span>
      ))}
      <span className={s.group} style={{ '--i': 2 }}>
        <Icon name="people" size={14} />
        {RUN_CLUB.name}
      </span>
    </div>
  )
}

export function Family() {
  return (
    <section id={F.id} data-wash="fizz" className={s.section}>
      <GhostWord className={s.ghost}>{F.ghost}</GhostWord>
      <div className={cx('l-wrap', s.inner)}>
        <div className={s.header}>
          <Label dot>{F.eyebrow}</Label>
          <Head before={F.head.before} mark={F.head.mark} after={F.head.after} className={s.head} />
          <p className="l-lede">{F.lede}</p>
        </div>

        <div className={s.shots}>
          <Reveal className={s.tree}>
            <CropShot id={F.tree.shot} alt={F.tree.alt} caption={F.tree.caption} />
          </Reveal>
          <Reveal className={s.profile} delay={120}>
            <CropShot id={F.profile.shot} alt={F.profile.alt} caption={F.profile.caption} />
          </Reveal>
          <Reveal className={s.groups} delay={220}>
            <CropShot id={F.groups.shot} alt={F.groups.alt} caption={F.groups.caption} />
          </Reveal>
        </div>

        <ol className={s.points}>
          {F.points.map((p, i) => (
            <Reveal as="li" key={p.id} className={s.point} i={i}>
              <Demo id={p.id} />
              <h3 className={s.pointTitle}>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
      <div className={s.ground}>
        <div className={s.kids}>
          <Cutout id="g-kids-biscuit" alt="Ivy and Leo kneeling with Biscuit the terrier" shadow sizes="(max-width: 760px) 70vw, 420px" />
          <span className={s.dogTag}>
            <span className={s.dogDot} aria-hidden="true" />
            {F.dogTag}
          </span>
        </div>
      </div>
    </section>
  )
}
