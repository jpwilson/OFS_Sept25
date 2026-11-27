// Standalone landing boot (owner: F0). main.jsx imports this when <html data-boot="landing">.
// Hydrates the prerendered page, or renders it when #root is empty (dev server).
// If anything throws, the static server-rendered HTML is put back: it is complete,
// styled and every link works, so a visitor is never left with an empty page.
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import Page from './Page.jsx'

const el = document.getElementById('root')
const only = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('only') : null

if (import.meta.env.DEV && only) {
  import('./dev/Only.jsx').then(({ Only }) => {
    createRoot(el).render(
      <StrictMode>
        <Only pkg={only} />
      </StrictMode>,
    )
  })
} else {
  const ssr = el.querySelector(':scope > [data-ofsl]')
  const saved = ssr ? el.innerHTML : null
  let root = null
  let restored = false

  const restore = (err) => {
    if (restored) return
    restored = true
    console.error('[landing] falling back to the static page', err)
    queueMicrotask(() => {
      try {
        root && root.unmount()
      } catch {
        /* already gone */
      }
      document.documentElement.classList.remove('ofsl-on')
      if (saved != null) el.innerHTML = saved
    })
  }

  const app = (
    <StrictMode>
      <Page onFatal={saved != null ? restore : undefined} />
    </StrictMode>
  )

  if (ssr) {
    root = hydrateRoot(el, app, {
      onRecoverableError(err) {
        // A hydration mismatch: React re-renders on the client and carries on. Say so,
        // so builders see it in shots (scripts/landing/shots.mjs prints console output).
        console.warn('[landing] hydration mismatch', err && err.message)
      },
      onUncaughtError: restore,
    })
  } else {
    root = createRoot(el, { onUncaughtError: (err) => console.error('[landing] page crashed', err) })
    root.render(app)
  }
}
