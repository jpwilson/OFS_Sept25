// Seam for `./pages/InviteLanding` in src/App.jsx (owner: AUTH). /join/:token
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/InviteLanding.jsx'))
const Page = lazy(() => import('../auth/pages/InvitePage.jsx'))

export default function InviteLanding(props) {
  return (
    <AuthSeam name="Invitation" classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
