import { hasArt } from '../art/manifest.js'
import { LOVE } from '../content/close.js'
import { ArtImg, Cutout, Head, Label, Reveal, Section } from '../ui/index.js'
import s from './Love.module.css'

/** 11 · Why families love it: six reasons, in the company's own voice. */
export function Love() {
  return (
    <Section id="lp-love" tone="white" className={s.band}>
      <div className={s.poster}>
        <div className={s.copy}>
          <Label strong dot className={s.eyebrow}>
            {LOVE.label}
          </Label>
          <Head {...LOVE.head} className={s.head} />
        </div>
        <div className={s.people} role="img" aria-label={LOVE.peopleAlt}>
          {LOVE.people.map((id) => (
            <Cutout key={id} id={id} shadow className={s.person} sizes="(max-width: 640px) 30vw, 180px" />
          ))}
        </div>
      </div>

      <ul className={s.cards}>
        {LOVE.cards.map((c, i) => (
          <Reveal as="li" key={c.line} i={i % 3} className={s.card}>
            <div className={s.photo}>
              <ArtImg id={hasArt(c.photo) ? c.photo : c.stand} alt="" className={s.img} sizes="(max-width: 640px) 90vw, (max-width: 1199px) 45vw, 400px" />
            </div>
            <h3 className={s.line}>{c.line}</h3>
            <p className={s.text}>{c.text}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
