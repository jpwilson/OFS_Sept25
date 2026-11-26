// The story itself (owner: STORY). Used by the story page, the creation flow's preview and
// (through its anchors) the journey map.
//
// <StoryView event images locations extras mode="read|preview|share" parsed? journey? activeStopId? />
//   event:   GET /events/{id} response, or a local draft in the same shape (CREATE's preview)
//   extras:  useStoryExtras(...) result, or null in preview
//   mode:    read (signed in), preview (creation flow: no likes, comments or counts),
//            share (a share link: likes and comments replaced by `social`, the sign-up prompt)
//   parsed, journey: optional; computed when absent
// Optional, for the page that hosts it (all may be left out):
//   bodyRef        ref on the story text (the element useJourneySync and useReading watch)
//   aside          node beside the text on desktop (the journey panel); rail: node left of it
//   afterHeader    node between the header and the text (the phone journey card)
//   onShowStop(id) "Map" on a stop header      onContents() desktop Contents button
//   authorItems    [{label, onClick|to, icon, danger}] for the author's menu;  onShare()
//   hideMedia, me (the signed-in user), onSignIn(), social (node), coverRef, authorFace
// Every stop header and every located photo carries data-stop-id.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseStory } from '../lib/storyBlocks.js'
import { buildJourney } from '../lib/journey.js'
import { useMediaStats } from '../lib/data.js'
import { useToast } from '../../components/Toast.jsx'
import { cx } from '../ui/cx.js'
import StoryHeader from './StoryHeader.jsx'
import StoryBody, { MediaContext } from './StoryBody.jsx'
import Gallery from './Gallery.jsx'
import Likes from './Likes.jsx'
import Comments from './Comments.jsx'
import s from './StoryView.module.css'

const Lightbox = lazy(() => import('./Lightbox.jsx'))

export default function StoryView({
  event, images, mode = 'read', extras, parsed: parsedIn, journey: journeyIn, activeStopId,
  bodyRef: bodyRefIn, aside, rail, afterHeader, onShowStop, onContents, authorItems, onShare, hideMedia, me, onSignIn, social, coverRef, authorFace, isAuthor,
}) {
  const parsed = useMemo(() => parsedIn || parseStory(event?.description || '', images || event?.event_images || []), [parsedIn, event, images])
  const journey = useMemo(() => (journeyIn !== undefined ? journeyIn : buildJourney(event, parsed)), [journeyIn, event, parsed])
  const ownBody = useRef(null)
  const bodyRef = bodyRefIn || ownBody
  let toast = {}
  try {
    toast = useToast() // the app's toasts; absent only outside the app's providers
  } catch {
    /* no provider */
  }
  const read = mode === 'read'
  const social_ = mode !== 'preview'

  // photo reactions: fetched when the text comes near the screen, not on load (PLAN 2.5)
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (!read || near) return
    const el = bodyRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return setNear(true)
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [read, near, bodyRef])
  const mediaIds = useMemo(() => (near ? parsed.media.map((m) => m.imageId).filter((x) => x != null) : []), [near, parsed])
  const ms = useMediaStats(mediaIds)
  const react = useCallback(
    async (imageId, type) => {
      try {
        if (type) await ms.react(imageId, type)
        else await ms.unreact(imageId)
      } catch {
        toast.showToast?.('That reaction did not save. Try again.', 'error')
      }
    },
    [ms.react, ms.unreact],
  )

  // the lightbox shows every photo and clip, in story order
  const [lb, setLb] = useState({ open: false, index: 0, loaded: false })
  const openAt = useCallback((i) => setLb({ open: true, index: i, loaded: true }), [])
  const openId = useCallback((id) => openAt(Math.max(0, parsed.media.findIndex((m) => m.id === id))), [parsed, openAt])

  const ctx = useMemo(
    () => ({ stats: ms.stats, react: social_ ? react : null, canReact: read && !!me, open: openId, journey, onSignIn }),
    [ms.stats, react, social_, read, me, openId, journey, onSignIn],
  )

  const onLike = useCallback(async () => {
    if (!read) return onSignIn?.()
    if (!me) return onSignIn?.()
    try {
      await extras.actions.toggleLike()
    } catch {
      toast.showToast?.('That like did not save. Try again.', 'error')
    }
  }, [read, me, extras, onSignIn])

  const scrollToComments = () => document.getElementById('ofsa-comments')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })

  if (!event) return null
  const layout = aside ? 'split' : rail ? 'rail' : 'single'
  const commentActions = extras
    ? { comment: extras.actions.comment, deleteComment: extras.actions.deleteComment, react: extras.actions.reactToComment, unreact: extras.actions.unreactComment }
    : null
  const photos = parsed.media.length

  return (
    <MediaContext.Provider value={ctx}>
      <article className={s.story} data-ui="story-view" data-mode={mode} data-layout={layout}>
        <StoryHeader
          event={event}
          mode={mode}
          extras={extras ? { ...extras, onLike } : null}
          isAuthor={isAuthor}
          authorItems={authorItems}
          onShare={onShare}
          onComments={scrollToComments}
          onContents={layout === 'split' ? onContents : null}
          onSignIn={onSignIn}
          coverRef={coverRef}
          authorFace={authorFace}
        />
        {afterHeader}
        <div className={s.layout} data-layout={layout}>
          {rail ? <aside className={s.rail}>{rail}</aside> : null}
          <StoryBody parsed={parsed} journey={journey} activeStopId={activeStopId} onShowStop={onShowStop} hideMedia={hideMedia} bodyRef={bodyRef} />
          {aside ? <aside className={s.aside} aria-label="The journey">{aside}</aside> : null}
        </div>

        {social_ && photos > 1 ? (
          <section className={s.photos} id="ofsa-photos" aria-labelledby="ofsa-photos-h">
            <div className={s.sectionHead}>
              <h2 id="ofsa-photos-h" className={s.h}>All photos</h2>
              <span className={cx(s.count, 'a-mono')}>{photos}</span>
            </div>
            <Gallery media={parsed.media} onOpen={openAt} stats={ms.stats} />
          </section>
        ) : null}

        {social_ ? (
          social || (extras ? (
            <section className={s.social} id="ofsa-comments">
              <div className={s.commentsCol}>
                <div className={s.sectionHead}>
                  <h2 className={s.h}>Comments</h2>
                  {extras.comments.length ? <span className={cx(s.count, 'a-mono')}>{extras.comments.length}</span> : null}
                </div>
                {extras.error && !extras.comments.length ? (
                  <p className={s.err} role="alert">
                    The comments did not load. <button type="button" onClick={extras.actions.reload}>Try again</button>
                  </p>
                ) : (
                  <Comments
                    comments={extras.comments}
                    me={me}
                    authorId={event.author_id}
                    canWrite={read && !!me}
                    onSignIn={onSignIn}
                    actions={commentActions}
                    placeholder={`Say something to ${(event.author_full_name || event.author_username || '').split(' ')[0] || 'the author'}`}
                    empty="No comments yet. Say something kind."
                  />
                )}
              </div>
              <div className={s.likesCol}>
                <Likes likes={extras.likes} onToggle={onLike} />
              </div>
            </section>
          ) : null)
        ) : null}
      </article>
      {lb.loaded ? (
        <Suspense fallback={null}>
          <Lightbox
            open={lb.open}
            index={lb.index}
            media={parsed.media}
            onClose={() => setLb((x) => ({ ...x, open: false }))}
            onIndex={(i) => setLb((x) => ({ ...x, index: i }))}
            stats={ms.stats}
            react={social_ && mode === 'read' ? react : null}
            canReact={read && !!me}
            onSignIn={onSignIn}
            journey={journey}
            me={me}
            canComment={read && !!me}
          />
        </Suspense>
      ) : null}
    </MediaContext.Provider>
  )
}
