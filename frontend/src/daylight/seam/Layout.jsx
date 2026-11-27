// Seam for `./components/Layout` in src/App.jsx (owner: F0). The layout route: the new
// Shell in Daylight, today's Layout in classic (plus a small "new look" offer).
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyLookQuery, useLook } from '../lib/look.js'
import { ONLY_ENABLED, useOnly } from '../dev/only.js'
import LookOffer from './LookOffer.jsx'
import { rememberPath } from '../auth/lib/intent.js'

const ClassicLayout = lazy(() => import('../../components/Layout.jsx'))
const Shell = lazy(() => import('../shell/Shell.jsx'))
const UiSheet = ONLY_ENABLED ? lazy(() => import('../dev/UiSheet.jsx')) : null
const MapSpike = ONLY_ENABLED ? lazy(() => import('../map/Spike.jsx')) : null

export default function Layout() {
  const look = useLook()
  const loc = useLocation()
  const only = useOnly()
  // The last in-app path, so the sign-in page can send a signed-in person back to it when a
  // page bounced them there on a direct load (docs/app/AUTH.md decision 7). A layout effect
  // runs before the page's own effects, so a bounce cannot get in first.
  useLayoutEffect(() => {
    rememberPath(loc.pathname + loc.search + loc.hash)
  }, [loc.pathname, loc.search, loc.hash])
  // ?look= on any in-app navigation, not only the first page load
  useEffect(() => {
    applyLookQuery(loc.search)
  }, [loc.search])
  if (look === 'classic') {
    return (
      <>
        <Suspense fallback={null}>
          <ClassicLayout />
        </Suspense>
        <LookOffer />
      </>
    )
  }
  const override = only === 'ui' && UiSheet ? <UiSheet /> : only === 'spike' && MapSpike ? <MapSpike /> : null
  return (
    <Suspense fallback={null}>
      <Shell override={override} />
    </Suspense>
  )
}
