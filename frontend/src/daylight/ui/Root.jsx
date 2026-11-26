import { createContext, useContext, useEffect } from 'react'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/compat.css'

const Nested = createContext(false)

let holders = 0
let savedThemeColor = null
/** html.ofsa-on and a paper theme colour while at least one Root is mounted. */
function holdPageLook() {
  const html = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  if (holders++ === 0) {
    html.classList.add('ofsa-on')
    savedThemeColor = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', '#F4F7FB')
  }
  return () => {
    if (--holders > 0) return
    html.classList.remove('ofsa-on')
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
