import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cx } from './cx.js'
import { Icon } from './Icon.jsx'
import { overlayRoot } from './overlay.js'
import s from './Menu.module.css'

/**
 * <Menu trigger={(props) => <button {...props}>Family</button>} items={[...]} align="start|end" label />
 * item: {label, to | href | onClick, icon, note, danger, divider}
 * A real menu: arrow keys move, Home/End jump, Esc closes and returns focus, Tab closes.
 * Rendered in a portal so it is never clipped by a bar or a card.
 */
export function Menu({ trigger, items, align = 'start', label, className, width = 260 }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const w = Math.min(width, window.innerWidth - 16)
    let left = align === 'end' ? r.right - w : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    setPos({ top: r.bottom + 8, left, width: w })
  }
  useLayoutEffect(() => {
    if (open) place()
  }, [open])
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (listRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onWin = () => place()
    document.addEventListener('pointerdown', onDoc)
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    const t = setTimeout(() => listRef.current?.querySelector('[role="menuitem"]')?.focus(), 10)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDoc)
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) btnRef.current?.focus()
  }
  const onKeyDown = (e) => {
    const els = [...listRef.current.querySelectorAll('[role="menuitem"]')]
    const i = els.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); els[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
  }

  const triggerProps = {
    ref: btnRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: () => setOpen((o) => !o),
    onKeyDown: (e) => {
      if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) }
    },
  }

  return (
    <>
      {trigger(triggerProps, open)}
      {open && pos
        ? createPortal(
            <div
              ref={listRef}
              id={id}
              role="menu"
              aria-label={label}
              className={cx(s.menu, className)}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onKeyDown={onKeyDown}
              data-ui="menu"
            >
              {items.filter(Boolean).map((it, i) =>
                it.divider ? (
                  <div key={`d${i}`} role="separator" className={s.divider} />
                ) : (
                  <MenuItem key={it.label} item={it} onDone={() => close(false)} />
                ),
              )}
            </div>,
            overlayRoot(),
          )
        : null}
    </>
  )
}

function MenuItem({ item, onDone }) {
  const body = (
    <>
      {item.icon ? <Icon name={item.icon} size={20} /> : <span className={s.noicon} />}
      <span className={s.labels}>
        <span>{item.label}</span>
        {item.note ? <span className={s.note}>{item.note}</span> : null}
      </span>
    </>
  )
  const cls = cx(s.item, item.danger && s.danger)
  const click = (e) => {
    item.onClick?.(e)
    onDone()
  }
  if (item.to) return <Link role="menuitem" tabIndex={-1} to={item.to} className={cls} onClick={click}>{body}</Link>
  if (item.href) return <a role="menuitem" tabIndex={-1} href={item.href} className={cls} onClick={click}>{body}</a>
  return <button role="menuitem" tabIndex={-1} type="button" className={cls} onClick={click}>{body}</button>
}

/** Items rendered as a plain list (for a phone Sheet showing the same entries). */
export function MenuList({ items, onDone }) {
  return (
    <div className={s.list} role="list">
      {items.filter(Boolean).map((it, i) =>
        it.divider ? <div key={`d${i}`} className={s.divider} /> : <div role="listitem" key={it.label}><ListItem item={it} onDone={onDone} /></div>,
      )}
    </div>
  )
}
function ListItem({ item, onDone }) {
  const body = (
    <>
      {item.icon ? <Icon name={item.icon} size={22} /> : <span className={s.noicon} />}
      <span className={s.labels}>
        <span>{item.label}</span>
        {item.note ? <span className={s.note}>{item.note}</span> : null}
      </span>
      <Icon name="chevron-right" size={18} className={s.chev} />
    </>
  )
  const cls = cx(s.item, s.big, item.danger && s.danger)
  const click = (e) => {
    item.onClick?.(e)
    onDone?.()
  }
  if (item.to) return <Link to={item.to} className={cls} onClick={click}>{body}</Link>
  if (item.href) return <a href={item.href} className={cls} onClick={click}>{body}</a>
  return <button type="button" className={cls} onClick={click}>{body}</button>
}
