import { useId } from 'react'
import { track } from '../lib/analytics.js'
import { factList, fact } from '../content/facts.js'
import { cx } from './cx.js'
import s from './AudienceSwitch.module.css'

/**
 * The five audiences with the app's exact names, in the switch's order (round two: narrowest
 * to widest by who is in the family first). slug is the input value.
 */
const ORDER = ['Private', 'Close Family', 'Followers', 'Custom Group', 'Public']
const APP_NAMES = factList('audiences')
if (ORDER.length !== APP_NAMES.length || ORDER.some((n) => !APP_NAMES.includes(n))) {
  throw new Error('AudienceSwitch: ORDER must hold exactly the app audience names in content/facts.js')
}
export const AUDIENCES = ORDER.map((name) => ({ name, slug: name.toLowerCase().split(' ')[0] }))
// -> private, close, followers, custom, public
export const AUDIENCE_DEFAULT = fact('audienceDefault')

/**
 * The hero's control: a native radio group styled as a segmented control with a sliding
 * thumb. Works before hydration (uncontrolled, default Followers): arrow keys move natively,
 * and the state is readable in CSS from any ancestor, e.g.
 *   .scene:has([data-aud] input[value='close']:checked) .crowd { ... }
 * Each input also carries data-aud-name with the app's name.
 *
 * value / onChange(name): optional. Pass value to control it (an app name, 'Close Family').
 * name: the radio group name; give each switch on the page its own.
 * label: the visible legend (default "WHO CAN OPEN THIS STORY"); hideLabel to visually hide it.
 * size: 'md' (default) | 'lg' (taller, larger type, wider).
 * Tune from a consumer class with CSS variables on the switch or any ancestor:
 *   --l-aud-h (option height), --l-aud-fs (font size), --l-aud-pad (track padding),
 *   --l-aud-max (max width), --l-aud-opt-px (option side padding).
 */
export function AudienceSwitch({ value, onChange, name = 'ofsl-audience', label = 'Who can open this story', hideLabel, size = 'md', className, style }) {
  const uid = useId()
  const controlled = value != null
  const handle = (e) => {
    const n = e.currentTarget.getAttribute('data-aud-name')
    track('landing_audience', { value: n })
    if (onChange) onChange(n)
  }
  return (
    <fieldset className={cx(s.wrap, size === 'lg' && s.lg, className)} style={style} data-aud="" data-size={size}>
      <legend className={cx(s.legend, hideLabel && 'l-sr')}>{label}</legend>
      <div className={s.track}>
        {AUDIENCES.map((a) => {
          const idFor = `${uid}-${a.slug}`
          return (
            <label key={a.slug} className={s.opt} htmlFor={idFor}>
              <input
                id={idFor}
                className={s.input}
                type="radio"
                name={name}
                value={a.slug}
                data-aud-name={a.name}
                {...(controlled ? { checked: value === a.name, onChange: handle } : { defaultChecked: a.name === AUDIENCE_DEFAULT, onChange: handle })}
              />
              <span className={s.text}>{a.name}</span>
            </label>
          )
        })}
        <span className={s.thumb} aria-hidden="true" />
      </div>
    </fieldset>
  )
}
