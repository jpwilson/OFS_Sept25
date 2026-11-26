// /import, "Find stories in a big batch" (stub by F0; CREATE owns this file).
// Until CREATE restyles it, the classic Smart Import runs inside the new shell.
import { lazy, Suspense } from 'react'
import { Stub } from '../ui/Stub.jsx'

const ClassicImport = lazy(() => import('../../pages/SmartImport.jsx'))

export default function ImportPage() {
  return (
    <>
      <div className="a-wrap" style={{ paddingTop: 16 }}>
        <Stub pkg="create" name="Smart Import" note="Stub: the classic Smart Import below, inside the new shell. CREATE restyles it and adds Combine into one story." />
      </div>
      <Suspense fallback={null}>
        <ClassicImport />
      </Suspense>
    </>
  )
}
