import { QUESTIONS } from '../content/close.js'
import { ROUTES } from '../content/routes.js'
import { Button, Head, Label, Section } from '../ui/index.js'
import s from './Questions.module.css'

/** 14 · Fair questions. Native <details>, so every answer is in the static HTML. */
export function Questions() {
  return (
    <Section id="lp-questions" wash="lime" className={s.band}>
      <div className={s.grid}>
        <div className={s.side}>
          <Label strong dot>
            {QUESTIONS.label}
          </Label>
          <Head {...QUESTIONS.head} className={s.head} />
          <p className={s.lede}>{QUESTIONS.lede}</p>
          <Button variant="ghost" href={ROUTES.faq} arrow>
            {QUESTIONS.more}
          </Button>
        </div>
        <div className={s.list}>
          {QUESTIONS.items.map((f, i) => (
            <details key={f.q} className={s.item} id={`lp-q-${i + 1}`}>
              <summary className={s.q}>
                <span className={s.n} aria-hidden="true" />
                <span className={s.qText}>{f.q}</span>
                <span className={s.plus} aria-hidden="true" />
              </summary>
              <p className={s.a}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
