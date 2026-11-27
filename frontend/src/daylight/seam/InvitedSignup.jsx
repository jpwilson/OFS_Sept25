// Seam for `./pages/InvitedSignup` in src/App.jsx (owner: AUTH). /signup/invited?token= (sends on to /join/:token)
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/InvitedSignup.jsx'))
const Page = lazy(() => import('../auth/pages/InvitedRedirect.jsx'))

export default function InvitedSignup(props) {
  return (
    <AuthSeam name="Invitation" classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
