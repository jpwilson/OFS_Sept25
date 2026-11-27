// People search (owner: F0). Moved out of the feed filters into the shell (PLAN 2.1).
// GET /users/search/users as you type (our own API; 250ms after the last key).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../ui/Sheet.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Icon } from '../ui/Icon.jsx'
import { fieldControl } from '../ui/Field.jsx'
import { searchPeople } from '../lib/data.js'
import s from './SearchSheet.module.css'

export function SearchSheet({ open, onClose }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState({ list: [], status: 'idle' })
  const input = useRef(null)
  useEffect(() => {
    if (!open) return
    const v = q.trim()
    if (v.length < 2) {
      setRes({ list: [], status: 'idle' })
      return
    }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      setRes((r) => ({ ...r, status: 'loading' }))
      searchPeople(v, { signal: ctl.signal })
        .then((list) => setRes({ list: list || [], status: 'done' }))
        .catch((e) => e?.name !== 'AbortError' && setRes({ list: [], status: 'error' }))
    }, 250)
    return () => {
      clearTimeout(t)
      ctl.abort()
    }
  }, [q, open])
  useEffect(() => {
    if (!open) setQ('')
  }, [open])
  return (
    <Sheet open={open} onClose={onClose} title="Find people" placement="center" size="full">
      <form role="search" onSubmit={(e) => e.preventDefault()} className={s.form}>
        <label className="a-sr" htmlFor="ofsa-people-q">Name or username</label>
        <Icon name="search" size={20} className={s.glass} />
        <input
          id="ofsa-people-q"
          ref={input}
          data-autofocus=""
          className={`${fieldControl} ${s.input}`}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Name or username"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div aria-live="polite" className={s.status}>
        {res.status === 'loading' ? 'Searching' : res.status === 'error' ? 'Search did not work. Try again in a moment.' : res.status === 'done' && !res.list.length ? 'Nobody by that name yet.' : ''}
      </div>
      <ul className={s.list}>
        {res.list.map((p) => (
          <li key={p.id || p.username}>
            <Link to={`/profile/${p.username}`} className={s.row} onClick={onClose}>
              <Avatar name={p.full_name || p.username} src={p.avatar_url} size={44} />
              <span className={s.who}>
                <span className={s.name}>{p.full_name || p.username}</span>
                <span className={`${s.user} a-mono`}>@{p.username}</span>
              </span>
              <Icon name="chevron-right" size={18} className={s.chev} />
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
