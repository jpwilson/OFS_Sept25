// Helpers for the six seam files (owner: F0). A seam picks classic or Daylight with
// useLook(), isolates packages with ?only=, and catches a Daylight page that throws so a
// real user is never left on a blank screen.
import { Component, Suspense } from 'react'
import { setLook } from '../lib/look.js'
import { useOnly, blockedBy } from '../dev/only.js'
import { Root } from '../ui/Root.jsx'
import { Stub } from '../ui/Stub.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

class PageBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error(`[daylight] ${this.props.pkg} page failed`, error, info?.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="a-wrap" style={{ paddingBlock: 32 }}>
        <EmptyState
          tone="error"
          icon="warning"
          title="This page did not load."
          body="Something went wrong on our side. You can try again, or switch to the previous look for now."
          action={
            <>
              <Button onClick={() => this.setState({ error: null })}>Try again</Button>
              <Button variant="ghost" onClick={() => setLook('classic')}>Use the previous look</Button>
            </>
          }
        />
      </div>
    )
  }
}

export function PageSkeleton() {
  return (
    <div className="a-wrap" style={{ paddingBlock: 24, display: 'grid', gap: 16 }} aria-busy="true">
      <Skeleton w="40%" h={36} r={10} />
      <Skeleton h={220} r={20} />
      <Skeleton w="70%" h={18} />
    </div>
  )
}

/** Renders a Daylight page for `pkg`, wrapped in Root, a boundary and Suspense. */
export function DaylightPage({ pkg, name, children }) {
  const only = useOnly()
  return (
    <Root>
      <PageBoundary pkg={pkg}>
        {blockedBy(only, pkg) ? (
          <div className="a-wrap" style={{ paddingBlock: 24 }}>
            <Stub pkg={pkg} name={name} note={`Hidden by ?only=${only}. Open ?only=all to see every package.`} />
          </div>
        ) : (
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        )}
      </PageBoundary>
    </Root>
  )
}

export function ClassicPage({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
