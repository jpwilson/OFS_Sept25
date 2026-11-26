import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx.js'
import { Icon } from './Icon.jsx'
import s from './IconButton.module.css'

/**
 * <IconButton icon="search" label="Search people" variant="plain|keyline|solid|float" badge={3} to href onClick />
 * Always 44px (48px with size="lg"). The label is the accessible name and the tooltip.
 */
export const IconButton = forwardRef(function IconButton(
  { icon, label, variant = 'plain', size = 'md', badge, to, href, className, pressed, ...rest },
  ref,
) {
  const cls = cx(s.btn, s[variant], s[size], className)
  const inner = (
    <>
      <Icon name={icon} size={size === 'lg' ? 24 : 22} />
      {badge ? (
        <span className={s.badge} aria-hidden="true">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  )
  const name = badge ? `${label} (${badge})` : label
  const common = { ref, className: cls, 'aria-label': name, title: label, 'data-ui': 'icon-button', ...rest }
  if (to) return <Link to={to} {...common}>{inner}</Link>
  if (href) return <a href={href} {...common}>{inner}</a>
  return (
    <button type="button" aria-pressed={pressed} {...common}>
      {inner}
    </button>
  )
})
