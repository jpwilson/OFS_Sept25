// The one Filter sheet (owner: FEED): order, people with faces, categories, date range and
// muted people. A bottom sheet on a phone, a centred panel on desktop. Changes apply as you
// make them (and go straight into the URL); the footer button just closes it.
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/http.js'
import { searchPeople } from '../lib/data.js'
import { plural } from '../lib/format.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import { activeCount, categoriesIn, CATEGORIES, categoryInfo, clearedFilters } from './query.js'
import s from './FilterSheet.module.css'

function Group({ title, note, children, id }) {
  return (
    <section className={s.group} aria-labelledby={id}>
      <div className={s.groupHead}>
        <h3 id={id} className={s.groupTitle}>
          {title}
        </h3>
        {note ? <span className={s.note}>{note}</span> : null}
      </div>
      {children}
    </section>
  )
}

function MutedPeople({ muted, me, onChanged }) {
  const [term, setTerm] = useState('')
  const [found, setFound] = useState([])
  const [busy, setBusy] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    const t = term.trim()
    if (t.length < 2) {
      setFound([])
      return
    }
    const ctl = new AbortController()
    setSearching(true)
    const timer = setTimeout(() => {
      searchPeople(t, { signal: ctl.signal })
        .then((rows) => {
          const mutedIds = new Set(muted.map((m) => m.id))
          setFound((rows || []).filter((r) => r.username !== me && !mutedIds.has(r.id)).slice(0, 6))
        })
        .catch((e) => e?.name !== 'AbortError' && setError('Search did not work. Try again.'))
        .finally(() => setSearching(false))
    }, 250)
    return () => {
      clearTimeout(timer)
      ctl.abort()
    }
  }, [term, muted, me])

  const act = async (person, mute) => {
    setBusy(person.id)
    setError(null)
    try {
      await apiFetch(`/users/${person.id}/mute`, { method: mute ? 'POST' : 'DELETE' })
      if (mute) {
        setTerm('')
        setFound([])
      }
      await onChanged()
    } catch (e) {
      setError(e.message || 'That did not work. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={s.muted}>
      {muted.length ? (
        <ul className={s.people}>
          {muted.map((m) => (
            <li key={m.id} className={s.personRow}>
              <Avatar name={m.full_name || m.username} src={m.avatar_url} size={36} />
              <span className={s.personName}>
                {m.full_name || m.username}
                <span className="a-mono a-mute a-small">@{m.username}</span>
              </span>
              <Button size="sm" variant="ghost" busy={busy === m.id} onClick={() => act(m, false)}>
                Unmute
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.hint}>Nobody is muted. Mute someone and their stories leave your feed.</p>
      )}
      <label className={s.search}>
        <Icon name="search" size={18} />
        <span className="a-sr">Find someone to mute</span>
        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Find someone to mute" autoComplete="off" />
        {searching ? <Spinner size={16} /> : null}
      </label>
      {found.length ? (
        <ul className={s.people}>
          {found.map((p) => (
            <li key={p.id} className={s.personRow}>
              <Avatar name={p.full_name || p.username} src={p.avatar_url} size={36} />
              <span className={s.personName}>
                {p.full_name || p.username}
                <span className="a-mono a-mute a-small">@{p.username}</span>
              </span>
              <Button size="sm" variant="ghost" busy={busy === p.id} onClick={() => act(p, true)}>
                Mute
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default function FilterSheet({ open, onClose, q, set, events, people, resultCount, partial, onMutedChanged, showGroup }) {
  const { following, faceFor, muted, me } = people
  const meName = me?.username
  // Faces to pick from: you, the people you follow, and anyone else with a story loaded.
  const authors = useMemo(() => {
    const m = new Map()
    if (meName) m.set(meName, faceFor(meName))
    for (const f of following) m.set(f.username, faceFor(f.username, f.full_name))
    for (const e of events) if (!m.has(e.author_username)) m.set(e.author_username, faceFor(e.author_username, e.author_full_name))
    q.people.forEach((u) => !m.has(u) && m.set(u, faceFor(u)))
    return [...m.values()]
  }, [following, events, faceFor, meName, q.people])
  const cats = categoriesIn(events, q.cats)
  const shownCats = cats.length ? [...cats, ...CATEGORIES.filter((c) => !cats.some((x) => x.value === c.value)).map((c) => categoryInfo(c.value))] : CATEGORIES.map((c) => categoryInfo(c.value))
  const toggle = (key, v) => set({ [key]: q[key].includes(v) ? q[key].filter((x) => x !== v) : [...q[key], v] })
  const n = activeCount(q)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter stories"
      placement="auto"
      footer={
        <>
          <Button variant="ghost" onClick={() => set(clearedFilters())} disabled={!n}>
            Clear filters
          </Button>
          <Button onClick={onClose}>{partial ? 'Show stories' : `Show ${plural(resultCount, 'story', 'stories')}`}</Button>
        </>
      }
    >
      <div className={s.sheet} data-ui="filter-sheet">
        <Group title="Order" id="ff-order">
          <Segmented
            label="Order by"
            full
            value={q.order}
            onChange={(v) => set({ order: v })}
            options={[
              { value: 'happened', label: 'Date it happened' },
              { value: 'posted', label: 'Date posted' },
            ]}
          />
          <Segmented
            label="Direction"
            full
            size="sm"
            value={q.dir}
            onChange={(v) => set({ dir: v })}
            options={[
              { value: 'new', label: 'Newest first' },
              { value: 'old', label: 'Oldest first' },
            ]}
          />
          {showGroup ? (
            <Segmented
              label="List stories"
              full
              size="sm"
              value={q.group}
              onChange={(v) => set({ group: v })}
              options={[
                { value: 'month', label: 'By month' },
                { value: 'category', label: 'By category' },
              ]}
            />
          ) : null}
        </Group>

        <Group title="People" id="ff-people" note={q.people.length ? `${q.people.length} chosen` : null}>
          <Segmented
            label="Whose stories"
            full
            size="sm"
            value={q.who}
            onChange={(v) => set({ who: v })}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'following', label: 'Following' },
              { value: 'mine', label: 'Mine' },
            ]}
          />
          <ul className={s.faces} aria-label="Only stories by">
            {authors.map((p) => {
              const on = q.people.includes(p.username)
              return (
                <li key={p.username}>
                  <button type="button" className={cx(s.face, on && s.faceOn)} aria-pressed={on} onClick={() => toggle('people', p.username)}>
                    <span className={s.faceImg}>
                      <Avatar name={p.name} src={p.avatarUrl} size={48} />
                      {on ? (
                        <span className={s.tick} aria-hidden="true">
                          <Icon name="check" size={14} strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    <span className={s.faceName}>{p.username === meName ? 'You' : p.name.split(' ')[0]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Group>

        <Group title="Categories" id="ff-cats">
          <div className={s.chips}>
            {shownCats.map((c) => (
              <Chip key={c.value} dot={!!c.wash} wash={c.wash || undefined} selected={q.cats.includes(c.value)} onClick={() => toggle('cats', c.value)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="When it happened" id="ff-dates">
          <div className={s.dates}>
            <label className={s.date}>
              <span className="a-label a-mute">From</span>
              <input type="date" value={q.from} max={q.to || undefined} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className={s.date}>
              <span className="a-label a-mute">To</span>
              <input type="date" value={q.to} min={q.from || undefined} onChange={(e) => set({ to: e.target.value })} />
            </label>
          </div>
          {q.from || q.to ? (
            <button type="button" className={s.link} onClick={() => set({ from: '', to: '' })}>
              Any date
            </button>
          ) : null}
        </Group>

        <Group title="Muted people" id="ff-muted" note={muted.length ? plural(muted.length, 'person', 'people') : null}>
          <MutedPeople muted={muted} me={meName} onChanged={onMutedChanged} />
        </Group>
      </div>
    </Sheet>
  )
}
