// Screens shared by several auth pages (owner: AUTH): opening the door, the inbox, the
// first-run step and the welcome. AUTH.md decisions 4, 6, 11, 12.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { fact } from '../../../landing/content/facts.js'
import { Button } from '../../ui/Button.jsx'
import { Field } from '../../ui/Field.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { Spinner } from '../../ui/Spinner.jsx'
import { AuthStage } from '../stage/AuthStage.jsx'
import { SCENES, sceneWithWash } from '../stage/scenes.js'
import { Notice, Providers, Stack, TextButton, Fine, Divider, HandleBox } from '../stage/parts.jsx'
import { cleanHandle, checkHandle, suggestHandle } from '../lib/handle.js'
import { createProfile, findFreeHandle, handleFree, inviteLink } from '../lib/account.js'
import { currentSession, resendConfirmation, signInWithGoogle, signOutHere } from '../lib/client.js'
import { messageFor } from '../lib/errors.js'
import { savePending } from '../lib/intent.js'
import { useCountdown, useMemberNavigate } from '../lib/hooks.js'
import s from './flows.module.css'

// ------------------------------------------------------------------ opening the door
/** Never a blank screen while a session is checked or a profile loads. */
export function Opening({ wash, late, onRetry, line = 'Checking who is here…' }) {
  return (
    <AuthStage scene={sceneWithWash('opening', wash)} sceneKey="opening" title="Opening" head={{ before: 'Opening the', mark: 'door', after: '.' }}>
      <div className={s.opening} aria-live="polite" aria-busy={!late}>
        {late ? (
          <Stack>
            <p className={s.lead}>This is taking longer than it should.</p>
            <Button size="lg" full onClick={onRetry || (() => window.location.reload())}>
              Try again
            </Button>
          </Stack>
        ) : (
          <>
            <Spinner size={28} />
            <p className={s.lead}>{line}</p>
          </>
        )}
      </div>
    </AuthStage>
  )
}

// ------------------------------------------------------------------ check your inbox
/** After an email sign-up. Never says whether an address already has an account. */
export function InboxScreen({ email, onBack, next, invite, barEnd }) {
  const [left, start] = useCountdown()
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState(null)
  useEffect(() => start(60), [start])
  const again = async () => {
    setBusy('resend')
    setNote(null)
    const { error } = await resendConfirmation(email)
    setBusy(null)
    if (error) setNote({ tone: 'error', text: messageFor(error).line })
    else {
      setNote({ tone: 'ok', text: 'Sent again. It can take a minute to arrive.' })
      start(60)
    }
  }
  const google = async () => {
    savePending({ next, invite, intent: 'signup', wash: 'sun' })
    setBusy('google')
    const { error } = await signInWithGoogle()
    if (error) {
      setBusy(null)
      setNote({ tone: 'error', text: messageFor(error).line })
    }
  }
  return (
    <AuthStage
      scene={SCENES.inbox}
      sceneKey="inbox"
      title="Check your inbox"
      head={{ before: 'Check your', mark: 'inbox', after: '.' }}
      sub={
        <>
          We sent a link to <strong className={s.addr}>{email}</strong>. Open it to finish.
        </>
      }
      barEnd={barEnd}
    >
      <Stack>
        <div className={s.envelope} aria-hidden="true">
          <Icon name="check" size={22} />
          <span>Link on its way</span>
        </div>
        <p className={s.body}>Nothing there after a minute? Look in spam or promotions, or send it again.</p>
        {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
        <Button size="lg" full variant="ghost" onClick={again} busy={busy === 'resend'} disabled={left > 0 || !!busy} data-ui="resend">
          {left > 0 ? `Send it again in ${left}s` : 'Send it again'}
        </Button>
        <Divider>or</Divider>
        <Providers onGoogle={google} busy={busy === 'google'} disabled={busy === 'resend'} />
        <p className={s.row}>
          <TextButton onClick={onBack}>Use a different email</TextButton>
        </p>
      </Stack>
    </AuthStage>
  )
}

// ------------------------------------------------------------------ first run
function firstNameOf(name) {
  return String(name || '').trim().split(/\s+/)[0] || ''
}

/** What should we call you? Name and handle, both filled in; the handle checked as you type. */
export function FirstRun({ invite, invitedName, onDone, wash }) {
  const auth = useAuth() || {}
  const navigate = useNavigate()
  const [who, setWho] = useState(null) // { email, name }
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [check, setCheck] = useState({ state: 'idle' }) // idle | checking | free | taken | invalid | error
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const handleRef = useRef(null)
  const handleHintId = useId()

  useEffect(() => {
    let live = true
    currentSession().then((sess) => {
      if (!live || !sess) return
      const meta = sess.user?.user_metadata || {}
      const n = meta.full_name || meta.name || invitedName || ''
      const email = sess.user?.email || ''
      setWho({ email, name: n })
      setName(n)
      setHandle(suggestHandle({ name: n, email }))
    })
    return () => {
      live = false
    }
  }, [invitedName])

  // the live check: 350ms after typing stops
  useEffect(() => {
    setError((e) => (e?.field === 'handle' ? null : e))
    if (!handle) return setCheck({ state: 'idle' })
    const bad = checkHandle(handle)
    if (bad && bad.reason !== 'reserved') return setCheck({ state: 'invalid', line: bad.line })
    const ctrl = new AbortController()
    setCheck({ state: 'checking' })
    const t = setTimeout(async () => {
      try {
        const free = bad ? false : await handleFree(handle, { signal: ctrl.signal })
        if (free) return setCheck({ state: 'free' })
        const alt = await findFreeHandle(handle, { name, signal: ctrl.signal })
        setCheck({ state: 'taken', alt })
      } catch (e) {
        if (e?.name !== 'AbortError') setCheck({ state: 'error' })
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // name only shapes the suggestion; re-checking on every name keystroke is not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) return setError({ field: 'name', text: 'Add the name your family knows you by.' })
    const bad = checkHandle(handle)
    if (bad && bad.reason !== 'reserved') {
      handleRef.current?.focus()
      return setError({ field: 'handle', text: bad.line })
    }
    setBusy(true)
    // Start does not wait for the live check: it checks for itself.
    if (check.state !== 'free') {
      const free = bad ? false : await handleFree(handle).catch(() => true) // unknown: the server decides
      if (!free) {
        setBusy(false)
        const alt = await findFreeHandle(handle, { name: trimmed }).catch(() => null)
        setCheck({ state: 'taken', alt })
        handleRef.current?.focus()
        return
      }
    }
    try {
      const user = await createProfile({ handle, name: trimmed, invite })
      onDone(user)
    } catch (err) {
      setBusy(false)
      if (err.code === 'handle_taken') {
        const alt = await findFreeHandle(handle, { name: trimmed }).catch(() => null)
        setCheck({ state: 'taken', alt })
        handleRef.current?.focus()
      } else if (err.code === 'email_registered') setError({ text: 'This email already has an account here. Log in with your password to reach it.', login: true })
      else if (err.code === 'signed_out') setError({ text: 'Your sign-in ran out before we finished. Start again and it will only take a moment.', login: true })
      else setError({ text: messageFor(err.code === 'network' ? 'network' : 'unknown').line })
    }
  }

  const differentAccount = async () => {
    await signOutHere(auth.logout)
    navigate('/login?signup=true', { replace: true })
  }

  const handleNote =
    check.state === 'free' ? (
      <span className={s.ok}>
        <Icon name="check" size={16} /> @{handle} is free.
      </span>
    ) : check.state === 'taken' ? (
      <span className={s.taken}>
        <Icon name="info" size={16} />
        @{handle} is taken.{' '}
        {check.alt ? (
          <>
            <TextButton className={s.inline} onClick={() => setHandle(check.alt)} data-ui="use-alt">
              @{check.alt}
            </TextButton>{' '}
            is free.
          </>
        ) : (
          'Try another.'
        )}
      </span>
    ) : check.state === 'invalid' ? (
      check.line
    ) : check.state === 'checking' ? (
      'Checking…'
    ) : check.state === 'error' ? (
      "We couldn't check that just now. Go on and we'll check again."
    ) : null

  return (
    <AuthStage
      scene={sceneWithWash('firstRun', wash)}
      sceneKey="first-run"
      title="What should we call you?"
      head={{ before: 'What should we', mark: 'call', after: 'you?' }}
      sub="Your name and your handle. That's all we need to open the door."
    >
      <form className={s.form} onSubmit={submit} noValidate>
        <Stack>
          {error && !error.field ? (
            <Notice
              action={
                error.login ? (
                  <TextButton onClick={differentAccount} data-ui="to-login">
                    Log in
                  </TextButton>
                ) : null
              }
            >
              {error.text}
            </Notice>
          ) : null}
          <Field label="Your name" error={error?.field === 'name' ? error.text : undefined}>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" maxLength={80} required />
          </Field>
          <div className={s.handleField} data-state={check.state}>
            <Field
              label="Your handle"
              hint={
                <>
                  <span aria-live="polite" id={handleHintId} className={s.handleNote} data-ui="handle-note">
                    {handleNote}
                  </span>
                  <span className={s.forever}>Your handle stays the same, so pick one you like.</span>
                </>
              }
              error={error?.field === 'handle' ? error.text : undefined}
            >
              <HandleBox
                ref={handleRef}
                value={handle}
                onChange={(e) => setHandle(cleanHandle(e.target.value).slice(0, 24))}
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-ui="handle"
              />
            </Field>
          </div>
          <Button type="submit" size="lg" full busy={busy} data-ui="start">
            Start
          </Button>
          {who?.email ? (
            <Fine>
              Signing up as <strong>{who.email}</strong> ·{' '}
              <TextButton className={s.inline} onClick={differentAccount}>
                Use a different account
              </TextButton>
            </Fine>
          ) : null}
        </Stack>
      </form>
    </AuthStage>
  )
}

// ------------------------------------------------------------------ welcome
/**
 * Straight after the profile is made, once. Two large cards, then a quiet way out.
 * inviter: { username, name, latestId } when they arrived by invitation.
 */
export function Welcome({ user, inviter }) {
  const { go, waiting, late } = useMemberNavigate()
  const [link, setLink] = useState(null)
  const [linkState, setLinkState] = useState('idle') // idle | busy | shown | copied | error
  const first = firstNameOf(user?.full_name || user?.display_name) || user?.username || 'friend'

  useEffect(() => {
    // The old trial pop-up waits a day, so it does not stack on top of this welcome.
    try {
      if (user?.id != null) localStorage.setItem(`welcome_temp_dismissed_${user.id}`, String(Date.now()))
    } catch {
      /* private mode */
    }
  }, [user?.id])

  const invite = async () => {
    setLinkState('busy')
    try {
      const r = await inviteLink()
      setLink(r.invite_url)
      setLinkState('shown')
    } catch {
      setLinkState('error')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setLinkState('copied')
    } catch {
      setLinkState('shown')
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: 'Our Family Socials', text: `Join me on Our Family Socials`, url: link })
    } catch {
      /* closed */
    }
  }

  const sub = inviter
    ? `You and ${inviter.name} follow each other, so their Followers stories open for you.`
    : `Your ${fact('trialDays')}-day trial starts today. Every story you make lives here, for the people you pick.`

  const cards = useMemo(() => {
    const make = { key: 'make', wash: 'fizz', icon: 'photos', title: 'Make your first story', body: 'Add a few photos. The story writes itself around them.', onClick: () => go('/create?from=photos') }
    const read = inviter && {
      key: 'read',
      wash: 'tide',
      icon: 'stories',
      title: `Read ${inviter.name}'s latest story`,
      body: inviter.latestTitle ? `“${inviter.latestTitle}”` : `See what ${inviter.name} has been sharing.`,
      onClick: () => go(inviter.latestId ? `/event/${inviter.latestId}` : `/profile/${inviter.username}`),
    }
    return read ? [read, make] : [make]
  }, [inviter, go])

  return (
    <AuthStage scene={SCENES.welcome} sceneKey="welcome" title="You're in" head={{ before: "You're in,", mark: first, after: '.' }} sub={sub} wide>
      <Stack gap="lg">
        <div className={s.choices}>
          {cards.map((c) => (
            <button key={c.key} type="button" className={s.choice} data-wash={c.wash} onClick={c.onClick} disabled={waiting} data-ui={`welcome-${c.key}`}>
              <span className={s.choiceIcon}>
                <Icon name={c.icon} size={24} />
              </span>
              <span className={s.choiceText}>
                <strong>{c.title}</strong>
                <span>{c.body}</span>
              </span>
              <Icon name="chevron-right" size={22} />
            </button>
          ))}
          <div className={s.choice} data-wash="lime" data-static="" data-ui="welcome-invite">
              <span className={s.choiceIcon}>
                <Icon name="family" size={24} />
              </span>
              <span className={s.choiceText}>
                <strong>Invite your family</strong>
                {linkState === 'shown' || linkState === 'copied' ? (
                  <span className={s.linkRow}>
                    <code className={s.link}>{link}</code>
                    <span className={s.linkBtns}>
                      <Button size="sm" variant="ghost" onClick={copy}>
                        {linkState === 'copied' ? 'Copied' : 'Copy'}
                      </Button>
                      {typeof navigator !== 'undefined' && navigator.share ? (
                        <Button size="sm" variant="ghost" onClick={share}>
                          Share
                        </Button>
                      ) : null}
                    </span>
                  </span>
                ) : (
                  <span>
                    {linkState === 'error' ? "We couldn't make your link just now. " : 'One link for everyone you want here. '}
                    <TextButton className={s.inline} onClick={invite} disabled={linkState === 'busy'} data-ui="get-link">
                      {linkState === 'busy' ? 'Making your link…' : linkState === 'error' ? 'Try again' : 'Get my link'}
                    </TextButton>
                  </span>
                )}
              </span>
            </div>
        </div>
        {late ? <Notice>This is taking longer than it should. Try again in a moment.</Notice> : null}
        <div className={s.quietRow}>
          <TextButton onClick={() => go('/feed')} disabled={waiting} data-ui="look-around">
            {waiting ? 'Opening…' : 'Look around first'}
          </TextButton>
          {user?.username ? (
            <TextButton onClick={() => go(`/profile/${user.username}/edit`)} disabled={waiting}>
              Add a photo of you
            </TextButton>
          ) : null}
        </div>
      </Stack>
    </AuthStage>
  )
}
