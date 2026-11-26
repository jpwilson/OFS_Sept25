// /join/:token (owner: AUTH). AUTH.md decisions 11, 12, 14. The inviter's real face and
// story covers on the wall (props only: no sample family beside real people), the same door
// as sign-up, and the token carried through Google or the email link to the profile step.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { imageSrc } from '../../lib/data.js'
import { Avatar } from '../../ui/Avatar.jsx'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { SCENES } from '../stage/scenes.js'
import { Divider, Fine, Notice, PasswordBox, Providers, Stack, SwitchLine, TextLink } from '../stage/parts.jsx'
import { signInWithGoogle, signUpWithEmail } from '../lib/client.js'
import { readInvite } from '../lib/account.js'
import { messageFor } from '../lib/errors.js'
import { savePending } from '../lib/intent.js'
import { InboxScreen, Opening } from './flows.jsx'
import s from './InvitePage.module.css'

const MIN_PASSWORD = 8
const firstOf = (n) => String(n || '').trim().split(/\s+/)[0]

function Covers({ events }) {
  if (!events?.length) return null
  return (
    <div className={s.covers} aria-hidden="true">
      {events.slice(0, 3).map((e, i) =>
        e.cover_image_url ? (
          <figure key={e.id} className={s.print} style={{ '--i': i }}>
            <img src={imageSrc(e.cover_image_url, 'small')} alt="" loading="lazy" decoding="async" />
            <figcaption>{e.title}</figcaption>
          </figure>
        ) : null,
      )}
    </div>
  )
}

export default function InvitePage() {
  const { token } = useParams()
  const auth = useAuth() || {}
  const [inv, setInv] = useState(null) // null while loading, else validate-invite's answer
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let live = true
    readInvite(token)
      .then((d) => {
        if (!live) return
        setInv(d)
        if (d?.invited_email) setEmail(d.invited_email)
      })
      .catch(() => live && setInv({ valid: false, unreachable: true }))
    return () => {
      live = false
    }
  }, [token])

  if (!inv || auth.loading) return <Opening wash="lime" line="Opening your invitation…" />

  const inviter = inv.inviter || {}
  const name = inviter.display_name || inviter.username || 'Your family'
  const first = firstOf(name)
  const kicker = inv.valid ? (
    <span className={s.from}>
      <span className={s.face}>
        <Avatar name={name} src={inviter.avatar_url} size={56} />
      </span>
      <span className={s.fromText}>
        An invitation from <strong>{name}</strong>
      </span>
    </span>
  ) : null

  // ---------------------------------------------------------------- not usable
  if (!inv.valid) {
    const used = /already been used/i.test(inv.message || '')
    return (
      <AuthStage
        scene={SCENES.invite}
        sceneKey="invite-invalid"
        title="Invitation"
        head={used ? { before: 'This invitation is already', mark: 'used', after: '.' } : { before: "Let's find you a", mark: 'way', after: 'in.' }}
        sub={inv.unreachable ? messageFor('network').line : used ? 'Someone has already joined with it. You can still start free, or log in if you have an account.' : "This invitation link isn't working. You can still start free, or log in if you have an account."}
      >
        <Stack>
          <Button size="lg" full to="/login?signup=true" data-ui="start-free">
            Start free
          </Button>
          <Button size="lg" full variant="ghost" to="/login">
            Log in
          </Button>
        </Stack>
      </AuthStage>
    )
  }

  // ---------------------------------------------------------------- already signed in
  if (auth.user) {
    return (
      <AuthStage scene={SCENES.invite} sceneKey="invite-in" title="Invitation" kicker={kicker} head={{ before: "You're already", mark: 'in', after: '.' }} sub={`${first} invited you. Their stories are a tap away.`} decor={<Covers events={inv.recent_events} />}>
        <Stack>
          <Button size="lg" full to={`/profile/${inviter.username}`} data-ui="to-inviter">
            See {first}'s stories
          </Button>
          <Button size="lg" full variant="ghost" to="/feed">
            Go to my stories
          </Button>
        </Stack>
      </AuthStage>
    )
  }

  if (sent) return <InboxScreen email={email.trim()} next="/feed" invite={token} onBack={() => (setPw(''), setSent(false))} />

  const pending = () => savePending({ next: '/feed', invite: token, intent: 'invite', wash: 'lime' })
  const google = async () => {
    setError(null)
    pending()
    setBusy('google')
    const { error: e } = await signInWithGoogle()
    if (e) {
      setBusy(null)
      setError(messageFor(e))
    }
  }
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const addr = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return setError(messageFor('email_address_invalid'))
    if (pw.length < MIN_PASSWORD) return setError(messageFor('weak_password'))
    setBusy('email')
    pending()
    const { error: err } = await signUpWithEmail(addr, pw, { invite: token })
    setBusy(null)
    if (err) return setError(messageFor(err))
    setSent(true)
  }

  return (
    <AuthStage
      scene={SCENES.invite}
      sceneKey="invite"
      title={`${first} saved you a seat`}
      kicker={kicker}
      head={{ before: `${first} saved you a`, mark: 'seat', after: '.' }}
      sub={`Join ${first} on Our Family Socials, a private place where your family shares its stories.`}
      decor={<Covers events={inv.recent_events} />}
    >
      <Stack>
        <Providers onGoogle={google} busy={busy === 'google'} disabled={busy === 'email'} />
        <Divider />
        <form onSubmit={submit} noValidate className={s.form}>
          <Stack gap="sm">
            {error && !error.field ? <Notice>{error.line}</Notice> : null}
            <Field label="Email" error={error?.field === 'email' ? error.line : undefined}>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} data-ui="email" />
            </Field>
            <Field label="Password" hint={error?.field === 'password' ? undefined : '8 characters or more.'} error={error?.field === 'password' ? error.line : undefined}>
              <PasswordBox autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} data-ui="password" />
            </Field>
            <Button type="submit" size="lg" full busy={busy === 'email'} disabled={busy === 'google'} data-ui="submit">
              Join {first}
            </Button>
          </Stack>
        </form>
        <Fine>
          By continuing you agree to the <a href="/terms">Terms</a> and the <a href="/privacy">Privacy Policy</a>.
        </Fine>
        <SwitchLine lead="Already a member?">
          <TextLink to="/login" data-ui="to-login">
            Log in
          </TextLink>
        </SwitchLine>
      </Stack>
    </AuthStage>
  )
}

