// The first screen of "From photos" (owner: CREATE): pick or drop photos. Plus the
// one-second "reading" state while time and place are read on the device.
import { useRef, useState } from 'react'
import { Head } from '../ui/Head.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Label } from '../../landing/ui/Label.jsx'
import { cx } from '../ui/cx.js'
import s from './Picker.module.css'

export const ACCEPT = 'image/*,.heic,.heif'

const STEPS = [
  ['photos', 'Pick the photos', 'The days, the stops and the map appear straight away, read from the photos on this device.'],
  ['mic', 'Talk or type, if you like', 'A voice note or a few lines while they upload. It can ask you a question or two as well.'],
  ['lock', 'Choose who can open it', 'Private, Close Family, Followers, a Custom Group or Public. Then publish, or save a draft.'],
]

export function Picker({ onFiles, error, canUseAI }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const pick = (files) => {
    if (files?.length) onFiles([...files])
  }
  return (
    <div className={s.page} data-ui="create-picker">
      <section className={s.band} data-wash="fizz">
        <div className={s.bandIn}>
          <Label strong>New story · from photos</Label>
          <Head as="h1" size="page" before="A story from your" mark="photos" after="." />
          <p className={s.sub}>Pick the photos from a trip, a weekend or one afternoon. The story is there straight away. {canUseAI ? 'Add a voice note or a few words to make it better.' : 'Add a few words to make it yours.'}</p>
          <ul className={s.ways} aria-label="Ways to make it">
            <li>Just photos</li>
            <li>Photos and a few words</li>
            {canUseAI ? <li>Photos and a voice note</li> : null}
          </ul>
        </div>
      </section>

      <div className={s.body}>
        <div
          className={cx(s.drop, over && s.over)}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files) }}
          data-ui="photo-drop"
        >
          <span className={s.disc} aria-hidden="true"><Icon name="photos" size={34} /></span>
          <Button size="lg" icon="plus" onClick={() => input.current?.click()} data-ui="pick-photos">Choose photos</Button>
          <p className={s.dropHint}>or drop them here</p>
          <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} data-ui="photo-input" />
          {error ? <p className={s.err} role="alert">{error}</p> : null}
        </div>

        <ol className={s.steps}>
          {STEPS.filter(([k]) => canUseAI || k !== 'mic').map(([icon, t, b], i) => (
            <li key={t}>
              <span className={s.n} aria-hidden="true">{i + 1}</span>
              <div>
                <p className={s.stepT}><Icon name={icon} size={18} /> {t}</p>
                <p className={s.stepB}>{b}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className={s.privacy}>
          <Icon name="lock" size={16} />
          <span>Photos start uploading as soon as you pick them{canUseAI ? ', so the write-up can read them' : ''}. Nothing is posted until you press Publish.</span>
        </p>

        <nav className={s.other} aria-label="Other ways to start">
          <Button variant="ghost" icon="pen" to="/create">Write it yourself</Button>
          <Button variant="ghost" icon="stack" to="/import">Find stories in a big batch</Button>
        </nav>
      </div>
    </div>
  )
}

export function Reading({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className={s.reading} data-ui="create-reading" role="status" aria-live="polite">
      <span className={s.disc} aria-hidden="true"><Icon name="photos" size={30} /></span>
      <p className={s.readT}>Reading {done} of {total} photos on this device</p>
      <span className={s.track} aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      <p className={s.readB}>Their times and places, before anything uploads.</p>
    </div>
  )
}
