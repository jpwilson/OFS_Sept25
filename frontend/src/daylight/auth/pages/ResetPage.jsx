// /reset-password (owner: AUTH). AUTH.md decision 8: one page, four states (ask, check your
// inbox, choose a new password, done), plus a fresh-link state for a spent or foreign link.
// It keys off the route, not an auth event: whenever a session exists it shows the
// new-password form, and it never sends a signed-in person away on its own.
import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { SCENES, sceneWithWash } from '../stage/scenes.js'
import { Notice, PasswordBox, Stack, TextLink } from '../stage/parts.jsx'
import { classifyArrival, cleanUrl, readParams } from '../lib/arrival.js'
import { currentSession, ready, sendPasswordReset, setPassword, verifyTokenHash } from '../lib/client.js'
import { messageFor } from '../lib/errors.js'
import { clearPending, savePending } from '../lib/intent.js'
import { useCountdown, useMemberNavigate, useOnce } from '../lib/hooks.js'
import { Opening } from './flows.jsx'
import s from './LoginPage.module.css'

const MIN_PASSWORD = 8

export default function ResetPage() {
  const loc = useLocation()
  const [view, setView] = useState('checking') // checking | ask | sent | choose | done | fresh
  const [email, setEmail] = useState(loc.state?.email || '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [left, startCountdown] = useCountdown()
  const { go, waiting, late } = useMemberNavigate()
  const fieldRef = useRef(null)

  useOnce(async () => {
    const params = readParams(window.location.href)
    const initError = await ready()
    let session = await currentSession()
    let arrival = classifyArrival({ params, hasSession: !!session, initError })
    if (arrival.kind === 'token-hash') {
      const { data, error: e } = await verifyTokenHash(arrival.tokenHash, 'recovery')
      session = data?.session || null
      arrival = e ? { kind: 'error', code: e.code || 'otp_expired' } : { kind: session ? 'session' : 'nothing' }
    }
    window.history.replaceState(window.history.state, '', cleanUrl(window.location.href))
    if (arrival.kind === 'session') setView('choose')
    else if (arrival.kind === 'error' || arrival.kind === 'no-verifier') {
      const m = messageFor(arrival.kind === 'error' ? arrival.code : 'no_verifier')
      setError(m.action === 'fresh-link' ? null : m)
      setView('fresh')
    } else setView('ask')
  })

  const fail = (e) => {
    setError(messageFor(e))
    setBusy(false)
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  const send = async (e) => {
    e?.preventDefault()
    setError(null)
    const addr = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return fail('email_address_invalid')
    setBusy(true)
    savePending({ intent: 'reset', wash: 'azure' })
    const { error: err } = await sendPasswordReset(addr)
    setBusy(false)
    if (err) return fail(err)
    startCountdown(60)
    setView('sent')
  }

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    if (pw.length < MIN_PASSWORD) return fail('weak_password')
    setBusy(true)
    const { error: err } = await setPassword(pw)
    setBusy(false)
    if (err) return fail(err)
    clearPending()
    setView('done')
  }

  if (view === 'checking' || waiting) return <Opening wash="azure" late={late} />

  const emailField = (
    <Field label="Email" error={error?.field === 'email' || error?.code === 'email_address_invalid' ? error.line : undefined}>
      <input ref={fieldRef} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} data-ui="email" />
    </Field>
  )
  const topError = error && error.code !== 'email_address_invalid' && !error.field ? <Notice>{error.line}</Notice> : null
  const back = (
    <p className={s.center}>
      <TextLink to="/login" data-ui="back-to-login">
        Back to log in
      </TextLink>
    </p>
  )

  if (view === 'ask' || view === 'fresh')
    return (
      <AuthStage
        scene={view === 'fresh' ? sceneWithWash('reset', 'zest') : SCENES.reset}
        sceneKey={view}
        title={view === 'fresh' ? 'A fresh link' : 'Forgot your password'}
        head={view === 'fresh' ? { before: "Let's get you a fresh", mark: 'link', after: '.' } : { before: "Let's get you back", mark: 'in', after: '.' }}
        sub={view === 'fresh' ? 'That link has done its job or timed out. Tell us where to send a new one.' : "Tell us your email and we'll send a link to choose a new password."}
      >
        <form onSubmit={send} noValidate className={s.form}>
          <Stack>
            {topError}
            {emailField}
            <Button type="submit" size="lg" full busy={busy} data-ui="send-link">
              {view === 'fresh' ? 'Send a new link' : 'Email me a link'}
            </Button>
            {back}
          </Stack>
        </form>
      </AuthStage>
    )

  if (view === 'sent')
    return (
      <AuthStage
        scene={sceneWithWash('inbox', 'azure')}
        sceneKey="sent"
        title="Check your inbox"
        head={{ before: 'Check your', mark: 'inbox', after: '.' }}
        sub={
          <>
            If there's an account for <strong className={s.addr}>{email.trim()}</strong>, a link to choose a new password is on its way.
          </>
        }
      >
        <Stack>
          {topError}
          <p className={s.body}>Open it on this device or any other. Nothing after a minute? Look in spam, or send it again.</p>
          <Button size="lg" full variant="ghost" onClick={send} busy={busy} disabled={left > 0} data-ui="resend">
            {left > 0 ? `Send it again in ${left}s` : 'Send it again'}
          </Button>
          {back}
        </Stack>
      </AuthStage>
    )

  if (view === 'choose')
    return (
      <AuthStage scene={SCENES.reset} sceneKey="choose" title="Choose a new password" head={{ before: 'Choose a new', mark: 'password', after: '.' }} sub="One you haven't used here before, 8 characters or more.">
        <form onSubmit={save} noValidate className={s.form}>
          <Stack>
            {error && !error.field ? <Notice>{error.line}</Notice> : null}
            <Field label="New password" error={error?.field === 'password' ? error.line : undefined}>
              <PasswordBox ref={fieldRef} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus data-ui="new-password" />
            </Field>
            <Button type="submit" size="lg" full busy={busy} data-ui="save-password">
              Save my new password
            </Button>
          </Stack>
        </form>
      </AuthStage>
    )

  // done
  return (
    <AuthStage scene={sceneWithWash('reset', 'lime')} sceneKey="done" title="Password saved" head={{ before: "You're all", mark: 'set', after: '.' }} sub="Your new password is saved, and you're signed in on this device.">
      <Stack>
        <Notice tone="ok">Next time, log in with your new password.</Notice>
        <Button size="lg" full onClick={() => go('/feed')} data-ui="to-stories">
          Go to my stories
        </Button>
      </Stack>
    </AuthStage>
  )
}
