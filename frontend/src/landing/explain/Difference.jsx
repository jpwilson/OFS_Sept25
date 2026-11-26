// 2. Difference (lp-difference): built for a family, not an audience. Type-led, white.
import { useEffect, useRef } from 'react'
import { ScrollFrame } from './ScrollFrame.jsx'
import { DIFFERENCE as D } from '../content/explain.js'
import { POST_SAMPLE } from '../content/explain.sample.js'
import { Cutout, Head, Label, Reveal, Section, SHOT_CAPTION, cx } from '../ui/index.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { prefersReducedMotion } from '../lib/scroll.js'
import { easeOutCubic } from '../lib/math.js'
import { onceInView } from './shared.js'
import s from './Difference.module.css'

const WASH = { ads: 'fizz', aud: 'zest', rank: 'lime' }

/** One big instrument. Numbers count up the first time the row is seen. */
function Big({ item, i }) {
  const num = useRef(null)
  const card = useRef(null)
  useEffect(() => {
    const el = card.current
    return onceInView(el, () => {
      el.setAttribute('data-in', '')
      const n = num.current
      const to = Number(item.value)
      if (!n || !item.count || !(to > 0) || prefersReducedMotion()) return
      const t0 = performance.now() + i * 120
      const dur = 900
      const tick = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / dur))
        n.textContent = String(Math.round(easeOutCubic(k) * to))
        if (k < 1) requestAnimationFrame(tick)
      }
      n.textContent = '0'
      requestAnimationFrame(tick)
    })
  }, [item, i])
  return (
    <div ref={card} className={cx(s.big, item.words && s.bigWords)} data-wash={WASH[item.key]} style={{ '--i': i }}>
      <Label strong>{item.label}</Label>
      <span className={s.bigValue}>
        <span ref={num}>{item.value}</span>
      </span>
      {item.list ? (
        <ul className={s.chips} aria-label={item.label}>
          {item.list.map((name, k) => (
            <li key={name} style={{ '--k': k }}>
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={s.bigNote}>{item.note}</p>
    </div>
  )
}

/** A generic social post, drawn here. No brand marks, no brand colours. */
function Post() {
  return (
    <div className={s.post} aria-label={D.toggle.postLabel} role="img">
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
        <ArtImg id={POST_SAMPLE.photo} alt="" sizes="340px" fit="cover" />
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

/** The real story page in a tall frame: wheel, drag or touch scrolls it. */
function StoryFrame() {
  return (
    <ScrollFrame
      id="ui-story-d"
      alt="A whole story page: cover and title, written sections with captioned photos, the journey map and the gallery"
      label={`${D.toggle.storyLabel}. ${D.toggle.storyHint}.`}
      hint={D.toggle.storyHint}
      sizes="(max-width: 760px) 92vw, 720px"
      className={s.story}
    />
  )
}

export function Difference() {
  return (
    <Section id="lp-difference" tone="white" className={s.band} aria-labelledby="lp-difference-h">
      <div className={s.top}>
        <Label dot strong>
          {D.label}
        </Label>
        <Head id="lp-difference-h" className={s.head} {...D.head} />
        <Reveal as="p" className={s.line}>
          {D.line}
        </Reveal>
      </div>

      <div className={s.bigs}>
        {D.big.map((b, i) => (
          <Big key={b.key} item={b} i={i} />
        ))}
      </div>

      <div className={s.compare}>
        <div className={s.side}>
          <fieldset className={s.toggle} data-cmp="">
            <legend className="l-sr">{D.toggle.legend}</legend>
            <label>
              <input type="radio" name="lp-cmp" value="post" defaultChecked />
              <span>{D.toggle.post}</span>
            </label>
            <label>
              <input type="radio" name="lp-cmp" value="story" />
              <span>{D.toggle.story}</span>
            </label>
          </fieldset>
          <p className={s.cmpNote}>
            <span className={s.notePost}>{D.toggle.postNote}</span>
            <span className={s.noteStory}>{D.toggle.storyNote}</span>
          </p>

          <dl className={s.table}>
            {D.table.map((r, i) => (
              <Reveal key={r.k} className={s.row} i={i}>
                <dt className="l-mono">{r.k}</dt>
                <dd>{r.v}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <div className={s.viewer}>
          <div className={s.stageBox}>
            <div className={s.postWrap}>
              <Post />
            </div>
            <StoryFrame />
          </div>
          <p className={cx('l-mono', s.cap)}>
            <span className={s.notePost}>{D.toggle.postLabel}</span>
            <span className={s.noteStory}>{SHOT_CAPTION}</span>
          </p>
          <Cutout id="p-ruth-tablet" alt={D.ruthAlt} className={s.ruth} shadow sizes="(max-width: 760px) 30vw, 220px" />
        </div>
      </div>
    </Section>
  )
}
