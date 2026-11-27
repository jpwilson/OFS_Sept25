// Seam for `./pages/FamilyTree` in src/App.jsx (owner: FAMILY). /family-tree.
// docs/app/FAMILY.md section 7: the classic page (and with it React Flow and html-to-image)
// is a lazy chunk reached only with ?look=classic; Daylight renders family/FamilyPage.jsx.
import { lazy } from 'react'
import { useLook } from '../lib/look.js'
import { ClassicPage, DaylightPage } from './shared.jsx'

const Classic = lazy(() => import('../../pages/FamilyTree.jsx'))
const FamilyPage = lazy(() => import('../family/FamilyPage.jsx'))

// The classic page's BETA tooltip sits off the right edge of a phone and widens the whole
// page; clipping sideways overflow here (vertical overflow stays visible) keeps the page
// still without editing the classic file. A classic build never loads this seam.
const CLIP = { overflowX: 'clip' }

export default function FamilyTree(props) {
  const look = useLook()
  if (look === 'classic') {
    return (
      <ClassicPage>
        <div style={CLIP}>
          <Classic {...props} />
        </div>
      </ClassicPage>
    )
  }
  return <DaylightPage pkg="family" name="Family tree"><FamilyPage {...props} /></DaylightPage>
}
