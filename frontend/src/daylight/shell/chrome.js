// Page control over the shell's chrome (owner: F0).
//   useChrome({tabBar: false, topBar: false, footer: false})
// A page that brings its own contextual bar (the story page on a phone, the creation
// flow, a full-screen map, the lightbox) hides the parts it replaces while mounted.
// Defaults are restored on unmount. Outside the Shell it does nothing.
import { createContext, useContext, useEffect } from 'react'

export const ChromeContext = createContext(null)

export function useChrome(opts) {
  const ctx = useContext(ChromeContext)
  const key = JSON.stringify(opts || {})
  useEffect(() => {
    if (!ctx) return
    return ctx.push(opts || {})
  }, [ctx, key])
}

/** Window event the Shell fires when Stories is tapped while already on Stories (scroll to top, refetch). */
export const STORIES_RESELECT = 'ofsa:stories-reselect'
