// The Stories page, /feed (owner: FEED). PLAN-DAYLIGHT 2.2 to 2.4.
// One page, three views (Feed, Calendar, Timeline; the map is the maps package's, through
// the seam at ?view=map), one Filter sheet, and the view and filters in the URL.
// Data: useFeed (GET /events, paged, cached per order) and usePeople (faces, muted).
// Nothing here is invented: a failure shows an honest error with Retry.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDesktop } from '../lib/capability.js'
import { useFeed, usePeople } from '../lib/data.js'
import { dateRange, plural } from '../lib/format.js'
import { STORIES_RESELECT } from '../shell/chrome.js'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import CalendarYear from './CalendarYear.jsx'
import FeedSkeleton from './FeedSkeleton.jsx'
import FilterSheet from './FilterSheet.jsx'
import Stream from './Stream.jsx'
import Timeline from './Timeline.jsx'
import { activeCount, applyQuery, categoriesIn, clearedFilters, useFeedQuery } from './query.js'
import s from './FeedPage.module.css'

const VIEW_OPTIONS = [
  { value: 'feed', label: 'Feed', icon: 'feed' },
  { value: 'calendar', label: 'Calendar', icon: 'calendar' },
  { value: 'timeline', label: 'Timeline', icon: 'timeline' },
]

/** The removable chips for every filter that is on (categories have their own row). */
function ActiveChips({ q, set, faceFor, me }) {
  const chips = []
  if (q.who !== 'all') chips.push({ key: 'who', label: q.who === 'mine' ? 'My stories' : 'People I follow', clear: { who: 'all' } })
  for (const u of q.people) chips.push({ key: `p:${u}`, label: u === me ? 'You' : faceFor(u).name, clear: { people: q.people.filter((x) => x !== u) } })
  if (q.from || q.to) {
    const label = q.from && q.to ? dateRange(q.from, q.to, { short: true }) : q.from ? `From ${dateRange(q.from, null, { short: true })}` : `Until ${dateRange(q.to, null, { short: true })}`
    chips.push({ key: 'dates', label, clear: { from: '', to: '' } })
  }
  if (q.order === 'posted') chips.push({ key: 'order', label: 'By date posted', clear: { order: 'happened' } })
  if (q.dir === 'old') chips.push({ key: 'dir', label: 'Oldest first', clear: { dir: 'new' } })
  return chips.map((c) => (
    <Chip key={c.key} selected onRemove={() => set(c.clear)} removeLabel={`Remove filter: ${c.label}`}>
      {c.label}
    </Chip>
  ))
}

function TrialEnded() {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <div className={s.notice} data-wash="sun" role="status" data-ui="trial-ended">
      <Icon name="lock" size={22} />
      <p className={s.noticeText}>
        <strong>Your free trial has ended.</strong> You can still open stories from people you follow, and any public story. A plan lets you publish and open everyone else's.
      </p>
      <Button size="sm" to="/billing">
        See plans
      </Button>
      <IconButton icon="close" label="Hide this" onClick={() => setGone(true)} />
    </div>
  )
}

export default function FeedPage() {
  const auth = useAuth() || {}
  const { user, loading: authLoading, canAccessContent, isTrialExpired, isExpired, isDemoAccount, demoEventIds = [] } = auth
  const navigate = useNavigate()
  const desktop = useDesktop()
  const [q, set] = useFeedQuery()
  const orderBy = q.order === 'posted' ? 'upload_date' : 'event_date'
  const { events, loading, error, hasMore, loadMore, refresh, loadAll } = useFeed({ orderBy })
  const people = usePeople()
  const { following, faceFor, refreshMuted } = people
  const me = user?.username
  const [sheet, setSheet] = useState(false)
  const [gate, setGate] = useState(null)
  const [loadingAll, setLoadingAll] = useState(false)

  // The feed needs an account, as today (Feed.jsx:51-55).
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/feed', message: 'Please sign in to view your feed' } })
  }, [authLoading, user, navigate])

  // Tapping Stories while on Stories: the shell scrolls to the top; we refetch.
  useEffect(() => {
    const on = () => refresh()
    window.addEventListener(STORIES_RESELECT, on)
    return () => window.removeEventListener(STORIES_RESELECT, on)
  }, [refresh])

  // Calendar and timeline need every story (to the 500 cap), not only the first page.
  useEffect(() => {
    if (q.view === 'feed' || !events.length || !hasMore) return
    let live = true
    setLoadingAll(true)
    loadAll().finally(() => live && setLoadingAll(false))
    return () => {
      live = false
    }
  }, [q.view, events.length > 0, hasMore, loadAll])

  const followingSet = useMemo(() => new Set(following.map((f) => f.username)), [following])
  const decorated = useMemo(() => {
    if (!isDemoAccount || !demoEventIds.length) return events
    return events.map((e) => (demoEventIds.includes(e.id) ? { ...e, __tags: ['Featured'] } : e))
  }, [events, isDemoAccount, demoEventIds])
  const items = useMemo(() => applyQuery(decorated, q, { me, followingSet }), [decorated, q, me, followingSet])
  const cats = useMemo(() => categoriesIn(events, q.cats), [events, q.cats])
  const nFilters = activeCount(q)

  // Without a plan or trial, a story from someone you do not follow does not open
  // (FeedView.jsx:72-89): say so instead of sending the reader to a refusal.
  const onOpen = useCallback(
    (e, ev) => {
      if (!user || canAccessContent !== false) return
      const own = e.author_username === me
      if (own || followingSet.has(e.author_username) || e.privacy_level === 'public') return
      ev.preventDefault()
      setGate(e)
    },
    [user, canAccessContent, me, followingSet],
  )

  // Feed view: load the next page as the end comes near.
  const sentinel = useRef(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || q.view !== 'feed' || !hasMore || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((xs) => xs.some((x) => x.isIntersecting) && loadMore(), { rootMargin: '900px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [q.view, hasMore, loadMore, items.length])

  const onMutedChanged = useCallback(async () => {
    await refreshMuted()
    await refresh()
  }, [refreshMuted, refresh])

  const toggleCat = (v) => set({ cats: q.cats.includes(v) ? q.cats.filter((x) => x !== v) : [...q.cats, v] })
  const setView = (v) => set({ view: v, month: null }, { push: true })

  const first = loading && !events.length
  const showControls = !error || events.length > 0
  const countLine = first
    ? 'Loading stories'
    : error && !events.length
      ? 'Not loaded'
    : !desktop
      ? `${plural(items.length, 'story', 'stories')}${hasMore ? ' so far' : ''}` // the order shows as a chip when it is not the default
      : `${plural(items.length, 'story', 'stories')}${hasMore ? ' so far' : ''} · ${q.order === 'posted' ? 'by the date posted' : 'by the date it happened'}`
  // phone: "List by" sits in the title row, so the first cover starts in the top third of the screen
  const phoneListBy = !desktop && q.view === 'feed' && showControls && !first && events.length > 0

  let body
  if (error && !events.length) {
    body = (
      <EmptyState
        tone="error"
        icon="warning"
        title="The stories did not load."
        body={error.status === 0 ? 'We could not reach Our Family Socials. Check your connection and try again.' : 'Something went wrong on our side. Nothing you made is lost; try again in a moment.'}
        action={<Button onClick={refresh}>Retry</Button>}
      />
    )
  } else if (first) {
    body = <FeedSkeleton view={q.view} />
  } else if (!events.length) {
    body = (
      <EmptyState
        wash="tide"
        icon="stories"
        before="Your family's year starts with"
        mark="one"
        after="story."
        body="Stories from you and the people you follow show up here, newest first. Pick the photos from a trip or a birthday and we will lay out the first draft."
        action={
          <>
            <Button to="/create?from=photos" icon="photos">Make one from photos</Button>
            <Button variant="ghost" to="/create">Write it yourself</Button>
          </>
        }
      />
    )
  } else if (!items.length) {
    body = (
      <EmptyState
        wash="paper"
        icon="filter"
        before="No stories match"
        mark="these"
        after="filters."
        body={hasMore ? 'Only the newest stories are loaded so far. Load more, or loosen the filters.' : 'Try fewer filters, or a wider date range.'}
        action={
          <>
            <Button onClick={() => set({ ...clearedFilters() })}>Clear filters</Button>
            {hasMore ? <Button variant="ghost" onClick={loadMore} busy={loading}>Load more stories</Button> : null}
          </>
        }
      />
    )
  } else if (q.view === 'calendar') {
    body = <CalendarYear events={items} q={q} set={set} faceFor={faceFor} onOpen={onOpen} loadingAll={loadingAll} />
  } else if (q.view === 'timeline') {
    body = <Timeline items={items} q={q} faceFor={faceFor} onOpen={onOpen} />
  } else {
    body = <Stream items={items} q={q} faceFor={faceFor} onOpen={onOpen} onOnlyCategory={(c) => set({ cats: [c], group: 'month' })} />
  }

  return (
    <div className={cx('a-wrap', s.page)} data-wash="tide" data-ui="feed-page" data-view={q.view}>
      {user && canAccessContent === false && (isTrialExpired || isExpired) ? <TrialEnded /> : null}

      <header className={s.header}>
        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <Head as="h1" size="page" before="Stories" />
            <p className={s.countLine} aria-live="polite">
              {countLine}
            </p>
          </div>
          {showControls ? (
            <div className={s.controls}>
              {desktop ? <Segmented label="View" value={q.view} onChange={setView} options={VIEW_OPTIONS} /> : null}
              {phoneListBy ? (
                <Segmented
                  label="List stories by"
                  size="sm"
                  value={q.group}
                  onChange={(v) => set({ group: v })}
                  options={[
                    { value: 'month', label: 'Month' },
                    { value: 'category', label: 'Category' },
                  ]}
                />
              ) : null}
              {desktop ? (
                <Button variant="ghost" icon="filter" onClick={() => setSheet(true)} aria-haspopup="dialog" data-ui="filter-button">
                  Filter{nFilters ? <span className={s.badge}>{nFilters}</span> : null}
                </Button>
              ) : (
                <IconButton icon="filter" label="Filter stories" variant="keyline" badge={nFilters || undefined} onClick={() => setSheet(true)} aria-haspopup="dialog" data-ui="filter-button" />
              )}
            </div>
          ) : null}
        </div>

        {showControls && !desktop ? <Segmented label="View" value={q.view} onChange={setView} options={VIEW_OPTIONS} full size="sm" className={s.viewSeg} /> : null}

        {showControls && !first && events.length ? (
          <div className={s.chipBar}>
            <div className={s.chips} role="group" aria-label="Browse by category and active filters" data-ui="chip-row">
              <ActiveChips q={q} set={set} faceFor={faceFor} me={me} />
              <Chip selected={!q.cats.length} onClick={() => set({ cats: [] })}>
                All categories
              </Chip>
              {cats.map((c) => (
                <Chip key={c.value} dot={!!c.wash} wash={c.wash || undefined} selected={q.cats.includes(c.value)} onClick={() => toggleCat(c.value)}>
                  {c.label}
                </Chip>
              ))}
              {nFilters > 1 ? (
                <button type="button" className={s.clearAll} onClick={() => set(clearedFilters())}>
                  Clear all
                </button>
              ) : null}
            </div>
            {desktop && q.view === 'feed' ? (
              <Segmented
                label="List stories"
                size="sm"
                value={q.group}
                onChange={(v) => set({ group: v })}
                options={[
                  { value: 'month', label: 'By month' },
                  { value: 'category', label: 'By category' },
                ]}
                className={s.groupSeg}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      {error && events.length ? (
        <div className={s.inlineError} role="alert">
          <Icon name="warning" size={20} />
          <span>Newer stories did not load.</span>
          <Button size="sm" variant="ghost" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className={s.body}>{body}</div>

      {q.view === 'feed' && events.length && items.length ? (
        <div ref={sentinel} className={s.more}>
          {hasMore ? (
            loading ? (
              <span className={s.moreNote}>
                <Spinner size={18} /> Loading more stories
              </span>
            ) : (
              <Button variant="ghost" onClick={loadMore}>
                Load more stories
              </Button>
            )
          ) : (
            <span className={s.end}>{events.length >= 500 ? 'That is the newest 500 stories.' : "That's every story so far."}</span>
          )}
        </div>
      ) : null}

      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        q={q}
        set={set}
        events={events}
        people={people}
        resultCount={items.length}
        partial={hasMore}
        onMutedChanged={onMutedChanged}
        showGroup={q.view === 'feed'}
      />

      <Dialog
        open={!!gate}
        onClose={() => setGate(null)}
        title="This story needs a plan to open"
        actions={
          <>
            <Button variant="ghost" onClick={() => setGate(null)}>
              Not now
            </Button>
            <Button to="/billing">See plans</Button>
          </>
        }
      >
        <p className={s.gateText}>
          {gate ? `"${gate.title}" is by ${faceFor(gate.author_username, gate.author_full_name).name}, who you do not follow. Without a plan or a trial you can open stories from people you follow and any public story.` : ''}
        </p>
      </Dialog>
    </div>
  )
}

