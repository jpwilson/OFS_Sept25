// Seam for `./pages/ResetPassword` in src/App.jsx (owner: AUTH). /reset-password
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/ResetPassword.jsx'))
const Page = lazy(() => import('../auth/pages/ResetPage.jsx'))

export default function ResetPassword(props) {
  return (
    <AuthSeam name="Choose a new password" returning classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
