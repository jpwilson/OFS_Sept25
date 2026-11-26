// The story page, /event/:id and /share/:token (owner: STORY). PLAN-DAYLIGHT 2.5 and 3.5.
// Loads the story, hosts StoryView, the journey (desktop: a sticky panel beside the text;
// phone: a card with Play and Open map, then a full-screen sheet), the contents, the
// phone's own bars, the author's actions, and the designed loading, error, blocked and
// share-link states. Requests: GET /events/{id} (or /share/{token}), then comments, tags
// and likes in parallel (useStoryExtras); photo stats when the text nears the screen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ShareEventModal from '../../components/ShareEventModal.jsx'
import { usePeople, useStory, useStoryExtras } from '../lib/data.js'
import { apiFetch } from '../lib/http.js'
import { useDesktop } from '../lib/capability.js'
import { useTopOnArrival } from '../lib/scroll.js'
import { useChrome } from '../shell/chrome.js'
import * as MapPkg from '../map/index.js'
import JourneyMap from '../map/JourneyMap.jsx'
import { useJourneySync } from '../map/useJourneySync.js'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Loading, Skeleton, SkeletonText } from '../ui/Skeleton.jsx'
import { cx } from '../ui/cx.js'
import { useParsedStory } from './useParsedStory.js'
import { scrollToEl, useReading } from './useReading.js'
import StoryView from './StoryView.jsx'
import Contents from './Contents.jsx'
import PrivacyBlock from './PrivacyBlock.jsx'
import { PhoneBottom, PhoneTop, ShareTop } from './StoryBars.jsx'
import { firstName, longDay, placeHead } from './words.js'
import s from './StoryPage.module.css'

export default function StoryPage({ isShareMode = false }) {
  const { id, token } = useParams()
  const navigate = useNavigate()
  const auth = useAuth() || {}
  const { user, canAccessContent = true, isExpired, isTrialExpired } = auth
  const desktop = useDesktop()
  const shareToken = isShareMode ? token : undefined
  useTopOnArrival(isShareMode ? token : id)
  const story = useStory(isShareMode ? null : id, { shareToken })
  const extras = useStoryExtras(story.event?.id, { shareToken })
  const people = usePeople()
  const { parsed, journey } = useParsedStory(story.event)
  const event = story.event
  const mode = isShareMode ? 'share' : 'read'
  const isAuthor = !isShareMode && !!user && !!event && user.username === event.author_username
  const editingBlocked = isAuthor && !canAccessContent && (isExpired || isTrialExpired)

  // a phone story brings its own bars; the shell's step aside while it is on screen
  const ownBars = !desktop && !!user && !isShareMode && (!!event || (story.loading && !story.privacyError && !story.error))
  useChrome(ownBars ? { tabBar: false, topBar: false } : {})

  const bodyRef = useRef(null)
  const coverRef = useRef(null)
  const { activeStopId, scrollToStop } = useJourneySync({ journey, containerRef: bodyRef })
  const reading = useReading(bodyRef, event?.id)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = coverRef.current
    if (!el || desktop) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [event?.id, desktop])

  const [sheet, setSheet] = useState(null) // 'contents' | 'map' | 'signin' | 'share' | 'blocked'
  const [playing, setPlaying] = useState(false)
  const [mapStop, setMapStop] = useState(null)
  const [hideMedia, setHideMedia] = useState(false)
  const [ask, setAsk] = useState(null) // {kind: 'publish'|'unpublish'|'trash'}
  const [busy, setBusy] = useState(false)
  const [askErr, setAskErr] = useState(null)

  const dayOfChapter = useMemo(() => {
    const m = new Map()
    for (const st of journey?.stops || []) if (st.chapterId && !m.has(st.chapterId)) m.set(st.chapterId, st.dayIndex)
    return m
  }, [journey])
  const chapter = parsed?.chapters.find((c) => c.id === reading.chapterId) || null

  const back = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/feed')
  }, [navigate])
  const goChapter = (cid) => {
    setSheet(null)
    setTimeout(() => scrollToEl(document.getElementById(cid)), 60)
  }
  const goSection = (sid) => {
    setSheet(null)
    setTimeout(() => scrollToEl(document.getElementById(sid)), 60)
  }
  const openMap = (stopId = null, play = false) => {
    setMapStop(stopId)
    setPlaying(play)
    setSheet('map')
  }
  const readFrom = (stopId) => {
    setSheet(null)
    setPlaying(false)
    setTimeout(() => scrollToStop(stopId), 80)
  }
  const signIn = useCallback(() => setSheet('signin'), [])

  // ---- author actions (EventDetail.jsx:1400-1458), each confirmed in a dialog
  const authorItems = useMemo(() => {
    if (!isAuthor || !event) return null
    const gate = (fn) => () => (editingBlocked ? setSheet('blocked') : fn())
    return [
      { label: 'Edit the story', icon: 'edit', onClick: gate(() => navigate(`/event/${event.id}/edit`)) },
      event.is_published
        ? { label: 'Move to drafts', icon: 'eye-off', note: 'Hide it from your audience', onClick: gate(() => setAsk({ kind: 'unpublish' })) }
        : { label: 'Publish', icon: 'check', note: 'Show it to your audience', onClick: gate(() => setAsk({ kind: 'publish' })) },
      { divider: true },
      { label: 'Move to trash', icon: 'trash', danger: true, onClick: gate(() => setAsk({ kind: 'trash' })) },
    ]
  }, [isAuthor, event, editingBlocked, navigate])
  const doAsk = async () => {
    setBusy(true)
    setAskErr(null)
    try {
      if (ask.kind === 'trash') {
        await apiFetch(`/events/${event.id}`, { method: 'DELETE' })
        navigate(`/profile/${user.username}`, { state: { activeTab: 'trash' } })
        return
      }
      await apiFetch(`/events/${event.id}/${ask.kind}`, { method: 'POST' })
      setAsk(null)
      story.reload()
    } catch (e) {
      setAskErr(e?.data?.detail && typeof e.data.detail === 'string' ? e.data.detail : 'That did not work. Check your connection and try again.')
    }
    setBusy(false)
  }

  // ---------------------------------------------------------------- states
  const shell = (node) => (isShareMode ? <div className={s.shareRoot}><ShareTop user={user} />{node}</div> : node)
  if (story.loading && !event)
    return shell(
      <>
        {ownBars ? <PhoneTop title="" past={false} onBack={back} /> : null}
        <StorySkeleton desktop={desktop} />
      </>,
    )
  if (story.privacyError) return shell(<PrivacyBlock error={story.privacyError} user={user} faceFor={people.faceFor} share={isShareMode} />)
  if (story.error || !event)
    return shell(
      <div className="a-wrap">
        <EmptyState
          tone="error"
          icon="warning"
          wash="paper"
          className={s.error}
          title={story.error?.status === 0 ? 'No connection.' : 'The story did not load.'}
          body={story.error?.status === 0 ? 'Check that you are online, then try again.' : 'Something went wrong on our side. Your story is safe; try again in a moment.'}
          action={
            <>
              <Button onClick={story.reload} icon="swap">Try again</Button>
              {!isShareMode ? <Button variant="ghost" to="/feed">Back to stories</Button> : null}
            </>
          }
        />
      </div>,
    )

  const authorFace = people.faceFor?.(event.author_username, event.author_full_name)?.avatarUrl || (user && user.username === event.author_username ? user.avatar_url : null)
  const commentsN = extras.comments.length
  const sectionLinks = [
    parsed?.media.length > 1 ? { label: 'All photos', icon: 'photos', count: parsed.media.length, onClick: () => goSection('ofsa-photos') } : null,
    journey && !desktop ? { label: 'The journey map', icon: 'map', count: journey.stops.filter((x) => x.kind === 'named').length, onClick: () => openMap() } : null,
    isShareMode ? null : { label: 'Comments', icon: 'comment', count: commentsN, onClick: () => goSection('ofsa-comments') },
  ].filter(Boolean)
  const contents = (variant) => (
    <Contents
      variant={variant}
      chapters={parsed?.chapters || []}
      activeId={reading.chapterId}
      onGo={goChapter}
      dayOfChapter={dayOfChapter}
      extras={sectionLinks}
      hideMedia={hideMedia}
      onHideMedia={parsed?.media.length ? setHideMedia : null}
      progress={reading.progress}
    />
  )

  const JourneySheet = MapPkg.JourneySheet
  const sheetStop = mapStop || activeStopId
  const named = journey ? journey.stops.filter((x) => x.kind === 'named').length : 0

  return (
    <div className={cx(s.page, isShareMode && s.shareRoot, ownBars && s.ownBars)} data-ui="story-page">
      {isShareMode ? <ShareTop user={user} storyTo={user && story.shareContext?.viewer_status === 'following' ? `/event/${event.slug || event.id}` : null} /> : null}
      {ownBars ? <PhoneTop title={event.title} past={past} onBack={back} /> : null}
      {isShareMode && story.shareContext ? <ShareNote ctx={story.shareContext} event={event} user={user} /> : null}

      <div className={cx('a-wrap', s.wrap)}>
        <StoryView
          event={event}
          extras={extras}
          mode={mode}
          parsed={parsed}
          journey={journey}
          activeStopId={activeStopId}
          bodyRef={bodyRef}
          coverRef={coverRef}
          me={user}
          isAuthor={isAuthor}
          authorFace={authorFace}
          authorItems={authorItems}
          onShare={isAuthor ? () => setSheet('share') : null}
          onSignIn={signIn}
          hideMedia={hideMedia}
          onShowStop={desktop ? (sid) => scrollToStop(sid) : (sid) => openMap(sid)}
          onContents={() => setSheet('contents')}
          rail={desktop && !journey ? contents('rail') : null}
          aside={
            desktop && journey ? (
              <div className={s.panel}>
                <JourneyMap journey={journey} activeStopId={activeStopId} onStopSelect={scrollToStop} mode="panel" playing={playing} onPlayingChange={setPlaying} />
              </div>
            ) : null
          }
          afterHeader={
            !desktop && journey ? (
              <section className={s.journeyCard} aria-labelledby="ofsa-journey-h" data-ui="journey-card">
                <div className={s.jcHead}>
                  <h2 id="ofsa-journey-h" className={s.jcTitle}>The journey</h2>
                  <span className={cx(s.jcMeta, 'a-mono')}>
                    {named} {named === 1 ? 'stop' : 'stops'} · {journey.days.length} {journey.days.length === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className={s.jcMap}>
                  <JourneyMap journey={journey} activeStopId={activeStopId} mode="strip" />
                  <button type="button" className={s.jcHit} onClick={() => openMap()} aria-label="Open the journey map" />
                </div>
                <div className={s.jcBtns}>
                  <Button icon="play" onClick={() => openMap(null, true)} className={s.jcPlay}>Play the journey</Button>
                  <Button variant="ghost" onClick={() => openMap()}>Open map</Button>
                </div>
              </section>
            ) : null
          }
          social={isShareMode ? <SharePrompt event={event} user={user} ctx={story.shareContext} /> : null}
        />
      </div>

      {!desktop ? (
        <PhoneBottom
          journey={journey}
          activeStopId={activeStopId}
          chapter={chapter}
          progress={reading.progress}
          title={event.title}
          share={isShareMode}
          likes={!isShareMode ? extras.likes : null}
          onLike={() => (user ? extras.actions.toggleLike().catch(() => {}) : signIn())}
          onContents={() => setSheet('contents')}
          onWhere={() => (journey ? openMap() : setSheet('contents'))}
          onMap={() => openMap()}
        />
      ) : null}

      {/* ---- overlays */}
      <Sheet open={sheet === 'contents'} onClose={() => setSheet(null)} title="Contents" placement={desktop ? 'side' : 'bottom'}>
        {contents('sheet')}
      </Sheet>

      {journey && !desktop ? (
        JourneySheet ? (
          <JourneySheet
            open={sheet === 'map'}
            onClose={() => { setSheet(null); setPlaying(false) }}
            journey={journey}
            activeStopId={sheetStop}
            onStopSelect={(sid) => setMapStop(sid)}
            onRead={readFrom}
            playing={playing}
            onPlayingChange={setPlaying}
            title={event.title}
          />
        ) : (
          <Sheet
            open={sheet === 'map'}
            onClose={() => { setSheet(null); setPlaying(false) }}
            title="The journey"
            size="full"
            className={s.mapSheet}
            footer={
              sheetStop ? (
                <Button full iconAfter="arrow" onClick={() => readFrom(sheetStop)}>
                  Read from {placeHead(journey.stops.find((x) => x.id === sheetStop)?.name) || 'here'}
                </Button>
              ) : null
            }
          >
            <JourneyMap journey={journey} activeStopId={sheetStop} onStopSelect={(sid) => setMapStop(sid)} mode="sheet" playing={playing} onPlayingChange={setPlaying} />
          </Sheet>
        )
      ) : null}

      <Sheet open={sheet === 'signin'} onClose={() => setSheet(null)} title="Join in" placement="auto">
        <div className={s.signin}>
          <p className={s.signinText}>
            {isShareMode
              ? `Make a free account to like, react and comment, and to follow ${firstName(event.author_full_name, event.author_username)}'s stories.`
              : 'Log in to like, react and comment.'}
          </p>
          <div className={s.signinBtns}>
            <Button to="/login?signup=true" icon="plus">Start free</Button>
            <Button to="/login" variant="ghost">Log in</Button>
          </div>
        </div>
      </Sheet>

      <Dialog
        open={sheet === 'blocked'}
        onClose={() => setSheet(null)}
        title="Your plan has ended"
        actions={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}>Not now</Button>
            <Button to="/billing">See the plans</Button>
          </>
        }
      >
        <p className={s.dialogText}>Editing, publishing and moving stories needs a plan. Your stories stay here and readable.</p>
      </Dialog>

      <Dialog
        open={!!ask}
        onClose={() => { setAsk(null); setAskErr(null) }}
        title={ask?.kind === 'trash' ? 'Move this story to the trash?' : ask?.kind === 'publish' ? 'Publish this story?' : 'Move this story to drafts?'}
        actions={
          <>
            <Button variant="ghost" onClick={() => { setAsk(null); setAskErr(null) }}>Cancel</Button>
            <Button variant={ask?.kind === 'trash' ? 'danger' : 'solid'} busy={busy} onClick={doAsk}>
              {ask?.kind === 'trash' ? 'Move to trash' : ask?.kind === 'publish' ? 'Publish' : 'Move to drafts'}
            </Button>
          </>
        }
      >
        <p className={s.dialogText}>
          {ask?.kind === 'trash'
            ? 'You can restore it from the trash on your profile, or delete it for good from there.'
            : ask?.kind === 'publish'
              ? 'It becomes visible to the audience you chose for it.'
              : 'Only you will see it. Its comments and likes are kept.'}
        </p>
        {askErr ? <p className={s.dialogErr} role="alert">{askErr}</p> : null}
      </Dialog>

      {isAuthor ? <ShareEventModal isOpen={sheet === 'share'} onClose={() => setSheet(null)} event={event} /> : null}
    </div>
  )
}

/** Above a shared story: who shared it and until when (share_context from GET /share/{token}). */
function ShareNote({ ctx, event, user }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  const who = ctx.author_full_name || event.author_full_name || ctx.author_username
  const until = longDay(ctx.expires_at)
  return (
    <div className={s.note} role="note" data-ui="share-note">
      <div className={s.noteInner}>
        <Icon name="link" size={20} />
        <p className={s.noteText}>
          <strong>{who}</strong> shared this story with you{until ? `. The link works until ${until}.` : '.'}
          {!user ? ' Anyone with the link can read it.' : ''}
        </p>
        <button type="button" className={s.noteClose} onClick={() => setOpen(false)} aria-label="Hide this note">
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  )
}

/** In share mode, likes and comments become an invitation (EventDetail.jsx:1706-1712). */
function SharePrompt({ event, user, ctx }) {
  const first = firstName(event.author_full_name, event.author_username)
  const following = user && ctx?.viewer_status === 'following'
  return (
    <section className={s.prompt} id="ofsa-comments" data-wash="tide" data-ui="share-prompt">
      <div className={s.promptBody}>
        {following ? (
          <>
            <Head as="h2" size="section" before="You already follow" mark={first} after="." />
            <p className={s.promptText}>Open the story in the app to like it, react to the photos and leave a comment.</p>
            <div className={s.promptBtns}>
              <Button size="lg" to={`/event/${event.slug || event.id}`} iconAfter="arrow">Open the story</Button>
            </div>
          </>
        ) : (
          <>
            <Head as="h2" size="section" before="Want to say something to" mark={first} after="?" />
            <p className={s.promptText}>
              Make a free account to like this story, react to the photos and leave a comment. Then ask to follow {first} and see the next one when it is posted.
            </p>
            <div className={s.promptBtns}>
              {user ? (
                <Button size="lg" to={`/profile/${event.author_username}`}>See {first}'s profile</Button>
              ) : (
                <>
                  <Button size="lg" to="/login?signup=true" icon="plus">Start free</Button>
                  <Button size="lg" variant="ghost" to="/login">Log in</Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function StorySkeleton({ desktop }) {
  return (
    <Loading label="Loading the story" className={cx('a-wrap', s.skel)}>
      <Skeleton className={s.skCover} w={desktop ? '100%' : 'calc(100% + 40px)'} r={desktop ? 20 : 0} />
      <div className={s.skText}>
        <Skeleton w={110} h={14} r={7} />
        <Skeleton w="82%" h={desktop ? 58 : 40} r={12} />
        <Skeleton w="54%" h={desktop ? 58 : 40} r={12} />
        <Skeleton w="70%" h={20} r={10} />
        <div className={s.skBy}>
          <Skeleton w={44} h={44} r={22} />
          <div className={s.skByText}>
            <Skeleton w={140} h={16} />
            <Skeleton w={190} h={13} />
          </div>
        </div>
        <div className={s.skActs}>
          <Skeleton w={96} h={44} r={22} />
          <Skeleton w={136} h={44} r={22} />
        </div>
        <div className={s.skBody}>
          <SkeletonText lines={4} size={17} gap={14} />
          <SkeletonText lines={3} size={17} gap={14} />
        </div>
      </div>
    </Loading>
  )
}
