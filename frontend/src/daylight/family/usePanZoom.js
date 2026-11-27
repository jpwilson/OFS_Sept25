// Moving around the tree (owner: FAMILY). docs/app/FAMILY.md section 3, "Panning".
//
// The page scrolls up and down; the tree's frame scrolls sideways at a readable size.
// Zoom runs from max(0.3, the whole tree's fit) to 1.25; it opens at 1, or at the fit when
// that keeps the relation words at 10px or more (0.85 on a phone, 0.83 on an iPad, 0.77 on a
// wide frame), centred on your unit. Desktop adds ctrl or cmd + wheel and trackpad
// pinch (zoom around the pointer). Nothing is dragged: the owner asked for a tree that is ordered,
// not arranged, so the frame only scrolls. Reduced motion: every move jumps.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/capability.js'

const MAX = 1.25
const STEP = 1.2
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/** Where the shell's top bar ends: its height plus the safe area over it (a notch), else the token. */
function topClear(el) {
  const b = document.querySelector('[data-ui="topbar"]')?.getBoundingClientRect().bottom
  return b > 0 ? b : parseFloat(getComputedStyle(el).getPropertyValue('--a-bar-h')) || 56
}

export function usePanZoom({ geometry: g, ready }) {
  const scrollerRef = useRef(null)
  const [frameW, setFrameW] = useState(0)
  const [zoom, setZoomState] = useState(1)
  const zoomRef = useRef(1)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    const measure = () => setFrameW(el.clientWidth)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  const fit = frameW && g.width ? frameW / g.width : 1
  const minZ = Math.max(0.3, Math.min(1, fit))
  // open fitted whenever the relation words stay readable (10px or more): 0.85 on a phone
  // (FAMILY.md's figure), 0.83 on an iPad, 0.77 on a wide frame, where the type starts larger
  const legible = Math.min(0.85, 10 / (g.metrics?.label || 12))
  const defaultZ = fit >= legible ? Math.min(1, fit) : 1

  const behavior = () => (prefersReducedMotion() ? 'auto' : 'smooth')

  /** Set the zoom, keeping the tree point under (clientX, clientY) where it is. */
  const setZoom = useCallback(
    (z, around) => {
      const el = scrollerRef.current
      const z0 = zoomRef.current
      const z1 = clamp(z, minZ, MAX)
      if (!el || Math.abs(z1 - z0) < 0.001) return
      const r = el.getBoundingClientRect()
      const px = around ? around.clientX - r.left : el.clientWidth / 2
      const py = around ? around.clientY - r.top : Math.min(r.height, window.innerHeight) / 2 - Math.min(0, r.top)
      const cx = (el.scrollLeft + px) / z0
      const cy = py / z0
      zoomRef.current = z1
      setZoomState(z1)
      requestAnimationFrame(() => {
        el.scrollLeft = cx * z1 - px
        const dy = cy * (z1 - z0)
        if (Math.abs(dy) > 0.5 && r.top < py) window.scrollBy({ top: dy, behavior: 'auto' })
      })
    },
    [minZ],
  )

  /** Centre the frame on a tree point (and bring its row into the window when asked). */
  const centreOn = useCallback((x, y, { z = zoomRef.current, vertical = true, smooth = true } = {}) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, x * z - el.clientWidth / 2), behavior: smooth ? behavior() : 'auto' })
    if (!vertical) return
    const r = el.getBoundingClientRect()
    const py = r.top + y * z
    const bar = topClear(el)
    const bottomClear = parseFloat(getComputedStyle(el).getPropertyValue('--a-bottom-clear')) || 0
    const top = bar + 16
    const bottom = window.innerHeight - bottomClear - 16
    if (py < top + 60 || py > bottom - 60) window.scrollBy({ top: py - (top + (bottom - top) * 0.4), behavior: smooth ? behavior() : 'auto' })
  }, [])

  // open at the default zoom, centred on your unit, whenever the tree is laid out afresh
  const opened = useRef(null)
  useLayoutEffect(() => {
    if (!ready || !frameW) return
    const key = `${g.width}x${g.height}:${g.size}`
    if (opened.current === key) return
    const first = opened.current == null
    opened.current = key
    zoomRef.current = defaultZ
    setZoomState(defaultZ)
    const el = scrollerRef.current
    requestAnimationFrame(() => {
      if (!el) return
      el.scrollLeft = Math.max(0, g.focus.x * defaultZ - el.clientWidth / 2)
      // a tall tree opens with you in view (only on a fresh visit, never against a restored scroll):
      // you at 45% of the screen, but never further than it takes the tree's bottom edge to reach
      // the bottom of the screen (nothing below the youngest row is worth the band it hides)
      if (!first || window.scrollY > 4) return
      const r = el.getBoundingClientRect()
      const meY = r.top + g.you.y * defaultZ
      const cs = getComputedStyle(el)
      const bottomClear = parseFloat(cs.getPropertyValue('--a-bottom-clear')) || 0
      const room = window.innerHeight - bottomClear
      if (meY <= room - 140) return
      const top = Math.max(meY - (room - 140), Math.min(meY - window.innerHeight * 0.45, r.bottom - room + 12))
      window.scrollTo({ top, behavior: 'auto' })
    })
  }, [ready, frameW, g.width, g.height, g.size, g.focus.x, defaultZ])

  // ctrl / cmd + wheel, and a trackpad pinch (which arrives as a wheel with ctrlKey)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025))
      setZoom(zoomRef.current * k, e)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setZoom])

  return {
    scrollerRef,
    scrollerProps: {},
    zoom,
    minZoom: minZ,
    canIn: zoom < MAX - 0.001,
    canOut: zoom > minZ + 0.001,
    isWhole: minZ < 1 && Math.abs(zoom - minZ) < 0.01,
    zoomIn: () => setZoom(zoomRef.current * STEP),
    zoomOut: () => setZoom(zoomRef.current / STEP),
    reset: () => {
      setZoom(defaultZ)
      requestAnimationFrame(() => centreOn(g.focus.x, g.focus.y, { z: defaultZ, vertical: false }))
    },
    whole: () => {
      const z = minZ
      zoomRef.current = z
      setZoomState(z)
      requestAnimationFrame(() => centreOn(g.width / 2, g.height / 2, { z, vertical: false }))
    },
    findMe: () => {
      const z = Math.max(zoomRef.current, defaultZ)
      zoomRef.current = z
      setZoomState(z)
      requestAnimationFrame(() => centreOn(g.you.x, g.you.y, { z }))
    },
    /** Keep a focused face in view (keyboard). */
    reveal: (item, { centre = false } = {}) => {
      const el = scrollerRef.current
      if (!el || !item) return
      const z = zoomRef.current
      const x = item.x * z
      if (centre || x < el.scrollLeft + 60 || x > el.scrollLeft + el.clientWidth - 60) el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: behavior() })
      // only as far as it takes to show the face and its name
      const r = el.getBoundingClientRect()
      const face = (g.metrics?.face || 80) * z
      const top = r.top + item.y * z - face / 2 - 24
      const bottom = r.top + item.y * z + face / 2 + 64 * z + 16
      const cs = getComputedStyle(el)
      const bar = topClear(el)
      const bottomClear = parseFloat(cs.getPropertyValue('--a-bottom-clear')) || 0
      if (top < bar + 8) window.scrollBy({ top: top - bar - 8, behavior: behavior() })
      else if (bottom > window.innerHeight - bottomClear - 8) window.scrollBy({ top: bottom - (window.innerHeight - bottomClear - 8), behavior: behavior() })
    },
  }
}
