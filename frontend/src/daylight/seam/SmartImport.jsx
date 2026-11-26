// Seam for `./pages/SmartImport` in src/App.jsx (owner: F0). /import ("Find stories in a big batch").
import { lazy } from 'react'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/SmartImport.jsx'))
const ImportPage = lazy(() => import('../create/ImportPage.jsx'))

export default function SmartImport(props) {
  const look = useLook()
  if (look === 'classic') return <ClassicPage><Classic {...props} /></ClassicPage>
  return <DaylightPage pkg="create" name="Find stories in a big batch"><ImportPage {...props} /></DaylightPage>
}
