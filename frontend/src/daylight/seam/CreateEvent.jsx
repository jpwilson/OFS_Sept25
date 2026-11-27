// Seam for `./pages/CreateEvent` in src/App.jsx (owner: F0).
// /create?from=photos is the new photo flow; plain /create ("Write it yourself") is the
// classic editor, unchanged, inside the new shell.
import { lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/CreateEvent.jsx'))
const NewStoryPage = lazy(() => import('../create/NewStoryPage.jsx'))

export default function CreateEvent(props) {
  const look = useLook()
  const [sp] = useSearchParams()
  if (look === 'classic' || sp.get('from') !== 'photos') return <ClassicPage><Classic {...props} /></ClassicPage>
  return <DaylightPage pkg="create" name="New story from photos"><NewStoryPage {...props} /></DaylightPage>
}
