// The admin page, /admin (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Page".
// Did anyone visit, sign up or sign in? Overview (the default) answers that; Members lists
// everyone with filters; Tools is the classic dashboard (stats, demo password, AI model,
// links to Users, Events and Feedback). Phone first: the owner reads it on an iPhone.
// URL: ?range=7d&interval=day&tab=members&sort=last_active (never the search text).
// One load makes at most three requests: overview and visitors at once, and members only
// when its tab or the Recent members card is on screen. No polling: a refresh button, and
// one refetch when the tab comes back after more than five minutes.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDesktop } from '../lib/capability.js'
import { Head } from '../ui/Head.jsx'
import { Button } from '../ui/Button.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { cx } from '../ui/cx.js'
import { getOverview, getVisitors, useResource } from './api.js'
import { INTERVAL_LABEL, RANGES, intervalFor, intervalsFor, readQuery, storeRange, storedRange, writeQuery } from './query.js'
import { asOf } from './time.js'
import Overview from './Overview.jsx'
import Members from './Members.jsx'
import s from './AdminPage.module.css'

const Tools = lazy(() => import('./Tools.jsx'))
const STALE_MS = 5 * 60 * 1000
const TAB_OPTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'members', label: 'Members' },
  { value: 'tools', label: 'Tools' },
]

export default function AdminPage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const desktop = useDesktop()
  const [stored] = useState(storedRange)
  const q = readQuery(loc.search, stored)
  const set = (patch) => {
    const next = { ...q, ...patch }
    if (patch.range) {
      next.interval = intervalFor(patch.range, patch.interval ?? q.interval)
      storeRange(patch.range)
    }
    navigate({ search: writeQuery(next, loc.search) }, { replace: true })
  }

  // refresh: one counter for every request on the page
  const [nonce, setNonce] = useState(0)
  const onOverview = q.tab === 'overview'
  const key = `${q.range}|${q.interval}|${nonce}`
  const overview = useResource(onOverview ? key : null, (signal) => getOverview(q, signal))
  const visitors = useResource(onOverview ? key : null, (signal) => getVisitors(q, signal))
  const loadedAt = useRef(0)
  if (overview.at) loadedAt.current = overview.at
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && loadedAt.current && Date.now() - loadedAt.current > STALE_MS) setNonce((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const busy = onOverview && (overview.loading || visitors.loading)
  const stamp = overview.data?.generated_at ? `As of ${asOf(overview.data.generated_at)}` : busy ? 'Counting…' : ''
  const ranges = (
    <Segmented
      label="Range"
      size="sm"
      full={!desktop}
      value={q.range}
      onChange={(v) => set({ range: v })}
      options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
      className={s.rangeSeg}
    />
  )
  const intervals = (
    <Segmented
      label="Each bar is"
      size="sm"
      value={q.interval}
      onChange={(v) => set({ interval: v })}
      options={intervalsFor(q.range).map((i) => ({ value: i, label: INTERVAL_LABEL[i] }))}
    />
  )

  const refresh = (
    <Button variant="ghost" size="sm" busy={busy} onClick={() => setNonce((n) => n + 1)} className={s.refresh} data-ui="admin-refresh">
      Refresh
    </Button>
  )
  const stampEl = <p className={s.stamp} aria-live="polite" data-ui="admin-stamp">{stamp || '\u00a0'}</p>
  const tabs = <Segmented label="Admin section" size="sm" value={q.tab} onChange={(v) => set({ tab: v })} options={TAB_OPTIONS} className={s.tabs} />

  return (
    <div className={cx('a-wrap', s.page)} data-ui="admin-page" data-tab={q.tab}>
      <header className={s.header}>
        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <Head as="h1" size="page" before="Admin" />
            {desktop ? stampEl : null}
          </div>
          {desktop ? (
            onOverview ? (
              <div className={s.controls}>
                {ranges}
                {intervals}
                {refresh}
              </div>
            ) : null
          ) : (
            tabs
          )}
        </div>
        {desktop ? tabs : null}
        {!desktop && onOverview ? (
          <div className={s.phoneControls}>
            {ranges}
            <div className={s.subRow}>
              {intervals}
              {stampEl}
              {refresh}
            </div>
          </div>
        ) : null}
      </header>

      {q.tab === 'overview' ? (
        <Overview q={q} overview={overview} visitors={visitors} nonce={nonce} onRetry={() => setNonce((n) => n + 1)} onTab={(tab, patch) => set({ tab, ...patch })} />
      ) : q.tab === 'members' ? (
        <Members q={q} onSort={(sort, order) => set({ sort, order })} />
      ) : (
        <Suspense fallback={<Skeleton h={320} r={20} />}>
          <Tools />
        </Suspense>
      )}
    </div>
  )
}
