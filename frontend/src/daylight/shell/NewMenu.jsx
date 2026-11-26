// The "New story" choices (owner: F0). PLAN-DAYLIGHT 2.1: From photos (primary), Write it
// yourself, Find stories in a big batch. A menu under the button on desktop, a bottom
// sheet on a phone.
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet.jsx'
import { Icon } from '../ui/Icon.jsx'
import s from './NewMenu.module.css'

export const NEW_CHOICES = [
  { to: '/create?from=photos', icon: 'photos', title: 'From photos', note: 'Pick photos and see your story straight away. Add a few words or a voice note if you like.', primary: true },
  { to: '/create', icon: 'pen', title: 'Write it yourself', note: 'The editor, with headings, photos, clips and places.' },
  { to: '/import', icon: 'stack', title: 'Find stories in a big batch', note: 'Choose up to 300 photos and they sort themselves into albums. Nothing uploads until you pick one.' },
]

export function NewChoices({ onDone }) {
  const navigate = useNavigate()
  return (
    <ul className={s.list}>
      {NEW_CHOICES.map((c) => (
        <li key={c.to}>
          <button
            type="button"
            className={`${s.choice} ${c.primary ? s.primary : ''}`}
            onClick={() => {
              onDone?.()
              navigate(c.to)
            }}
          >
            <span className={s.icon} data-wash={c.primary ? 'fizz' : undefined}>
              <Icon name={c.icon} size={24} />
            </span>
            <span className={s.text}>
              <span className={s.title}>{c.title}</span>
              <span className={s.note}>{c.note}</span>
            </span>
            <Icon name="chevron-right" size={20} className={s.chev} />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function NewSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="New story" placement="center" wash="fizz">
      <NewChoices onDone={onClose} />
    </Sheet>
  )
}
