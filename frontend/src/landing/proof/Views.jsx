// 8. Views (lp-views): the same stories, four ways to find them; then browsing by category. (owner: proof)
// With script and motion (pinned): one big phone and the app's view switch. Scrolling switches
// the view (Feed, Calendar, Map, Timeline); the screen before it tucks in behind, so the deck
// of four phones is the claim. A tap on the switch glides to that view.
// Without motion (server, no script, reduced motion): the four phones side by side, complete.
import { useMemo, useRef, useState } from 'react'
import { VIEWS } from '../content/proof.js'
import { SAMPLE_CARDS, OWN_CATEGORY } from '../content/proof.sample.js'
import { Head, Label, Device, Shot, Stage, Cutout, GhostWord, Reveal, SHOT_CAPTION } from '../ui/index.js'
import { clamp, remap } from '../lib/math.js'
import { cx } from '../ui/cx.js'
import { usePinMode, scrollStageTo, PIcon, pad2 } from './shared.jsx'
import s from './Views.module.css'

const V = VIEWS
const N = V.reel.length
const P0 = 0.05
const P1 = 0.95

/** Write the active view into the DOM (pin attribute, phones' depth, the switch's pressed state). */
function paint(root, k) {
  if (!root) return
  root.setAttribute('data-k', String(k))
  root.querySelectorAll('[data-f="phone"]').forEach((el) => el.setAttribute('data-d', String(clamp(Number(el.getAttribute('data-i')) - k, -3, 1))))
  root.querySelectorAll('[data-f="vbtn"]').forEach((el) => el.setAttribute('aria-pressed', String(Number(el.getAttribute('data-i')) === k)))
}

function Switcher({ stageRef, pinRef }) {
  const go = (i) => {
    paint(pinRef.current, i)
    scrollStageTo(stageRef.current, P0 + ((i + 0.5) / N) * (P1 - P0))
  }
  return (
    <div className={s.lead}>
      <div className={s.copy}>
        <div className={s.header}>
          <Label dot>{V.eyebrow}</Label>
          <Head size="head" before={V.head.before} mark={V.head.mark} after={V.head.after} className={s.head} />
          <p className={s.claim}>{V.claim}</p>
        </div>
        <div className={s.vswitch} role="group" aria-label={V.switchLabel}>
          {V.reel.map((r, i) => (
            <button key={r.id} type="button" className={s.vbtn} data-f="vbtn" data-i={i} aria-pressed={i === 0} onClick={() => go(i)}>
              <PIcon name={r.id} size={22} />
              <span>{r.name}</span>
            </button>
          ))}
        </div>
        <div className={s.names} aria-live="polite">
          {V.reel.map((r, i) => (
            <div key={r.id} className={s.nameBlock} data-i={i}>
              <p className={s.bigName}>
                {r.name}
                <span className={s.how}>{r.how}</span>
              </p>
              <p className={s.nameText}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={s.deck}>
        <div className={s.phones}>
          {V.reel.map((r, i) => (
            <div key={r.id} className={s.phone} data-f="phone" data-i={i} data-d={i === 0 ? 0 : 1}>
              <Device id={r.shot} alt={`The ${r.name} view on a phone, showing the family’s stories`} caption={false} className={s.device} width="100%" />
            </div>
          ))}
        </div>
        <Cutout id="p-ruth-tablet" alt={V.readerAlt} className={s.reader} shadow sizes="(max-width: 760px) 30vw, 260px" />
        <p className={s.cap}>{SHOT_CAPTION}</p>
      </div>
    </div>
  )
}

/** No motion: the four phones side by side, each with its name and line. */
function Grid() {
  return (
    <div className={cx('l-wrap', s.flow)}>
      <div className={s.flowTop}>
        <div className={s.header}>
          <Label dot>{V.eyebrow}</Label>
          <Head size="head" before={V.head.before} mark={V.head.mark} after={V.head.after} className={s.head} />
          <p className={s.claim}>{V.claim}</p>
          <p className={s.lede}>{V.lede}</p>
        </div>
        <Cutout id="p-ruth-tablet" alt={V.readerAlt} className={s.flowReader} shadow sizes="220px" />
      </div>
      <ol className={s.grid}>
        {V.reel.map((r, i) => (
          <li key={r.id} className={s.gridItem}>
            <Device id={r.shot} alt={`The ${r.name} view on a phone, showing the family’s stories`} caption={false} className={s.gridDevice} width="100%" />
            <div className={s.gridText}>
              <span className={s.gridNum}>
                <PIcon name={r.id} size={20} />
                {pad2(i + 1)} / {pad2(N)}
              </span>
              <h3 className={s.gridName}>
                {r.name}
                <span className={s.how}>{r.how}</span>
              </h3>
              <p className={s.nameText}>{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className={s.cap}>{SHOT_CAPTION}</p>
    </div>
  )
}

function Browse() {
  const [sel, setSel] = useState([])
  const toggle = (c) => setSel((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))
  // The feed's rule: show a story when any of its categories is selected (Feed.jsx:107-113).
  const shown = useMemo(() => (sel.length ? SAMPLE_CARDS.filter((c) => c.categories.some((k) => sel.includes(k))) : SAMPLE_CARDS), [sel])
  const sig = sel.join('|')
  const chips = [...V.categories.map((c) => ({ id: c, label: c })), { id: OWN_CATEGORY, label: OWN_CATEGORY, own: true }]
  return (
    <>
      <div className={cx('l-wrap', s.browse)}>
        <div className={s.browseHead}>
          <h3 className={s.browseTitle}>{V.browseHead}</h3>
          <p className={s.browseLede}>{V.browseLede}</p>
        </div>
        <div className={s.chips} role="group" aria-label={V.browseHead}>
          <button type="button" className={s.chip} aria-pressed={sel.length === 0} onClick={() => setSel([])}>
            {V.all}
          </button>
          {chips.map((c) => (
            <button key={c.id} type="button" className={cx(s.chip, c.own && s.own)} aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}>
              {c.label}
              {c.own ? <span className={s.ownNote}>{V.ownNote}</span> : null}
            </button>
          ))}
        </div>
        <p className={s.count} aria-live="polite">
          {V.showing} {shown.length} {V.of} {SAMPLE_CARDS.length} {V.stories}
        </p>
        <div className={s.shelf}>
          <Cutout id="p-leo-school" className={s.kidL} shadow sizes="140px" />
          <ul className={s.cards}>
            {SAMPLE_CARDS.map((c) => {
              const on = shown.includes(c)
              return (
                <li key={c.id} className={s.feedCard} data-on={on || undefined} hidden={!on} style={{ '--k': shown.indexOf(c) }} data-sig={sig}>
                  <div className={s.feedInner} key={sig}>
                    <Shot id={c.shot} alt={`Feed card: ${c.title}`} caption={false} sizes="(max-width: 760px) 46vw, 300px" />
                    <span className={s.feedMeta}>
                      <span className={s.feedCat}>{c.categories.join(' · ')}</span>
                      <span className={s.feedTitle}>{c.title}</span>
                    </span>
                  </div>
                </li>
              )
            })}
            <li className={s.kidsSlot} aria-hidden="true">
              <Cutout id="p-leo-school" className={s.kidM} shadow sizes="90px" />
              <Cutout id="p-ivy-trophy" className={s.kidM} shadow sizes="90px" />
            </li>
          </ul>
          <Cutout id="p-ivy-trophy" className={s.kidR} shadow sizes="140px" />
        </div>
      </div>
      <div className={s.floorBand}>
        <div className={cx('l-wrap', s.floorInner)}>
          <p className={s.cap}>{SHOT_CAPTION}</p>
          <div className={s.filters}>
            <Label>{V.filtersLabel}</Label>
            <ul className={s.filterRow}>
              {V.filters.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export function Views() {
  const mode = usePinMode(0)
  const pinned = mode === 'pin'
  const stageRef = useRef(null)
  const pinRef = useRef(null)
  const lastK = useRef(-1)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const onProgress = (p, pin) => {
    if (modeRef.current !== 'pin') return
    pinRef.current = pin
    const k = clamp(Math.floor(remap(p, P0, P1, 0, 1) * N), 0, N - 1)
    if (k === lastK.current) return
    lastK.current = k
    paint(pin, k)
  }

  return (
    <section id={V.id} data-wash="lime" className={s.section} data-mode={mode}>
      <Stage svh={400} pinned={pinned} onProgress={onProgress} className={s.stage} pinClassName={s.pin} stageRef={stageRef} aria-label={V.head.before + ' ' + V.head.mark}>
        <GhostWord className={s.ghost}>{V.head.mark}</GhostWord>
        {pinned ? <Switcher stageRef={stageRef} pinRef={pinRef} /> : <Grid />}
      </Stage>
      <Reveal>
        <Browse />
      </Reveal>
    </section>
  )
}
