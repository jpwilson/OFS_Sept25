// Writing a note or a history entry about someone (owner: FAMILY), the person sheet's 'write'
// mode. docs/app/FAMILY-NOTES.md "Page": a Note | History switch, the words (up to 4000
// characters, a counter from 3600), for history a date where a year is enough, who can read
// it, and Save. A refusal shows the server's own words. The text is sent as written and is
// shown as text, never as HTML.
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { audienceLine, fromPartial, toPartial, todayYmd } from './dates.js'
import PartialDate from './PartialDate.jsx'
import { noteActions } from './useNotes.js'
import sh from './Sheets.module.css'
import s from './Notes.module.css'

const MAX = 4000
const COUNT_FROM = 3600
const KINDS = [
  { value: 'note', label: 'Note' },
  { value: 'history', label: 'History' },
]

/** The server's words when it gives them (a string detail); otherwise a plain sentence. */
export function refusal(e) {
  if (typeof e?.data?.detail === 'string') return e.data.detail
  if (e?.status === 0) return 'Could not reach Our Family Socials. Check your connection.'
  return 'That did not save. Check it and try again.'
}

/** <NoteComposer p you editing={note | null} kind="note|history" onCancel onSaved(note) /> */
export default function NoteComposer({ p, you, editing, kind: startKind = 'note', onCancel, onSaved }) {
  const [kind, setKind] = useState(editing?.kind || startKind)
  const [body, setBody] = useState(editing?.body || '')
  const [date, setDate] = useState(() => fromPartial(editing?.happened_on, editing?.happened_precision))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const area = useRef(null)
  useEffect(() => {
    area.current?.focus({ preventScroll: true })
  }, [])
  const length = [...body].length
  const who = you ? 'yourself' : p.first

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setDateError('')
    if (!body.trim()) return setError('Write something first.')
    let when = { ymd: null, precision: null }
    if (kind === 'history') {
      when = toPartial(date)
      if (when.error) return setDateError(when.error)
      if (when.ymd && (when.ymd < '1000-01-01' || when.ymd > todayYmd())) return setDateError('Choose a date between the year 1000 and today.')
    }
    const fields = { kind, body, happened_on: when.ymd, happened_precision: when.precision }
    setBusy(true)
    try {
      const saved = editing ? await noteActions.update(p, editing.id, fields) : await noteActions.create(p, fields)
      onSaved(saved)
    } catch (err) {
      setError(refusal(err))
      setBusy(false)
    }
  }

  return (
    <form className={s.composer} onSubmit={submit} data-ui="note-composer" data-kind={kind} noValidate>
      <span className={sh.sectionHead}>{editing ? (kind === 'history' ? 'Edit this entry' : 'Edit your note') : `Write about ${who}`}</span>
      <Segmented label="Kind" value={kind} onChange={setKind} options={KINDS} full />
      <Field
        label={kind === 'history' ? 'What happened' : 'Your note'}
        hint={kind === 'history' ? 'Something that happened, and when.' : 'A memory, a story, or something the family should know.'}
      >
        <textarea ref={area} rows={5} maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} data-ui="note-text" />
      </Field>
      {length > COUNT_FROM ? (
        <p className={s.counter} aria-live="polite" data-ui="note-counter">
          {length.toLocaleString('en-US')} of {MAX.toLocaleString('en-US')} characters
        </p>
      ) : null}
      {kind === 'history' ? (
        <PartialDate legend="When" optional hint="A year is enough." value={date} onChange={(d) => { setDate(d); setDateError('') }} error={dateError} ui="note-date" />
      ) : null}
      <p className={s.audience} data-ui="note-audience">
        <Icon name="eye" size={18} />
        <span>{audienceLine(p, you)}</span>
      </p>
      {error ? <p className={sh.error} role="alert">{error}</p> : null}
      <div className={s.buttons}>
        <Button type="submit" busy={busy} data-ui="note-save">
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
