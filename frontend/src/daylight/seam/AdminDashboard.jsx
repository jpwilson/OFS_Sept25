// Seam for `./pages/AdminDashboard` in src/App.jsx (owner: F0). /admin, superuser only
// (App.jsx's SuperuserRoute still guards it). docs/app/ADMIN-ANALYTICS.md "Page".
import { lazy } from 'react'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/AdminDashboard.jsx'))
const AdminPage = lazy(() => import('../admin/AdminPage.jsx'))

export default function AdminDashboard(props) {
  const look = useLook()
  if (look === 'classic') return <ClassicPage><Classic {...props} /></ClassicPage>
  return <DaylightPage pkg="admin" name="Admin"><AdminPage {...props} /></DaylightPage>
}
