// The small things every Daylight map wears (owner: MAP): the attribution line and the
// control stack. PLAN-DAYLIGHT 3.7: attribution is always present and always legible. It
// is our own element, not MapLibre's control, because our maps carry sheets, cards and
// transport bars that the control's fixed corners would slide under; the text is the
// same, taken from the two sources in sources.js.
import { OPENFREEMAP, MAPTERHORN } from './sources.js'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import s from './MapChrome.module.css'

/** <MapAttribution terrain /> terrain: hillshade or 3D terrain is on (adds Mapterhorn). */
export function MapAttribution({ terrain = false, className }) {
  const html = [OPENFREEMAP.attribution, terrain ? MAPTERHORN.attribution : null].filter(Boolean).join(' <span aria-hidden="true">·</span> ')
  return <p className={cx(s.attrib, className)} data-ui="map-attribution" dangerouslySetInnerHTML={{ __html: html }} />
}

/** One keylined button in a control stack. */
export function MapButton({ icon, label, onClick, pressed, solo, children, className, ...rest }) {
  return (
    <button type="button" className={cx(s.btn, children ? s.wide : null, solo && s.solo, className)} aria-label={children ? undefined : label} title={label} aria-pressed={pressed} onClick={onClick} data-ui="map-button" {...rest}>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  )
}

/** A vertical or horizontal group of MapButtons that reads as one keylined object. */
export function MapStack({ children, row, label, className }) {
  return (
    <div className={cx(s.stack, row && s.row, className)} role="group" aria-label={label}>
      {children}
    </div>
  )
}

/** Globe or Flat: a two-button switch (radio group). */
export function ProjectionSwitch({ value, onChange, className }) {
  const opts = [
    { v: 'globe', label: 'Globe', icon: 'globe' },
    { v: 'flat', label: 'Flat', icon: 'map' },
  ]
  return (
    <div className={cx(s.stack, s.row, s.switch, className)} role="radiogroup" aria-label="Map shape" data-ui="projection-switch">
      {opts.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={cx(s.btn, s.wide)} onClick={() => onChange(o.v)}>
          <Icon name={o.icon} size={18} />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
