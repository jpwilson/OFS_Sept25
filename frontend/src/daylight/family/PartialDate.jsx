// A date a family may know only in part (owner: FAMILY): Month, Day and Year, where the year
// alone is enough. The precision follows from what is filled in (dates.js toPartial). Used by
// the note composer (history) and the tag form (birthday, died). Fits 345px: a phone sheet.
import { useId } from 'react'
import { fieldControl } from '../ui/Field.jsx'
import { cx } from '../ui/cx.js'
import { MONTHS, daysIn } from './dates.js'
import s from './Notes.module.css'

/**
 * <PartialDate legend="When" hint="A year is enough." value={{year, month, day}} onChange error optional ui />
 * value parts are strings ('' when not known); onChange(next) gets the whole object.
 */
export default function PartialDate({ legend, hint, value, onChange, error, optional, ui, hideLegend }) {
  const id = useId()
  const v = value || { year: '', month: '', day: '' }
  const days = v.month ? daysIn(v.year, v.month) : 31
  const set = (k, x) => {
    const next = { ...v, [k]: x }
    if (!next.month) next.day = '' // a day needs its month
    if (next.day && Number(next.day) > daysIn(next.year, next.month)) next.day = ''
    onChange(next)
  }
  const desc = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined
  return (
    <fieldset className={cx(s.date, error && s.dateInvalid)} data-ui={ui} aria-describedby={desc}>
      <legend className={cx(s.legend, hideLegend && 'a-sr')}>
        {legend}
        {optional ? <span className={s.optional}> optional</span> : null}
      </legend>
      <div className={s.dateRow}>
        <select className={cx(fieldControl, s.select)} aria-label="Month" value={v.month} onChange={(e) => set('month', e.target.value)} data-ui="date-month">
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select className={cx(fieldControl, s.select)} aria-label="Day" value={v.day} onChange={(e) => set('day', e.target.value)} disabled={!v.month} data-ui="date-day">
          <option value="">Day</option>
          {Array.from({ length: days }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {i + 1}
            </option>
          ))}
        </select>
        <input
          className={fieldControl}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="Year"
          aria-label="Year"
          autoComplete="off"
          value={v.year}
          onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
          data-ui="date-year"
        />
      </div>
      {hint ? <p id={`${id}-h`} className={s.hint}>{hint}</p> : null}
      {error ? <p id={`${id}-e`} className={s.fieldError} role="alert">{error}</p> : null}
    </fieldset>
  )
}
