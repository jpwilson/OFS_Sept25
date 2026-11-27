// Add a relative (owner: FAMILY). docs/app/FAMILY.md section 5.
// Step 1, who: people you and they both follow first (marked In your tree, Waiting, Asked
// you), then search; someone who does not follow you back can be added once you follow each
// other; last, "Someone without an account" (a tag profile, which joins the tree at once).
// Step 2, how: the eight common words, all 35 grouped, and the word they would use for you.
// Step 3: sent. They confirm, then join your tree.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchPeople } from '../lib/data.js'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { COMMON, TYPE_GROUPS, capitalise, reverseOf } from './kin.js'
import { Face, FaceSticker } from './Person.jsx'
import TagForm from './TagForm.jsx'
import { loadFollows } from './useFamily.js'
import { possessive } from './words.js'
import s from './Sheets.module.css'

const firstOf = (name) => String(name || '').trim().split(/\s+/)[0] || 'them'

/** <AddSheet open start="who|tag" fam user onClose onOpenPerson onOpenRequests /> */
export default function AddSheet({ open, start = 'who', fam, user, onClose, onOpenPerson, onOpenRequests, tagWord }) {
  const [step, setStep] = useState(start)
  const [who, setWho] = useState(null) // {id, username, full_name, avatar_url}
  const [mine, setMine] = useState('')
  const [theirs, setTheirs] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [made, setMade] = useState(null)
  useEffect(() => {
    if (open) {
      setStep(start)
      setWho(null)
      setMine('')
      setTheirs('')
      setError('')
      setMade(null)
    }
  }, [open, start])

  const choose = (person) => {
    setWho(person)
    setMine('')
    setTheirs('')
    setError('')
    setStep('how')
  }
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await fam.actions.propose(who, mine, theirs)
      setStep('sent')
    } catch (e) {
      setError(e?.message || 'That did not send. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }
  const createTag = async (v) => {
    setBusy(true)
    setError('')
    try {
      const t = await fam.actions.createTag(v)
      setMade(t)
      setStep('tagDone')
    } catch (e) {
      setError(e?.message || 'That did not save. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const titles = { who: 'Add a relative', how: 'How are you related?', sent: 'Sent', tag: 'Someone without an account', tagDone: 'In your tree' }
  const n = { who: 1, how: 2, sent: 3, tag: 2, tagDone: 3 }[step]
  const footer =
    step === 'how' ? (
      <>
        <Button variant="ghost" onClick={() => setStep('who')}>
          Back
        </Button>
        <Button onClick={send} busy={busy} disabled={!mine || !theirs} data-ui="add-send">
          Send
        </Button>
      </>
    ) : step === 'sent' || step === 'tagDone' ? (
      <>
        <Button variant="ghost" onClick={() => { setStep('who'); setWho(null); setMade(null) }}>
          Add someone else
        </Button>
        <Button onClick={onClose}>Done</Button>
      </>
    ) : null

  return (
    <Sheet open={open} onClose={onClose} title={titles[step]} footer={footer} wash="lime" size={step === 'who' ? 'full' : 'auto'}>
      <div className={s.steps} aria-hidden="true" data-ui="add-steps" data-step={step}>
        {[1, 2, 3].map((i) => <span key={i} className={s.stepDot} data-on={i <= n || undefined} />)}
      </div>
      {step === 'who' ? (
        <Who fam={fam} user={user} onChoose={choose} onTag={() => setStep('tag')} onOpenPerson={onOpenPerson} onOpenRequests={onOpenRequests} />
      ) : step === 'how' && who ? (
        <How who={who} mine={mine} theirs={theirs} setMine={setMine} setTheirs={setTheirs} error={error} />
      ) : step === 'sent' && who ? (
        <div className={s.hero} data-ui="add-sent">
          <span className={s.heroFace}>
            <Face name={who.full_name || who.username} src={who.avatar_url} size={96} asked />
            <FaceSticker kind="asked" />
          </span>
          <span className={s.heroName}>Sent to {firstOf(who.full_name || who.username)}</span>
          <p className={s.done}>
            {firstOf(who.full_name || who.username)} confirms, then joins your tree. Until then {firstOf(who.full_name || who.username)} waits there, faded, with an Asked sticker.
          </p>
        </div>
      ) : step === 'tag' ? (
        <>
          <p className={s.note} style={{ marginTop: 0, marginBottom: 14 }}>
            Children, pets and family not on Our Family Socials yet. They join your tree right away, and you can tag them in stories.
          </p>
          <TagForm id="tag-new" initial={{ word: tagWord || '' }} busy={busy} error={error} onSubmit={createTag} />
        </>
      ) : step === 'tagDone' && made ? (
        <div className={s.hero} data-ui="add-tag-done">
          <span className={s.heroFace}>
            <Face name={made.name} src={made.photo_url} size={96} tag />
            <FaceSticker kind="tag" />
          </span>
          <span className={s.heroName}>{made.name} joins your tree</span>
          <p className={s.done}>Tag {firstOf(made.name)} in your stories. You can add a photo or another relative&apos;s link from {possessive(firstOf(made.name))} card any time.</p>
        </div>
      ) : null}
    </Sheet>
  )
}

function Who({ fam, user, onChoose, onTag, onOpenPerson, onOpenRequests }) {
  const [follows, setFollows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    let live = true
    loadFollows()
      .then((f) => live && setFollows(f))
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])
  const mutualIds = useMemo(() => {
    if (!follows) return new Set()
    const back = new Set(follows.followers.map((f) => f.id))
    return new Set(follows.following.map((f) => f.user_id ?? f.id).filter((id) => back.has(id)))
  }, [follows])
  const statusOf = (id) => {
    if (fam.relationships.some((r) => r.other_user_id === id)) return { kind: 'in', text: 'In your tree' }
    if (fam.sent.some((r) => r.recipient_id === id)) return { kind: 'waiting', text: 'Waiting' }
    if (fam.pending.some((r) => r.proposer_id === id)) return { kind: 'asked', text: 'Asked you' }
    return null
  }
  const mutual = useMemo(() => {
    if (!follows) return []
    const seen = new Set()
    return follows.following
      .map((f) => ({ id: f.user_id ?? f.id, username: f.username, full_name: f.full_name || f.display_name || f.username, avatar_url: f.avatar_url }))
      .filter((f) => mutualIds.has(f.id) && f.id !== user?.id && !seen.has(f.id) && seen.add(f.id))
      .sort((a, b) => {
        const sa = statusOf(a.id) ? 1 : 0, sb = statusOf(b.id) ? 1 : 0
        return sa - sb || a.full_name.localeCompare(b.full_name)
      })
  }, [follows, mutualIds, fam.relationships, fam.sent, fam.pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    if (q.trim().length < 2) {
      setResults(null)
      return undefined
    }
    const ctl = new AbortController()
    timer.current = setTimeout(() => {
      setSearching(true)
      searchPeople(q, { signal: ctl.signal })
        .then((r) => setResults((r || []).filter((x) => x.id !== user?.id)))
        .catch((e) => e?.name !== 'AbortError' && setResults([]))
        .finally(() => setSearching(false))
    }, 220)
    return () => { clearTimeout(timer.current); ctl.abort() }
  }, [q, user?.id])

  const row = (person) => {
    const st = statusOf(person.id)
    const name = person.full_name || person.username
    const canAdd = !st && mutualIds.has(person.id)
    const onClick = st?.kind === 'in' ? () => onOpenPerson(`u:${person.id}`) : st?.kind === 'asked' ? onOpenRequests : canAdd ? () => onChoose(person) : undefined
    const body = (
      <>
        <Face name={name} src={person.avatar_url} size={44} />
        <span className={s.rowText}>
          <span className={s.rowName}>{name}</span>
          {!st && !canAdd ? <span className={s.rowHint}>Follow each other to add {firstOf(name)}</span> : null}
        </span>
        {st ? <span className={s.rowTag} data-kind={st.kind}>{st.text}</span> : null}
        {canAdd ? <Icon name="chevron-right" size={18} className={s.chev} /> : null}
        {!st && !canAdd ? (
          <Link to={`/profile/${person.username}`} className={s.rowLink} onClick={(e) => e.stopPropagation()}>
            Profile
          </Link>
        ) : null}
      </>
    )
    return onClick ? (
      <button key={person.id} type="button" className={s.row} onClick={onClick} data-ui="add-person" data-username={person.username}>
        {body}
      </button>
    ) : (
      <div key={person.id} className={s.row} aria-disabled="true" data-ui="add-person" data-username={person.username}>
        {body}
      </div>
    )
  }

  return (
    <div className={s.form} style={{ gap: 14 }}>
      <Field label="Search by name" hideLabel>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" autoComplete="off" enterKeyHint="search" />
      </Field>
      {results ? (
        <div className={s.section} style={{ marginTop: 0 }}>
          <span className={s.sectionHead}>{searching ? 'Searching…' : results.length ? 'People' : 'Nobody by that name yet'}</span>
          <div className={s.rows}>{results.map(row)}</div>
        </div>
      ) : (
        <div className={s.section} style={{ marginTop: 0 }}>
          <span className={s.sectionHead}>People you follow who follow you</span>
          {follows ? (
            mutual.length ? <div className={s.rows}>{mutual.map(row)}</div> : <p className={s.note} style={{ margin: 0 }}>When you and someone follow each other, they show here. Search for anyone by name.</p>
          ) : failed ? (
            <p className={s.note} style={{ margin: 0 }}>Search for anyone by name.</p>
          ) : (
            <span style={{ padding: 12 }}><Spinner size={22} /></span>
          )}
        </div>
      )}
      <div className={s.rows}>
        <button type="button" className={s.row} onClick={onTag} data-ui="add-tag">
          <span className={s.rowIcon}>
            <Icon name="plus" size={20} />
          </span>
          <span className={s.rowText}>
            <span className={s.rowName}>Someone without an account</span>
            <span className={s.rowHint}>A child, a pet, or family not on the app yet</span>
          </span>
          <Icon name="chevron-right" size={18} className={s.chev} />
        </button>
      </div>
    </div>
  )
}

function How({ who, mine, theirs, setMine, setTheirs, error }) {
  const [moreMine, setMoreMine] = useState(false)
  const [moreTheirs, setMoreTheirs] = useState(false)
  const name = who.full_name || who.username
  const first = firstOf(name)
  const rev = mine ? reverseOf(mine) : { words: [], suggest: null }
  useEffect(() => {
    if (!mine) return
    const r = reverseOf(mine)
    setTheirs(r.suggest || '')
  }, [mine]) // eslint-disable-line react-hooks/exhaustive-deps
  const words = (list, value, set) =>
    list.map((w) => (
      <Chip key={w} selected={value === w} onClick={() => set(value === w ? '' : w)}>
        {capitalise(w)}
      </Chip>
    ))
  return (
    <div className={s.form} data-ui="add-how">
      <div className={s.who}>
        <Face name={name} src={who.avatar_url} size={56} />
        <span className={s.whoName}>{name}</span>
      </div>
      <div className={s.section} style={{ marginTop: 0 }}>
        <span className={s.sectionHead} id="how-mine">{first} is your…</span>
        <div className={s.chips} role="group" aria-labelledby="how-mine">{words(COMMON, mine, setMine)}</div>
        {moreMine ? (
          TYPE_GROUPS.map((g) => (
            <div key={g.label}>
              <p className={s.groupLabel}>{g.label}</p>
              <div className={s.chips}>{words(g.words.filter((w) => !COMMON.includes(w)), mine, setMine)}</div>
            </div>
          ))
        ) : (
          <button type="button" className={s.moreWords} onClick={() => setMoreMine(true)}>
            More words <Icon name="chevron-down" size={16} />
          </button>
        )}
      </div>
      {mine ? (
        <div className={s.section} style={{ marginTop: 0 }}>
          <span className={s.sectionHead} id="how-theirs">And you are {possessive(first)}…</span>
          <div className={s.chips} role="group" aria-labelledby="how-theirs">{words(rev.words, theirs, setTheirs)}</div>
          {moreTheirs ? (
            TYPE_GROUPS.map((g) => (
              <div key={g.label}>
                <p className={s.groupLabel}>{g.label}</p>
                <div className={s.chips}>{words(g.words.filter((w) => !rev.words.includes(w)), theirs, setTheirs)}</div>
              </div>
            ))
          ) : (
            <button type="button" className={s.moreWords} onClick={() => setMoreTheirs(true)}>
              Another word <Icon name="chevron-down" size={16} />
            </button>
          )}
        </div>
      ) : null}
      {mine && theirs ? (
        <p className={s.sentence} data-ui="add-sentence">
          {first} is your {mine}. You&apos;re {possessive(first)} {theirs}.
        </p>
      ) : null}
      <p className={s.note} style={{ margin: 0 }}>
        {first} confirms, then joins your tree.
      </p>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
    </div>
  )
}
