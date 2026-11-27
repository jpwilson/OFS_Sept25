// One person, opened from the tree or the list (owner: FAMILY). docs/app/FAMILY.md section 5.
// In sections, so more can join them: To you (who they are to you), Details, Stories (the
// stories they are in), then what you can do. A relative: their profile, and Remove from your
// tree. Someone you asked: Withdraw. A tag profile: its page, Edit, and links to your other
// relatives. You: your profile.
// The owner has asked for notes and history on each person; that needs the backend (a table,
// routes and rules for who may read and write) and slots in after Stories when it exists.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { apiFetch } from '../lib/http.js'
import { imageSrc } from '../lib/data.js'
import { dateRange, monthLabel, parseBackendDate } from '../lib/format.js'
import { COMMON, TYPE_GROUPS, capitalise } from './kin.js'
import { Face, FaceSticker } from './Person.jsx'
import TagForm from './TagForm.jsx'
import { inSentence, possessive } from './words.js'
import s from './Sheets.module.css'

const since = (iso) => {
  const d = parseBackendDate(iso)
  return d ? monthLabel(d) : null
}
// a calendar date, not an instant: read it in local time so no time zone moves the day
const born = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '')
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
}

/** <PersonSheet open id structure fam onClose canWrite /> */
export default function PersonSheet({ open, id, structure, fam, onClose, canWrite }) {
  const p = id ? structure?.people.get(id) : null
  const [mode, setMode] = useState('view') // view | edit | link
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    setMode('view')
    setError('')
    setNote('')
  }, [id])
  const close = () => {
    setMode('view')
    setError('')
    setNote('')
    onClose()
  }
  if (!p) return <Sheet open={open} onClose={close} title="Family" hideTitle>{null}</Sheet>

  const you = id === structure.me
  const first = p.first
  const word = inSentence(p.word)
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e?.message || 'That did not go through. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const status = you
    ? null
    : p.status === 'asked'
      ? { kind: 'asked', text: 'Waiting to confirm' }
      : p.kind === 'tag'
        ? { kind: 'tag', text: 'No account needed' }
        : { kind: 'ok', text: 'Confirmed' }

  return (
    <Sheet open={open} onClose={close} title={p.name} hideTitle wash="lime">
      <div className={s.hero} data-ui="person-sheet" data-person={id}>
        <span className={s.heroFace}>
          <Face name={p.name} src={p.avatar} size={104} you={you} tag={p.kind === 'tag'} asked={p.status === 'asked'} />
          {you ? <FaceSticker kind="you" /> : p.kind === 'tag' ? <FaceSticker kind="tag" /> : null}
        </span>
        <span className={s.heroName} aria-hidden="true">
          {p.name}
        </span>
        {you ? <span className={s.heroWord}>You</span> : word ? <span className={s.heroWord}>Your {word}</span> : null}
        {status ? (
          <span className={s.status} data-kind={status.kind}>
            {status.kind === 'ok' ? (
              <span className={s.statusDot}>
                <Icon name="check" size={12} />
              </span>
            ) : null}
            {status.text}
          </span>
        ) : null}
      </div>

      {mode === 'edit' && p.kind === 'tag' ? (
        <TagForm
          id="tag-edit"
          initial={{ name: p.name, word: p.word, photoUrl: p.avatar, birth: p.birth }}
          submitLabel="Save"
          busy={busy}
          error={error}
          onSubmit={(v) => run(async () => {
            await fam.actions.updateTag(p.tagId, { name: v.name, word: v.word || '', photoUrl: v.photoUrl ?? '', birthDate: v.birthDate })
            setMode('view')
          })}
        />
      ) : mode === 'link' && p.kind === 'tag' ? (
        <LinkForm p={p} structure={structure} busy={busy} error={error} onCancel={() => setMode('view')} onLink={(userId, w, who) => run(async () => {
          const r = await fam.actions.linkTag(p.tagId, userId, w)
          setNote(r.pending ? `${who} confirms, then the link shows in your tree.` : `${first} is now ${possessive(who)} ${w}.`)
          setMode('view')
        })} />
      ) : (
        <>
          <ToYou p={p} you={you} structure={structure} />
          <Details p={p} you={you} structure={structure} canWrite={canWrite} busy={busy} onUnlink={(linkId) => run(() => fam.actions.unlinkTag(p.tagId, linkId))} />
          <Stories p={p} you={you} open={open} />
          {/* Notes and history join here once the backend keeps them (see the family report). */}
          {note ? <p className={s.done} role="status">{note}</p> : null}
          <div className={s.actions} data-ui="person-actions">
            {you ? (
              <Button to={`/profile/${p.username}`} iconAfter="chevron-right" full>
                Open your profile
              </Button>
            ) : p.kind === 'tag' ? (
              <>
                <Button to={`/tag-profile/${p.tagId}`} iconAfter="chevron-right" full>
                  Open {possessive(first)} page
                </Button>
                {canWrite ? (
                  <>
                    <Button variant="ghost" icon="edit" full onClick={() => setMode('edit')}>
                      Edit {first}
                    </Button>
                    <Button variant="ghost" icon="link" full onClick={() => setMode('link')}>
                      Link {first} to another relative
                    </Button>
                  </>
                ) : null}
              </>
            ) : p.status === 'asked' ? (
              <>
                <Button to={`/profile/${p.username}`} variant="ghost" iconAfter="chevron-right" full>
                  Open {possessive(first)} profile
                </Button>
                {canWrite ? (
                  <Button variant="quiet" full busy={busy} onClick={() => run(async () => { await fam.actions.withdraw(p.relId); close() })}>
                    Withdraw request
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button to={`/profile/${p.username}`} iconAfter="chevron-right" full>
                  Open {possessive(first)} profile
                </Button>
                {canWrite ? (
                  <Button variant="quiet" full onClick={() => setConfirm(true)} data-ui="remove-relative">
                    Remove from your tree
                  </Button>
                ) : null}
              </>
            )}
          </div>
          {error ? <p className={s.error} role="alert">{error}</p> : null}
          {!you && p.kind === 'user' && p.status === 'confirmed' && canWrite ? (
            <p className={s.note}>
              Want a different word? Remove {first} here, then add {first} again with the word you prefer.
            </p>
          ) : null}
        </>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Remove ${first} from your tree?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              busy={busy}
              onClick={() => run(async () => {
                await fam.actions.remove(p.relId)
                setConfirm(false)
                close()
              })}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className={s.done}>{first} leaves your tree, and you leave {possessive(first)}. You still follow each other.</p>
      </Dialog>
    </Sheet>
  )
}

function Block({ title, children, ui }) {
  return (
    <section className={s.block} data-ui={ui}>
      <h3 className={s.blockHead}>{title}</h3>
      <div className={s.blockBody}>{children}</div>
    </section>
  )
}

/** Who they are to you, in both people's words. */
function ToYou({ p, you, structure }) {
  if (you) {
    const n = structure.count - 1
    return (
      <Block title="Your family" ui="person-to-you">
        <p>{n ? `${n} ${n === 1 ? 'person is' : 'people are'} in your family tree.` : 'Add the people you love and they join you here.'}</p>
      </Block>
    )
  }
  const lines = []
  if (p.status === 'asked') {
    lines.push(<p key="a">You asked {p.first} to be your {inSentence(p.word)}. {p.first} joins your tree after saying yes.</p>)
  } else {
    if (inSentence(p.word)) lines.push(<p key="w">{p.first} is your {inSentence(p.word)}.</p>)
    if (p.theirWord) lines.push(<p key="t">You&apos;re {possessive(p.first)} {inSentence(p.theirWord)}.</p>)
    const when = p.kind === 'user' ? since(p.source?.accepted_at) : since(p.source?.created_at)
    if (when) lines.push(<p key="s" className="a-mute">In your tree since {when}.</p>)
  }
  return lines.length ? <Block title="To you" ui="person-to-you">{lines}</Block> : null
}

/** Their details: an account or a tag, a birth date when known, links to your other relatives. */
function Details({ p, you, structure, canWrite, busy, onUnlink }) {
  const lines = []
  if (p.kind === 'tag') {
    lines.push(
      <p key="tag">
        {p.info?.pet
          ? `${p.first} is in your tree without an account. Tag ${p.first} in your stories.`
          : `${p.first} is in your tree without an account. Tag ${p.first} in your stories, and ${p.first} can claim this profile after joining.`}
      </p>,
    )
  } else if (p.username) {
    lines.push(<p key="acct">{you ? 'You are' : `${p.first} is`} on Our Family Socials as @{p.username}.</p>)
  }
  if (born(p.birth)) lines.push(<p key="born">Born {born(p.birth)}.</p>)
  const others = p.kind === 'tag' ? (p.source?.relationships || []).filter((l) => `u:${l.user_id}` !== structure.me) : []
  if (others.length) {
    lines.push(
      <div key="links" className={s.links}>
        {others.map((l) => (
          <div key={l.id} className={s.link}>
            <span>
              {p.first} is {possessive(l.display_name?.split(/\s+/)[0] || l.username)} {inSentence(l.relationship_type)}
            </span>
            {canWrite ? <IconButton icon="close" label={`Remove the link to ${l.display_name || l.username}`} onClick={() => onUnlink(l.id)} disabled={busy} /> : null}
          </div>
        ))}
      </div>,
    )
  }
  return lines.length ? <Block title="Details" ui="person-details">{lines}</Block> : null
}

/** The stories they are in: a person's own stories, or the stories a tag is tagged in. */
function Stories({ p, you, open }) {
  const [state, setState] = useState({ key: null, list: null, failed: false })
  const key = p.kind === 'tag' ? `t:${p.tagId}` : p.username ? `u:${p.username}` : null
  useEffect(() => {
    if (!open || !key || state.key === key) return undefined
    let live = true
    setState({ key, list: null, failed: false })
    const path = p.kind === 'tag' ? `/tag-profiles/${p.tagId}/events` : `/users/${encodeURIComponent(p.username)}/events`
    apiFetch(path, { query: { limit: 3 } })
      .then((list) => live && setState({ key, list: (list || []).slice(0, 3), failed: false }))
      .catch(() => live && setState({ key, list: [], failed: true }))
    return () => {
      live = false
    }
  }, [open, key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!key) return null
  const title = p.kind === 'tag' ? `Stories with ${p.first}` : you ? 'Your stories' : `${possessive(p.first)} stories`
  const all = p.kind === 'tag' ? `/tag-profile/${p.tagId}` : `/profile/${p.username}`
  const list = state.key === key ? state.list : null
  const allLink = (
    <Link to={all} className={s.allLink}>
      {p.kind === 'tag' ? `Every story with ${p.first}` : you ? 'All your stories' : `All ${possessive(p.first)} stories`} <Icon name="chevron-right" size={16} />
    </Link>
  )
  return (
    <Block title={title} ui="person-stories">
      {list == null ? (
        <>
          <Skeleton h={52} r={12} />
          <Skeleton h={52} r={12} w="80%" />
        </>
      ) : state.failed ? (
        // the list did not arrive: never claim there are none; the page has them all
        allLink
      ) : list.length ? (
        <>
          {list.map((e) => (
            <Link key={e.id} to={`/event/${e.slug || e.id}`} className={s.story} data-ui="person-story">
              {e.cover_image_url ? <img className={s.storyCover} src={imageSrc(e.cover_image_url, 'small')} alt="" loading="lazy" /> : <span className={s.storyCover} aria-hidden="true" />}
              <span className={s.storyText}>
                <span className={s.storyTitle}>{e.title}</span>
                {e.start_date ? <span className={s.storyDate}>{dateRange(e.start_date, e.end_date, { short: true })}</span> : null}
              </span>
            </Link>
          ))}
          {allLink}
        </>
      ) : (
        <p className="a-mute">{p.kind === 'tag' ? `Tag ${p.first} in a story and it shows here.` : you ? 'Your stories show here.' : `${possessive(p.first)} stories show here.`}</p>
      )}
    </Block>
  )
}

/** Link a tag to one of your relatives with an account: "{tag} is {relative}'s {word}". */
function LinkForm({ p, structure, busy, error, onCancel, onLink }) {
  const linked = new Set((p.source?.relationships || []).map((l) => `u:${l.user_id}`))
  const options = useMemo(
    () => [...structure.people.values()].filter((x) => x.kind === 'user' && x.status === 'confirmed' && !linked.has(x.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [structure, p], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [who, setWho] = useState(options[0]?.id || '')
  const [word, setWord] = useState('')
  const [more, setMore] = useState(false)
  const person = structure.people.get(who)
  return (
    <form className={s.linkForm} onSubmit={(e) => { e.preventDefault(); if (who && word) onLink(person.userId, word, person.first) }} data-ui="tag-link-form">
      {options.length ? (
        <>
          <Field label={`${p.first} is the…`}>
            <select value={who} onChange={(e) => setWho(e.target.value)} className={s.select}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <div className={s.chips} role="group" aria-label="Word">
            {(more ? TYPE_GROUPS.flatMap((g) => g.words) : [...COMMON, 'pet', 'child']).map((w) => (
              <Chip key={w} size="sm" selected={word === w} onClick={() => setWord(word === w ? '' : w)}>
                {capitalise(w)}
              </Chip>
            ))}
          </div>
          {more ? null : (
            <button type="button" className={s.moreWords} onClick={() => setMore(true)}>
              More words <Icon name="chevron-down" size={16} />
            </button>
          )}
          {person && word ? <p className={s.sentence}>{p.first} is {possessive(person.first)} {word}</p> : null}
          {error ? <p className={s.error} role="alert">{error}</p> : null}
          <div className={s.photoButtons}>
            <Button type="submit" busy={busy} disabled={!who || !word}>
              Link
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={s.done}>Everyone in your tree with an account is already linked to {p.first}.</p>
          <Button variant="ghost" onClick={onCancel}>
            Back
          </Button>
        </>
      )}
    </form>
  )
}
