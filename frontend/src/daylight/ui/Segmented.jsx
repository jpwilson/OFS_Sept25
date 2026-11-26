import { useRef } from 'react'
import { cx } from './cx.js'
import { Icon } from './Icon.jsx'
import s from './Segmented.module.css'

/**
 * <Segmented label="View" value={v} onChange={setV} options={[{value, label, icon}]} size="md|sm" full />
 * A radiogroup: one tab stop, arrow keys move and select.
 */
export function Segmented({ label, value, onChange, options, size = 'md', full, className, hideLabels }) {
  const ref = useRef(null)
  const onKeyDown = (e) => {
    const i = options.findIndex((o) => o.value === value)
    let j = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % options.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + options.length) % options.length
    if (e.key === 'Home') j = 0
    if (e.key === 'End') j = options.length - 1
    if (j == null) return
    e.preventDefault()
    onChange(options[j].value)
    requestAnimationFrame(() => ref.current?.querySelector('[aria-checked="true"]')?.focus())
  }
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx(s.seg, s[size], full && s.full, className)} onKeyDown={onKeyDown} data-ui="segmented">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={s.opt}
            onClick={() => onChange(o.value)}
            aria-label={hideLabels ? o.label : undefined}
            title={hideLabels ? o.label : undefined}
          >
            {o.icon ? <Icon name={o.icon} size={18} /> : null}
            {hideLabels ? null : <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
