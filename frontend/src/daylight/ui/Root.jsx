import { createContext, useContext, useEffect } from 'react'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/compat.css'

const Nested = createContext(false)

let holders = 0
let savedThemeColor = null
let releaseTheme = null

/**
 * TEMPORARY, until the new look has its own dark mode (planned separately): keep
 * <html data-theme="light"> while the new look is on screen. AuthContext.jsx and the classic
 * Settings page set data-theme from the account's saved theme, which turned the pages not yet
 * redesigned (billing, settings, notifications, tags, sharing, the family tree, admin) dark
 * under the light app bar. The saved preference is left alone; the latest theme the app asked
 * for is put back when the last Root unmounts (a switch to the classic look).
 */
function holdLightTheme() {
  const html = document.documentElement
  let wanted = html.getAttribute('data-theme')
  const force = () => {
    const now = html.getAttribute('data-theme')
    if (now === 'light') return
    wanted = now
    html.setAttribute('data-theme', 'light')
  }
  force()
  const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(force)
  mo?.observe(html, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    mo?.disconnect()
    if (wanted == null) html.removeAttribute('data-theme')
    else html.setAttribute('data-theme', wanted)
  }
}

/** html.ofsa-on, a light data-theme and a paper theme colour while at least one Root is mounted. */
function holdPageLook() {
  const html = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  if (holders++ === 0) {
    html.classList.add('ofsa-on')
    releaseTheme = holdLightTheme()
    savedThemeColor = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', '#F4F7FB')
  }
  return () => {
    if (--holders > 0) return
    html.classList.remove('ofsa-on')
    releaseTheme?.()
    releaseTheme = null
    if (meta && savedThemeColor != null) meta.setAttribute('content', savedThemeColor)
  }
}

/**
 * <Root> wraps every Daylight screen: the .ofsa scope (tokens, base styles, the classic
 * bridge) and html.ofsa-on (page background, light colour scheme) while mounted.
 * Nested Roots render their children only, so a seam and the Shell can both use it.
 */
export function Root({ children, className }) {
  const nested = useContext(Nested)
  useEffect(() => {
    if (nested) return
    return holdPageLook()
  }, [nested])
  if (nested) return children
  return (
    <Nested.Provider value={true}>
      <div className={`ofsa${className ? ` ${className}` : ''}`} data-ofsa-root="">
        {children}
      </div>
    </Nested.Provider>
  )
}
