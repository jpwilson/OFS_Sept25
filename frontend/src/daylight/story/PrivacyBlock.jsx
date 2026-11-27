// When a story cannot be shown (owner: STORY). Keeps every branch classic has
// (EventDetail.jsx:1262-1374) with drawn emblems instead of emoji:
//   403 audience: signed out (requires_auth), not a follower (requires_follow, maybe a
//   request pending), private; 403 subscription_required (the plan has lapsed);
//   404 not found; 410 share link ended.
// Words come from the server's detail where it sends them (privacy_display, privacy_description).
import { useState } from 'react'
import { apiFetch } from '../lib/http.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { firstName } from './words.js'
import s from './PrivacyBlock.module.css'

export function blockKind(e, user) {
  if (!e) return null
  if (e.status === 410 || e.kind === 'expired') return 'expired'
  if (e.status === 404) return 'missing'
  if (e.subscription_required) return 'plan'
  if (e.requires_auth || (!user && e.status === 403)) return 'signin'
  if (e.requires_follow) return 'follow'
  return 'private'
}

export default function PrivacyBlock({ error, user, faceFor, share }) {
  const kind = blockKind(error, user)
  const full = error.author_full_name || error.author_username || ''
  const first = firstName(error.author_full_name, error.author_username) || 'the author'
  const u = error.author_username
  const face = u && faceFor ? faceFor(u, error.author_full_name) : null
  const [asked, setAsked] = useState(error.follow_request_pending ? 'pending' : null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const ask = async () => {
    setBusy(true)
    setErr(null)
    try {
      const r = await apiFetch(`/users/${encodeURIComponent(u)}/follow`, { method: 'POST' })
      setAsked(r?.status === 'accepted' ? 'accepted' : 'pending')
    } catch (x) {
      setErr(x?.status === 0 ? 'No connection. Try again.' : 'The request did not go through. Try again.')
    }
    setBusy(false)
  }
  const signUp = (
    <>
      <Button to="/login?signup=true" size="lg" icon="plus">Start free</Button>
      <Button to="/login" size="lg" variant="ghost">Log in</Button>
    </>
  )
  const back = <Button to="/feed" size="lg" variant={kind === 'missing' || kind === 'private' ? 'solid' : 'ghost'} icon="arrow-left">Back to stories</Button>

  const v = {
    signin: {
      wash: 'violet', icon: 'lock',
      head: { before: 'Sign in to read', mark: 'this', after: 'story.' },
      body: `${full || 'The author'} shares this story with the people they choose. Make a free account or log in, then ask to follow ${first}.`,
      actions: signUp,
    },
    follow: {
      wash: 'violet', icon: 'people',
      head: error.privacy_display ? { before: 'Shared with', mark: error.privacy_display.toLowerCase(), after: '' } : { before: 'Shared with', mark: `${first}'s`, after: 'followers.' },
      body: error.privacy_description || `Only people who follow ${first} can open it. If ${first} accepts, it opens for you.`,
      actions:
        asked === 'accepted' ? (
          <Button size="lg" onClick={() => window.location.reload()}>Open the story</Button>
        ) : asked === 'pending' ? (
          <>
            <p className={s.sent}>
              <Icon name="check" size={18} /> Request sent. {first} will see it in their notifications.
            </p>
            {back}
          </>
        ) : (
          <>
            {u ? <Button size="lg" busy={busy} onClick={ask} icon="plus">Ask to follow {first}</Button> : null}
            {u ? <Button size="lg" variant="ghost" to={`/profile/${u}`}>See {first}'s profile</Button> : back}
          </>
        ),
    },
    private: {
      wash: 'paper', icon: 'lock',
      head: { before: `Only ${first} can open`, mark: 'this', after: 'story.' },
      body: `${full || 'The author'} has kept it private.`,
      actions: back,
    },
    plan: {
      wash: 'sun', icon: 'lock',
      head: { before: 'This story needs', mark: 'a plan', after: '.' },
      body: error.message || `${full || 'The author'}'s plan has ended, so their stories are paused.`,
      actions: (
        <>
          <Button size="lg" to="/pricing">See the plans</Button>
          {u ? <Button size="lg" variant="ghost" to={`/profile/${u}`}>See {first}'s profile</Button> : back}
        </>
      ),
    },
    missing: {
      wash: 'paper', icon: 'search',
      head: { before: 'This story is', mark: 'not here', after: '.' },
      body: 'It may have been moved to the trash, or the link is not quite right.',
      actions: back,
    },
    expired: {
      wash: 'azure', icon: 'link',
      head: { before: 'This share link has', mark: 'ended', after: '.' },
      body: 'Share links stop working after a few days, to keep family stories private. Ask the person who sent it for a new link, or join and ask to follow them.',
      actions: user ? back : signUp,
    },
  }[kind]

  return (
    <div className={s.page} data-ui="privacy-block" data-kind={kind}>
      <section className={s.card} data-wash={v.wash}>
        <div className={s.band} aria-hidden="true">
          <span className={s.emblem}>
            <Icon name={v.icon} size={40} strokeWidth={2.2} />
          </span>
          {face && kind !== 'missing' && kind !== 'expired' ? (
            <span className={s.face}>
              <Avatar name={face.name || full} src={face.avatarUrl} size={56} ring />
            </span>
          ) : null}
        </div>
        <div className={s.text}>
          {full && kind !== 'missing' && kind !== 'expired' ? <p className={cx(s.by, 'a-mono')}>A story by {full}</p> : null}
          <Head as="h1" size="page" {...v.head} className={s.title} />
          <p className={s.body}>{v.body}</p>
          {err ? <p className={s.err} role="alert">{err}</p> : null}
          <div className={s.actions}>{v.actions}</div>
        </div>
      </section>
    </div>
  )
}
