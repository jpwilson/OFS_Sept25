// 9. Audience (lp-audience): exactly who can open what. (owner: proof)
// The matrix is data (content/proof.js AUDIENCE_MATRIX, each row verified against the backend
// with file and line). The switch picks a row; the row lights up and a small crowd shows who
// can open the story.
import { useState } from 'react'
import { AUDIENCE, AUDIENCE_COLUMNS, AUDIENCE_MATRIX, CELL_TEXT, CROWD } from '../content/proof.js'
import { person } from '../content/cast.js'
import { Head, Label, AudienceSwitch, AUDIENCE_DEFAULT, Cutout, GhostWord, Icon, Reveal } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { PIcon } from './shared.jsx'
import s from './Audience.module.css'

const AU = AUDIENCE

function Cell({ state, compact }) {
  return (
    <span className={s.cell} data-state={state}>
      <span className={s.mark} aria-hidden="true">
        {state === 'open' ? <Icon name="check" size={16} /> : state === 'card' ? <PIcon name="card" size={16} /> : <PIcon name="dash" size={16} />}
      </span>
      <span className={cx(s.cellText, compact && s.cellCompact)}>{CELL_TEXT[state]}</span>
    </span>
  )
}

function ColHead({ c }) {
  return (
    <span className={s.colHead}>
      {c.key ? (
        <span className={s.keyIcon} aria-hidden="true">
          <PIcon name="key" size={18} />
        </span>
      ) : null}
      <span className={s.colLabel}>{c.label}</span>
      <span className={s.colSub}>{c.sub}</span>
    </span>
  )
}

function Crowd({ value }) {
  const openers = AU.openers[value] || []
  return (
    <figure className={s.crowd} data-aud={value}>
      <figcaption className={s.crowdCap}>{AU.crowdLabel}</figcaption>
      <div className={s.crowdStage}>
        <div className={s.people}>
          {CROWD.map((c, i) => {
            const up = c.id === 'maya' || openers.includes(c.id)
            return (
              <span key={c.id} className={s.person} data-up={up || undefined} style={{ '--i': i }}>
                <Cutout id={c.art} alt="" className={s.personArt} sizes="90px" />
              </span>
            )
          })}
        </div>
        <span className={s.floor} aria-hidden="true">
          {CROWD.map((c) => (
            <span key={c.id} className={s.name} data-up={c.id === 'maya' || openers.includes(c.id) || undefined}>
              {person(c.id).short}
            </span>
          ))}
        </span>
        <span className={s.anyone} data-on={openers.includes('anyone') || undefined}>
          {AU.anyone}
        </span>
        <span className={s.only} data-on={value === 'Private' || undefined}>
          {AU.nobody}
        </span>
      </div>
      <p className={s.crowdNames} aria-hidden="true">
        {['maya', ...openers.filter((o) => o !== 'anyone')].map((id) => person(id).short).join(' · ')}
      </p>
      <p className="l-sr" aria-live="polite">
        {value}: {['maya', ...openers.filter((o) => o !== 'anyone')].map((id) => person(id).short).join(', ')}
        {openers.includes('anyone') ? ` ${AU.anyone}` : ''}
      </p>
    </figure>
  )
}

export function Audience() {
  const [value, setValue] = useState(AUDIENCE_DEFAULT)
  const row = AUDIENCE_MATRIX.find((r) => r.name === value) || AUDIENCE_MATRIX[0]
  return (
    <section id={AU.id} data-wash="tide" className={s.section}>
      <GhostWord className={s.ghost}>{AU.head.mark}</GhostWord>
      <div className={cx('l-wrap', s.inner)}>
        <div className={s.header}>
          <Label dot>{AU.eyebrow}</Label>
          <Head before={AU.head.before} mark={AU.head.mark} after={AU.head.after} className={s.head} />
          <p className="l-lede">{AU.lede}</p>
        </div>

        <div className={s.control}>
          <AudienceSwitch value={value} onChange={setValue} name="lp-audience-matrix" label={AU.switchLabel} className={s.switch} />
          <Crowd value={value} />
        </div>

        {/* Wide: the full matrix. */}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="l-sr">{AU.head.before + ' ' + AU.head.mark}: each story setting against each kind of reader.</caption>
            <thead>
              <tr>
                <th scope="col" className={s.corner}>
                  <span className={s.cornerA}>{AU.rowHead}</span>
                  <span className={s.cornerB}>{AU.colHead}</span>
                </th>
                {AUDIENCE_COLUMNS.map((c) => (
                  <th key={c.id} scope="col" className={cx(s.th, c.key && s.keyCol)}>
                    <ColHead c={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIENCE_MATRIX.map((r) => {
                const on = r.name === value
                return (
                  <tr key={r.name} className={s.tr} data-on={on || undefined}>
                    <th scope="row" className={s.rowHead}>
                      <button type="button" className={s.rowBtn} aria-pressed={on} onClick={() => setValue(r.name)}>
                        <span className={s.rowName}>{r.name}</span>
                        <span className={s.rowNote}>{r.note}</span>
                      </button>
                    </th>
                    {AUDIENCE_COLUMNS.map((c) => (
                      <td key={c.id} className={cx(s.td, c.key && s.keyCol)}>
                        <Cell state={r.cells[c.id]} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Phone: the selected row as a list. */}
        <div className={s.rowList} aria-live="polite">
          <p className={s.rowListHead}>
            <span className={s.rowName}>{row.name}</span>
            <span className={s.rowNote}>{row.note}</span>
          </p>
          <ul>
            {AUDIENCE_COLUMNS.map((c) => (
              <li key={c.id} className={cx(s.rowItem, c.key && s.keyItem)} data-state={row.cells[c.id]}>
                <ColHead c={c} />
                <Cell state={row.cells[c.id]} />
              </li>
            ))}
          </ul>
        </div>

        <p className={s.note}>{AU.note}</p>

        <div className={s.worth}>
          <h3 className={s.worthHead}>{AU.worthHead}</h3>
          <ul className={s.worthCards}>
            {AU.worth.map((w, i) => (
              <Reveal as="li" key={w.title} className={s.worthCard} i={i}>
                <span className={s.worthIcon} aria-hidden="true">
                  {i === 0 ? <Icon name="people" size={22} /> : i === 1 ? <PIcon name="card" size={22} /> : <PIcon name="key" size={22} />}
                </span>
                <h4 className={s.worthTitle}>{w.title}</h4>
                <p>{w.text}</p>
              </Reveal>
            ))}
          </ul>
          <ul className={s.facts}>
            {AU.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
