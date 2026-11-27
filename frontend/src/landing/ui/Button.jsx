import { scrollToId } from '../lib/scroll.js'
import { track } from '../lib/analytics.js'
import { Icon } from './Icon.jsx'
import { cx } from './cx.js'
import s from './Button.module.css'

/**
 * The button. Plain labels that say what happens.
 *   variant: 'solid' (ink) | 'ghost' (white)        size: 'md' | 'lg'
 *   href: a path renders a plain <a>; '#lp-x' glides to that section; 'https://' opens a tab.
 *   no href renders a <button type="button">.
 *   trackAs: optional analytics event name sent on click ({ label, href }).
 *   arrow / icon: an Icon after the label.
 */
export function Button({
  children,
  variant = 'solid',
  size = 'md',
  href,
  onClick,
  arrow,
  icon,
  trackAs,
  type = 'button',
  disabled,
  className,
  style,
  id,
  ...rest
}) {
  const cls = cx(s.btn, s[variant], s[size], className)
  const tail = icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} className={s.icon} /> : arrow ? <Icon name="arrow" size={size === 'lg' ? 20 : 18} className={s.icon} /> : null
  const handle = (e) => {
    if (trackAs) track(trackAs, { label: typeof children === 'string' ? children : undefined, href })
    if (onClick) onClick(e)
    if (e.defaultPrevented || !href) return
    if (href.startsWith('#') && document.getElementById(href.slice(1)) && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      e.preventDefault()
      scrollToId(href.slice(1))
      if (history.replaceState) history.replaceState(null, '', href)
    }
  }

  if (href != null) {
    const external = /^https?:\/\//.test(href)
    return (
      <a
        {...rest}
        id={id}
        className={cls}
        style={style}
        href={href}
        onClick={handle}
        aria-disabled={disabled || undefined}
        {...(external ? { target: '_blank', rel: 'noopener' } : null)}
      >
        <span>{children}</span>
        {tail}
      </a>
    )
  }
  return (
    <button {...rest} id={id} className={cls} style={style} type={type} onClick={handle} disabled={disabled}>
      <span>{children}</span>
      {tail}
    </button>
  )
}
