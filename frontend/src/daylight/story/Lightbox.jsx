// The photo lightbox (owner: STORY), loaded on first open. The same library as classic
// (yet-another-react-lightbox, ImageGallery.jsx:3-12) with light paper chrome (PLAN 8 #10).
// Each photo keeps what classic offers: its reactions and its own comments thread
// (GET/POST /media/{id}/comments), plus where and when it was taken from the journey.
import { useCallback, useEffect, useRef, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import { apiFetch } from '../lib/http.js'
import { imageSrc } from '../lib/data.js'
import { stopOfPhoto } from '../lib/journey.js'
import { overlayRoot } from '../ui/overlay.js'
import { Icon } from '../ui/Icon.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import { ReactionButton } from './Reactions.jsx'
import Comments from './Comments.jsx'
import { wallDayLabel, wallTime } from '../lib/format.js'
import { prefersReducedMotion, useMedia } from '../lib/capability.js'
import { placeHead } from './words.js'
import s from './Lightbox.module.css'

/** Where and when a photo was taken: "Stop 4 · Jenny Lake · Tuesday, June 16 · 9:30 AM". */
function whereLine(m, journey) {
  const stop = m ? stopOfPhoto(journey, m.id) : null
  const when = m?.ts || stop?.ts
  if (!stop?.name && !when) return ''
  return [stop?.n ? `Stop ${stop.n}` : null, stop?.name ? placeHead(stop.name) : null, when ? `${wallDayLabel(when, 0)} · ${wallTime(when)}` : null].filter(Boolean).join(' · ')
}

/** A phone's photo, with its place and caption right under it (they travel with it as it swipes). */
function SlideInfo({ m, journey }) {
  if (!m) return null
  const where = whereLine(m, journey)
  if (!where && !m.caption) return null
  return (
    <div className={s.info} data-ui="lightbox-info">
      {where ? <p className={cx(s.where, 'a-mono')}>{where}</p> : null}
      {m.caption ? <p className={s.caption}>{m.caption}</p> : null}
    </div>
  )
}

export default function StoryLightbox({ open, index, media, onClose, onIndex, stats, react, canReact, onSignIn, journey, me, canComment, shareToken }) {
  const [talk, setTalk] = useState(null) // media item whose comments are open
  // Phone: the photo across the width with its words right under it, every photo of the story
  // in a strip and every control in a bar at the bottom (the thumb zone). Wider screens: the
  // photo centred, a bar top and foot.
  const phone = useMedia('(max-width: 599px)')
  // the classic help button floats at z-index 9998 over every overlay; step it aside while open
  useEffect(() => {
    if (!open) return
    document.documentElement.classList.add('ofsa-lb')
    return () => document.documentElement.classList.remove('ofsa-lb')
  }, [open])
  const slides = media.map((m, i) =>
    m.kind === 'video'
      ? { type: 'video', sources: [{ src: m.src, type: /\.webm/i.test(m.src) ? 'video/webm' : 'video/mp4' }], poster: m.poster || undefined, width: m.w || 1280, height: m.h || 720, ofsIndex: i }
      : { src: imageSrc(m.src, 'original'), alt: m.alt || m.caption || '', width: m.w || undefined, height: m.h || undefined, ofsIndex: i },
  )
  const cur = media[index]
  const stat = cur?.imageId != null ? stats?.[cur.imageId] : null
  const where = whereLine(cur, journey)
  const acts =
    cur?.imageId != null && react ? (
      <div className={s.footActs}>
        <ReactionButton
          counts={stat?.reaction_counts}
          total={stat?.like_count}
          mine={stat?.user_reaction}
          label="React to this photo"
          disabled={!canReact}
          onDisabled={onSignIn}
          onPick={(t) => react(cur.imageId, t)}
          trayAvoid={phone ? () => document.querySelector('.yarl__slide_current [data-ui="lightbox-info"]') : undefined}
        />
        <button type="button" className={s.talk} onClick={() => setTalk(cur)}>
          <Icon name="comment" size={18} />
          <span>{stat?.comment_count ? `${stat.comment_count}` : 'Comment'}</span>
          <span className="a-sr"> on this photo</span>
        </button>
      </div>
    ) : null
  const count = (
    <span className={cx(s.count, 'a-mono')} aria-live="polite">
      {index + 1} / {media.length}
    </span>
  )
  const close = (
    <button type="button" className={s.close} onClick={onClose} aria-label="Close photos">
      <Icon name="close" size={22} />
    </button>
  )
  // phone: every photo of the story in a strip above the bar; the current one stays in view
  const film = useRef(null)
  const at = useRef(index)
  at.current = index
  const centre = (row, i, behavior) => {
    const el = row?.children?.[i]
    if (el) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior })
  }
  // on opening, the strip arrives already centred on the photo that was tapped
  const filmRef = useCallback((row) => {
    film.current = row
    if (row) requestAnimationFrame(() => centre(row, at.current, 'auto'))
  }, [])
  useEffect(() => {
    centre(film.current, index, prefersReducedMotion() ? 'auto' : 'smooth')
  }, [index])
  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        index={index}
        slides={slides}
        plugins={[Zoom, Video]}
        portal={{ root: typeof document !== 'undefined' ? overlayRoot() : undefined }}
        on={{ view: ({ index: i }) => onIndex?.(i) }}
        carousel={{ finite: media.length <= 1, padding: 0, spacing: '8%', imageFit: 'contain' }}
        animation={{ swipe: 260, fade: 200 }}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        zoom={{ maxZoomPixelRatio: 2.5, scrollToZoom: true }}
        video={{ playsInline: true, controls: true }}
        toolbar={{ buttons: [] }}
        className={cx(s.lb, phone && s.lbPhone)}
        styles={{
          root: {
            '--yarl__portal_zindex': 250,
            '--yarl__color_backdrop': '#F4F7FB',
            '--yarl__color_button': '#101B3B',
            '--yarl__color_button_active': '#101B3B',
            '--yarl__color_button_disabled': 'rgba(16, 27, 59, 0.3)',
            '--yarl__slide_title_color': '#101B3B',
          },
        }}
        labels={{ Previous: 'Previous photo', Next: 'Next photo', Close: 'Close', Lightbox: 'Photos', Carousel: 'Photos', Slide: 'Photo' }}
        render={{
          iconPrev: () => <Icon name="chevron-left" size={24} />,
          iconNext: () => <Icon name="chevron-right" size={24} />,
          slideFooter: phone ? ({ slide }) => <SlideInfo m={media[slide.ofsIndex]} journey={journey} /> : undefined,
          controls: () =>
            phone ? (
              <>
                {media.length > 1 ? (
                  <div ref={filmRef} className={s.film} data-ui="lightbox-film" role="group" aria-label="All the photos" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                    {media.map((m, i) => (
                      <button key={m.id} type="button" className={s.filmThumb} aria-current={i === index || undefined} aria-label={`Photo ${i + 1} of ${media.length}`} onClick={() => onIndex?.(i)}>
                        {m.kind === 'video' && !m.poster ? <Icon name="play" size={18} /> : <img src={imageSrc(m.kind === 'video' ? m.poster : m.src, 'micro')} alt="" loading="lazy" decoding="async" draggable={false} />}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className={s.bar} data-ui="lightbox-foot">
                  {acts || <span />}
                  <div className={s.barEnd}>
                    {count}
                    {close}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={s.top}>
                  {count}
                  {close}
                </div>
                <div className={s.foot} data-ui="lightbox-foot">
                  <div className={s.footText}>
                    {where ? <p className={cx(s.where, 'a-mono')}>{where}</p> : null}
                    {cur?.caption ? <p className={s.caption}>{cur.caption}</p> : null}
                  </div>
                  {acts}
                </div>
              </>
            ),
        }}
      />
      <PhotoComments item={talk} onClose={() => setTalk(null)} me={me} canComment={canComment} onSignIn={onSignIn} shareToken={shareToken} />
    </>
  )
}

/** One photo's own comments, in a sheet over the lightbox. */
function PhotoComments({ item, onClose, me, canComment, onSignIn, shareToken }) {
  const id = item?.imageId
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    if (id == null) return
    setError(null)
    apiFetch(`/media/${id}/comments`, { auth: !!me, query: { share_token: shareToken } })
      .then((rows) => setList(rows || []))
      .catch((e) => setError(e))
  }, [id, me, shareToken])
  useEffect(() => {
    setList(null)
    load()
  }, [load])
  const actions = {
    async comment(content, parentId) {
      const c = await apiFetch(`/media/${id}/comments`, { method: 'POST', body: parentId ? { content, parent_id: parentId } : { content } })
      setList((l) => [...(l || []), c])
    },
    async deleteComment(cid) {
      await apiFetch(`/media/${id}/comments/${cid}`, { method: 'DELETE' })
      setList((l) => (l || []).filter((c) => c.id !== cid))
    },
    async react(cid, type) {
      await apiFetch(`/media/${id}/comments/${cid}/reactions`, { method: 'POST', body: { reaction_type: type } })
      load()
    },
    async unreact(cid) {
      await apiFetch(`/media/${id}/comments/${cid}/reactions`, { method: 'DELETE' })
      load()
    },
  }
  return (
    <Sheet open={!!item} onClose={onClose} title="About this photo" placement="auto" className={s.sheet}>
      {item ? (
        <div className={s.sheetHead}>
          <img src={imageSrc(item.src, 'small')} alt="" className={s.thumb} />
          {item.caption ? <p className={s.sheetCap}>{item.caption}</p> : null}
        </div>
      ) : null}
      {error ? (
        <p className={s.err} role="alert">
          The comments did not load. <button type="button" onClick={load}>Try again</button>
        </p>
      ) : list == null ? (
        <div className={s.wait}><Spinner size={22} /> Loading comments</div>
      ) : (
        <Comments compact comments={list} me={me} canWrite={canComment} onSignIn={onSignIn} actions={actions} placeholder="Say something about this photo" empty="No one has said anything about this photo yet." />
      )}
    </Sheet>
  )
}
