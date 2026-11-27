// TEMPORARY, with ui/Root.jsx's light lock (until the new look has its own dark mode): the
// classic Settings page (pages/Preferences.jsx) opens on its Appearance tab, a Dark/Light
// choice that has no effect in the new look. While the new look shows /settings, hide that
// tab and open the next one instead. Preferences.jsx is classic code and stays untouched, so
// this finds the tab by its words in the page's tab row, never by a hashed class name.
import { useLayoutEffect } from 'react'

const LABEL = 'Appearance'

function tidy(main) {
  for (const tab of main.querySelectorAll('button')) {
    if (tab.textContent.trim() !== LABEL) continue
    const others = [...(tab.parentElement?.children || [])].filter((x) => x !== tab && x.tagName === 'BUTTON')
    if (!others.length) continue // not the tab row
    if (tab.style.display !== 'none') tab.style.display = 'none'
    // the selected tab carries one class more than the rest (navItem + activeNavItem)
    const selected = others.every((o) => tab.classList.length > o.classList.length)
    if (selected) others[0].click()
  }
}

/** While `on`, keep the Appearance tab of the classic Settings page hidden and unselected. */
export function useHideAppearance(on) {
  useLayoutEffect(() => {
    if (!on) return
    const main = document.getElementById('ofsa-main')
    if (!main || typeof MutationObserver === 'undefined') return
    tidy(main)
    const mo = new MutationObserver(() => tidy(main))
    mo.observe(main, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [on])
}
