// 6. Anatomy (lp-anatomy): one real story page, taken apart. (owner: proof)
// Desktop with motion: a pinned stage; the tall capture scrolls inside a browser frame and each
// part pops out beside it. Spread it out / Put it back shows every part at once.
// Without motion (server, no script, reduced motion, tablet): the frame and every part as cards.
// Phone: a stepper, one part per step.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ANATOMY } from '../content/proof.js'
import { Head, Label, Button, Stage, GhostWord, Icon, Missing, SHOT_CAPTION, ArtImg } from '../ui/index.js'
import { hasArt } from '../art/manifest.js'
import { clamp, lerp, remap, smoothstep, win } from '../lib/math.js'
import { cx } from '../ui/cx.js'
import { PartMedia, PartText } from './Parts.jsx'
import { usePinMode, useMounted, useEscape, PIcon, pad2 } from './shared.jsx'
import s from './Anatomy.module.css'

const A = ANATOMY
const PARTS = A.parts

function Header({ compactHead }) {
  return (
    <div className={s.header}>
      <Label dot>{A.eyebrow}</Label>
      <Head before={A.head.before} mark={A.head.mark} after={A.head.after} className={cx(s.head, compactHead && s.headCompact)} />
      <p className={s.lede}>{A.lede}</p>
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
            <ArtImg id={A.shot} alt={A.shotAlt} className={s.page} sizes="(max-width: 760px) 90vw, 520px" />
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

/** The detail card (desktop): two or three true lines and the facts, with a visible close. */
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
  const go = (d) => setStep((v) => clamp(v + d, 0, PARTS.length - 1))
  return (
    <div className={s.stepper} data-js={mounted ? '' : undefined}>
      <div className={s.stepNav}>
        <button type="button" className={s.stepBtn} onClick={() => go(-1)} disabled={step === 0} aria-label={A.prev}>
          <PIcon name="chevl" size={20} />
        </button>
        <span className={s.stepCount} aria-live="polite">
          {A.stepOf} {pad2(step + 1)} / {pad2(PARTS.length)}
        </span>
        <button type="button" className={s.stepBtn} onClick={() => go(1)} disabled={step === PARTS.length - 1} aria-label={A.next}>
          <PIcon name="chevr" size={20} />
        </button>
      </div>
      <div className={s.stepDots} role="group" aria-label={A.eyebrow}>
        {PARTS.map((p, i) => (
          <button key={p.id} type="button" aria-current={i === step ? 'step' : undefined} aria-label={p.label} className={s.stepDot} data-on={i === step || undefined} onClick={() => setStep(i)} />
        ))}
      </div>
      <ol className={s.steps}>
        {PARTS.map((p, i) => (
          <li key={p.id} className={s.step} data-on={i === step || undefined}>
            <div className={s.stepMedia}>
              <PartMedia part={p} />
            </div>
            <div className={s.stepCard}>
              <PartText part={p} n={pad2(i + 1)} />
            </div>
          </li>
        ))}
      </ol>
      <p className={s.cap}>{SHOT_CAPTION}</p>
    </div>
  )
}

export function Anatomy() {
  const mode = usePinMode(900)
  const mounted = useMounted()
  const pinned = mode === 'pin'
  const [exploded, setExploded] = useState(false)
  const [openId, setOpenId] = useState(null)
  const moverRef = useRef(null)
  const viewportRef = useRef(null)
  const lastK = useRef(-2)
  const gridRef = useRef(null)
  const rightRef = useRef(null)
  const markerRef = useRef(null)
  const wireRef = useRef(null)
  const wireEndRef = useRef(null)
  const returnTo = useRef(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const open = (id, e) => {
    returnTo.current = e?.currentTarget || null
    setOpenId(id)
  }
  const onClose = useCallback(() => setOpenId(null), [])

  // Each part gets an equal share of the scroll: the frame holds on it, then glides to the next.
  // The marker sits on the part inside the frame, and a wire joins it to the part's panel.
  const onProgress = (p, pin) => {
    if (modeRef.current !== 'pin') return
    const vp = viewportRef.current
    const mv = moverRef.current
    const grid = gridRef.current
    if (!vp || !mv || !grid) return
    const H = mv.offsetHeight
    const V = vp.clientHeight
    const N = PARTS.length
    const maxY = Math.max(0, H - V)
    const yFor = (i) => clamp(PARTS[i].at * H - V * 0.5, 0, maxY)
    const pp = clamp(remap(p, 0.03, 0.97, 0, 1))
    const f = Math.min(pp * N, N - 0.0001)
    const i = Math.floor(f)
    const t = smoothstep(win(f - i, 0.55, 1))
    const j = Math.min(i + 1, N - 1)
    const y = lerp(yFor(i), yFor(j), t)
    const k = t > 0.5 ? j : i
    mv.style.transform = `translate3d(0, ${(-y).toFixed(1)}px, 0)`
    pin.style.setProperty('--p', pp.toFixed(4))
    const my = clamp(lerp(PARTS[i].at * H - yFor(i), PARTS[j].at * H - yFor(j), t), 10, V - 10)
    if (markerRef.current) markerRef.current.style.transform = `translate3d(0, ${my.toFixed(1)}px, 0)`
    const wire = wireRef.current
    const right = rightRef.current
    if (wire && right) {
      const g = grid.getBoundingClientRect()
      const v = vp.getBoundingClientRect()
      const r = right.getBoundingClientRect()
      const x1 = v.right - g.left
      const y1 = v.top - g.top + my
      const x2 = r.left - g.left - 8
      const y2 = r.top - g.top + r.height / 2
      const c = (x2 - x1) * 0.55
      wire.setAttribute('d', `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + c).toFixed(1)},${y1.toFixed(1)} ${(x2 - c).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`)
      if (wireEndRef.current) {
        wireEndRef.current.setAttribute('cx', x2.toFixed(1))
        wireEndRef.current.setAttribute('cy', y2.toFixed(1))
      }
    }
    if (k === lastK.current) return
    lastK.current = k
    pin.setAttribute('data-active', String(k))
    pin.querySelectorAll('[data-f="tag"],[data-f="panel"]').forEach((el) => {
      const n = Number(el.getAttribute('data-i'))
      el.toggleAttribute('data-reached', n <= k)
      el.toggleAttribute('data-on', n === k)
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
    <Stage id={A.id} svh={380} pinned={pinned} onProgress={onProgress} className={s.stage} pinClassName={s.pin} data-mode={mode} data-exploded={exploded || undefined}>
      <GhostWord className={s.ghost}>{A.head.mark}</GhostWord>

      {/* Phone: a stepper. */}
      <div className={cx('l-wrap', s.phone)}>
        <Header />
        <Stepper mounted={mounted} />
      </div>

      {/* Desktop and tablet. */}
      <div className={s.desk}>
        {pinned ? (
          <div className={s.grid} ref={gridRef}>
            <svg className={s.wire} aria-hidden="true">
              <path ref={wireRef} d="M0,0" />
              <circle ref={wireEndRef} r="6" cx="0" cy="0" />
            </svg>
            <div className={s.left}>
              <Header compactHead />
              <ol className={s.index} aria-label={A.eyebrow}>
                {PARTS.map((p, i) => (
                  <li key={p.id} data-f="tag" data-i={i}>
                    <button type="button" className={s.tag} onClick={(e) => open(p.id, e)} aria-haspopup="dialog">
                      <span className={s.tagNum}>{pad2(i + 1)}</span>
                      {p.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className={s.middle}>
              <Browser moverRef={moverRef} viewportRef={viewportRef}>
                <span className={s.marker} ref={markerRef} aria-hidden="true" />
              </Browser>
              <div className={s.under}>
                <span className={s.cap}>{SHOT_CAPTION}</span>
                <Button variant="ghost" onClick={() => setExploded((v) => !v)} aria-pressed={exploded} icon={exploded ? 'close' : 'plus'}>
                  {exploded ? A.assemble : A.explode}
                </Button>
              </div>
            </div>

            <div className={s.right} ref={rightRef}>
              {PARTS.map((p, i) => (
                <div key={p.id} className={s.panel} data-f="panel" data-i={i}>
                  <div className={s.panelLabel}>
                    <span className={s.tagNum}>{pad2(i + 1)}</span>
                    {p.label}
                  </div>
                  <div className={s.panelMedia}>
                    <PartMedia part={p} />
                  </div>
                  <p className={s.panelLine}>{p.lines[0]}</p>
                  <button type="button" className={s.more} onClick={(e) => open(p.id, e)} aria-haspopup="dialog">
                    {A.detailFor} {p.label.toLowerCase()} <Icon name="arrow" size={16} />
                  </button>
                </div>
              ))}
            </div>

            <ul className={s.burst} aria-hidden={!exploded || undefined}>
              {PARTS.map((p, i) => (
                <li key={p.id} className={s.burstItem} style={{ '--i': i, '--side': p.side === 'left' ? -1 : 1 }} data-side={p.side}>
                  <button type="button" className={s.burstBtn} onClick={(e) => open(p.id, e)} tabIndex={exploded ? 0 : -1} aria-haspopup="dialog">
                    <span className={s.burstMedia}>
                      <PartMedia part={p} compact />
                    </span>
                    <span className={s.burstLabel}>
                      <span className={s.tagNum}>{pad2(i + 1)}</span>
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
