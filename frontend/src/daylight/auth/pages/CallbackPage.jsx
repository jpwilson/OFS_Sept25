// /auth/callback (owner: AUTH). AUTH.md decisions 3, 4, 11, 14.
// Where Google (through Supabase) and the confirmation email return. The Supabase client
// exchanges a ?code= by itself on load; this page never calls exchangeCodeForSession. It
// waits for the client, reads any error in the URL itself, verifies a token_hash link (the
// go-live email template), strips its own parameters, then: an existing member goes on to
// where they were headed; a new person meets the first-run step and the welcome.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui/Button.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { sceneWithWash } from '../stage/scenes.js'
import { Notice, Providers, Stack, TextLink } from '../stage/parts.jsx'
import { classifyArrival, cleanUrl, readParams } from '../lib/arrival.js'
import { currentSession, ready, signInWithGoogle, verifyTokenHash } from '../lib/client.js'
import { readInvite, resolveAccount } from '../lib/account.js'
import { messageFor } from '../lib/errors.js'
import { readPending, savePending } from '../lib/intent.js'
import { useMemberNavigate, useOnce } from '../lib/hooks.js'
import { FirstRun, Opening, Welcome } from './flows.jsx'

/** The inviter, for the welcome ("Read Ruth's latest story"). */
async function inviterOf(token) {
  if (!token) return null
  try {
    const inv = await readInvite(token)
    if (!inv?.valid || !inv.inviter) return null
    const latest = inv.recent_events?.[0]
    return { username: inv.inviter.username, name: (inv.inviter.display_name || inv.inviter.username).split(' ')[0], latestId: latest?.id, latestTitle: latest?.title }
  } catch {
    return null
  }
}

export default function CallbackPage() {
  const navigate = useNavigate()
  const [pending] = useState(() => readPending())
  const wash = pending?.wash || 'tide'
  const { go, waiting, late } = useMemberNavigate()
  const [view, setView] = useState({ name: 'opening' })
  const [made, setMade] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const params = readParams(window.location.href)
    const initError = await ready()
    let session = await currentSession()
    const arrival = classifyArrival({ params, hasSession: !!session, initError })
    let outcome = arrival
    if (arrival.kind === 'token-hash') {
      const { data, error } = await verifyTokenHash(arrival.tokenHash, arrival.type === 'recovery' ? 'recovery' : 'email')
      session = data?.session || null
      outcome = error ? { kind: 'error', code: error.code || 'otp_expired' } : session ? { kind: 'session' } : { kind: 'nothing' }
    }
    // Our own parameters go only now, after the client has read the URL.
    window.history.replaceState(window.history.state, '', cleanUrl(window.location.href))

    if (outcome.kind === 'nothing') return navigate('/login', { replace: true })
    if (outcome.kind === 'no-verifier') return setView({ name: 'elsewhere' })
    if (outcome.kind === 'error') return setView({ name: 'error', code: outcome.code })

    const acc = await resolveAccount()
    if (acc.state === 'member') return go(pending?.next || '/feed')
    if (acc.state === 'needs-profile') {
      const invite = pending?.invite || session?.user?.user_metadata?.invite_token || null
      const inviter = await inviterOf(invite)
      return setView({ name: 'first-run', invite, inviter })
    }
    setView({ name: 'error', code: acc.state === 'unreachable' ? 'network' : 'unknown', retry: true })
  }
  useOnce(run)

  const again = async () => {
    savePending({ next: pending?.next, invite: pending?.invite, intent: pending?.intent || 'login', wash })
    setBusy(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setBusy(false)
      setView({ name: 'error', code: error.code || 'network' })
    }
  }

  if (view.name === 'opening' || waiting) return <Opening wash={wash} late={late} line={waiting ? 'Opening your stories…' : 'Signing you in…'} />
  if (view.name === 'first-run')
    return <FirstRun wash="fizz" invite={view.invite} onDone={(u) => (setMade(u), setView({ ...view, name: 'welcome' }))} />
  if (view.name === 'welcome') return <Welcome user={made} inviter={view.inviter} />

  if (view.name === 'elsewhere') {
    // A confirmation link opened in a different browser or device: the address is confirmed,
    // but this browser cannot finish the sign-in itself.
    return (
      <AuthStage scene={sceneWithWash('opening', 'sun')} sceneKey="elsewhere" title="Log in to finish" head={{ before: 'One more', mark: 'step', after: '.' }} sub="This link opened somewhere other than where you started. Log in here and you're in.">
        <Stack>
          <Button size="lg" full to="/login" data-ui="to-login">
            Log in
          </Button>
          <Providers onGoogle={again} busy={busy} />
        </Stack>
      </AuthStage>
    )
  }

  // errors: Google closed or refused, a spent or expired link, the network
  const m = messageFor(view.code)
  const fresh = m.action === 'fresh-link'
  const closed = view.code === 'access_denied'
  const head = fresh ? { before: "Let's get you a fresh", mark: 'link', after: '.' } : closed ? { before: 'No', mark: 'rush', after: '.' } : { before: "Let's try that", mark: 'again', after: '.' }
  return (
    <AuthStage scene={sceneWithWash(fresh ? 'reset' : 'login', fresh ? 'zest' : wash)} sceneKey={`error-${view.code}`} title="Sign in" head={head} sub={m.line}>
      <Stack>
        {view.code === 'provider_email_needs_verification' ? <Notice tone="info">We sent a confirmation to your Google address. Open it, then continue with Google again.</Notice> : null}
        {fresh ? (
          <>
            <Button size="lg" full to="/login" data-ui="to-login">
              Log in
            </Button>
            <Button size="lg" full variant="ghost" to="/login?signup=true">
              Send me a new link
            </Button>
          </>
        ) : (
          <>
            {view.retry ? (
              <Button size="lg" full onClick={() => window.location.reload()}>
                Try again
              </Button>
            ) : (
              <Providers onGoogle={again} busy={busy} />
            )}
            <p style={{ margin: 0, textAlign: 'center' }}>
              <TextLink to={pending?.intent === 'signup' ? '/login?signup=true' : '/login'} data-ui="use-email">
                Use my email instead
              </TextLink>
            </p>
          </>
        )}
      </Stack>
    </AuthStage>
  )
}

