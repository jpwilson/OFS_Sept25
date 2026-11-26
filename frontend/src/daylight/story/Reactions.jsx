// The ten reactions, drawn (owner: STORY). The API's reaction types are heart, laugh,
// sad, wow, love, clap, fire, hundred, hug and smile (ImageGallery.jsx:19-30); classic
// shows them as emoji and opens the picker on hover only, so a phone cannot choose.
// Here each is a small sticker drawing, and the tray opens on tap or long-press.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { overlayRoot } from '../ui/overlay.js'
import { cx } from '../ui/cx.js'
import s from './Reactions.module.css'

export const REACTIONS = [
  { type: 'heart', label: 'Love' },
  { type: 'laugh', label: 'Haha' },
  { type: 'love', label: 'Heart eyes' },
  { type: 'wow', label: 'Wow' },
  { type: 'clap', label: 'Applause' },
  { type: 'fire', label: 'Fire' },
  { type: 'hundred', label: 'Perfect' },
  { type: 'hug', label: 'Care' },
  { type: 'smile', label: 'Happy' },
  { type: 'sad', label: 'Sad' },
]
export const reactionLabel = (t) => REACTIONS.find((r) => r.type === t)?.label || 'Love'

const INK = '#101B3B'
const W = { fizz: '#FF62C4', sun: '#FFD43B', azure: '#3AA8FF', violet: '#A98BFF', zest: '#FF8A1F', lime: '#C6F135', tide: '#19CFC7', white: '#FFFFFF', azureTint: '#D8EDFF' }
const face = (fill) => <circle cx="12" cy="12" r="9.2" fill={fill} stroke={INK} strokeWidth="1.8" />
const dots = (
  <>
    <circle cx="9" cy="10" r="1.25" fill={INK} />
    <circle cx="15" cy="10" r="1.25" fill={INK} />
  </>
)
const heartPath = (x, y, k) => `M${x} ${y + 3.2 * k}c${-0.6 * k} ${-1.2 * k} ${-3.6 * k} ${-2.6 * k} ${-3.6 * k} ${-4.8 * k}c0 ${-1.4 * k} ${1 * k} ${-2.3 * k} ${2.1 * k} ${-2.3 * k}c${0.7 * k} 0 ${1.2 * k} ${0.3 * k} ${1.5 * k} ${0.8 * k}c${0.3 * k} ${-0.5 * k} ${0.8 * k} ${-0.8 * k} ${1.5 * k} ${-0.8 * k}c${1.1 * k} 0 ${2.1 * k} ${0.9 * k} ${2.1 * k} ${2.3 * k}c0 ${2.2 * k} ${-3 * k} ${3.6 * k} ${-3.6 * k} ${4.8 * k}z`

const DRAW = {
  heart: <path d="M12 20.2c-1-1.9-8.6-5.6-8.6-11.1C3.4 6.5 5.4 4.6 7.8 4.6c1.8 0 3.3 1 4.2 2.5.9-1.5 2.4-2.5 4.2-2.5 2.4 0 4.4 1.9 4.4 4.5 0 5.5-7.6 9.2-8.6 11.1z" fill={W.fizz} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />,
  laugh: (
    <>
      {face(W.sun)}
      <path d="M7.4 10.2q1.6-1.8 3.2 0M13.4 10.2q1.6-1.8 3.2 0" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.2 13.2h9.6q-.6 4.6-4.8 4.6t-4.8-4.6z" fill={INK} />
      <path d="M9.2 16.4q2.8 1.6 5.6 0" fill="none" stroke={W.fizz} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  love: (
    <>
      {face(W.sun)}
      <path d={heartPath(9, 9.2, 0.62)} fill={W.fizz} stroke={INK} strokeWidth="1" />
      <path d={heartPath(15, 9.2, 0.62)} fill={W.fizz} stroke={INK} strokeWidth="1" />
      <path d="M8.2 14.2q3.8 3.8 7.6 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  wow: (
    <>
      {face(W.violet)}
      <circle cx="9" cy="9.6" r="1.4" fill={INK} />
      <circle cx="15" cy="9.6" r="1.4" fill={INK} />
      <ellipse cx="12" cy="15.4" rx="2.1" ry="2.6" fill={INK} />
    </>
  ),
  clap: (
    <>
      <path d="M8.4 20.4l-3.2-6.8a1.4 1.4 0 0 1 2.5-1.2L9 15V6.6a1.4 1.4 0 0 1 2.8 0V12l4.2-5.4a1.4 1.4 0 0 1 2.2 1.7l-2.4 3.4 1-.4a1.4 1.4 0 0 1 1 2.6l-2.6 1.2-1.6 5.3z" fill={W.zest} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17.6 3.4l-.6 1.8M20.4 5.2l-1.6 1M14.6 2.8l.2 1.8" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  fire: (
    <>
      <path d="M12 21.2c-4 0-6.6-2.7-6.6-6.2 0-3.4 2.4-5 3.4-8 .9 1.4 1.4 2.6 1.4 3.8 1.2-2.4 2.8-4.6 2.6-7.6 3.4 2.2 5.8 6.2 5.8 10.6 0 4.4-2.6 7.4-6.6 7.4z" fill={W.zest} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 20.6c-1.8 0-3-1.2-3-2.9 0-1.6 1.4-2.6 2-4.1 1.6 1.2 4 2.4 4 4.4 0 1.5-1.2 2.6-3 2.6z" fill={W.sun} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  hundred: (
    <>
      <rect x="2.2" y="5" width="19.6" height="12.4" rx="3" fill={W.lime} stroke={INK} strokeWidth="1.7" />
      <text x="12" y="14.6" textAnchor="middle" fontFamily="'OFSL DM Mono', ui-monospace, monospace" fontWeight="500" fontSize="8.6" fill={INK}>100</text>
      <path d="M5 19.6h14M7 21.6h10" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  hug: (
    <>
      {face(W.tide)}
      <path d="M7.6 10.2q1.4-1.4 2.8 0M13.6 10.2q1.4-1.4 2.8 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d={heartPath(12, 14.2, 0.78)} fill={W.fizz} stroke={INK} strokeWidth="1.1" />
      <path d="M4.6 15.8q2.6-.6 4.4.6M19.4 15.8q-2.6-.6-4.4.6" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  smile: (
    <>
      {face(W.sun)}
      {dots}
      <circle cx="7.4" cy="13.6" r="1.3" fill={W.fizz} opacity=".7" />
      <circle cx="16.6" cy="13.6" r="1.3" fill={W.fizz} opacity=".7" />
      <path d="M8.4 14q3.6 3.4 7.2 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  sad: (
    <>
      {face(W.azure)}
      {dots}
      <path d="M8.8 16.8q3.2-2.8 6.4 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16.4 12.2q1.2 1.6 1.2 2.4a1.2 1.2 0 0 1-2.4 0q0-.8 1.2-2.4z" fill={W.white} stroke={INK} strokeWidth="1" />
    </>
  ),
  // the resting state: an outline heart, "react to this"
  none: <path d="M12 20.2c-1-1.9-8.6-5.6-8.6-11.1C3.4 6.5 5.4 4.6 7.8 4.6c1.8 0 3.3 1 4.2 2.5.9-1.5 2.4-2.5 4.2-2.5 2.4 0 4.4 1.9 4.4 4.5 0 5.5-7.6 9.2-8.6 11.1z" fill="none" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />,
}

export function ReactionGlyph({ type, size = 22, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {DRAW[type] || DRAW.none}
    </svg>
  )
}

/** The reaction with the most votes, or null. */
export function topReaction(counts) {
  let best = null, n = 0
  for (const [k, v] of Object.entries(counts || {})) if (v > n) { best = k; n = v }
  return best
}
/** Up to three glyph types, most used first. */
export function topReactions(counts, max = 3) {
  return Object.entries(counts || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k)
}

/**
 * A press that tells a tap from a long-press (450ms, cancelled by moving 10px), for photos:
 * tap opens the lightbox, long-press opens the reaction tray. Keyboard users get the chip.
 */
export function useLongPress(onLong, onTap, ms = 450) {
  const st = useRef(null)
  const clear = () => {
    if (st.current?.t) clearTimeout(st.current.t)
  }
  return {
    onPointerDown(e) {
      if (e.button !== 0) return
      clear()
      const el = e.currentTarget
      st.current = { x: e.clientX, y: e.clientY, long: false, t: setTimeout(() => { st.current.long = true; navigator.vibrate?.(8); onLong?.(el) }, ms) }
    },
    onPointerMove(e) {
      if (st.current && Math.hypot(e.clientX - st.current.x, e.clientY - st.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onContextMenu(e) {
      if (st.current?.long) e.preventDefault()
    },
    onClick(e) {
      if (st.current?.long) {
        e.preventDefault()
        st.current = null
        return
      }
      onTap?.(e)
    },
  }
}

/**
 * <ReactionTray anchor={el} open value onPick(type|null) onClose label />
 * A floating tray of ten reactions next to its anchor: 5 by 2 on a phone, one row on wider
 * screens. Arrow keys move, Enter picks, Esc closes and returns focus. Picking the current
 * reaction removes it.
 */
export function ReactionTray({ anchor, open, value, onPick, onClose, label = 'React' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const place = () => {
    const r = anchor?.getBoundingClientRect?.()
    if (!r) return
    const vw = window.innerWidth
    const cols = vw < 600 ? 5 : 10
    const w = cols * 48 + 16
    let left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8))
    const h = (vw < 600 ? 2 : 1) * 48 + 16
    const above = r.top - h - 10
    const top = above > 8 ? above : Math.min(r.bottom + 10, window.innerHeight - h - 8)
    setPos({ left, top, cols })
  }
  useLayoutEffect(() => {
    if (open) place()
  }, [open, anchor])
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const t = setTimeout(() => ref.current?.querySelector('[aria-pressed="true"], button')?.focus({ preventScroll: true }), 10)
    const onDoc = (e) => {
      if (ref.current?.contains(e.target) || anchor?.contains?.(e.target)) return
      onClose?.()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    const onMove = () => onClose?.()
    document.addEventListener('pointerdown', onDoc, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, { passive: true })
    window.addEventListener('resize', onMove)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDoc, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove)
      window.removeEventListener('resize', onMove)
      if (opener?.focus && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open])
  if (!open || !pos) return null
  const move = (e) => {
    const btns = [...ref.current.querySelectorAll('button')]
    const i = btns.indexOf(document.activeElement)
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: pos.cols, ArrowUp: -pos.cols }[e.key]
    if (step == null || i < 0) return
    e.preventDefault()
    btns[(i + step + btns.length) % btns.length].focus()
  }
  return createPortal(
    <div ref={ref} className={s.tray} style={{ left: pos.left, top: pos.top, '--cols': pos.cols }} role="group" aria-label={label} onKeyDown={move} data-ui="reaction-tray">
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          type="button"
          className={cx(s.pick, value === r.type && s.on)}
          aria-pressed={value === r.type}
          aria-label={value === r.type ? `${r.label} (remove)` : r.label}
          title={r.label}
          onClick={() => onPick?.(value === r.type ? null : r.type)}
        >
          <ReactionGlyph type={r.type} size={30} />
        </button>
      ))}
    </div>,
    overlayRoot(),
  )
}

/**
 * <ReactionButton counts mine onPick label variant="chip|plain" /> The keylined chip that
 * shows the top reactions and the total, and opens the tray. Owns its tray.
 */
export function ReactionButton({ counts, mine, total, onPick, label = 'React', variant = 'chip', disabled, onDisabled, className }) {
  const [open, setOpen] = useState(false)
  const btn = useRef(null)
  const n = total ?? Object.values(counts || {}).reduce((a, b) => a + (b || 0), 0)
  const tops = topReactions(counts)
  const shown = mine ? [mine, ...tops.filter((t) => t !== mine)].slice(0, 2) : tops.slice(0, 2)
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={cx(s.btn, s[variant], mine && s.mine, className)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label}${n ? `, ${n} ${n === 1 ? 'reaction' : 'reactions'}` : ''}${mine ? `, you reacted ${reactionLabel(mine)}` : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return onDisabled?.()
          setOpen((o) => !o)
        }}
        data-ui="reaction-button"
      >
        <span className={s.glyphs}>
          {shown.length ? shown.map((t) => <ReactionGlyph key={t} type={t} size={variant === 'chip' ? 18 : 20} />) : <ReactionGlyph type="none" size={variant === 'chip' ? 18 : 20} />}
        </span>
        {n ? <span className={`${s.n} a-mono`}>{n}</span> : variant === 'plain' ? <span className={s.word}>React</span> : null}
      </button>
      <ReactionTray
        anchor={btn.current}
        open={open}
        value={mine}
        label={label}
        onClose={() => setOpen(false)}
        onPick={(t) => {
          setOpen(false)
          onPick?.(t)
        }}
      />
    </>
  )
}
