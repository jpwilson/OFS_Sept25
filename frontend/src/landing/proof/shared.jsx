// Small helpers shared by the proof sections (owner: proof).
import { useEffect, useState } from 'react'
import { prefersReducedMotion, refreshScroll, scrollToY } from '../lib/scroll.js'

/**
 * 'flow' on the server, without script, under reduced motion, and below `minWidth`;
 * 'pin' once mounted on a wide screen with motion allowed. Re-evaluates on resize and on a
 * change of the motion preference. The server and first client render are both 'flow'.
 */
export function usePinMode(minWidth = 900) {
  const [mode, setMode] = useState('flow')
  useEffect(() => {
    // a number is a min width; a string is any media query
    const wide = window.matchMedia(typeof minWidth === 'string' ? minWidth : `(min-width: ${minWidth}px)`)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pick = () => setMode(wide.matches && !prefersReducedMotion() ? 'pin' : 'flow')
    pick()
    wide.addEventListener('change', pick)
    motion.addEventListener('change', pick)
    return () => {
      wide.removeEventListener('change', pick)
      motion.removeEventListener('change', pick)
    }
  }, [minWidth])
  useEffect(() => {
    const id = requestAnimationFrame(() => refreshScroll())
    return () => cancelAnimationFrame(id)
  }, [mode])
  return mode
}

/** Glide a pinned stage to progress t (0..1): the page y where stageProgress(el) === t. */
export function scrollStageTo(el, t) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY
  scrollToY(top + t * Math.max(0, el.offsetHeight - window.innerHeight))
}

/** True after mount (for styles that only make sense with script, e.g. a stepper hiding steps). */
export function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

/** Close on Escape while open. */
export function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    const k = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
}

const PATHS = {
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3.5M21 12v2.5" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 14.5l4.5-4 4 3.5 3-2.5 5.5 4.5" />
    </>
  ),
  dash: <path d="M6 12h12" />,
  flag: <path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  // the four views (drawn for the view switch)
  feed: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  timeline: (
    <>
      <path d="M7 3v18" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="7" cy="16" r="2" />
      <path d="M11 7h9M11 16h7" />
    </>
  ),
  chevl: <path d="M15 5l-7 7 7 7" />,
  chevr: <path d="M9 5l7 7-7 7" />,
}

/** Proof-only drawn icons (the shared set has no key, card or flag). Decorative unless titled. */
export function PIcon({ name, size = 18, title, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

/** Two-digit index for labels: 1 -> "01". Kept out of content so copy carries no digits. */
export const pad2 = (n) => String(n).padStart(2, '0')
