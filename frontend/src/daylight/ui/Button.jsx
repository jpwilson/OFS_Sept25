import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx.js'
import { Icon } from './Icon.jsx'
import { Spinner } from './Spinner.jsx'
import s from './Button.module.css'

/**
 * <Button variant="solid|ghost|quiet|danger" size="md|lg|sm" to href onClick icon iconAfter busy full />
 * `to` renders a router Link, `href` a plain anchor, otherwise a <button type="button">.
 * Every size keeps a 44px hit area; sm only looks smaller.
 */
export const Button = forwardRef(function Button(
  { variant = 'solid', size = 'md', to, href, icon, iconAfter, busy, full, className, children, type = 'button', disabled, wash, ...rest },
  ref,
) {
  const cls = cx(s.btn, s[variant], s[size], full && s.full, busy && s.busy, className)
  const inner = (
    <>
      {busy ? <Spinner size={18} /> : icon ? <Icon name={icon} size={size === 'lg' ? 22 : 20} /> : null}
      {children != null && <span className={s.text}>{children}</span>}
      {iconAfter && !busy ? <Icon name={iconAfter} size={size === 'lg' ? 22 : 20} /> : null}
    </>
  )
  const common = { ref, className: cls, 'data-ui': 'button', 'data-wash': wash, 'aria-busy': busy || undefined, ...rest }
  if (to && !disabled) return <Link to={to} {...common}>{inner}</Link>
  if (href && !disabled) return <a href={href} {...common}>{inner}</a>
  return (
    <button type={type} disabled={disabled || busy} {...common}>
      {inner}
    </button>
  )
})
