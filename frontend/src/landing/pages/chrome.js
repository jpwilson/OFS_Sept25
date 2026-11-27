// Whether a story marketing page is on screen (owner: pages). The frame sets it in a layout
// effect, so Layout's header and footer wrappers re-render before the browser paints and the
// app's own chrome never shows under the landing's nav. Plain module state, no context, so
// Layout.jsx itself needs no change.
import { useSyncExternalStore } from 'react'

let mounted = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

/** Call on frame mount; returns the matching release. */
export function claimChrome() {
  mounted += 1
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    mounted -= 1
    emit()
  }
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const get = () => mounted > 0

/** True while a story marketing page is mounted. */
export function useStoryChrome() {
  return useSyncExternalStore(subscribe, get, get)
}
