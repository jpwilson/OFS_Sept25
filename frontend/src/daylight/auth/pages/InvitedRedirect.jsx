// /signup/invited?token= (owner: AUTH). The older invitation address: sent on to /join/:token,
// whose page views are already masked (PLAN-AUTH section 3). With no token, to sign-up.
import { Navigate, useSearchParams } from 'react-router-dom'

export default function InvitedRedirect() {
  const [params] = useSearchParams()
  const token = params.get('token') || params.get('invite')
  return <Navigate to={token ? `/join/${encodeURIComponent(token)}` : '/login?signup=true'} replace />
}
