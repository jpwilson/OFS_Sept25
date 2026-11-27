// 9. Audience (lp-audience): exactly who can open what. (owner: proof)
// Lead: Maya and everyone who might ask, standing in a line-up. Scrolling walks the five settings
// in the switch's order (Private, Close Family, Followers, Custom Group, Public) and each face
// lights up when that person can open the story. Beneath it, the exact matrix.
//
// One source of truth: the checked radio of the AudienceSwitch. Every state (faces, readout,
// matrix row, phone row list) is drawn from it in CSS with :has(), so the prerender and a page
// without script show a complete static version resting on Followers. With motion and script,
// the pinned stage checks the radio for the step the scroll is on (DOM only, no React state).
// Faces light from AUDIENCE_MATRIX, the same verified table as the matrix (content/proof.js).
import { useRef } from 'react'
import { AUDIENCE, AUDIENCE_COLUMNS, AUDIENCE_MATRIX, AUDIENCE_STEPS, CELL_TEXT, CELL_SR, LINEUP, shortName } from '../content/proof.js'
import { Head, Label, AudienceSwitch, AUDIENCES, Cutout, GhostWord, Icon, Stage } from '../ui/index.js'
import { maybeArt } from '../art/manifest.js'
import { clamp, remap } from '../lib/math.js'
import { cx } from '../ui/cx.js'
import { PIcon, usePinMode, scrollStageTo } from './shared.jsx'
import s from './Audience.module.css'

const AU = AUDIENCE
const SLUG = Object.fromEntries(AUDIENCES.map((a) => [a.name, a.slug]))
const ROW = Object.fromEntries(AUDIENCE_MATRIX.map((r) => [r.name, r]))
const N = AUDIENCES.length
// the stage's progress window: a little lead-in and run-out around the five holds
const P0 = 0.04
const P1 = 0.96

/**
 * Where each figure stands. row: one line (wide screens). rows: two rows (portrait and phone).
 * x: centre, % of the line's width. y: feet above the floor, % of its height. h: height, % of
 * its height (from the film's relative heights, so the adults and kids read true).
 */
const SPOT = {
  web1: { row: { x: 4, y: 3, h: 82 }, rows: { x: 7, y: 35, h: 54 } },
  finn: { row: { x: 13.2, y: 0, h: 90 }, rows: { x: 23, y: 35, h: 60 } },
  kate: { row: { x: 22.4, y: 0, h: 92 }, rows: { x: 12, y: 0, h: 76 } },
  ruth: { row: { x: 31.6, y: 0, h: 87 }, rows: { x: 31, y: 0, h: 72 } },
  maya: { row: { x: 42, y: -1, h: 100 }, rows: { x: 51, y: -2, h: 84 } },
  joe: { row: { x: 52.4, y: 0, h: 96 }, rows: { x: 71, y: 0, h: 79 } },
  marcus: { row: { x: 61.6, y: 0, h: 97 }, rows: { x: 90, y: 0, h: 80 } },
  sam: { row: { x: 70.8, y: 0, h: 95 }, rows: { x: 41, y: 35, h: 63 } },
  priya: { row: { x: 80, y: 0, h: 88 }, rows: { x: 59, y: 35, h: 59 } },
  deb: { row: { x: 89.2, y: 0, h: 89 }, rows: { x: 77, y: 35, h: 60 } },
  web2: { row: { x: 97, y: 3, h: 82 }, rows: { x: 93, y: 35, h: 54 } },
}

function spotVars(id) {
  const p = SPOT[id]
  // the back row (feet above the floor) wears its badge above the head, clear of the front row
  return { '--x': p.row.x, '--y': p.row.y, '--h': p.row.h, '--xm': p.rows.x, '--ym': p.rows.y, '--hm': p.rows.h, '--bm': p.rows.y > 0 ? 100 : 40 }
}

/** Each figure carries its state at every setting, read from the matrix. */
function stateAttrs(col) {
  const out = {}
  for (const a of AUDIENCES) out[`data-${a.slug}`] = ROW[a.name].cells[col]
  return out
}

function Figure({ f, i }) {
  const isYou = f.col === 'you'
  const name = f.anon ? AU.anyone : shortName(f.id)
  if (f.anon) {
    const a = maybeArt(f.art)
    return (
      <li className={cx(s.who, s.anon)} style={{ ...spotVars(f.id), '--i': i }} {...stateAttrs(f.col)} aria-hidden="true">
        <span className={s.fig}>
          {a ? <span className={s.mask} style={{ WebkitMaskImage: `url(${a.srcM})`, maskImage: `url(${a.srcM})`, aspectRatio: `${a.w} / ${a.h}` }} /> : null}
        </span>
      </li>
    )
  }
  return (
    <li className={cx(s.who, isYou && s.you)} style={{ ...spotVars(f.id), '--i': i }} {...stateAttrs(f.col)}>
      <span className={s.fig}>
        <span className={s.shadow} aria-hidden="true" />
        <Cutout id={f.art} alt="" className={s.art} sizes="(max-width: 760px) 34vw, 220px" />
      </span>
      <span className={s.badge}>
        <span className={s.badgeRow}>
          <span className={s.tick} aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
          <span className={s.badgeName}>{isYou ? `${name} · ${AU.you}` : name}</span>
        </span>
      </span>
    </li>
  )
}

/** What the line-up says at each setting; only the checked one shows (CSS). */
function Readouts() {
  return (
    <div className={s.reads} aria-live="polite">
      {AUDIENCES.map((a) => {
        const st = AUDIENCE_STEPS[a.name]
        return (
          <div key={a.slug} className={s.read} data-v={a.slug}>
            <span className={s.readTag}>
              <span className={s.readAud}>{a.name}</span>
              <span className={s.readStory}>{st.story}</span>
            </span>
            <p className={s.readWho}>{st.who}</p>
            <p className={s.readMore}>{st.more}</p>
          </div>
        )
      })}
    </div>
  )
}

/** "Opens it" with a tick, or a quiet empty cell (named for screen readers only). */
function Cell({ state }) {
  if (state !== 'open') return <span className={cx(s.cell, s.cellQuiet)}><span className="l-sr">{CELL_SR}</span></span>
  return (
    <span className={s.cell} data-state="open">
      <span className={s.mark} aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
      <span className={s.cellText}>{CELL_TEXT.open}</span>
    </span>
  )
}

function ColHead({ c }) {
  return (
    <span className={s.colHead}>
      {c.key ? (
        <span className={s.keyIcon} aria-hidden="true">
          <PIcon name="key" size={18} />
        </span>
      ) : null}
      <span className={s.colLabel}>{c.label}</span>
      <span className={s.colSub}>{c.sub}</span>
    </span>
  )
}

export function Audience() {
  const mode = usePinMode(0)
  const pinned = mode === 'pin'
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const lastK = useRef(-1)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const check = (slug) => {
    const input = rootRef.current?.querySelector(`input[data-aud-name][value='${slug}']`)
    if (input) input.checked = true
  }

  // Pinned: the scroll picks the setting. One step per fifth of the stage.
  const onProgress = (p, pin) => {
    if (modeRef.current !== 'pin') return
    const k = clamp(Math.floor(remap(p, P0, P1, 0, 1) * N), 0, N - 1)
    if (k === lastK.current) return
    lastK.current = k
    pin.setAttribute('data-k', String(k))
    check(AUDIENCES[k].slug)
  }

  // A click on the switch: pinned, glide to that setting's hold (the scroll then keeps it).
  const onSwitch = (name) => {
    if (modeRef.current !== 'pin') return
    const k = AUDIENCES.findIndex((a) => a.name === name)
    lastK.current = k
    scrollStageTo(stageRef.current, P0 + ((k + 0.5) / N) * (P1 - P0))
  }

  // A row of the matrix lights the line-up above without moving the page.
  const pickRow = (name) => check(SLUG[name])

  return (
    <section id={AU.id} data-wash="tide" className={s.section} ref={rootRef} data-mode={mode}>
      <Stage svh={460} pinned={pinned} onProgress={onProgress} className={s.stage} pinClassName={s.pin} stageRef={stageRef} aria-label={AU.eyebrow}>
        <GhostWord className={s.ghost}>{AU.head.mark}</GhostWord>
        <div className={s.lead}>
          <div className={s.header}>
            <Label dot>{AU.eyebrow}</Label>
            <Head before={AU.head.before} mark={AU.head.mark} after={AU.head.after} className={s.head} />
          </div>
          <div className={s.control}>
            <AudienceSwitch name="lp-audience-matrix" label={AU.switchLabel} size="lg" className={s.switch} onChange={onSwitch} />
            <Readouts />
          </div>
          <figure className={s.lineup}>
            <ul className={s.line}>
              {LINEUP.map((f, i) => (
                <Figure key={f.id} f={f} i={i} />
              ))}
              <li className={s.anyTag} aria-hidden="true">
                {AU.anyone}
              </li>
            </ul>
            <figcaption className="l-sr">{AU.lede}</figcaption>
          </figure>
        </div>
      </Stage>

      <div className={cx('l-wrap', s.detail)}>
        <div className={s.detailHead}>
          <h3 className={s.matrixHead}>{AU.matrixHead}</h3>
          <p className={s.matrixLede}>{AU.matrixLede}</p>
        </div>

        {/* Wide: the full matrix. */}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className="l-sr">{AU.head.before + ' ' + AU.head.mark}: each story setting against each kind of reader.</caption>
            <thead>
              <tr>
                <th scope="col" className={s.corner}>
                  <span className={s.cornerA}>{AU.rowHead}</span>
                  <span className={s.cornerB}>{AU.colHead}</span>
                </th>
                {AUDIENCE_COLUMNS.map((c) => (
                  <th key={c.id} scope="col" className={cx(s.th, c.key && s.keyCol)}>
                    <ColHead c={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIENCE_MATRIX.map((r) => (
                <tr key={r.name} className={s.tr} data-v={SLUG[r.name]}>
                  <th scope="row" className={s.rowHead}>
                    <button type="button" className={s.rowBtn} onClick={() => pickRow(r.name)}>
                      <span className={s.rowName}>{r.name}</span>
                      <span className={s.rowNote}>{r.note}</span>
                    </button>
                  </th>
                  {AUDIENCE_COLUMNS.map((c) => (
                    <td key={c.id} className={cx(s.td, c.key && s.keyCol)}>
                      <Cell state={r.cells[c.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phone: every row as a list; the chosen one opens (CSS), the rest are one tap away. */}
        <div className={s.rowLists}>
          {AUDIENCE_MATRIX.map((r) => (
            <div key={r.name} className={s.rowList} data-v={SLUG[r.name]}>
              <button type="button" className={s.rowListHead} onClick={() => pickRow(r.name)}>
                <span className={s.rowName}>{r.name}</span>
                <span className={s.rowNote}>{r.note}</span>
                <span className={s.rowChevron} aria-hidden="true">
                  <PIcon name="chevr" size={18} />
                </span>
              </button>
              <ul>
                {AUDIENCE_COLUMNS.map((c) => (
                  <li key={c.id} className={cx(s.rowItem, c.key && s.keyItem)} data-state={r.cells[c.id]}>
                    <ColHead c={c} />
                    <Cell state={r.cells[c.id]} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
