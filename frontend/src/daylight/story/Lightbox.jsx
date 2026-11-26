// The photo lightbox (owner: STORY), loaded on first open. The same library as classic
// (yet-another-react-lightbox, ImageGallery.jsx:3-12) with light paper chrome (PLAN 8 #10).
// Each photo keeps what classic offers: its reactions and its own comments thread
// (GET/POST /media/{id}/comments), plus where and when it was taken from the journey.
import { useCallback, useEffect, useState } from 'react'
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
import { placeHead } from './words.js'
import s from './Lightbox.module.css'

export default function StoryLightbox({ open, index, media, onClose, onIndex, stats, react, canReact, onSignIn, journey, me, canComment }) {
  const [talk, setTalk] = useState(null) // media item whose comments are open
  // the classic help button floats at z-index 9998 over every overlay; step it aside while open
  useEffect(() => {
    if (!open) return
    document.documentElement.classList.add('ofsa-lb')
    return () => document.documentElement.classList.remove('ofsa-lb')
  }, [open])
  const slides = media.map((m) =>
    m.kind === 'video'
      ? { type: 'video', sources: [{ src: m.src, type: /\.webm/i.test(m.src) ? 'video/webm' : 'video/mp4' }], poster: m.poster || undefined, width: m.w || 1280, height: m.h || 720 }
      : { src: imageSrc(m.src, 'original'), alt: m.alt || m.caption || '', width: m.w || undefined, height: m.h || undefined },
  )
  const cur = media[index]
  const stat = cur?.imageId != null ? stats?.[cur.imageId] : null
  const stop = cur ? stopOfPhoto(journey, cur.id) : null
  const when = cur?.ts || stop?.ts
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
        className={s.lb}
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
          controls: () => (
            <>
              <div className={s.top}>
                <span className={cx(s.count, 'a-mono')} aria-live="polite">
                  {index + 1} / {media.length}
                </span>
                <button type="button" className={s.close} onClick={onClose} aria-label="Close photos">
                  <Icon name="close" size={22} />
                </button>
              </div>
              <div className={s.foot} data-ui="lightbox-foot">
                <div className={s.footText}>
                  {stop?.name || when ? (
                    <p className={cx(s.where, 'a-mono')}>
                      {[stop?.n ? `Stop ${stop.n}` : null, stop?.name ? placeHead(stop.name) : null, when ? `${wallDayLabel(when, 0)} · ${wallTime(when)}` : null].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {cur?.caption ? <p className={s.caption}>{cur.caption}</p> : null}
                </div>
                {cur?.imageId != null && react ? (
                  <div className={s.footActs}>
                    <ReactionButton
                      counts={stat?.reaction_counts}
                      total={stat?.like_count}
                      mine={stat?.user_reaction}
                      label="React to this photo"
                      disabled={!canReact}
                      onDisabled={onSignIn}
                      onPick={(t) => react(cur.imageId, t)}
                    />
                    <button type="button" className={s.talk} onClick={() => setTalk(cur)}>
                      <Icon name="comment" size={18} />
                      <span>{stat?.comment_count ? `${stat.comment_count}` : 'Comment'}</span>
                      <span className="a-sr"> on this photo</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ),
        }}
      />
      <PhotoComments item={talk} onClose={() => setTalk(null)} me={me} canComment={canComment} onSignIn={onSignIn} />
    </>
  )
}

/** One photo's own comments, in a sheet over the lightbox. */
function PhotoComments({ item, onClose, me, canComment, onSignIn }) {
  const id = item?.imageId
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    if (id == null) return
    setError(null)
    apiFetch(`/media/${id}/comments`, { auth: !!me })
      .then((rows) => setList(rows || []))
      .catch((e) => setError(e))
  }, [id, me])
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
