// Seam for `./pages/Profile` in src/App.jsx (owner: F0). /profile/:username (FEED owns the page).
import { lazy } from 'react'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/Profile.jsx'))
const ProfilePage = lazy(() => import('../profile/ProfilePage.jsx'))

export default function Profile(props) {
  const look = useLook()
  if (look === 'classic') return <ClassicPage><Classic {...props} /></ClassicPage>
  return <DaylightPage pkg="feed" name="Profile"><ProfilePage {...props} /></DaylightPage>
}
