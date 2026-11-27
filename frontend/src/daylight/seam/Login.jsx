// Seam for `./pages/Login` in src/App.jsx (owner: AUTH). /login and /login?signup=true
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/Login.jsx'))
const Page = lazy(() => import('../auth/pages/LoginPage.jsx'))

export default function Login(props) {
  return (
    <AuthSeam name="Log in or start free" classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
