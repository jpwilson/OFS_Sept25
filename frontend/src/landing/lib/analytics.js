// Landing analytics (owner: F0). Loads Vercel Analytics and PostHog after the page is idle,
// with exactly the app's PostHog options (src/config/posthogOptions.js), and exposes
// track(), which is safe to call at any time: events queue until PostHog is ready and are
// dropped quietly if it never loads. Nothing runs on the server.
//
// Inside the app (the landing rendered by RootRedirect) the app has already set up both
// tools, so initAnalytics() does not load them again; track() uses the app's PostHog.
import { POSTHOG_KEY, POSTHOG_HOST, posthogOptions } from '../../config/posthogOptions.js'

const MAX_QUEUE = 50
let queue = []
let ph = null
let started = false

function flush() {
  if (!ph) return
  const q = queue
  queue = []
  for (const [name, props] of q) {
    try {
      ph.capture(name, props)
    } catch {
      /* analytics must never break the page */
    }
  }
}

/**
 * Record an event. Queues until PostHog is ready.
 * @param {string} name e.g. 'landing_audience'
 * @param {Record<string, unknown>} [props]
 */
export function track(name, props = {}) {
  if (typeof window === 'undefined') return
  if (queue.length < MAX_QUEUE) queue.push([name, props])
  flush()
}

function whenIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 4000 })
  else setTimeout(fn, 2000)
}

/** Start analytics once, after idle. Call from an effect. */
export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  const insideApp = document.documentElement.dataset.boot === 'app'

  whenIdle(async () => {
    if (insideApp) {
      try {
        const mod = await import('posthog-js')
        const posthog = mod.default
        if (posthog.__loaded) {
          ph = posthog
          flush()
        }
      } catch {
        /* ignore */
      }
      return
    }

    import('@vercel/analytics')
      .then((m) => m.inject())
      .catch(() => {})

    if (!POSTHOG_KEY) return
    try {
      const mod = await import('posthog-js')
      const posthog = mod.default
      posthog.init(POSTHOG_KEY, {
        ...posthogOptions(POSTHOG_HOST),
        loaded: (p) => {
          p.register({ app: 'ofs' })
          p.capture('$pageview', { path: window.location.pathname })
          ph = p
          flush()
        },
      })
    } catch {
      /* blocked by an extension or offline: the page carries on */
    }
  })
}
