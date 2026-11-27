// Your own birthday (owner: FAMILY), the person sheet's 'birthday' mode, opened from your own
// sheet: the new look has no settings page yet, so this is where a member sets it.
// docs/app/FAMILY-NOTES.md "Page". PUT /users/me/family-details; then useAuth().updateUser, so
// the tree puts you among your brothers and sisters by age at once. Never public: the choice is
// your family or only you. Remove sends nulls.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { todayYmd } from './dates.js'
import { refusal } from './NoteComposer.jsx'
import sh from './Sheets.module.css'
import s from './Notes.module.css'

const WHO = [
  { value: 'relatives', label: 'Your family' },
  { value: 'only_me', label: 'Only you' },
]

/** <BirthdayForm fam onDone(message) onCancel /> */
export default function BirthdayForm({ fam, onDone, onCancel }) {
  const { user, updateUser } = useAuth() || {}
  const [birth, setBirth] = useState(user?.birth_date || '')
  const [place, setPlace] = useState(user?.birthplace || '')
  const [who, setWho] = useState(user?.birth_date_visibility || 'relatives')
  const [busy, setBusy] = useState(null) // 'save' | 'remove'
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const had = !!(user?.birth_date || user?.birthplace)

  const save = async (fields, which, message) => {
    setBusy(which)
    setError('')
    try {
      const r = await fam.actions.saveBirthday(fields)
      // the whole member as AuthContext keeps it, with the server's answer on top
      updateUser?.({ ...user, birth_date: r.birth_date, birthplace: r.birthplace, birth_date_visibility: r.birth_date_visibility })
      onDone(message)
    } catch (e) {
      setError(refusal(e))
      setBusy(null)
    }
  }
  const submit = (e) => {
    e.preventDefault()
    if (busy) return
    setDateError('')
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return setDateError('Choose the whole date: day, month and year.')
    if (birth && (birth < '1900-01-01' || birth > todayYmd())) return setDateError('Choose a birthday between 1900 and today.')
    save({ birth_date: birth || null, birthplace: place.trim() || null, birth_date_visibility: who }, 'save', 'Your birthday is saved.')
  }

  return (
    <form className={s.composer} onSubmit={submit} data-ui="birthday-form" noValidate>
      <span className={sh.sectionHead}>{had ? 'Your birthday' : 'Add your birthday'}</span>
      <Field label="Birthday" error={dateError}>
        <input type="date" value={birth} min="1900-01-01" max={todayYmd()} onChange={(e) => { setBirth(e.target.value); setDateError('') }} data-ui="birthday-date" />
      </Field>
      <Field label="Birthplace" optional>
        <input type="text" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} autoComplete="off" placeholder="Town or city" data-ui="birthday-place" />
      </Field>
      <div className={s.group}>
        <span className={s.legend} id="birthday-who">
          Who sees it
        </span>
        <Segmented label="Who sees it" value={who} onChange={setWho} options={WHO} full />
        <p className={s.hint}>Never public. Brothers and sisters stand in age order when birthdays are known.</p>
      </div>
      {error ? <p className={sh.error} role="alert">{error}</p> : null}
      <div className={s.buttons}>
        <Button type="submit" busy={busy === 'save'} disabled={!!busy} data-ui="birthday-save">
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={!!busy}>
          Cancel
        </Button>
      </div>
      {had ? (
        <Button variant="quiet" busy={busy === 'remove'} disabled={!!busy} onClick={() => save({ birth_date: null, birthplace: null }, 'remove', 'Your birthday is removed.')} data-ui="birthday-remove">
          Remove your birthday
        </Button>
      ) : null}
    </form>
  )
}
