// Shared overlay mechanics (owner: F0): portal root inside .ofsa, focus trap, Esc,
// scroll lock, focus return. Used by Sheet, Dialog and Menu.
import { useEffect, useRef } from 'react'

let lockCount = 0
let savedOverflow = ''
export function lockScroll() {
  if (lockCount++ === 0) {
    savedOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  return () => {
    if (--lockCount === 0) document.documentElement.style.overflow = savedOverflow
  }
}

/** A <div class="ofsa"> on <body> for overlays, so they keep Daylight tokens outside the tree. */
export function overlayRoot() {
  let el = document.getElementById('ofsa-overlays')
  if (!el) {
    el = document.createElement('div')
    el.id = 'ofsa-overlays'
    el.className = 'ofsa'
    el.style.background = 'transparent'
    document.body.appendChild(el)
  }
  return el
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Traps Tab inside ref while open; Esc calls onClose; focus returns to the opener on close. */
export function useModal(open, ref, onClose, { initialFocus } = {}) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const unlock = lockScroll()
    const node = ref.current
    const t = setTimeout(() => {
      const target = (initialFocus && initialFocus.current) || node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE) || node
      target?.focus?.({ preventScroll: true })
    }, 20)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      unlock()
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [open])
}
