import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx.js'
import { IconButton } from './IconButton.jsx'
import { overlayRoot, useModal } from './overlay.js'
import s from './Sheet.module.css'

/**
 * <Sheet open onClose title="Filter" placement="auto|bottom|side|center" footer={...} size="auto|full">
 * A bottom sheet on phones (drag handle, safe-area padding), a side panel or a centred
 * card on desktop (placement). Always has a visible close button, traps focus, closes on
 * Esc and on the scrim, returns focus to its opener, locks page scroll.
 */
export function Sheet({ open, onClose, title, hideTitle, placement = 'auto', size = 'auto', footer, children, className, labelledBy, wash }) {
  const ref = useRef(null)
  const id = useId()
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
    else {
      const t = setTimeout(() => setMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [open])
  useModal(open, ref, onClose)
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(
    <div className={cx(s.layer, s[`p-${placement}`], open ? s.open : s.closing)} data-ui="sheet">
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || `${id}-t`}
        className={cx(s.panel, size === 'full' && s.full, className)}
        tabIndex={-1}
        data-wash={wash}
      >
        <div className={s.handle} aria-hidden="true" />
        <header className={s.head}>
          <h2 id={`${id}-t`} className={cx(s.title, hideTitle && 'a-sr')}>
            {title}
          </h2>
          <IconButton icon="close" label="Close" variant="keyline" onClick={onClose} className={s.close} />
        </header>
        <div className={s.body}>{children}</div>
        {footer ? <footer className={s.foot}>{footer}</footer> : null}
      </div>
    </div>,
    overlayRoot(),
  )
}
