// Seam for `./pages/EventDetail` in src/App.jsx (owner: F0). /event/:id, and /share/:token
// (isShareMode, outside the Layout route, so the page wraps itself in Root).
import { lazy } from 'react'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/EventDetail.jsx'))
const StoryPage = lazy(() => import('../story/StoryPage.jsx'))

export default function EventDetail(props) {
  const look = useLook()
  if (look === 'classic') return <ClassicPage><Classic {...props} /></ClassicPage>
  return <DaylightPage pkg="story" name="Story"><StoryPage {...props} /></DaylightPage>
}
