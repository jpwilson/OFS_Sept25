import { MILESTONE } from '../content/close.js'
import { biz } from '../content/business.js'
import { Cutout, Head, Section } from '../ui/index.js'
import s from './Milestone.module.css'

/**
 * The band after the film. The figure and both sentences come from content/business.js
 * (supplied by the business); the people, props and layout are design.
 */
export function Milestone() {
  return (
    <Section id="lp-milestone" wash="sun" className={s.band} aria-labelledby="lp-milestone-h">
      <div className={s.grid}>
        <div className={s.copy}>
          <p className={s.count}>
            <span className={s.num}>{biz('members')}</span> <span className={s.unit}>{biz('membersUnit')}</span>
          </p>
          <Head id="lp-milestone-h" {...biz('milestoneHead')} className={s.head} />
          <p className={s.line}>{biz('milestoneLine')}</p>
        </div>
        <div className={s.scene}>
          <Cutout id={MILESTONE.prop} className={s.balloons} sizes="220px" />
          <Cutout id={MILESTONE.people} alt={MILESTONE.peopleAlt} shadow className={s.family} sizes="(max-width: 640px) 80vw, 520px" />
        </div>
      </div>
    </Section>
  )
}
