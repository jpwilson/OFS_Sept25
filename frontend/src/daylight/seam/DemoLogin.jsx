// Seam for `./pages/DemoLogin` in src/App.jsx (owner: AUTH). /demo-login
import { lazy } from 'react'
import { AuthSeam } from './auth.jsx'

const Classic = lazy(() => import('../../pages/DemoLogin.jsx'))
const Page = lazy(() => import('../auth/pages/DemoPage.jsx'))

export default function DemoLogin(props) {
  return (
    <AuthSeam name="Investor demo" classic={<Classic {...props} />}>
      <Page {...props} />
    </AuthSeam>
  )
}
