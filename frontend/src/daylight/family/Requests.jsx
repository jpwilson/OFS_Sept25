// Requests to join your family tree (owner: FAMILY). docs/app/FAMILY.md sections 4 and 5.
// The strip on the page (only when someone has asked) and the sheet with everything:
// "Nico Russo says you're family · Your brother · You're Nico's sister", Confirm or Not now;
// and the people you asked, with Withdraw. Notifications keeps them too.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Face } from './Person.jsx'
import { inSentence, possessive } from './words.js'
import s from './Requests.module.css'

const firstOf = (name) => String(name || '').trim().split(/\s+/)[0] || 'They'

function IncomingCard({ r, fam, canWrite }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const name = r.proposer_display_name || r.proposer_username
  const first = firstOf(name)
  const act = async (kind) => {
    setBusy(kind)
    setError('')
    try {
      if (kind === 'yes') {
        await fam.actions.accept(r.id)
        setDone(`${first} joins your tree.`)
      } else {
        await fam.actions.reject(r.id)
      }
    } catch (e) {
      setError(e?.message || 'That did not go through. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }
  return (
    <article className={s.card} data-ui="request-card">
      <Face name={name} src={r.proposer_avatar_url} size={52} className={s.face} />
      <p className={s.says}>{name} says you&apos;re family</p>
      <p className={s.words}>
        Your <b>{inSentence(r.i_would_call_them)}</b> · You&apos;re {possessive(first)} <b>{inSentence(r.they_call_me)}</b>
      </p>
      {done ? (
        <p className={s.done} role="status">{done}</p>
      ) : canWrite ? (
        <div className={s.buttons}>
          <Button size="sm" onClick={() => act('yes')} busy={busy === 'yes'} disabled={!!busy}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act('no')} busy={busy === 'no'} disabled={!!busy}>
            Not now
          </Button>
        </div>
      ) : null}
      {error ? <p className={s.err} role="alert">{error}</p> : null}
    </article>
  )
}

function SentCard({ r, fam, canWrite }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = r.recipient_display_name || r.recipient_username
  const first = firstOf(name)
  return (
    <article className={s.card} data-ui="sent-card">
      <Face name={name} src={r.recipient_avatar_url} size={52} asked className={s.face} />
      <p className={s.says}>{name}</p>
      <p className={s.words}>
        Asked to be your <b>{inSentence(r.i_call_them)}</b> · You&apos;d be {possessive(first)} <b>{inSentence(r.they_would_call_me)}</b>
      </p>
      {canWrite ? (
        <div className={s.buttons}>
          <Button
            size="sm"
            variant="ghost"
            busy={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await fam.actions.withdraw(r.id)
              } catch (e) {
                setError(e?.message || 'That did not go through. Try again in a moment.')
                setBusy(false)
              }
            }}
          >
            Withdraw
          </Button>
        </div>
      ) : null}
      {error ? <p className={s.err} role="alert">{error}</p> : null}
    </article>
  )
}

/** The strip: shown only when someone has asked you. */
export function RequestsStrip({ fam, canWrite, onSeeAll }) {
  const list = fam.pending
  if (!list.length) return null
  const shown = list.slice(0, 3)
  return (
    <section className={s.strip} aria-label="Asking to join your tree" data-ui="requests-strip">
      <div className={s.head}>
        <h2 className={s.title}>Asking to join · {list.length}</h2>
        {list.length > 2 || fam.sent.length ? (
          <button type="button" className={s.seeAll} onClick={onSeeAll}>
            See all
          </button>
        ) : null}
      </div>
      <div className={s.cards}>
        {shown.map((r) => (
          <IncomingCard key={r.id} r={r} fam={fam} canWrite={canWrite} />
        ))}
      </div>
    </section>
  )
}

/** Everything: requests to you, and the people you asked. */
export function RequestsSheet({ open, onClose, fam, canWrite }) {
  return (
    <Sheet open={open} onClose={onClose} title="Requests" wash="lime">
      <div data-ui="requests-sheet">
        <section className={s.group}>
          <h3 className={s.groupHead}>Asking to join · {fam.pending.length}</h3>
          {fam.pending.length ? (
            <div className={s.list}>
              {fam.pending.map((r) => <IncomingCard key={r.id} r={r} fam={fam} canWrite={canWrite} />)}
            </div>
          ) : (
            <p className={s.empty}>Nobody is waiting for you to confirm.</p>
          )}
        </section>
        <section className={s.group}>
          <h3 className={s.groupHead}>Waiting to confirm · {fam.sent.length}</h3>
          {fam.sent.length ? (
            <div className={s.list}>
              {fam.sent.map((r) => <SentCard key={r.id} r={r} fam={fam} canWrite={canWrite} />)}
            </div>
          ) : (
            <p className={s.empty}>Everyone you asked has answered.</p>
          )}
        </section>
        <Link to="/notifications" className={s.more}>
          Requests about your tags <Icon name="chevron-right" size={16} />
        </Link>
      </div>
    </Sheet>
  )
}
