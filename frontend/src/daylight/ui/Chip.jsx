import { cx } from './cx.js'
import { Icon } from './Icon.jsx'
import s from './Chip.module.css'

/**
 * <Chip selected onClick onRemove wash dot icon to href size="md|sm">Label</Chip>
 * With onClick it is a toggle button (aria-pressed from `selected`); with onRemove it shows
 * a remove control labelled "Remove <label>"; with neither it is a static tag.
 */
export function Chip({ children, selected, onClick, onRemove, wash, dot, icon, size = 'md', className, removeLabel, ...rest }) {
  const cls = cx(s.chip, s[size], selected && s.selected, className)
  const body = (
    <>
      {dot ? <span className={s.dot} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={16} /> : null}
      <span className={s.text}>{children}</span>
    </>
  )
  if (onRemove) {
    return (
      <span className={cx(cls, s.removable)} data-wash={wash} data-ui="chip" {...rest}>
        {body}
        <button type="button" className={s.remove} onClick={onRemove} aria-label={removeLabel || `Remove ${typeof children === 'string' ? children : 'filter'}`}>
          <Icon name="close" size={14} />
        </button>
      </span>
    )
  }
  if (onClick) {
    return (
      <button type="button" className={cls} data-wash={wash} aria-pressed={!!selected} onClick={onClick} data-ui="chip" {...rest}>
        {body}
      </button>
    )
  }
  return (
    <span className={cls} data-wash={wash} data-ui="chip" {...rest}>
      {body}
    </span>
  )
}
