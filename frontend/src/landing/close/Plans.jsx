import { PLANS, PLAN_MATH } from '../content/close.js'
import { ROUTES } from '../content/routes.js'
import { track } from '../lib/analytics.js'
import { Button, Cutout, Head, Icon, Label, Reveal, Section, cx } from '../ui/index.js'
import s from './Plans.module.css'

// Prices come only from PLANS / PLAN_MATH (content/close.js), which read PRICES (site.js).
// data-price and data-math mark every rendered amount for scripts/landing/check-pricing.mjs.

function List({ items }) {
  return (
    <ul className={s.list}>
      {items.map((t) => (
        <li key={t}>
          <Icon name="check" size={18} className={s.tick} />
          {t}
        </li>
      ))}
    </ul>
  )
}

function Price({ amount, per, note, k, noteK, noteAmount }) {
  return (
    <div className={s.price}>
      <span className={s.amount} data-price={k}>
        {amount}
      </span>
      <span className={s.per}>{per}</span>
      {note ? (
          <span className={s.note}>
            {noteK ? (
              <>
                {note.split(noteAmount)[0]}
                <span data-price={noteK}>{noteAmount}</span>
                {note.split(noteAmount)[1]}
              </>
            ) : (
              note
            )}
          </span>
        ) : null}
    </div>
  )
}

const cta = (where) => () => track('landing_cta', { where })

function Billing() {
  return (
    <fieldset className={s.billing} data-billing="">
      <legend className="l-sr">{PLANS.billing.legend}</legend>
      <label>
        <input type="radio" name="lp-billing" value="yearly" defaultChecked />
        <span>{PLANS.billing.yearly}</span>
      </label>
      <label>
        <input type="radio" name="lp-billing" value="monthly" />
        <span>{PLANS.billing.monthly}</span>
      </label>
    </fieldset>
  )
}

/** One person of the poster, with what they pay on a tag above them. */
function Who({ who, k, cls }) {
  return (
    <figure className={cx(s.who, cls)}>
      <figcaption className={s.tag}>
        <span className={s.tagBig}>
          <span className={s.tagPrice} data-price={k}>
            {who.price}
          </span>{' '}
          <span className={s.tagUnit}>{who.unit}</span>
        </span>
        <span className={s.tagNote}>{who.note}</span>
      </figcaption>
      <Cutout id={who.person} alt={who.alt} shadow className={s.whoImg} sizes="(max-width: 640px) 40vw, 220px" />
    </figure>
  )
}

/** 13 · Readers are free. Storytellers pay. */
export function Plans() {
  const { free, pro, lifetime } = PLANS
  return (
    <Section id="lp-plans" tone="paper" className={s.band}>
      <div className={s.top}>
        <div className={s.intro}>
          <Label strong dot className={s.lbl}>
            {PLANS.label}
          </Label>
          <Head {...PLANS.head} className={s.head} />
          <p className={s.lede}>{PLANS.lede}</p>
        </div>
        <div className={s.duo}>
          <Who who={PLANS.reader} k="free" cls={s.reader} />
          <Who who={PLANS.writer} k="pro-month-yearly" cls={s.writer} />
        </div>
      </div>

      <div className={s.row}>

        <Reveal as="article" i={0} className={cx(s.card, s.free)}>
          <h3 className={s.name}>{free.name}</h3>
          <Price amount={free.price} per={free.per} k="free" />
          <p className={s.line}>{free.line}</p>
          <List items={free.list} />
          <Button className={s.go} variant="ghost" href={ROUTES.signup} onClick={cta('plans-free')} arrow>
            {free.cta}
          </Button>
        </Reveal>

        <Reveal as="article" i={1} className={cx(s.card, s.pro)}>
          <div className={s.proHead}>
            <h3 className={s.name}>{pro.name}</h3>
            <Billing />
          </div>
          <div className={s.yearly}>
            <Price amount={pro.yearly.price} per={pro.yearly.per} note={pro.yearly.note} k="pro-month-yearly" noteK="pro-year" noteAmount={PLAN_MATH.perYear} />
          </div>
          <div className={s.monthly}>
            <Price amount={pro.monthly.price} per={pro.monthly.per} note={pro.monthly.note} k="pro-month" />
          </div>
          <p className={s.line}>{pro.line}</p>
          <List items={pro.list} />
          <Button className={s.go} href={ROUTES.signup} onClick={cta('plans-pro')} arrow>
            {pro.cta}
          </Button>
        </Reveal>

        <Reveal as="article" i={2} className={cx(s.card, s.life)}>
          <h3 className={s.name}>{lifetime.name}</h3>
          <Price amount={lifetime.price} per={lifetime.per} k="lifetime" />
          <p className={s.line}>{lifetime.line}</p>
          <List items={lifetime.list} />
          <div className={cx(s.calc, s.calcIn)}>
            <Label className={s.lbl}>{PLANS.math.lifeLabel}</Label>
            <p className={s.sum} aria-label={`${PLAN_MATH.lifetime} divided by ${PLAN_MATH.perYear} is ${PLAN_MATH.years} ${PLANS.math.unitYears}`}>
              <span data-price="lifetime">{PLAN_MATH.lifetime}</span>
              <span className={s.op}>÷</span>
              <span data-price="pro-year">{PLAN_MATH.perYear}</span>
              <span className={s.op}>=</span>
            </p>
            <div className={s.result}>
              <span className={s.big}>
                <span data-math="years">{PLAN_MATH.years}</span>
                <span className={s.unit}>{PLANS.math.unitYears}</span>
              </span>
              <span className={s.resultNote}>{PLANS.math.lifeNote}</span>
            </div>
          </div>
          <Button className={s.go} variant="ghost" href={ROUTES.pricing} arrow>
            {lifetime.cta}
          </Button>
        </Reveal>
      </div>

      <div className={s.below}>
        <div className={s.trial}>
          <div className={s.trialHead}>
            <Label strong className={s.lbl}>
              {PLANS.trial.label}
            </Label>
            <h3 className={s.trialTitle}>{PLANS.trial.head}</h3>
          </div>
          <dl className={s.terms}>
            {PLANS.trial.items.map((t) => (
              <div key={t.k}>
                <dt className="l-sr">{t.k}</dt>
                <dd>
                  <span className={s.termBig}>{t.v}</span>
                  <span className={s.termLine}>{t.line}</span>
                </dd>
              </div>
            ))}
          </dl>
          <ul className={s.rules}>
            {PLANS.rules.map((r, i) => (
              <li key={r}>
                <Icon name={i === 0 ? 'heart' : 'people'} size={20} />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className={s.math}>
          <div className={s.calc}>
            <Label className={s.lbl}>{PLANS.math.yearLabel}</Label>
            <p className={s.sum} aria-label={`${PLAN_MATH.months} times ${PLAN_MATH.perMonth} is ${PLAN_MATH.monthlyYear}, against ${PLAN_MATH.perYear}`}>
              <span data-math="months">{PLAN_MATH.months}</span>
              <span className={s.op}>×</span>
              <span data-price="pro-month">{PLAN_MATH.perMonth}</span>
              <span className={s.op}>=</span>
              <span data-math="monthly-year">{PLAN_MATH.monthlyYear}</span>
              <span className={s.vsOp}>against</span>
              <span data-price="pro-year">{PLAN_MATH.perYear}</span>
            </p>
            <div className={s.result}>
              <span className={s.big} data-math="saving">
                {PLAN_MATH.saving}
              </span>
              <span className={s.resultNote}>{PLANS.math.yearNote}</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
