// 6. Anatomy (lp-anatomy): one real story page, taken apart. (owner: proof)
// Pinned (script, motion, wider than a phone): the story page is the hero, large enough to
// read, scrolling inside a browser frame. As each part passes the reading line, a sticker names
// it on the page and the part comes out beside it, large: its capture, one true line and its
// numbers. A rail of ten numbered buttons jumps to any part. Spread it out shows all ten.
// Landscape: page right, part left. Portrait (iPad): page on top, part beneath.
// Without motion (server, no script, reduced motion): the frame and every part as cards.
// Phone: a stepper, one part per step.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ANATOMY } from '../content/proof.js'
import { Head, Label, Button, Stage, GhostWord, Icon, Missing, SHOT_CAPTION, ArtImg } from '../ui/index.js'
import { hasArt } from '../art/manifest.js'
import { clamp, lerp, remap, smoothstep, win } from '../lib/math.js'
import { cx } from '../ui/cx.js'
import { PartMedia, PartText, PartFacts } from './Parts.jsx'
import { usePinMode, useMounted, useEscape, scrollStageTo, PIcon, pad2 } from './shared.jsx'
import s from './Anatomy.module.css'

const A = ANATOMY
const PARTS = A.parts
const N = PARTS.length
const P0 = 0.03
const P1 = 0.97

function Header({ tap }) {
  return (
    <div className={s.header}>
      <Label dot>{A.eyebrow}</Label>
      <Head before={A.head.before} mark={A.head.mark} after={A.head.after} className={s.head} />
      <p className={s.lede}>
        {A.lede}
        {tap ? ` ${A.ledeTap}` : null}
      </p>
    </div>
  )
}

function Browser({ moverRef, viewportRef, children }) {
  return (
    <div className={s.browser}>
      <div className={s.chrome} aria-hidden="true">
        <span className={s.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.url}>ourfamilysocials.com</span>
      </div>
      <div className={s.viewport} ref={viewportRef}>
        <div className={s.mover} ref={moverRef}>
          {hasArt(A.shot) ? (
            <ArtImg id={A.shot} alt={A.shotAlt} className={s.page} sizes="(max-width: 760px) 90vw, 820px" />
          ) : (
            // Until the capture lands: a placeholder with the tall page's proportions.
            <Missing id={A.shot} w={1440} h={9000} alt={A.shotAlt} className={s.page} />
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

/** The detail card: every true line and the facts, with a visible close. */
function Detail({ part, onClose, returnTo }) {
  const closeRef = useRef(null)
  useEscape(!!part, onClose)
  useEffect(() => {
    if (!part) return undefined
    closeRef.current?.focus()
    const back = returnTo.current
    return () => back?.focus?.()
  }, [part, returnTo])
  if (!part) return null
  const i = PARTS.indexOf(part)
  return (
    <div className={s.scrim} onClick={onClose}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="lp-anatomy-detail" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label={A.close}>
          <Icon name="close" size={20} />
        </button>
        <div className={s.dialogMedia}>
          <PartMedia part={part} />
        </div>
        <PartText part={part} n={pad2(i + 1)} id="lp-anatomy-detail" />
        <p className={s.cap}>{part.print ? 'Sample photo.' : SHOT_CAPTION}</p>
      </div>
    </div>
  )
}

function Stepper({ mounted }) {
  const [step, setStep] = useState(0)
  const go = (d) => setStep((v) => clamp(v + d, 0, N - 1))
  return (
    <div className={s.stepper} data-js={mounted ? '' : undefined}>
      <div className={s.stepNav}>
        <button type="button" className={s.stepBtn} onClick={() => go(-1)} disabled={step === 0} aria-label={A.prev}>
          <PIcon name="chevl" size={22} />
        </button>
        <span className={s.stepCount} aria-live="polite">
          <span className={s.stepNow}>{pad2(step + 1)}</span> / {pad2(N)}
        </span>
        <button type="button" className={s.stepBtn} onClick={() => go(1)} disabled={step === N - 1} aria-label={A.next}>
          <PIcon name="chevr" size={22} />
        </button>
      </div>
      <div className={s.stepDots} aria-hidden="true">
        {PARTS.map((p, i) => (
          <span key={p.id} className={s.stepDot} data-on={i === step || undefined} data-done={i < step || undefined} />
        ))}
      </div>
      <ol className={s.steps}>
        {PARTS.map((p, i) => (
          <li key={p.id} className={s.step} data-on={i === step || undefined}>
            <p className={s.stepTitle}>
              <span className={s.stepNum}>{pad2(i + 1)}</span>
              {p.label}
            </p>
            {p.offPage ? <p className={s.offNote}>{p.offPage}</p> : null}
            <div className={s.stepMedia}>
              <PartMedia part={p} />
            </div>
            <div className={s.stepCard}>
              <PartText part={p} n={pad2(i + 1)} hideTitle />
            </div>
          </li>
        ))}
      </ol>
      <p className={s.cap}>{SHOT_CAPTION}</p>
    </div>
  )
}

export function Anatomy() {
  const mode = usePinMode('(min-width: 761px)')
  const mounted = useMounted()
  const pinned = mode === 'pin'
  const [exploded, setExploded] = useState(false)
  const [openId, setOpenId] = useState(null)
  const moverRef = useRef(null)
  const viewportRef = useRef(null)
  const stageRef = useRef(null)
  const lastK = useRef(-2)
  const markerRef = useRef(null)
  const returnTo = useRef(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const open = (id, e) => {
    returnTo.current = e?.currentTarget || null
    setOpenId(id)
  }
  const onClose = useCallback(() => setOpenId(null), [])
  // the rail: glide to where part i holds (a quarter of the way into its share of the scroll)
  const jump = (i) => scrollStageTo(stageRef.current, P0 + ((i + 0.25) / N) * (P1 - P0))

  // Each part gets an equal share of the scroll: the page holds on it, then glides to the next.
  // The reading line (and the sticker naming the part) sits on the part inside the frame.
  const onProgress = (p, pin) => {
    if (modeRef.current !== 'pin') return
    const vp = viewportRef.current
    const mv = moverRef.current
    if (!vp || !mv) return
    const H = mv.offsetHeight
    const V = vp.clientHeight
    const maxY = Math.max(0, H - V)
    // a part that is not on this page (offPage) holds the page where the last located part was
    const atOf = (i) => {
      for (let n = i; n >= 0; n--) if (PARTS[n].at != null) return PARTS[n].at
      return 0
    }
    const yFor = (i) => clamp(atOf(i) * H - V * 0.42, 0, maxY)
    const pp = clamp(remap(p, P0, P1, 0, 1))
    const f = Math.min(pp * N, N - 0.0001)
    const i = Math.floor(f)
    const t = smoothstep(win(f - i, 0.55, 1))
    const j = Math.min(i + 1, N - 1)
    const y = lerp(yFor(i), yFor(j), t)
    const k = t > 0.5 ? j : i
    mv.style.transform = `translate3d(0, ${(-y).toFixed(1)}px, 0)`
    pin.style.setProperty('--p', pp.toFixed(4))
    const my = clamp(lerp(atOf(i) * H - yFor(i), atOf(j) * H - yFor(j), t), 24, V - 24)
    if (markerRef.current) markerRef.current.style.transform = `translate3d(0, ${my.toFixed(1)}px, 0)`
    if (k === lastK.current) return
    lastK.current = k
    pin.setAttribute('data-active', String(k))
    // no reading line or sticker on the page for a part that is not on it
    pin.toggleAttribute('data-off', !!PARTS[k].offPage)
    pin.querySelectorAll('[data-f="tag"],[data-f="panel"],[data-f="flag"]').forEach((el) => {
      const n = Number(el.getAttribute('data-i'))
      el.toggleAttribute('data-reached', n <= k)
      el.toggleAttribute('data-on', n === k)
      if (el.tagName === 'BUTTON') el.setAttribute('aria-current', n === k ? 'step' : 'false')
    })
  }

  // Leaving pin mode: clear what the frame loop wrote.
  useEffect(() => {
    if (pinned) return
    lastK.current = -2
    if (moverRef.current) moverRef.current.style.transform = ''
  }, [pinned])

  const openPart = PARTS.find((p) => p.id === openId) || null

  return (
    <Stage id={A.id} svh={560} pinned={pinned} onProgress={onProgress} className={s.stage} pinClassName={s.pin} stageRef={stageRef} data-mode={mode} data-exploded={exploded || undefined}>
      <GhostWord className={s.ghost}>{A.head.mark}</GhostWord>

      {/* Phone: a stepper. */}
      <div className={cx('l-wrap', s.phone)}>
        <Header />
        <Stepper mounted={mounted} />
      </div>

      {/* Tablet and desktop. */}
      <div className={s.desk}>
        {pinned ? (
          <div className={s.grid}>
            <div className={s.top}>
              <Header />
            </div>

            <div className={s.frameCol}>
              <Browser moverRef={moverRef} viewportRef={viewportRef}>
                <span className={s.markerWrap} ref={markerRef} aria-hidden="true">
                  <span className={s.marker} />
                  {PARTS.map((p, i) => (
                    <span key={p.id} className={s.flag} data-f={p.offPage ? undefined : 'flag'} data-i={i}>
                      <span className={s.flagNum}>{pad2(i + 1)}</span>
                      {p.label}
                    </span>
                  ))}
                </span>
              </Browser>
              <div className={s.under}>
                <span className={s.cap}>{SHOT_CAPTION}</span>
                <Button variant="ghost" onClick={() => setExploded((v) => !v)} aria-pressed={exploded} icon={exploded ? 'close' : 'plus'} className={s.explodeBtn}>
                  {exploded ? A.assemble : A.explode}
                </Button>
              </div>
            </div>

            <div className={s.parts}>
              {PARTS.map((p, i) => (
                <div key={p.id} className={s.panel} data-f="panel" data-i={i} data-on={i === 0 || undefined}>
                  <p className={s.panelLabel}>
                    <span className={s.panelNum}>{pad2(i + 1)}</span>
                    {p.label}
                  </p>
                  {p.offPage ? <p className={s.offNote}>{p.offPage}</p> : null}
                  <div className={s.panelBody}>
                    <div className={s.panelMedia}>
                      <PartMedia part={p} />
                    </div>
                    <div className={s.panelText}>
                      <p className={s.panelLine}>{p.lines[0]}</p>
                      <PartFacts part={p} />
                      <button type="button" className={s.more} onClick={(e) => open(p.id, e)} aria-haspopup="dialog">
                        {A.detailFor} {p.label.toLowerCase()} <Icon name="arrow" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <ol className={s.rail} aria-label={A.partsLabel}>
              {PARTS.map((p, i) => (
                <li key={p.id}>
                  <button type="button" className={s.railBtn} data-f="tag" data-i={i} aria-label={`${A.jump} ${pad2(i + 1)}: ${p.label}`} title={p.label} onClick={() => jump(i)}>
                    {pad2(i + 1)}
                  </button>
                </li>
              ))}
            </ol>

            <ul className={s.burst} aria-hidden={!exploded || undefined}>
              {PARTS.map((p, i) => (
                <li key={p.id} className={s.burstItem} style={{ '--i': i, '--side': p.side === 'left' ? -1 : 1 }} data-side={p.side}>
                  <button type="button" className={s.burstBtn} onClick={(e) => open(p.id, e)} tabIndex={exploded ? 0 : -1} aria-haspopup="dialog">
                    <span className={s.burstMedia}>
                      <PartMedia part={p} compact />
                    </span>
                    <span className={s.burstLabel}>
                      <span className={s.panelNum}>{pad2(i + 1)}</span>
                      {p.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={cx('l-wrap', s.flow)}>
            <Header />
            <div className={s.flowBody}>
              <div className={s.flowFrame}>
                <Browser moverRef={moverRef} viewportRef={viewportRef} />
                <span className={s.cap}>{SHOT_CAPTION}</span>
              </div>
              <ol className={s.cards}>
                {PARTS.map((p, i) => (
                  <li key={p.id} className={s.card}>
                    <div className={s.cardMedia}>
                      <PartMedia part={p} />
                    </div>
                    <PartText part={p} n={pad2(i + 1)} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <Detail part={openPart} onClose={onClose} returnTo={returnTo} />
    </Stage>
  )
}
