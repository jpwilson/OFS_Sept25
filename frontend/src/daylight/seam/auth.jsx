// Helpers for the six sign-in seams (owner: AUTH, docs/app/AUTH.md decision 2).
// Daylight when the look is Daylight. The two return pages (/auth/callback and
// /reset-password) are also Daylight whenever a sign-in started in Daylight is still
// pending, so someone who left for Google always comes back to a page that understands it.
// "Use the previous sign-in page" (the boundary's escape) switches only these pages, for
// this tab, and leaves the rest of the app as it is.
import { useSyncExternalStore } from 'react'
import { useLook } from '../lib/look.js'
import { hasPending } from '../auth/lib/intent.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const CLASSIC_KEY = 'ofs.auth.classic'
const subs = new Set()
function readClassic() {
  try {
    return sessionStorage.getItem(CLASSIC_KEY) === '1'
  } catch {
    return false
  }
}
function useAuthClassic() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    readClassic,
    () => false,
  )
}
function usePreviousSignIn() {
  try {
    sessionStorage.setItem(CLASSIC_KEY, '1')
  } catch {
    /* private mode: this page load only */
  }
  subs.forEach((f) => f())
}

/** returning: true for the pages Google and email links come back to. */
export function AuthSeam({ name, classic, children, returning = false }) {
  const look = useLook()
  const forcedClassic = useAuthClassic()
  const daylight = !forcedClassic && (look === 'daylight' || (returning && hasPending()))
  if (!daylight) return <ClassicPage>{classic}</ClassicPage>
  return (
    <DaylightPage
      pkg="auth"
      name={name}
      fallbackLabel="Use the previous sign-in page"
      fallbackBody="Something went wrong on our side. You can try again, or use the previous sign-in page for now."
      onFallback={usePreviousSignIn}
    >
      {children}
    </DaylightPage>
  )
}
