import { LIMITS } from '../content/close.js'
import { Cutout, Head, Label, Reveal, Section } from '../ui/index.js'
import s from './Limits.module.css'

/**
 * 11 · What it does not do. The claim in display type with one of the family beside it,
 * then eight cards: a short key in display type, the plain statement, the consequence.
 */
export function Limits() {
  return (
    <Section id="lp-limits" tone="white" className={s.band}>
      <div className={s.poster}>
        <div className={s.copy}>
          <Label strong dot className={s.eyebrow}>
            {LIMITS.label}
          </Label>
          <Head {...LIMITS.head} className={s.head} />
          <p className={s.lede}>{LIMITS.lede}</p>
        </div>
        <figure className={s.stage}>
          <Cutout id={LIMITS.person} alt={LIMITS.personAlt} shadow className={s.person} sizes="(max-width: 640px) 40vw, 240px" />
          <Cutout id={LIMITS.prop} className={s.prop} sizes="200px" />
          <figcaption className={s.cap}>Sample family</figcaption>
        </figure>
      </div>
      <ol className={s.list}>
        {LIMITS.items.map((it, i) => (
          <Reveal as="li" key={it.s} className={s.item} i={i % 4}>
            <span className={s.n} aria-hidden="true" />
            <p className={s.key}>{it.key}</p>
            <p className={s.s}>{it.s}</p>
            <p className={s.c}>{it.c}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
