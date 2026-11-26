import { START } from '../content/close.js'
import { ROUTES } from '../content/routes.js'
import { track } from '../lib/analytics.js'
import { Button, Head, Label, Print, Section } from '../ui/index.js'
import s from './Start.module.css'

/** 15 · Start with one story. The whole sample family as one big print, the offer on a card over it. */
export function Start() {
  return (
    <Section id="lp-start" wash="tide" floor className={s.band}>
      <div className={s.stage}>
        <div className={s.plate}>
          <Print id={START.plate} alt={START.plateAlt} tilt={1.5} className={s.printD} sizes="(max-width: 1240px) 70vw, 860px" />
          <Print id={START.plateM} alt={START.plateAlt} tilt={1.5} className={s.printM} sizes="92vw" />
          <p className={s.plateNote}>{START.plateNote}</p>
        </div>
        <div className={s.card}>
          <Label strong dot>
            {START.label}
          </Label>
          <Head {...START.head} className={s.head} />
          <p className={s.line}>{START.line}</p>
          <div className={s.actions}>
            <Button size="lg" href={ROUTES.signup} onClick={() => track('landing_cta', { where: 'start' })} arrow>
              {START.start}
            </Button>
            <p className={s.login}>
              {START.loginLead} <a href={ROUTES.login}>{START.login}</a>
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
