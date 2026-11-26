import { useState } from 'react'
import { COMPARE } from '../content/close.js'
import { Head, Icon, Label, Reveal, Section } from '../ui/index.js'
import s from './Compare.module.css'

/**
 * One alternative. Under 700px wide (and only once the page is mounted) the quote shows a
 * few lines with a control that opens the rest; the whole text is always in the DOM.
 */
function Card({ c, i }) {
  const [open, setOpen] = useState(false)
  const qid = `lp-cmp-${c.path.split('/').pop()}`
  return (
    <Reveal as="li" i={i % 2} className={s.card}>
      <div className={s.cardTop} data-wash={c.wash}>
        <span className={s.vs} aria-hidden="true">
          vs
        </span>
        <h3 className={s.name}>{c.name}</h3>
      </div>
      <div className={s.body}>
        <Label className={s.src}>The short answer, from our page</Label>
        <blockquote id={qid} className={s.quote} cite={c.path} data-open={open || undefined}>
          <p>{c.short}</p>
        </blockquote>
        <button type="button" className={s.toggle} aria-expanded={open} aria-controls={qid} onClick={() => setOpen((v) => !v)}>
          {open ? COMPARE.collapse : COMPARE.expand}
          <Icon name={open ? 'close' : 'plus'} size={16} />
        </button>
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
      <div className={s.top}>
        <div>
          <Label strong dot>
            {COMPARE.label}
          </Label>
          <Head {...COMPARE.head} className={s.head} />
        </div>
        <p className={s.lede}>{COMPARE.lede}</p>
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
