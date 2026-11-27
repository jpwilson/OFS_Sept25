import { useEffect, useRef } from 'react'
import { onFrame } from '../lib/scroll.js'

/** Subscribe to the page's one rAF loop for the component's lifetime (latest callback, no resubscribe). */
export function useFrame(fn) {
  const cb = useRef(fn)
  cb.current = fn
  useEffect(() => onFrame((t) => cb.current(t)), [])
}
