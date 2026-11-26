// The way back to Daylight from the classic look (owner: F0). Shown in classic look only:
// always in a daylight build ("Back to the new look"); in an optin build only to someone
// who has tried Daylight before (there, ?look=daylight is the way in). Dismissible for the session.
import { useState } from 'react'
import { BUILD_LOOK, LOOK_KEY, setLook } from '../lib/look.js'
import s from './LookOffer.module.css'

const HIDE = 'ofs.look.offer-hidden'
function initiallyShown() {
  try {
    if (sessionStorage.getItem(HIDE)) return false
    if (BUILD_LOOK === 'daylight') return true
    return localStorage.getItem(LOOK_KEY) != null
  } catch {
    return BUILD_LOOK === 'daylight'
  }
}

export default function LookOffer() {
  const [shown, setShown] = useState(initiallyShown)
  if (!shown) return null
  return (
    <div className={s.offer} role="region" aria-label="New look">
      <button type="button" className={s.go} onClick={() => setLook('daylight')}>
        {BUILD_LOOK === 'daylight' ? 'Back to the new look' : 'Try the new look'}
      </button>
      <button
        type="button"
        className={s.x}
        aria-label="Hide"
        onClick={() => {
          try {
            sessionStorage.setItem(HIDE, '1')
          } catch {}
          setShown(false)
        }}
      >
        ×
      </button>
    </div>
  )
}
