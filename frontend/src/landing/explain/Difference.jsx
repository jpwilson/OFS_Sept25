// 2. Difference (lp-difference): built for family and close friends, not an audience.
// Round three: the statement arrives as three beats, the boxed word alternates between
// "family" and "close friends" (static "family and close friends" in the prerender and under
// reduced motion), three cards that are each one complete claim, then a post against a story.
import { useEffect, useRef } from 'react'
import { ScrollFrame } from './ScrollFrame.jsx'
import { DIFFERENCE as D } from '../content/explain.js'
import { POST_SAMPLE } from '../content/explain.sample.js'
import { AUDIENCES, Cutout, Head, Label, Reveal, Section, SHOT_CAPTION, Sticker, cx } from '../ui/index.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { prefersReducedMotion } from '../lib/scroll.js'
import { onceInView } from './shared.js'
import s from './Difference.module.css'

const WASH = { ads: 'fizz', aud: 'zest', rank: 'lime' }
const PULSE_MS = 2800 // one word change every 2.8s: a slow pulse

/**
 * The beats arrive in turn the first time the statement is seen; then, while it is on
 * screen, the boxed word alternates and the people beside it change with it. DOM writes
 * only; nothing here runs on the server or under reduced motion.
 */
function useStatement(bandRef, headRef, wordRef) {
  useEffect(() => {
    const band = bandRef.current
    const head = headRef.current
    const word = wordRef.current
    if (!band || !head || !word || prefersReducedMotion()) return
    band.setAttribute('data-live', '')
    // The two words share one cell and cross-fade, so one is always legible; the box's
    // width eases to the incoming word instead of jumping.
    const words = [...word.children]
    let k = 0
    let timer = 0
    let flip = 0
    let visible = false
    let ready = false
    const fit = () => {
      const w = words[k] ? words[k].offsetWidth : 0
      if (w) word.style.width = `${w}px`
    }
    fit()
    window.addEventListener('resize', fit)
    const tick = () => {
      k = (k + 1) % words.length
      words.forEach((el, i) => el.toggleAttribute('data-on', i === k))
      band.setAttribute('data-word', k === 0 ? 'family' : 'friends')
      fit()
    }
    const run = () => {
      window.clearInterval(timer)
      if (visible && ready) timer = window.setInterval(tick, PULSE_MS)
    }
    const stopArrive = onceInView(head, () => {
      band.setAttribute('data-in', '')
      // start alternating once the third beat has landed
      flip = window.setTimeout(() => {
        ready = true
        band.setAttribute('data-pulse', '')
        run()
      }, 1900)
    }, 0.3)
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting)
            run()
          })
        : null
    if (io) io.observe(head)
    return () => {
      stopArrive()
      if (io) io.disconnect()
      window.clearInterval(timer)
      window.clearTimeout(flip)
      window.removeEventListener('resize', fit)
    }
  }, [bandRef, headRef, wordRef])
}

/** The people beside the statement: the household, with family or close friends at the sides. */
function People() {
  return (
    <div className={s.people}>
      <Cutout id="p-priya-wave" alt="" className={cx(s.side, s.friend, s.sideL)} shadow sizes="(max-width: 760px) 26vw, 200px" />
      <Cutout id="p-ruth-wave" alt="" className={cx(s.side, s.fam, s.sideL)} shadow sizes="(max-width: 760px) 26vw, 200px" />
      <Cutout id="g-family-hero" alt={D.peopleAlt.family} className={s.household} shadow sizes="(max-width: 760px) 60vw, 440px" />
      <Cutout id="p-joe-phone" alt="" className={cx(s.side, s.fam, s.sideR)} shadow sizes="(max-width: 760px) 26vw, 200px" />
      <Cutout id="p-sam-wave" alt={D.peopleAlt.friends} className={cx(s.side, s.friend, s.sideR)} shadow sizes="(max-width: 760px) 26vw, 200px" />
    </div>
  )
}

/** One complete claim: the numeral and its noun at the same size. */
function Claim({ item, i }) {
  const card = useRef(null)
  useEffect(() => {
    const el = card.current
    return onceInView(el, () => el && el.setAttribute('data-in', ''), 0.3)
  }, [])
  return (
    <div ref={card} className={s.claim} data-wash={WASH[item.key]} style={{ '--i': i }}>
      <h3 className={s.claimHead}>
        {item.words ? (
          item.words
        ) : (
          <>
            <span className={s.num}>{item.num}</span> {item.noun}
          </>
        )}
      </h3>
      {item.list ? (
        <ul className={s.chips} aria-label="The five audiences">
          {AUDIENCES.map((a, k) => (
            <li key={a.slug} style={{ '--k': k }}>
              {a.name}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={s.claimNote}>{item.note}</p>
    </div>
  )
}

/** A generic social post, drawn here. No brand marks, no brand colors. */
function Post() {
  return (
    <div className={s.post} aria-label={D.cmp.postLabel} role="img">
      <div className={s.postTop} aria-hidden="true">
        <span className={s.postAvatar} />
        <span className={s.postBars}>
          <i />
          <i />
        </span>
        <span className={s.postDots}>
          <i />
          <i />
          <i />
        </span>
      </div>
      <span className={s.postPhoto}>
        <ArtImg id={POST_SAMPLE.photo} alt="" sizes="300px" fit="cover" />
      </span>
      <div className={s.postIcons} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5z" />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d="M21 4 3 11l7 2.5L12.5 21z M10 13.5 21 4" />
        </svg>
        <svg viewBox="0 0 24 24" className={s.postSave}>
          <path d="M6.5 4h11v16l-5.5-4-5.5 4z" />
        </svg>
      </div>
      <p className={s.postCaption}>
        <span className={s.postName} aria-hidden="true" />
        {POST_SAMPLE.caption}
      </p>
    </div>
  )
}

export function Difference() {
  const band = useRef(null)
  const head = useRef(null)
  const word = useRef(null)
  useStatement(band, head, word)

  return (
    <Section id="lp-difference" tone="white" className={s.band} sectionRef={band} data-word="family" aria-labelledby="lp-difference-h">
      {/* ---------- the statement, as three beats ---------- */}
      <div className={s.poster}>
        <div className={s.words}>
          <Label dot strong>
            {D.label}
          </Label>
          <h2 id="lp-difference-h" ref={head} className={s.beats}>
            {D.beats.map((b, i) => (
              <span key={b} className={s.beat} style={{ '--b': i }}>
                {b}{' '}
              </span>
            ))}
            <span className={cx(s.beat, s.beatLast)} style={{ '--b': D.beats.length }}>
              {D.last.before}{' '}
              <span className={cx('l-nowrap', s.markLine)}>
                <Sticker className={s.mark}>
                  <span className={s.markStatic}>{D.markStatic}</span>
                  <span ref={word} className={s.markLive} aria-hidden="true">
                    {D.marks.map((m, i) => (
                      <span key={m} className={s.markWord} data-on={i === 0 ? '' : undefined}>
                        {m}
                      </span>
                    ))}
                  </span>
                </Sticker>
                {D.last.after}
              </span>
            </span>
          </h2>
          <p className={s.line}>{D.line}</p>
        </div>
        <People />
      </div>

      {/* ---------- three complete claims ---------- */}
      <div className={s.claims}>
        {D.big.map((b, i) => (
          <Claim key={b.key} item={b} i={i} />
        ))}
      </div>

      {/* ---------- a post against a story ---------- */}
      <div className={s.cmp}>
        <Head as="h3" size="sm" className={s.cmpHead} {...D.cmp.head} />
        <div className={s.vs}>
          <figure className={s.postSide}>
            <p className={s.vsName}>{D.cmp.post}</p>
            <p className={s.vsNote}>{D.cmp.postNote}</p>
            <div className={s.postBox}>
              <Post />
            </div>
            <figcaption className={cx('l-mono', s.cap)}>{D.cmp.postLabel}</figcaption>
          </figure>
          <figure className={s.storySide}>
            <p className={s.vsName}>{D.cmp.story}</p>
            <p className={s.vsNote}>{D.cmp.storyNote}</p>
            <div className={s.storyBox}>
              <ScrollFrame
                id="ui-story-d"
                alt="A whole story page: cover and title, written sections with captioned photos, the journey map and the gallery"
                label={`${D.cmp.storyLabel}. ${D.cmp.storyHint}.`}
                hint={D.cmp.storyHint}
                sizes="(max-width: 760px) 92vw, 760px"
                className={s.story}
              />
              <Cutout id="p-ruth-tablet" alt={D.ruthAlt} className={s.ruth} shadow sizes="(max-width: 760px) 30vw, 220px" />
            </div>
            <figcaption className={cx('l-mono', s.cap)}>{SHOT_CAPTION}</figcaption>
          </figure>
        </div>
      </div>

      {/* ---------- the short version, in full ---------- */}
      <div className={s.facts}>
        <Label strong>{D.tableLabel}</Label>
        <dl className={s.table}>
          {D.table.map((r, i) => (
            <Reveal key={r.k} className={s.row} i={i}>
              <dt>{r.k}</dt>
              <dd>{r.v}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </Section>
  )
}
