import { cloneElement, isValidElement, useId } from 'react'
import { cx } from './cx.js'
import s from './Field.module.css'

/**
 * <Field label="Title" hint="..." error="..." optional>
 *   <input />  |  <textarea />  |  <select />
 * </Field>
 * Wires id, aria-describedby and aria-invalid onto the child and styles it. Inputs are
 * 48px tall and 16px text (so iOS does not zoom on focus).
 */
export function Field({ label, hint, error, optional, hideLabel, children, className }) {
  const id = useId()
  const desc = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        'aria-describedby': desc,
        'aria-invalid': error ? true : undefined,
        className: cx(s.control, children.type === 'textarea' && s.area, children.type === 'select' && s.select, children.props.className),
      })
    : children
  return (
    <div className={cx(s.field, error && s.hasError, className)} data-ui="field">
      <label htmlFor={children?.props?.id || id} className={cx(s.label, hideLabel && 'a-sr')}>
        {label}
        {optional ? <span className={s.optional}> optional</span> : null}
      </label>
      {control}
      {hint ? <p id={`${id}-h`} className={s.hint}>{hint}</p> : null}
      {error ? <p id={`${id}-e`} className={s.error} role="alert">{error}</p> : null}
    </div>
  )
}

/** The field styles, for a control that is not a direct child (a search box in a bar). */
export const fieldControl = s.control
