// The landing's frame around a marketing page (owner: pages; story variant only).
//
// Draws the landing's nav (signed-out visitors) and footer, loads the landing's fonts and
// tokens, puts the page on the light paper ground, and hands the page's look to its
// stylesheet as CSS variables: the wash (data-wash) and the cut-out (--ph-art, looked up by
// id in the art manifest), which the page head draws standing on its floor.
//
// It runs inside the app (react-router, AuthContext), never on its own.
import { useLayoutEffect } from 'react'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import './css/shared.css'
import { useAuth } from '../../context/AuthContext'
import { Nav } from '../close/Nav.jsx'
import { Footer } from '../close/Footer.jsx'
import { maybeArt } from '../art/manifest.js'
import { claimChrome } from './chrome.js'
import { LOOK } from './look.js'
import s from './Frame.module.css'

/** A session hint in storage (same test as the boot script in index.html). */
function sessionHint() {
  try {
    const ls = window.localStorage
    if (ls.getItem('token')) return true
    for (let i = 0; i < ls.length; i++) if (/^sb-.*-auth-token$/.test(ls.key(i) || '')) return true
  } catch {
    return false
  }
  return false
}

/** CSS variables for the page head's cut-out. */
export function artVars(id) {
  const a = id ? maybeArt(id) : null
  if (!a) return undefined
  return {
    '--ph-art': `url("${a.src}")`,
    '--ph-ar': String(Math.round((a.w / a.h) * 1000) / 1000),
    '--ph-ax': String(a.ax),
  }
}

/**
 * path: the page's key in LOOK (its wash and cut-out).
 * standalone: a route outside the app Layout (privacy, terms, contact), which has its own
 * small logo bar; signed-out visitors get the landing nav in its place.
 */
export function Frame({ path, standalone, children }) {
  const { user, loading } = useAuth()
  const look = LOOK[path] || { wash: 'tide' }
  const showNav = !user && !(loading && sessionHint())

  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('ofsl-on')
    const release = claimChrome()
    return () => {
      html.classList.remove('ofsl-on')
      release()
    }
  }, [])

  return (
    <div
      className={`ofsl ${s.frame}`}
      data-nav={showNav ? '' : undefined}
      data-standalone={standalone ? '' : undefined}
      data-art={look.art ? '' : undefined}
      data-art-small={look.small ? '' : undefined}
      style={artVars(look.art)}
    >
      <div className={s.wash} data-wash={look.wash}>
        {showNav ? <Nav base="/" /> : null}
        <div className={s.page}>{children}</div>
        <Footer />
      </div>
    </div>
  )
}
