// Someone without an account: a name, the word you use, a birthday and a photo if you like,
// and under "More about {first}" a birthplace and when they died (owner: FAMILY). Creates or
// edits a tag profile. The birthday puts brothers, sisters and children in age order
// (arrange.js orderSiblings); a year is enough (PartialDate). Every field can be cleared: the
// PUT applies what is sent and an explicit null clears it (docs/app/FAMILY-NOTES.md). The photo
// is cropped round with the existing components/ImageCropper and uploaded with
// apiService.uploadImage, as the classic modal does.
import { lazy, Suspense, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import apiService from '../../services/api.js'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { fromPartial, toPartial, todayYmd } from './dates.js'
import { TYPE_GROUPS, capitalise, normalise } from './kin.js'
import PartialDate from './PartialDate.jsx'
import { Face } from './Person.jsx'
import s from './Sheets.module.css'

const ImageCropper = lazy(() => import('../../components/ImageCropper.jsx'))
const FIRST_WORDS = ['daughter', 'son', 'child', 'pet', 'grandmother', 'grandfather']
const ALL = new Set(TYPE_GROUPS.flatMap((g) => g.words))

/** A partial date from the form, or {error}; null-safe for nothing filled in. */
function readDate(parts, what) {
  const d = toPartial(parts)
  if (d.error) return d
  if (d.ymd && d.ymd > todayYmd()) return { error: `Choose a ${what} up to today.` }
  return d
}

/**
 * <TagForm initial={{name, word, photoUrl, birth: {ymd, precision}, birthplace, died: {ymd, precision}}} onSubmit busy error submitLabel />
 * onSubmit({name, word, photoUrl, birth: {ymd, precision}, birthplace, died: {ymd, precision}}) -> Promise
 */
export default function TagForm({ initial = {}, onSubmit, busy, error, submitLabel = 'Add to your tree', id = 'tag-form' }) {
  const [name, setName] = useState(initial.name || '')
  const startWord = initial.word || ''
  const known = !startWord || ALL.has(normalise(startWord).word) || FIRST_WORDS.includes(startWord)
  const [word, setWord] = useState(startWord)
  const [own, setOwn] = useState(known ? '' : startWord)
  const [more, setMore] = useState(!known || (startWord && !FIRST_WORDS.includes(startWord)))
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || '')
  const [birth, setBirth] = useState(() => fromPartial(initial.birth?.ymd, initial.birth?.precision))
  const [birthplace, setBirthplace] = useState(initial.birthplace || '')
  const [died, setDied] = useState(() => fromPartial(initial.died?.ymd, initial.died?.precision))
  const [about, setAbout] = useState(!!(initial.birthplace || initial.died?.ymd))
  const [dateErrors, setDateErrors] = useState({})
  const [crop, setCrop] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef(null)

  const chosen = own.trim() || word
  const pick = (w) => {
    setOwn('')
    setWord((cur) => (cur === w ? '' : w))
  }
  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setPhotoError('Choose a photo (JPEG, PNG or HEIC).')
    if (file.size > 10 * 1024 * 1024) return setPhotoError('Choose a photo under 10 MB.')
    setPhotoError('')
    const reader = new FileReader()
    reader.onload = () => setCrop(reader.result)
    reader.readAsDataURL(file)
  }
  const onCropped = async (blob) => {
    setCrop(null)
    setUploading(true)
    setPhotoError('')
    try {
      const data = await apiService.uploadImage(new File([blob], 'tag-profile-photo.jpg', { type: 'image/jpeg' }))
      const url = data?.url || data?.urls?.medium
      if (!url) throw new Error('no url')
      setPhotoUrl(url)
    } catch {
      setPhotoError('That photo did not upload. Try it again in a moment.')
    } finally {
      setUploading(false)
    }
  }
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || busy || uploading) return
    const b = readDate(birth, 'birthday')
    const d = readDate(died, 'date')
    setDateErrors({ birth: b.error, died: d.error })
    if (d.error) setAbout(true)
    if (b.error || d.error) return
    onSubmit({ name: name.trim(), word: chosen || null, photoUrl: photoUrl || null, birth: b, birthplace: birthplace.trim() || null, died: d })
  }
  const first = name.trim().split(/\s+/)[0]

  return (
    <form className={s.form} onSubmit={submit} id={id} data-ui="tag-form" noValidate>
      <Field label="Name" hint="As the family knows them: Ivy, Grandma Rose, Biscuit.">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={80} data-autofocus required />
      </Field>
      <div className={s.section} style={{ marginTop: 0 }}>
        <span className={s.sectionHead} id={`${id}-word`}>
          {name.trim() ? `${name.trim().split(/\s+/)[0]} is your…` : 'They are your…'}
        </span>
        <div className={s.chips} role="group" aria-labelledby={`${id}-word`}>
          {FIRST_WORDS.map((w) => (
            <Chip key={w} selected={!own && word === w} onClick={() => pick(w)}>
              {capitalise(w)}
            </Chip>
          ))}
        </div>
        {more ? (
          <>
            {TYPE_GROUPS.map((g) => (
              <div key={g.label}>
                <p className={s.groupLabel}>{g.label}</p>
                <div className={s.chips}>
                  {g.words.filter((w) => !FIRST_WORDS.includes(w)).map((w) => (
                    <Chip key={w} size="sm" selected={!own && word === w} onClick={() => pick(w)}>
                      {capitalise(w)}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
            <Field label="Or your own word" optional hint="Godmother, neighbor, best friend: anything you call them.">
              <input type="text" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={40} autoComplete="off" />
            </Field>
          </>
        ) : (
          <button type="button" className={s.moreWords} onClick={() => setMore(true)}>
            More words <Icon name="chevron-down" size={16} />
          </button>
        )}
      </div>
      <PartialDate
        legend="Birthday"
        optional
        hint="A year is enough. Brothers, sisters and children stand oldest first when birthdays are known."
        value={birth}
        onChange={(v) => { setBirth(v); setDateErrors((x) => ({ ...x, birth: null })) }}
        error={dateErrors.birth}
        ui="tag-birthday"
      />
      <div className={s.section} style={{ marginTop: 0 }} data-ui="tag-more-about">
        <button type="button" className={s.moreWords} onClick={() => setAbout((o) => !o)} aria-expanded={about}>
          More about {first || 'them'} <Icon name={about ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
        {about ? (
          <>
            <Field label="Birthplace" optional>
              <input type="text" value={birthplace} onChange={(e) => setBirthplace(e.target.value)} maxLength={120} autoComplete="off" placeholder="Town or city" data-ui="tag-birthplace" />
            </Field>
            <PartialDate
              legend="Died"
              optional
              hint="Leave it empty if they are with us."
              value={died}
              onChange={(v) => { setDied(v); setDateErrors((x) => ({ ...x, died: null })) }}
              error={dateErrors.died}
              ui="tag-died"
            />
          </>
        ) : null}
      </div>
      <div className={s.section} style={{ marginTop: 0 }}>
        <span className={s.sectionHead}>Photo</span>
        <div className={s.photoRow}>
          <Face name={name || '?'} src={photoUrl || null} size={72} tag />
          <div className={s.photoButtons}>
            <Button variant="ghost" size="sm" icon="camera" onClick={() => fileRef.current?.click()} busy={uploading}>
              {photoUrl ? 'Change photo' : 'Add a photo'}
            </Button>
            {photoUrl ? (
              <Button variant="quiet" size="sm" onClick={() => setPhotoUrl('')}>
                Remove
              </Button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />
        </div>
        {photoError ? <p className={s.error} role="alert">{photoError}</p> : null}
      </div>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      <Button type="submit" full busy={busy} disabled={!name.trim() || uploading}>
        {submitLabel}
      </Button>
      {crop
        ? createPortal(
            <Suspense fallback={null}>
              <ImageCropper image={crop} aspect={1} shape="round" onComplete={onCropped} onCancel={() => setCrop(null)} />
            </Suspense>,
            document.body,
          )
        : null}
    </form>
  )
}
