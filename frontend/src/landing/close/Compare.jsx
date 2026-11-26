import { COMPARE } from '../content/close.js'
import { biz } from '../content/business.js'
import { Cutout, Head, Icon, Label, Reveal, Section } from '../ui/index.js'
import s from './Compare.module.css'

/** One "Coming from…?" card: only what you get here. */
function Card({ c, i }) {
  return (
    <Reveal as="li" i={i % 2} className={s.card}>
      <div className={s.cardTop} data-wash={c.wash}>
        <span className={s.vs} aria-hidden="true">
          <Icon name="arrow" size={18} />
        </span>
        <h3 className={s.name}>{c.name}</h3>
      </div>
      <div className={s.body}>
        <p className={s.text}>{c.text}</p>
        <a className={s.more} href={c.path}>
          {COMPARE.more}
          <span className="l-sr"> about {c.name.replace(/^Coming from |\?$/g, '')}</span>
          <Icon name="arrow" size={18} />
        </a>
      </div>
    </Reveal>
  )
}

/** 12 · Why Our Family Socials. Head and line from business.js. */
export function Compare() {
  return (
    <Section id="lp-compare" wash="azure" className={s.band}>
      <div className={s.poster}>
        <div className={s.copy}>
          <Label strong dot className={s.eyebrow}>
            {COMPARE.label}
          </Label>
          <Head {...biz('whyHead')} className={s.head} />
          <p className={s.lede}>{biz('whyLine')}</p>
        </div>
        <figure className={s.stage}>
          <Cutout id={COMPARE.person} alt={COMPARE.personAlt} shadow className={s.person} sizes="(max-width: 640px) 36vw, 220px" />
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
