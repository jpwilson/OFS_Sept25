// The drawn family tree (owner: FAMILY). docs/app/FAMILY.md section 3.
// Custom SVG for the lines and HTML buttons for the faces, in pixels, as the landing draws
// its tree (src/landing/proof/FamilyTree.jsx). Geometry comes from layout.js; this file only
// paints it, grows it, and lets you move around it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { layout, sizeFor } from './layout.js'
import { Face, FaceSticker } from './Person.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { prefersReducedMotion } from '../lib/capability.js'
import { usePanZoom } from './usePanZoom.js'
import { nameFor } from './words.js'
import s from './TreeView.module.css'

const GROWN_KEY = 'ofs.family.grown'
const BEAT = 420
const seenThisSession = () => {
  try {
    return sessionStorage.getItem(GROWN_KEY) === '1'
  } catch {
    return false
  }
}
const markSeen = () => {
  try {
    sessionStorage.setItem(GROWN_KEY, '1')
  } catch {
    /* private mode: it grows again next time, which is fine */
  }
}

/** Stroke widths and dashes per size (the landing's proportions at each width). */
const STROKE = {
  compact: { under: 8, ink: 2.4, dash: '6 5' },
  regular: { under: 11, ink: 2.8, dash: '8 7' },
  wide: { under: 13, ink: 3.2, dash: '9 8' },
}

/**
 * <TreeView structure onOpen(id) onAdd onTray(id) hold readOnly />
 * hold: a growth step to hold (dev-only ?grow=N); readOnly hides Add a relative.
 */
export default function TreeView({ structure, onOpen, onAdd, onTray, hold = null, readOnly = false, label, fresh }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const size = sizeFor(width || 390)
  const g = useMemo(() => layout(structure, { size }), [structure, size])
  const stroke = STROKE[size]
  const pz = usePanZoom({ geometry: g, wrapRef, ready: width > 0 })

  // is there more of the tree to either side?
  const [edges, setEdges] = useState({ left: false, right: false })
  const readEdges = () => {
    const el = pz.scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
  }
  useEffect(() => {
    const t = requestAnimationFrame(readEdges)
    return () => cancelAnimationFrame(t)
  }) // after every render: zoom, layout and width all move the edges

  // ---- growing in: once per session, armed before paint, released when it scrolls into view
  const [grow, setGrow] = useState(() => (hold != null ? 'held' : 'idle'))
  const armedRef = useRef(false)
  useLayoutEffect(() => {
    if (hold != null || !width) return undefined
    if (armedRef.current) return undefined
    armedRef.current = true
    if (prefersReducedMotion() || seenThisSession() || typeof IntersectionObserver === 'undefined') {
      setGrow('grown')
      return undefined
    }
    setGrow('armed')
    return undefined
  }, [width, hold])
  useEffect(() => {
    if (grow !== 'armed') return undefined
    const el = wrapRef.current
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return
        io.disconnect()
        markSeen()
        setGrow('growing')
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [grow])
  useEffect(() => {
    if (grow !== 'growing') return undefined
    const t = setTimeout(() => setGrow('grown'), (structure.finalStep + 1) * BEAT + 700)
    return () => clearTimeout(t)
  }, [grow, structure.finalStep])

  // ---- people who arrived while you watched pop in on their own
  const seen = useRef(null)
  const [popping, setPopping] = useState(() => new Set())
  useEffect(() => {
    const ids = new Set(g.nodes.map((n) => n.id))
    if (seen.current && fresh) {
      const arrived = [...ids].filter((id) => !seen.current.has(id) && fresh.has(id))
      if (arrived.length && !prefersReducedMotion()) {
        setPopping(new Set(arrived))
        const t = setTimeout(() => setPopping(new Set()), 1200)
        seen.current = ids
        return () => clearTimeout(t)
      }
    }
    seen.current = ids
    return undefined
  }, [g, fresh])

  const state = grow === 'held' ? 'held' : grow === 'grown' || grow === 'idle' ? 'grown' : 'growing'
  const hidden = (step) => (grow === 'held' ? step > hold : false)
  const P = (id) => structure.people.get(id)
  const roving = useRoving(g, structure.me, pz)

  /** One face with its name and word; (ox, oy) is the containing tray's corner, or 0. */
  const renderNode = (n, ox, oy) => {
    const p = P(n.id)
    const you = n.id === structure.me
    return (
      <button
        key={n.id}
        type="button"
        className={cx(s.node, you && s.isYou, n.tray && s.inTray, n.asked && s.isAsked, popping.has(n.id) && s.pop)}
        style={{ left: n.x - ox, top: n.y - oy, '--d': `${n.d}px`, '--step': n.step }}
        data-id={n.id}
        data-ui="tree-person"
        data-hidden={n.tray ? undefined : hidden(n.step) || undefined}
        tabIndex={roving.tabIndex(n.id)}
        onFocus={() => roving.focused(n.id)}
        onClick={() => onOpen?.(n.id)}
        aria-label={nameFor(structure, n.id)}
      >
        <span className={s.photoWrap}>
          <Face name={p.name} src={p.avatar} size={n.d} you={you} tag={p.kind === 'tag'} asked={n.asked} />
          {you ? <FaceSticker kind="you" /> : p.kind === 'tag' ? <FaceSticker kind="tag" /> : n.asked ? <FaceSticker kind="asked" /> : null}
        </span>
        <span className={s.label}>
          <span className={s.name}>{n.first}</span>
          {you ? null : n.word ? <span className={s.word}>{n.word}</span> : null}
        </span>
      </button>
    )
  }

  const count = structure.count
  const groupLabel = label || `Family tree, ${count} ${count === 1 ? 'person' : 'people'}`

  return (
    <div
      ref={wrapRef}
      className={cx(s.wrap, s[size])}
      data-ui="family-tree"
      data-tree-state={state}
      data-size={size}
      data-armed={grow === 'armed' || grow === 'growing' ? '' : undefined}
      data-more-left={edges.left || undefined}
      data-more-right={edges.right || undefined}
      data-grown={grow === 'growing' ? '' : undefined}
      style={{ '--beat': `${BEAT}ms`, '--under': stroke.under, '--ink-w': stroke.ink, '--name': `${g.metrics.name}px`, '--word': `${g.metrics.label}px` }}
    >
      <div className={s.controls} data-ui="tree-controls">
        <div className={s.controlsInner} role="toolbar" aria-label="Move around the tree">
          <button type="button" className={s.ctl} onClick={pz.zoomOut} disabled={!pz.canOut} aria-label="Zoom out" title="Zoom out">
            <Icon name="minus" size={20} />
          </button>
          <button type="button" className={s.ctl} onClick={pz.zoomIn} disabled={!pz.canIn} aria-label="Zoom in" title="Zoom in">
            <Icon name="plus" size={20} />
          </button>
          <button type="button" className={s.ctl} onClick={pz.whole} data-ui="whole-tree" aria-pressed={pz.isWhole} title="Whole tree">
            <Icon name="expand" size={18} />
            <span className={size === 'wide' ? undefined : 'a-sr'}>Whole tree</span>
          </button>
          <button type="button" className={s.ctl} onClick={() => roving.home(true)} data-ui="find-me" title="Find me">
            <Icon name="locate" size={18} />
            <span className={size === 'wide' ? undefined : 'a-sr'}>Find me</span>
          </button>
        </div>
      </div>
      <span className={`${s.fade} ${s.fadeL}`} aria-hidden="true" />
      <span className={`${s.fade} ${s.fadeR}`} aria-hidden="true" />
      <div className={s.scroller} ref={pz.scrollerRef} {...pz.scrollerProps} onScroll={readEdges} data-ui="tree-scroller">
        <div className={s.sizer} style={{ width: g.width * pz.zoom, height: g.height * pz.zoom }}>
          <div
            className={s.canvas}
            style={{ width: g.width, height: g.height, transform: `scale(${pz.zoom})` }}
            role="group"
            aria-label={groupLabel}
            onKeyDown={roving.onKeyDown}
          >
            <svg className={s.lines} width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`} aria-hidden="true" focusable="false">
              {g.lines.map((l) =>
                l.faint || !l.tone ? null : (
                  <path key={`u-${l.id}`} d={l.d} className={s.under} data-tone={l.tone} data-hidden={hidden(l.step) || undefined} style={{ '--step': l.step }} pathLength="1" />
                ),
              )}
              {g.lines.map((l) => (
                <path
                  key={`i-${l.id}`}
                  d={l.d}
                  className={cx(s.ink, l.dashed && s.dashed, l.faint && s.faint, popping.size > 0 && l.ends.some((id) => popping.has(id)) && s.popLine)}
                  data-hidden={hidden(l.step) || undefined}
                  style={{ '--step': l.step, strokeDasharray: l.dashed || l.faint ? stroke.dash : undefined }}
                  pathLength={l.dashed || l.faint ? undefined : 1}
                />
              ))}
            </svg>
            {g.nodes.filter((n) => !n.tray).map((n) => renderNode(n, 0, 0))}
            {g.trays.map((t) => (
              <div
                key={t.id}
                className={s.tray}
                style={{ left: t.x, top: t.y, width: t.w, height: t.h, '--step': t.step }}
                data-hidden={hidden(t.step) || undefined}
                data-ui="tray"
                role="group"
                aria-label={`${t.caption}, ${t.members.length}`}
              >
                <span className={s.caption} style={{ top: t.captionY - t.y }} aria-hidden="true">
                  {t.caption}
                </span>
                {g.nodes.filter((n) => n.tray === t.id).map((n) => renderNode(n, t.x, t.y))}
                {t.more ? (
                  <button
                    type="button"
                    className={cx(s.node, s.inTray, s.more)}
                    style={{ left: t.moreX - t.x, top: t.moreY - t.y, '--d': `${t.moreD}px`, '--step': t.step }}
                    data-id={`more:${t.id}`}
                    data-ui="tray-more"
                    tabIndex={roving.tabIndex(`more:${t.id}`)}
                    onFocus={() => roving.focused(`more:${t.id}`)}
                    onClick={() => onTray?.(t.id)}
                    aria-label={`${t.more} more ${t.caption.toLowerCase()}`}
                  >
                    <span className={s.moreDisc}>+{t.more}</span>
                  </button>
                ) : null}
              </div>
            ))}
            {g.ticks.map((tk) => (
              <span key={tk.id} className={s.tick} style={{ left: tk.x, top: tk.y, '--step': tk.step }} data-hidden={hidden(tk.step) || undefined} aria-hidden="true">
                <Icon name="check" size={size === 'compact' ? 11 : 14} />
              </span>
            ))}
            {readOnly ? null : (
              <button
                type="button"
                className={cx(s.node, s.add)}
                style={{ left: g.add.x, top: g.add.y, '--d': `${g.add.d}px`, '--step': g.add.step }}
                data-id="add"
                data-ui="tree-add"
                data-hidden={hidden(g.add.step) || undefined}
                tabIndex={roving.tabIndex('add')}
                onFocus={() => roving.focused('add')}
                onClick={onAdd}
              >
                <span className={s.addDisc} aria-hidden="true">
                  <Icon name="plus" size={Math.round(g.add.d * 0.3)} />
                </span>
                <span className={s.label}>
                  <span className={cx(s.name, s.addName)}>Add a relative</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- keyboard: a roving tab stop
/** One tab stop in the tree (starting on you); arrows move spatially; Home returns to you. */
function useRoving(g, meId, pz) {
  const [current, setCurrent] = useState(meId)
  const items = useMemo(() => {
    const list = g.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))
    for (const t of g.trays) if (t.more) list.push({ id: `more:${t.id}`, x: t.moreX, y: t.moreY })
    list.push({ id: 'add', x: g.add.x, y: g.add.y })
    return list
  }, [g])
  const has = (id) => items.some((i) => i.id === id)
  const active = has(current) ? current : meId
  const focusId = (id, { centre = false } = {}) => {
    setCurrent(id)
    const el = document.querySelector(`[data-ui="family-tree"] [data-id="${CSS.escape(id)}"]`)
    if (!el) return
    el.focus({ preventScroll: true })
    pz.reveal(items.find((i) => i.id === id), { centre })
  }
  const move = (dir) => {
    const from = items.find((i) => i.id === active)
    if (!from) return
    let best = null, bestScore = Infinity
    for (const it of items) {
      if (it.id === from.id) continue
      const dx = it.x - from.x, dy = it.y - from.y
      const ahead = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy
      const side = dir === 'right' || dir === 'left' ? Math.abs(dy) : Math.abs(dx)
      if (ahead <= 4) continue
      const score = ahead + side * 2.2
      if (score < bestScore) { bestScore = score; best = it }
    }
    if (best) focusId(best.id)
  }
  const onKeyDown = (e) => {
    const k = e.key
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault()
      move(k.replace('Arrow', '').toLowerCase())
    } else if (k === 'Home') {
      e.preventDefault()
      focusId(meId)
    } else if (k === '+' || k === '=') {
      e.preventDefault()
      pz.zoomIn()
    } else if (k === '-' || k === '_') {
      e.preventDefault()
      pz.zoomOut()
    } else if (k === '0') {
      e.preventDefault()
      pz.reset()
    }
  }
  return {
    tabIndex: (id) => (id === active ? 0 : -1),
    focused: (id) => setCurrent(id),
    onKeyDown,
    home: (centre) => {
      pz.findMe()
      requestAnimationFrame(() => focusId(meId, { centre }))
    },
  }
}
