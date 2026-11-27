// The world view, /feed?view=map (owner: MAP). PLAN-DAYLIGHT 2.6.
// Desktop: a full-bleed map under the top bar with a 360px panel on the left (filters and
// the list of stories, which is the keyboard and screen-reader path) and the selected
// story's card hanging from its pin.
// Phone: a full-screen map above the tab bar, a filter pill at the top, and a bottom sheet
// with three heights. Swiping a story card flies the map, so it works with one thumb.
// Defaults to "People I follow and me" (SPEC decision 9). Filters and the selected story
// live in the query string; the camera is kept for the session, so Back returns to it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { imageSrc, useFeed, usePeople } from '../lib/data.js'
import { dateRange } from '../lib/format.js'
import { isLatLng } from '../lib/geo.js'
import { useDesktop } from '../lib/capability.js'
import { useChrome } from '../shell/chrome.js'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import WorldMap from './WorldMap.jsx'
import { currentLevel } from './engine.js'
import { StoryCarousel, StoryRows, WorldFilters, WorldSheet, sheetHeights, storiesCount } from './WorldParts.jsx'
import { activeCount, applyFilters, facets as facetsOf, filterSummary, inScope, readFilters, withFilter } from './worldFilters.js'
import s from './WorldPage.module.css'

const CAM_KEY = 'ofs.map.camera'
const readCamera = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CAM_KEY) || 'null')
  } catch {
    return null
  }
}

/** The page's top edge in the document: banners above the top bar change it. */
function usePageTop(ref, key) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => el.style.setProperty('--page-top', `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`)
    set()
    window.addEventListener('resize', set)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(document.body)
    return () => {
      window.removeEventListener('resize', set)
      ro?.disconnect()
    }
  }, [key]) // the page element appears after the loading state, and changes with the layout
}

export default function WorldPage() {
  useChrome({ footer: false })
  const { events, loading, error, refresh, loadAll } = useFeed()
  const people = usePeople()
  const [sp, setSp] = useSearchParams()
  const navType = useNavigationType()
  const desktop = useDesktop()
  const page = useRef(null)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth() || {}

  // Signed-out visitors go to the sign-in page and come back here, as the feed does.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/feed?view=map', message: 'Please sign in to see your map' } })
  }, [authLoading, user, navigate])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // "People I follow and me" needs the follow list; wait for it rather than flash everyone's pins
  const peopleReady = people.loaded

  const filters = useMemo(() => readFilters(sp), [sp])
  const scoped = useMemo(() => inScope(events, filters.who, people), [events, filters.who, people.following, people.muted, people.me])
  const shown = useMemo(() => applyFilters(scoped, filters), [scoped, filters])
  const facets = useMemo(() => facetsOf(scoped, people.faceFor), [scoped, people.faceFor])
  const placed = useMemo(() => shown.filter((e) => isLatLng(e.latitude, e.longitude)), [shown])
  const unplaced = useMemo(() => shown.filter((e) => !isLatLng(e.latitude, e.longitude)), [shown])

  const storyParam = sp.get('story')
  const selectedId = useMemo(() => placed.find((e) => String(e.id) === storyParam)?.id ?? null, [placed, storyParam])
  const [hoverId, setHoverId] = useState(null)
  const [spot, setSpot] = useState(null)
  const [level, setLevel] = useState(currentLevel)
  const [filterOpen, setFilterOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [snap, setSnap] = useState('peek')
  const [areaH, setAreaH] = useState(() => (typeof window !== 'undefined' ? window.innerHeight - 116 : 700))

  const select = useCallback(
    (id) => {
      setSp((cur) => withFilter(cur, 'story', id), { replace: true })
      if (id == null) setSpot(null)
    },
    [setSp],
  )
  const setFilter = useCallback((key, value) => setSp((cur) => withFilter(cur, key, value), { replace: true }), [setSp])
  const clearFilters = useCallback(() => setSp((cur) => ['who', 'person', 'cat', 'year', 'story'].reduce((n, k) => (n.delete(k), n), new URLSearchParams(cur)), { replace: true }), [setSp])

  // ---- phone: the sheet and the map share the screen
  useLayoutEffect(() => {
    const el = page.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setAreaH(el.clientHeight))
    ro.observe(el)
    setAreaH(el.clientHeight)
    return () => ro.disconnect()
  }, [loading, error, peopleReady])
  usePageTop(page, `${loading}|${!!error}|${peopleReady}|${desktop}|${level}`)
  const hs = sheetHeights(areaH)
  const half = hs.half
  const onSheetHeight = useCallback((px) => page.current?.style.setProperty('--world-bottom', `${Math.round(Math.min(px, half))}px`), [half])
  const pickFromMap = useCallback(
    (id) => {
      select(id)
      if (id != null && !desktop) setSnap((cur) => (cur === 'half' ? cur : 'half'))
    },
    [select, desktop],
  )
  const pickFromList = useCallback(
    (id) => {
      select(id)
      if (!desktop) setSnap('half')
    },
    [select, desktop],
  )
  // raising the sheet with nothing chosen puts the first card's story on the map
  const onSnap = useCallback(
    (next) => {
      setSnap(next)
      if (next === 'half' && selectedId == null && placed.length) select(placed[0].id)
    },
    [selectedId, placed, select],
  )
  const padding = useMemo(() => (desktop ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 64, bottom: Math.min(hs[snap], hs.half), left: 0, right: 0 }), [desktop, snap, hs.half, hs.peek])

  const camera = useMemo(() => (navType === 'POP' ? readCamera() : null), [])
  const onView = useCallback((v) => {
    try {
      sessionStorage.setItem(CAM_KEY, JSON.stringify({ center: v.center, zoom: v.zoom, bearing: v.bearing }))
    } catch {
      /* private mode */
    }
  }, [])

  const spotEvents = spot ? spot.ids.map((id) => placed.find((e) => e.id === id)).filter(Boolean) : null
  const cards = spotEvents && spotEvents.length > 1 && spotEvents.some((e) => e.id === selectedId) ? spotEvents : placed
  const nActive = activeCount(filters)
  const summary = filterSummary(filters, people.faceFor)
  const countLine = `${storiesCount(placed.length)} on the map`
  const span = useMemo(() => {
    if (!placed.length) return ''
    const starts = placed.map((e) => e.start_date).filter(Boolean).sort()
    const ends = placed.map((e) => e.end_date || e.start_date).filter(Boolean).sort()
    return dateRange(starts[0], ends[ends.length - 1], { short: true })
  }, [placed])

  if (error && !events.length)
    return (
      <div className="a-wrap" style={{ paddingBlock: 32 }}>
        <EmptyState tone="error" icon="warning" title="The stories did not load." body={error.message} action={<Button onClick={refresh}>Retry</Button>} />
      </div>
    )
  if ((loading && !events.length) || !peopleReady)
    return (
      <Loading label="Loading the map">
        <div className={s.page}>
          <Skeleton h="100%" r={0} />
        </div>
      </Loading>
    )

  const empty = (
    <EmptyState
      wash="azure"
      icon="map"
      title={nActive ? 'No stories match these filters.' : 'No stories here yet.'}
      body={nActive ? 'Try a wider choice.' : 'Stories appear on the map when they have a place.'}
      action={nActive ? <Button variant="ghost" onClick={clearFilters}>Clear the filters</Button> : null}
    />
  )
  const map = (
    <WorldMap
      events={level === 'static' ? shown : placed}
      selectedId={selectedId}
      onSelect={pickFromMap}
      hoverId={hoverId}
      onHover={setHoverId}
      padding={padding}
      card={desktop ? 'anchored' : 'none'}
      faceFor={people.faceFor}
      camera={camera}
      onView={onView}
      onSpot={(ids) => setSpot({ ids })}
      onLevel={setLevel}
      fitKey={`${filters.who}|${filters.person}|${filters.cat}|${filters.year}`}
    />
  )
  const filtersUi = <WorldFilters filters={filters} facets={facets} onChange={setFilter} compact={desktop && level !== 'static'} />

  // ---- the static level: no map, the places as a page
  if (level === 'static')
    return (
      <div className={`a-wrap ${s.staticPage}`} data-wash="azure" data-ui="world-page" data-level="static">
        <Head as="h1" before="Your family's" mark="places" after="." />
        {filtersUi}
        {shown.length ? map : empty}
      </div>
    )

  if (desktop)
    return (
      <div ref={page} className={s.page} data-wash="azure" data-ui="world-page" data-panel={panelOpen ? 'open' : 'closed'}>
        <aside className={s.panel} aria-label="Stories on the map" hidden={!panelOpen}>
          <header className={s.panelHead}>
            <Head as="h1" size="lead" before="Your family's" mark="map" after="." />
            <p className={`${s.count} a-mono`}>
              {countLine}
              {unplaced.length ? ` · ${unplaced.length} with no place yet` : ''}
            </p>
          </header>
          {filtersUi}
          {nActive ? (
            <button type="button" className={s.clear} onClick={clearFilters}>
              <Icon name="close" size={14} /> Clear the filters
            </button>
          ) : null}
          <div className={s.panelList}>
            <StoryRows events={placed} unplaced={unplaced} selectedId={selectedId} hoverId={hoverId} onSelect={pickFromList} onHover={setHoverId} faceFor={people.faceFor} empty={empty} />
          </div>
        </aside>
        <div className={s.mapWrap}>
          {map}
          <button type="button" className={s.panelToggle} onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen} aria-label={panelOpen ? 'Hide the list' : 'Show the list'} title={panelOpen ? 'Hide the list' : 'Show the list'}>
            <Icon name={panelOpen ? 'chevron-left' : 'chevron-right'} size={20} />
            {panelOpen ? null : <span>{storiesCount(placed.length)}</span>}
          </button>
        </div>
      </div>
    )

  return (
    <div ref={page} className={s.page} data-wash="azure" data-ui="world-page" data-snap={snap} style={{ '--world-bottom': `${Math.min(hs[snap], hs.half)}px` }}>
      <div className={s.mapWrap}>{map}</div>
      <div className={s.top}>
        <button type="button" className={s.pill} onClick={() => setFilterOpen(true)} aria-haspopup="dialog" data-ui="world-pill">
          <Icon name="filter" size={18} />
          <span className={s.pillText}>{summary}</span>
          <span className="a-sr">. Filter the map.</span>
          {nActive ? <span className={s.pillCount}>{nActive}</span> : <Icon name="chevron-down" size={16} />}
        </button>
      </div>
      <WorldSheet
        snap={snap}
        onSnap={onSnap}
        areaH={areaH}
        onHeight={onSheetHeight}
        dragBody
        title={cards !== placed ? `${cards.length} stories at one place` : countLine}
        sub={cards !== placed ? null : unplaced.length ? `${span} · ${unplaced.length} with no place yet` : span}
        action={
          cards !== placed ? (
            <button type="button" className={s.sheetLink} onClick={() => setSpot(null)}>
              Show all
            </button>
          ) : snap === 'peek' && placed.length ? (
            <span className={s.covers} aria-hidden="true">
              {placed.slice(0, 4).map((e) => (e.cover_image_url ? <img key={e.id} src={imageSrc(e.cover_image_url, 'micro')} alt="" /> : null))}
            </span>
          ) : null
        }
      >
        {snap === 'full' ? (
          <StoryRows events={placed} unplaced={unplaced} selectedId={selectedId} onSelect={pickFromList} faceFor={people.faceFor} empty={empty} />
        ) : cards.length ? (
          <StoryCarousel events={cards} selectedId={selectedId} onSelect={select} faceFor={people.faceFor} />
        ) : (
          <div className={s.sheetEmpty}>{empty}</div>
        )}
      </WorldSheet>
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter the map"
        wash="azure"
        footer={
          <>
            {nActive ? (
              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
            <Button onClick={() => setFilterOpen(false)}>Show {storiesCount(placed.length)}</Button>
          </>
        }
      >
        {filtersUi}
      </Sheet>
    </div>
  )
}
