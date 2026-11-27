// Someone without an account: a name, the word you use, a birthday and a photo if you like
// (owner: FAMILY). Creates or edits a tag profile. The birthday puts brothers, sisters and
// children in age order (arrange.js orderSiblings); the API sets or changes one, never clears it. The photo is cropped round with the existing
// components/ImageCropper and uploaded with apiService.uploadImage, as the classic modal does.
import { lazy, Suspense, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import apiService from '../../services/api.js'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { TYPE_GROUPS, capitalise, normalise } from './kin.js'
import { Face } from './Person.jsx'
import s from './Sheets.module.css'

const ImageCropper = lazy(() => import('../../components/ImageCropper.jsx'))
const FIRST_WORDS = ['daughter', 'son', 'child', 'pet', 'grandmother', 'grandfather']
const ALL = new Set(TYPE_GROUPS.flatMap((g) => g.words))
const DAY = /^\d{4}-\d{2}-\d{2}$/
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * <TagForm initial={{name, word, photoUrl, birth}} onSubmit busy error submitLabel />
 * onSubmit({name, word, photoUrl, birthDate}) -> Promise
 */
export default function TagForm({ initial = {}, onSubmit, busy, error, submitLabel = 'Add to your tree', id = 'tag-form' }) {
  const [name, setName] = useState(initial.name || '')
  const startWord = initial.word || ''
  const known = !startWord || ALL.has(normalise(startWord).word) || FIRST_WORDS.includes(startWord)
  const [word, setWord] = useState(startWord)
  const [own, setOwn] = useState(known ? '' : startWord)
  const [more, setMore] = useState(!known || (startWord && !FIRST_WORDS.includes(startWord)))
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || '')
  const [birth, setBirth] = useState(initial.birth || '')
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
    onSubmit({ name: name.trim(), word: chosen || null, photoUrl: photoUrl || null, birthDate: DAY.test(birth) ? birth : null })
  }

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
      <Field label="Birthday" optional hint="Brothers, sisters and children stand oldest first when birthdays are known.">
        <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={today()} data-ui="tag-birthday" />
      </Field>
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
