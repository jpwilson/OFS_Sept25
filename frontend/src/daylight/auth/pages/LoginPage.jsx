// /login and /login?signup=true (owner: AUTH). AUTH.md decisions 5, 6, 7, 11, 14.
// One page, two modes (Log in, Start free), the check-your-inbox state, and the first-run
// and welcome steps for a session that has no profile yet. A signed-in person is never shown
// the form: they are sent on to where they were going.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { fact } from '../../../landing/content/facts.js'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { SCENES } from '../stage/scenes.js'
import { Divider, Fine, MonoNote, Notice, PasswordBox, Providers, Stack, SwitchLine, TextButton, TextLink } from '../stage/parts.jsx'
import { currentSession, hasStoredSession, LEGACY_FALLBACK, resendConfirmation, signInWithGoogle, signInWithPassword, signUpWithEmail } from '../lib/client.js'
import { legacyLogin, resolveAccount } from '../lib/account.js'
import { errorCode, messageFor } from '../lib/errors.js'
import { lastPath, savePending } from '../lib/intent.js'
import { useCountdown, useMemberNavigate, useNextPath } from '../lib/hooks.js'
import { FirstRun, InboxScreen, Opening, Welcome } from './flows.jsx'
import s from './LoginPage.module.css'

const MIN_PASSWORD = 8

const COPY = {
  login: {
    title: 'Log in',
    head: { before: 'Welcome', mark: 'back', after: '.' },
    sub: "Your family's stories are right where you left them.",
    submit: 'Log in',
    switchLead: 'New here?',
    switchTo: 'Start free',
  },
  signup: {
    title: 'Start free',
    head: { before: 'Come on', mark: 'in', after: '.' },
    sub: `Free to view, forever. Free to try for ${fact('trialDays')} days, with no card.`,
    submit: 'Create my account',
    switchLead: 'Already a member?',
    switchTo: 'Log in',
  },
}

export default function LoginPage() {
  const auth = useAuth() || {}
  const loc = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('signup') === 'true' ? 'signup' : 'login'
  const next = useNextPath('/feed')
  const { go, waiting, late } = useMemberNavigate()

  // checking: a stored session is being looked at; form; inbox; first-run; welcome
  const [view, setView] = useState(() => (hasStoredSession() ? 'checking' : 'form'))
  const [email, setEmail] = useState(loc.state?.email || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null) // 'email' | 'google' | 'resend'
  const [error, setError] = useState(null) // { line, field, action, code }
  const [made, setMade] = useState(null) // the new profile, for Welcome
  const [left, startCountdown] = useCountdown()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  // Where a signed-in visitor goes: where they were headed, else where they just were.
  const onwards = () => (params.get('next') || loc.state?.from ? next : lastPath() || next)

  // A signed-in person never sees the form (AUTH.md decision 7).
  useEffect(() => {
    let live = true
    if (auth.user && !auth.loading) {
      go(onwards())
      return
    }
    if (view !== 'checking') return
    ;(async () => {
      const session = await currentSession()
      if (!live) return
      if (!session) {
        // a legacy (pre-Supabase) sign-in shows up as AuthContext.user once it has loaded
        if (!auth.loading && !auth.user) setView('form')
        return
      }
      const acc = await resolveAccount()
      if (!live) return
      if (acc.state === 'member') go(onwards())
      else if (acc.state === 'needs-profile') setView('first-run')
      else {
        setView('form')
        if (acc.state === 'unreachable') setError(messageFor('network'))
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.loading])

  useEffect(() => setError(null), [mode])

  const switchMode = () => {
    const q = new URLSearchParams(params)
    if (mode === 'login') q.set('signup', 'true')
    else q.delete('signup')
    navigate({ pathname: '/login', search: q.toString() ? `?${q}` : '' }, { replace: true, state: loc.state })
  }

  const fail = (e, fallbackField) => {
    const m = messageFor(e)
    setError({ ...m, field: m.field || fallbackField })
    setBusy(null)
    requestAnimationFrame(() => ((m.field || fallbackField) === 'password' ? passwordRef : emailRef).current?.focus())
  }

  const google = async () => {
    setError(null)
    savePending({ next, intent: mode, wash: SCENES[mode].wash })
    setBusy('google')
    const { error: e } = await signInWithGoogle()
    if (e) fail(e)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    const addr = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return fail('email_address_invalid', 'email')
    if (!password) return fail(mode === 'login' ? 'invalid_credentials' : 'weak_password', 'password')
    if (mode === 'signup' && password.length < MIN_PASSWORD) return fail('weak_password', 'password')
    setBusy('email')

    if (mode === 'signup') {
      savePending({ next, intent: 'signup', wash: SCENES.signup.wash })
      const { data, error: err } = await signUpWithEmail(addr, password)
      if (err) return fail(err)
      setBusy(null)
      if (data?.session) {
        // Confirm email is off: signed in already. Straight to the first-run step.
        const acc = await resolveAccount()
        return acc.state === 'member' ? go(next) : setView('first-run')
      }
      return setView('inbox')
    }

    const { error: err } = await signInWithPassword(addr, password)
    if (err) {
      if (LEGACY_FALLBACK && errorCode(err) === 'invalid_credentials') {
        // Accounts made before Supabase: the old endpoint. A full load lets AuthContext read them.
        try {
          const d = await legacyLogin(addr, password)
          localStorage.setItem('token', d.access_token)
          localStorage.setItem('user', JSON.stringify(d.user))
          window.location.assign(next)
          return
        } catch {
          /* not a legacy account either: say what Supabase said */
        }
      }
      return fail(err)
    }
    const acc = await resolveAccount()
    setBusy(null)
    if (acc.state === 'member') go(next)
    else if (acc.state === 'needs-profile') setView('first-run')
    else fail('network')
  }

  const resend = async () => {
    setBusy('resend')
    const { error: err } = await resendConfirmation(email)
    setBusy(null)
    if (err) setError(messageFor(err))
    else {
      setError({ line: 'Sent. Open the link in that email to finish.', tone: 'ok' })
      startCountdown(60)
    }
  }

  // ---------------------------------------------------------------- the other screens
  if (view === 'checking' || waiting) return <Opening wash={SCENES[mode].wash} late={late} />
  if (view === 'first-run') return <FirstRun wash="fizz" onDone={(u) => (setMade(u), setView('welcome'))} />
  if (view === 'welcome') return <Welcome user={made} />
  if (view === 'inbox')
    return (
      <InboxScreen
        email={email.trim()}
        next={next}
        onBack={() => {
          setPassword('')
          setView('form')
        }}
        barEnd={<BarSwitch mode="signup" onClick={() => (setView('form'), switchMode())} />}
      />
    )

  // ---------------------------------------------------------------- the door
  const c = COPY[mode]
  const err = error && error.tone !== 'ok' ? error : null
  const emailErr = err?.field === 'email' ? err.line : undefined
  const pwErr = err?.field === 'password' ? err.line : undefined
  return (
    <AuthStage
      scene={SCENES[mode]}
      sceneKey={mode}
      title={c.title}
      head={c.head}
      sub={c.sub}
      cardLabel={c.title}
      barEnd={<BarSwitch mode={mode} onClick={switchMode} />}
    >
      <Stack>
        <Providers onGoogle={google} busy={busy === 'google'} disabled={busy === 'email'} />
        <Divider />
        <form className={s.form} onSubmit={submit} noValidate aria-label={mode === 'login' ? 'Log in with email' : 'Sign up with email'}>
          <Stack gap="sm">
            {error && !error.field ? (
              <Notice
                tone={error.tone || 'error'}
                action={
                  error.action === 'resend' ? (
                    <TextButton onClick={resend} disabled={left > 0 || busy === 'resend'} data-ui="resend">
                      {busy === 'resend' ? 'Sending…' : left > 0 ? `Send the link again in ${left}s` : 'Send the link again'}
                    </TextButton>
                  ) : error.action === 'contact' ? (
                    <TextLink to="/contact">Get in touch</TextLink>
                  ) : null
                }
              >
                {error.line}
              </Notice>
            ) : null}
            <Field label="Email" error={emailErr}>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-ui="email"
              />
            </Field>
            <Field label="Password" error={pwErr} hint={mode === 'signup' && !pwErr ? `${MIN_PASSWORD} characters or more.` : undefined}>
              <PasswordBox
                ref={passwordRef}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-ui="password"
              />
            </Field>
            <Button type="submit" size="lg" full busy={busy === 'email'} disabled={busy === 'google'} className={s.submit} data-ui="submit">
              {c.submit}
            </Button>
          </Stack>
        </form>
        <div className={s.foot}>
          {mode === 'login' ? (
            <TextLink to="/reset-password" state={{ email: email.trim() }} data-ui="forgot">
              Forgot your password?
            </TextLink>
          ) : (
            <Fine>
              By continuing you agree to the <a href="/terms">Terms</a> and the <a href="/privacy">Privacy Policy</a>.
            </Fine>
          )}
          <SwitchLine lead={c.switchLead}>
            <TextButton onClick={switchMode} data-ui="switch">
              {c.switchTo}
            </TextButton>
          </SwitchLine>
        </div>
        {mode === 'signup' ? (
          <div className={s.note}>
            <MonoNote>
              {`Free to view, forever · ${fact('trialDays')}-day trial · ${fact('trialStories')} stories in the trial · No card`}
            </MonoNote>
          </div>
        ) : null}
      </Stack>
    </AuthStage>
  )
}

function BarSwitch({ mode, onClick }) {
  return (
    <Button size="sm" variant={mode === 'login' ? 'solid' : 'ghost'} onClick={onClick} data-ui="bar-switch">
      {mode === 'login' ? 'Start free' : 'Log in'}
    </Button>
  )
}
