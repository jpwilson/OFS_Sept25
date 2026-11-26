import { COMPARE } from '../content/close.js'
import { Cutout, Head, Icon, Label, Reveal, Section } from '../ui/index.js'
import s from './Compare.module.css'

/**
 * One alternative. The short answer is one paragraph in two spans: where the other choice
 * wins, set large, then where we fit. Together they are the compare page's text, exactly.
 */
function Card({ c, i }) {
  return (
    <Reveal as="li" i={i % 2} className={s.card}>
      <div className={s.cardTop} data-wash={c.wash}>
        <span className={s.vs} aria-hidden="true">
          vs
        </span>
        <h3 className={s.name}>{c.name}</h3>
      </div>
      <div className={s.body}>
        <blockquote className={s.quote} cite={c.path}>
          <p>
            <span className={s.them}>{c.them}</span>
            {c.us ? ' ' : null}
            {c.us ? <span className={s.us}>{c.us}</span> : null}
          </p>
        </blockquote>
        <a className={s.more} href={c.path}>
          {COMPARE.more}
          <span className="l-sr"> with {c.name}</span>
          <Icon name="arrow" size={18} />
        </a>
      </div>
    </Reveal>
  )
}

/** 12 · Where the others are better. The text is each compare page's own short answer. */
export function Compare() {
  return (
    <Section id="lp-compare" wash="azure" className={s.band}>
      <div className={s.poster}>
        <div className={s.copy}>
          <Label strong dot className={s.eyebrow}>
            {COMPARE.label}
          </Label>
          <Head {...COMPARE.head} className={s.head} />
          <p className={s.lede}>{COMPARE.lede}</p>
        </div>
        <figure className={s.stage}>
          <Cutout id={COMPARE.person} alt={COMPARE.personAlt} shadow className={s.person} sizes="(max-width: 640px) 36vw, 220px" />
          <figcaption className={s.cap}>Sample family</figcaption>
        </figure>
      </div>

      <ul className={s.cards}>
        {COMPARE.cards.map((c, i) => (
          <Card key={c.path} c={c} i={i} />
        ))}
      </ul>

      <ul className={s.links}>
        {COMPARE.links.map((l) => (
          <li key={l.href}>
            <a className={s.link} href={l.href}>
              <span>
                <span className={s.linkName}>{l.name}</span>
                <span className={s.linkLine}>{l.line}</span>
              </span>
              <span className={s.linkArrow} aria-hidden="true">
                <Icon name="arrow" size={22} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
