// 4. Create (lp-create): AI Create and its three modes (fizz). Then "Or write it yourself".
import { useEffect, useRef } from 'react'
import { CREATE as C } from '../content/explain.js'
import { Cutout, Head, Label, Reveal, Section, SHOT_CAPTION, Sticker, cx, useFrame } from '../ui/index.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { ScrollFrame } from './ScrollFrame.jsx'
import { onceInView, two } from './shared.js'
import s from './Create.module.css'

const TILTS = [-4, 3, -2, 5, -3]

export function Create() {
  const root = useRef(null)
  const phone = useRef(null)
  const back = useRef(null)
  const st = useRef({ step: 0, manual: false })

  /** Show step i: DOM writes only (scroll never goes through React state). */
  const setStep = (i, focus) => {
    const el = root.current
    if (!el) return
    st.current.step = i
    el.setAttribute('data-step', String(i))
    el.querySelectorAll('[data-tab]').forEach((t, k) => {
      t.setAttribute('aria-selected', k === i ? 'true' : 'false')
      t.tabIndex = k === i ? 0 : -1
      if (k === i && focus) t.focus()
    })
    el.querySelectorAll('[data-panel]').forEach((p, k) => {
      if (k === i) p.removeAttribute('aria-hidden')
      else p.setAttribute('aria-hidden', 'true')
    })
  }

  // Scroll steps the phone through its three screens until someone picks a tab. On wide
  // screens the phone is sticky, so the grid's progress past it sets the step; on phones it
  // scrolls with the page, so its own position does.
  useFrame(({ vh, vw }) => {
    const el = phone.current
    const grid = root.current
    if (!el || !grid) return
    const g = grid.getBoundingClientRect()
    if (g.bottom < 0 || g.top > vh) {
      st.current.manual = false
      return
    }
    if (st.current.manual) return
    let i
    if (vw > 900) {
      const p = (vh * 0.42 - g.top) / Math.max(1, g.height - vh * 0.6)
      i = p < 0.3 ? 0 : p < 0.62 ? 1 : 2
    } else {
      const r = el.getBoundingClientRect()
      const c = (r.top + r.height / 2) / vh
      i = c > 0.55 ? 0 : c > 0.3 ? 1 : 2
    }
    if (i !== st.current.step) setStep(i)
  })

  useEffect(() => onceInView(back.current, () => back.current && back.current.setAttribute('data-in', ''), 0.6), [])

  const pick = (i, focus) => {
    st.current.manual = true
    setStep(i, focus)
  }
  const onKey = (e) => {
    const n = C.steps.length
    const cur = st.current.step
    const to = e.key === 'ArrowRight' ? (cur + 1) % n : e.key === 'ArrowLeft' ? (cur + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to < 0) return
    e.preventDefault()
    pick(to, true)
  }

  return (
    <Section id="lp-create" wash="fizz" className={s.band} aria-labelledby="lp-create-h">
      <div ref={root} className={s.grid} data-step="0">
        <div className={s.copy}>
          <Label dot strong>
            {C.label}
          </Label>
          <Head id="lp-create-h" className={s.head} {...C.head} />
          <p className="l-lede">{C.lede}</p>

          <div className={s.modes}>
            <Label strong className={s.subLabel}>
              {C.modesLabel}
            </Label>
            <ul className={s.modeList}>
              {C.modes.map((m, i) => (
                <Reveal as="li" key={m.name} i={i} className={s.mode}>
                  <span className={s.modeN} aria-hidden="true">
                    {two(i + 1)}
                  </span>
                  <b>{m.name}</b>
                  {m.tag ? <span className={s.tag}>{m.tag}</span> : null}
                  <span className={s.modeText}>{m.text}</span>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className={s.back}>
            <Label strong className={s.subLabel}>
              {C.backLabel}
            </Label>
            <ul ref={back} className={s.backList}>
              {C.back.map((b, i) => (
                <li key={b} style={{ '--k': i }}>
                  <Sticker tilt={TILTS[i % TILTS.length]} className={s.backSticker}>
                    {b}
                  </Sticker>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={s.stage}>
          <div className={s.tabs} role="tablist" aria-label={C.stepsLegend} onKeyDown={onKey}>
            {C.steps.map((t, i) => (
              <button
                key={t.tab}
                type="button"
                role="tab"
                id={`lp-create-tab-${i}`}
                aria-controls={`lp-create-panel-${i}`}
                aria-selected={i === 0 ? 'true' : 'false'}
                tabIndex={i === 0 ? 0 : -1}
                data-tab=""
                className={s.tab}
                onClick={() => pick(i)}
              >
                <i aria-hidden="true">{i + 1}</i>
                {t.tab}
              </button>
            ))}
          </div>
          <div ref={phone} className={s.phone}>
            {C.steps.map((t, i) => (
              <div
                key={t.shot}
                id={`lp-create-panel-${i}`}
                role="tabpanel"
                aria-labelledby={`lp-create-tab-${i}`}
                aria-hidden={i === 0 ? undefined : 'true'}
                data-panel=""
                className={s.panel}
              >
                <span className={s.win}>
                  <span className={s.bar} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <b>{C.label}</b>
                  </span>
                  <span className={s.screen}>
                    <ArtImg id={t.shot} alt={t.alt} className={s.winImg} sizes="(max-width: 760px) 86vw, 560px" />
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className={cx('l-mono', s.devCap)}>{SHOT_CAPTION}</p>
          <Cutout id="p-maya-tada" alt={C.mayaAlt} className={s.maya} shadow sizes="(max-width: 760px) 40vw, 300px" />
        </div>
      </div>

      <div className={s.limits}>
        <Label strong className={s.subLabel}>
          {C.limitsLabel}
        </Label>
        <dl className={s.limitRow}>
          {C.limits.map((l) => (
            <div key={l.k} className={s.limit}>
              <dt className="l-mono">{l.k}</dt>
              <dd>{l.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={s.write}>
        <div className={s.writeCopy}>
          <Label dot strong>
            {C.write.label}
          </Label>
          <h3 className={s.writeHead}>{C.write.head}</h3>
          <ul className={s.writeList}>
            {C.write.list.map((t, i) => (
              <Reveal as="li" key={t} i={i}>
                {t}
              </Reveal>
            ))}
          </ul>
        </div>
        <figure className={s.editorFig}>
          <ScrollFrame id={C.write.shot} alt={C.write.shotAlt} label={`${C.write.shotAlt}. ${C.write.hint}.`} hint={C.write.hint} start={0.205} sizes="(max-width: 760px) 92vw, 720px" className={s.editor} />
          <figcaption className="l-mono">{SHOT_CAPTION}</figcaption>
        </figure>
      </div>
    </Section>
  )
}
