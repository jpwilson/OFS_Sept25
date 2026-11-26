import { Label } from '../../landing/ui/Label.jsx'
import s from './Stub.module.css'

/** A labelled placeholder for a page or part another package owns. */
export function Stub({ name, pkg, note, wash = 'paper', children, tall }) {
  return (
    <section className={s.stub} data-wash={wash} data-stub={pkg} style={tall ? { minHeight: '60vh' } : undefined}>
      <Label>{`${pkg} · stub`}</Label>
      <h2 className={s.name}>{name}</h2>
      {note ? <p className={s.note}>{note}</p> : null}
      {children}
    </section>
  )
}
