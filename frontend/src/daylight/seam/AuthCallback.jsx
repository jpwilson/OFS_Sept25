// Seam for `./pages/AuthCallback` in src/App.jsx (owner: AUTH). /auth/callback
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/AuthCallback.jsx'))
const Page = lazy(() => import('../auth/pages/CallbackPage.jsx'))

export default function AuthCallback(props) {
  return (
    <AuthSeam name="Returning from Google or an email link" returning classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
