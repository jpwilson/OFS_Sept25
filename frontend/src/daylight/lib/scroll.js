// Arriving at a page by a link starts it at the top (owner: F0). The router keeps the window's
// scroll across routes, so a story opened from far down the feed would open mid-story.
// Back and Forward (POP) leave the position alone. The shell should do this for every route
// (see the integration notes); until then the long pages call it themselves.
import { useLayoutEffect } from 'react'
import { useNavigationType } from 'react-router-dom'

export function useTopOnArrival(key) {
  const nav = useNavigationType()
  useLayoutEffect(() => {
    if (nav !== 'POP') window.scrollTo(0, 0)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
