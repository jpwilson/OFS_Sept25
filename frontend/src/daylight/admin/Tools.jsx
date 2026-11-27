// The Tools tab (owner: ADMIN): the classic admin dashboard, loaded only when this tab
// opens. It keeps the stats, the demo password, the AI model and the links to Users, Events
// and Feedback; the classic admin routes (/admin/users and so on) are unchanged.
import { lazy } from 'react'
import s from './AdminPage.module.css'

const ClassicDashboard = lazy(() => import('../../pages/AdminDashboard.jsx'))

export default function Tools() {
  return (
    <section className={s.tools} aria-label="Tools" data-ui="admin-tools">
      <ClassicDashboard />
    </section>
  )
}
