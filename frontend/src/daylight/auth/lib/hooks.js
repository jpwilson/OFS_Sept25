// React hooks shared by the auth pages (owner: AUTH).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { clearPending, safeNext } from './intent.js'

/**
 * Navigation into the app waits for AuthContext to hold the profile, not just for a session,
 * so the first page never bounces back to sign-in (PLAN-AUTH section 4).
 * go(path) -> waits, then navigates (replace). waiting: true meanwhile. late: 10 s passed.
 */
export function useMemberNavigate() {
  const auth = useAuth() || {}
  const navigate = useNavigate()
  const [target, setTarget] = useState(null)
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!target || !auth.user) return
    clearPending()
    navigate(target, { replace: true })
  }, [target, auth.user, navigate])
  useEffect(() => {
    if (!target) return
    setLate(false)
    const t = setTimeout(() => setLate(true), 10000)
    return () => clearTimeout(t)
  }, [target])
  const go = useCallback((path) => setTarget(safeNext(path)), [])
  return { go, waiting: !!target, late, target }
}

/** Where to send someone after signing in from this page: ?next=, then the page that sent
 * them here (location.state.from), else the fallback. Always through safeNext. */
export function useNextPath(fallback = '/feed') {
  const loc = useLocation()
  const q = new URLSearchParams(loc.search)
  const from = loc.state?.from
  const fromPath = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : null
  return safeNext(q.get('next') || fromPath || '', fallback)
}

/** A countdown for "Send it again" (Supabase allows one email per address a minute). */
export function useCountdown() {
  const [left, setLeft] = useState(0)
  const timer = useRef(null)
  useEffect(() => () => clearInterval(timer.current), [])
  const start = useCallback((seconds = 60) => {
    clearInterval(timer.current)
    setLeft(seconds)
    timer.current = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(timer.current)
          return 0
        }
        return n - 1
      })
    }, 1000)
  }, [])
  return [left, start]
}

/** Runs an async effect once per mount, even under React's development double-run (a token
 * hash or a code must never be spent twice). */
export function useOnce(fn) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
