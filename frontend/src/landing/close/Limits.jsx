import { LIMITS } from '../content/close.js'
import { Cutout, Head, Label, Reveal, Section } from '../ui/index.js'
import s from './Limits.module.css'

/** 11 · What it does not do. Plain on purpose: one prop, eight numbered statements. */
export function Limits() {
  return (
    <Section id="lp-limits" tone="white" className={s.band}>
      <div className={s.grid}>
        <div className={s.side}>
          <Label strong dot>
            {LIMITS.label}
          </Label>
          <Head {...LIMITS.head} className={s.head} />
          <p className={s.lede}>{LIMITS.lede}</p>
          <Cutout id={LIMITS.prop} className={s.prop} sizes="200px" />
        </div>
        <ol className={s.list}>
          {LIMITS.items.map((it, i) => (
            <Reveal as="li" key={it.s} className={s.item} i={i % 2}>
              <span className={s.n} aria-hidden="true" />
              <p className={s.s}>{it.s}</p>
              <p className={s.c}>{it.c}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  )
}
