// The wash a sign-in route paints first (owner: AUTH). While a sign-in page's code is still
// loading, the seam fills the screen with this colour instead of a grey skeleton, so the page
// arrives on its own wall. Kept small and free of the pages' code: the seams import it.
// The colours match stage/scenes.js (login tide, start free sun, reset azure, invitation lime,
// demo violet); the page Google or an email link returns to keeps the wash of the page it left.
import { readPending } from './intent.js'

export function authWashFor(pathname = '', search = '') {
  if (pathname.startsWith('/reset-password')) return 'azure'
  if (pathname.startsWith('/join/') || pathname.startsWith('/signup/invited')) return 'lime'
  if (pathname.startsWith('/demo-login')) return 'violet'
  if (pathname.startsWith('/auth/callback')) return readPending()?.wash || 'tide'
  if (pathname.startsWith('/login') && /(^|[?&])signup=true(&|$)/.test(search)) return 'sun'
  return 'tide'
}
