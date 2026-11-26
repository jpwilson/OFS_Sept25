import { Label } from './Label.jsx'
import { Section } from './Section.jsx'
import s from './Stub.module.css'

/**
 * TEMPORARY placeholder band for a section its package has not built yet.
 * name: the export name ("Difference"). pkg: owning package. note: what it will be.
 */
export function Stub({ name, id, pkg, wash, tone, note }) {
  return (
    <Section id={id} wash={wash} tone={tone} pad="sm" className={s.stub} aria-label={`${name} (placeholder)`}>
      <div className={s.inner}>
        <div className={s.row}>
          <Label dot>Placeholder</Label>
          {pkg ? <Label>src/landing/{pkg} · {name}</Label> : null}
        </div>
        <h2 className="l-head">{name}</h2>
        {note ? <p className={s.note}>{note}</p> : null}
      </div>
    </Section>
  )
}
