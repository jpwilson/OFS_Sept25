// The pieces inside the door (owner: AUTH): the provider list, the divider, the password
// box with a real show button, notices and the quiet links. AUTH.md decision 5.
import { forwardRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../ui/Spinner.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { Sheet } from '../../ui/Sheet.jsx'
import { Button } from '../../ui/Button.jsx'
import { cx } from '../../ui/cx.js'
import { isInAppBrowser } from '../lib/inApp.js'
import { GOOGLE } from '../lib/features.js'
import { GoogleMark } from './GoogleMark.jsx'
import s from './parts.module.css'

/**
 * The providers, Google first. A list, so "Continue with Apple" joins it when the iPhone app
 * ships. Inside Instagram, Facebook and other in-app browsers Google refuses to sign in, so
 * the button explains that instead of failing.
 */
export function Providers({ onGoogle, busy, disabled }) {
  const [sheet, setSheet] = useState(false)
  if (!GOOGLE) return null // no provider switched on (lib/features.js): the card is email only
  const click = () => {
    if (typeof navigator !== 'undefined' && isInAppBrowser(navigator.userAgent)) setSheet(true)
    else onGoogle()
  }
  return (
    <div className={s.providers} data-ui="auth-providers">
      <button type="button" className={s.google} onClick={click} disabled={disabled || busy} aria-busy={busy || undefined} data-ui="google">
        <span className={s.gMark}>{busy ? <Spinner size={20} /> : <GoogleMark size={20} />}</span>
        <span>{busy ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>
      {/* "Continue with Apple" goes here when Sign in with Apple is configured. */}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Google opens in your browser">
        <div className={s.sheetBody}>
          <p>Google sign-in works in your phone's browser, not inside this app. Tap the menu (often ••• or the share button) and choose Open in browser.</p>
          <p>Or carry on right here with your email.</p>
          <Button full onClick={() => setSheet(false)}>Use my email</Button>
        </div>
      </Sheet>
    </div>
  )
}

/** The line between the providers and the email form; absent when no provider is on. */
export function Divider({ children = 'or use your email' }) {
  if (!GOOGLE) return null
  return (
    <div className={s.divider} role="separator" aria-label={children}>
      <span aria-hidden="true">{children}</span>
    </div>
  )
}

/** For use inside <Field>: Field hands it id, aria-* and the control class; they go on the input. */
export const PasswordBox = forwardRef(function PasswordBox({ className, ...props }, ref) {
  const [shown, setShown] = useState(false)
  return (
    <div className={s.pwBox}>
      <input ref={ref} {...props} type={shown ? 'text' : 'password'} className={cx(className, s.pwInput)} spellCheck={false} autoCapitalize="off" />
      <button type="button" className={s.show} onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'} aria-controls={props.id}>
        <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
        <span className={s.showText}>{shown ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  )
})

/** For use inside <Field>: an @ before the handle, inside the box. */
export const HandleBox = forwardRef(function HandleBox({ className, ...props }, ref) {
  return (
    <div className={s.handleBox}>
      <span className={s.at} aria-hidden="true">
        @
      </span>
      <input ref={ref} {...props} className={cx(className, s.handleInput)} />
    </div>
  )
})

/** A message tied to the form. tone: 'error' | 'info' | 'ok'. */
export function Notice({ tone = 'error', children, action, id }) {
  return (
    <div className={s.notice} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'} id={id} data-ui="auth-notice">
      <Icon name={tone === 'error' ? 'warning' : tone === 'ok' ? 'check' : 'info'} size={20} />
      <div className={s.noticeText}>
        <p>{children}</p>
        {action}
      </div>
    </div>
  )
}

export function TextButton({ children, className, ...props }) {
  return (
    <button type="button" className={cx(s.textBtn, className)} {...props}>
      {children}
    </button>
  )
}

export function TextLink({ children, className, ...props }) {
  return (
    <Link className={cx(s.textBtn, className)} {...props}>
      {children}
    </Link>
  )
}

/** "New here? Start free" / "Already a member? Log in": the switch between the two modes. */
export function SwitchLine({ lead, children }) {
  return (
    <p className={s.switch}>
      {lead} {children}
    </p>
  )
}

export function Fine({ children }) {
  return <p className={s.fine}>{children}</p>
}

export function Stack({ children, gap = 'md', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={s.stack} data-gap={gap} {...rest}>
      {children}
    </Tag>
  )
}

/** A mono readout line from the landing's voice (facts only). */
export function MonoNote({ children }) {
  return <p className={s.mono}>{children}</p>
}
