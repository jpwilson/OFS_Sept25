// Seam for `./pages/Feed` in src/App.jsx (owner: F0). /feed, and /feed?view=map (the world map).
import { lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/Feed.jsx'))
const FeedPage = lazy(() => import('../feed/FeedPage.jsx'))
const WorldPage = lazy(() => import('../map/WorldPage.jsx'))

export default function Feed(props) {
  const look = useLook()
  const [sp] = useSearchParams()
  if (look === 'classic') return <ClassicPage><Classic {...props} /></ClassicPage>
  if (sp.get('view') === 'map') return <DaylightPage pkg="map" name="World map"><WorldPage {...props} /></DaylightPage>
  return <DaylightPage pkg="feed" name="Stories"><FeedPage {...props} /></DaylightPage>
}
