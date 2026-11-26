import { useEffect, useRef, useState } from 'react'
import { NAV } from '../content/close.js'
import { ROUTES } from '../content/routes.js'
import { scrollToId, scrollToY, setScrollLocked } from '../lib/scroll.js'
import { track } from '../lib/analytics.js'
import { Button, Icon, useFrame } from '../ui/index.js'
import { Wordmark } from './Wordmark.jsx'
import s from './Nav.module.css'

/** A plain in-page link that glides when script is on and jumps when it is not. */
function glide(e, id, after) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  if (after) after()
  // Let a scroll lock release before gliding.
  requestAnimationFrame(() => scrollToId(id))
  if (history.replaceState) history.replaceState(null, '', `#${id}`)
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** base: prefix for the section links ('/' on the other marketing pages, so they lead to the landing's sections). */
export function Nav({ base = '' }) {
  const bar = useRef(null)
  const menuBtn = useRef(null)
  const closeBtn = useRef(null)
  const [open, setOpen] = useState(false)
  const st = useRef({ y: 0, hidden: false, open: false })
  st.current.open = open

  // Hide on the way down, return on the way up; always shown inside the first screen.
  useFrame(({ scrollY, vh }) => {
    const m = st.current
    const dy = scrollY - m.y
    if (Math.abs(dy) < 6 && scrollY > vh * 0.9) return
    m.y = scrollY
    const hide = !m.open && scrollY > vh * 0.9 && dy > 0
    if (hide !== m.hidden && bar.current) {
      if (hide && bar.current.contains(document.activeElement)) return // never hide what has focus
      m.hidden = hide
      bar.current.toggleAttribute('data-hidden', hide)
    }
  })

  useEffect(() => {
    if (!open) return
    setScrollLocked(true)
    closeBtn.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const btn = menuBtn.current
    return () => {
      setScrollLocked(false)
      window.removeEventListener('keydown', onKey)
      btn?.focus()
    }
  }, [open])

  const toTop = (e) => {
    if (window.location.pathname !== '/' || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    setOpen(false)
    scrollToY(0)
  }
  const cta = (where) => () => track('landing_cta', { where })

  return (
    <>
      <header ref={bar} className={s.bar}>
        <nav className={s.nav} aria-label="Main">
          <a className={s.home} href={ROUTES.home} onClick={toTop} aria-label="Our Family Socials, back to the top">
            <Wordmark short />
          </a>
          <ul className={s.links}>
            {NAV.links.map((l) => (
              <li key={l.id}>
                <a href={`${base}#${l.id}`} onClick={(e) => glide(e, l.id)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className={s.right}>
            <a className={s.login} href={ROUTES.login}>
              {NAV.login}
            </a>
            <Button className={s.start} href={ROUTES.signup} onClick={cta('nav')}>
              {NAV.start}
            </Button>
            <button
              ref={menuBtn}
              type="button"
              className={s.menuBtn}
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="lp-menu"
              aria-label="Open the menu"
            >
              <MenuIcon />
            </button>
          </div>
        </nav>
      </header>

      <div className={s.scrim} data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        id="lp-menu"
        className={s.sheet}
        data-open={open || undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
      >
        <div className={s.sheetTop}>
          <Wordmark />
          <button ref={closeBtn} type="button" className={s.close} onClick={() => setOpen(false)}>
            <Icon name="close" size={18} />
            {NAV.close}
          </button>
        </div>
        <ol className={s.sheetLinks}>
          {NAV.links.map((l, i) => (
            <li key={l.id} style={{ '--i': i }}>
              <a href={`${base}#${l.id}`} onClick={(e) => glide(e, l.id, () => setOpen(false))}>
                <span className={s.chip} aria-hidden="true" />
                <span className={s.linkText}>{l.label}</span>
                <Icon name="arrow" size={22} />
              </a>
            </li>
          ))}
        </ol>
        <div className={s.sheetFoot}>
          <Button size="lg" href={ROUTES.signup} onClick={cta('menu')} arrow>
            {NAV.start}
          </Button>
          <Button size="lg" variant="ghost" href={ROUTES.login}>
            {NAV.login}
          </Button>
          <p className="l-small">{NAV.menuNote}</p>
        </div>
      </div>
    </>
  )
}
