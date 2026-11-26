// The world map page, /feed?view=map (stub by F0; MAP owns this file).
// Defaults to "People I follow and me" (SPEC decision 9) once MAP builds the filters.
import { useEffect, useState } from 'react'
import { useFeed } from '../lib/data.js'
import { Head } from '../ui/Head.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { Stub } from '../ui/Stub.jsx'
import WorldMap from './WorldMap.jsx'

export default function WorldPage() {
  const { events, loading, error, refresh, loadAll } = useFeed()
  const [sel, setSel] = useState(null)
  useEffect(() => {
    loadAll()
  }, [loadAll])
  return (
    <div className="a-wrap" style={{ paddingBlock: 20, display: 'grid', gap: 16 }} data-wash="azure">
      <Head as="h1" before="Your family's" mark="map" after="." />
      <Stub pkg="map" name="World map" note="The globe, pins, clusters and the phone sheet arrive with MAP. This stub is the static level: a Places list." />
      {error ? (
        <EmptyState tone="error" icon="warning" title="The stories did not load." body={error.message} action={<Button onClick={refresh}>Retry</Button>} />
      ) : loading && !events.length ? (
        <Loading label="Loading stories"><Skeleton h={300} r={20} /></Loading>
      ) : (
        <WorldMap events={events} selectedId={sel} onSelect={setSel} />
      )}
    </div>
  )
}
