// The publish settings (owner: CREATE): title, audience (all five), people, dates, place,
// category and cover. PLAN-DAYLIGHT 2.8 moment 3. Desktop shows them as rows in the right
// rail; a phone shows them as a row of chips in the thumb-zone bar. Each opens its own sheet.
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/http.js'
import { usePeople } from '../lib/data.js'
import { dateRange, shortPlace, localDay } from '../lib/format.js'
import { Sheet } from '../ui/Sheet.jsx'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import { AUDIENCES, CATEGORIES } from './maker.js'
import s from './Settings.module.css'

// ---------------------------------------------------------------- summaries
export const audienceOf = (v) => AUDIENCES.find((a) => a.value === v) || AUDIENCES[2]
export const categoryLabel = (v) => (v ? CATEGORIES.find((c) => c.value === v)?.label || v : null)

export function summaries(state, groups) {
  const st = state.settings
  const d = state.draft
  const start = st.start || d.start
  const end = st.end || d.end
  const group = st.audience === 'custom_group' ? groups?.find((g) => g.id === st.groupId)?.name : null
  return {
    title: st.title || d.title,
    audience: group ? `Custom Group: ${group}` : audienceOf(st.audience).label,
    people: state.people.length ? state.people.map((p) => p.name.split(' ')[0]).join(', ') : null,
    dates: start ? dateRange(start, end, { short: true }) : null,
    place: shortPlace(st.place ?? d.place) || null,
    category: categoryLabel(st.category),
    cover: st.cover || d.cover,
  }
}

// ---------------------------------------------------------------- data
const toPerson = {
  user: (u) => ({ kind: 'user', id: u.id, name: u.full_name || u.display_name || u.username, avatar: u.avatar_url || null, username: u.username }),
  profile: (p) => ({ kind: 'profile', id: p.id, name: p.name, avatar: p.photo_url || null, note: p.relationship_to_creator || null }),
}

/** People to suggest (the ones you follow and your tag profiles) and a search over everyone taggable. */
export function usePeopleChoices() {
  const { following, me } = usePeople()
  const [profiles, setProfiles] = useState([])
  useEffect(() => {
    let live = true
    apiFetch('/tag-profiles/mine').then((r) => live && setProfiles(r || [])).catch(() => {})
    return () => { live = false }
  }, [])
  const suggestions = useMemo(() => [...(profiles || []).map(toPerson.profile), ...(following || []).filter((u) => u.id !== me?.id).map(toPerson.user)], [profiles, following, me])
  const search = async (q) => {
    const r = await apiFetch('/search/taggable', { query: { q } })
    return (r || []).map((t) => (t.type === 'profile'
      ? { kind: 'profile', id: t.id, name: t.name, avatar: t.photo_url || null, note: t.relationship_to_creator || null }
      : { kind: 'user', id: t.id, name: t.display_name || t.name, avatar: t.photo_url || null, username: t.username }))
  }
  return { suggestions, search }
}

export function useGroups(enabled) {
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState(null)
  const load = () => {
    setError(null)
    apiFetch('/custom-groups/').then((r) => setGroups(r || [])).catch((e) => setError(e.message))
  }
  useEffect(() => {
    if (enabled && groups == null) load()
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  return { groups, error, reload: load }
}

// ---------------------------------------------------------------- people
export function PeoplePicker({ people, onAdd, onRemove, choices, limit = 8 }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const chosen = (p) => people.some((x) => x.kind === p.kind && x.id === p.id)
  const run = async (e) => {
    e?.preventDefault()
    if (q.trim().length < 1) return
    setBusy(true)
    setErr(null)
    try {
      setFound(await choices.search(q.trim()))
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
    }
  }
  const list = found ?? choices.suggestions.slice(0, limit)
  return (
    <div className={s.people} data-ui="people-picker">
      {people.length ? (
        <div className={s.chips} aria-label="In the story">
          {people.map((p) => (
            <Chip key={`${p.kind}-${p.id}`} selected onRemove={() => onRemove(p)} removeLabel={`Remove ${p.name}`}>
              <span className={s.chipFace}><Avatar name={p.name} src={p.avatar} size={22} />{p.name}</span>
            </Chip>
          ))}
        </div>
      ) : null}
      <div className={s.chips} aria-label={found ? 'Search results' : 'Suggestions'}>
        {list.filter((p) => !chosen(p)).map((p) => (
          <Chip key={`${p.kind}-${p.id}`} onClick={() => onAdd(p)} icon="plus" size="sm">
            {p.name}{p.note ? <span className="a-mute"> · {p.note}</span> : null}
          </Chip>
        ))}
        {found && !found.length ? <p className="a-mute a-small">Nobody by that name. You can tag them later from the story.</p> : null}
      </div>
      <form className={s.search} onSubmit={run} role="search">
        <label className="a-sr" htmlFor="ofsa-people-q">Find someone to tag</label>
        <input id="ofsa-people-q" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setFound(null) }} placeholder="Find someone" autoComplete="off" />
        <Button size="sm" variant="ghost" type="submit" busy={busy}>Find</Button>
      </form>
      {err ? <p className={s.err} role="alert">{err}</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------- the sheets
function AudienceBody({ value, groupId, onChange, groups }) {
  return (
    <div className={s.audiences} role="radiogroup" aria-label="Who can open this story">
      {AUDIENCES.map((a) => (
        <div key={a.value}>
          <button type="button" role="radio" aria-checked={value === a.value} className={cx(s.option, value === a.value && s.on)} onClick={() => onChange({ audience: a.value })} data-ui={`audience-${a.value}`}>
            <span className={s.radio} aria-hidden="true">{value === a.value ? <Icon name="check" size={14} /> : null}</span>
            <span className={s.optText}>
              <strong>{a.label}{a.value === 'followers' ? <span className={s.def}> · the usual</span> : null}</strong>
              <span>{a.note}</span>
            </span>
          </button>
          {a.value === 'custom_group' && value === 'custom_group' ? (
            <div className={s.groups}>
              {groups.error ? <p className={s.err}>Your groups did not load. <button type="button" className={s.link} onClick={groups.reload}>Retry</button></p> : null}
              {groups.groups == null && !groups.error ? <Spinner size={18} /> : null}
              {groups.groups?.length === 0 ? <p className="a-mute a-small">You have no groups yet. Make one in Sharing and groups, then come back.</p> : null}
              {groups.groups?.map((g) => (
                <Chip key={g.id} selected={groupId === g.id} onClick={() => onChange({ groupId: g.id })}>
                  {g.name} <span className="a-mute">· {g.member_count}</span>
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <p className={s.fine}>Members' feeds list the title, cover and place of any story that is not Private. Opening it follows the audience you pick.</p>
    </div>
  )
}

function DatesBody({ state, onChange }) {
  const st = state.settings
  const d = state.draft
  const start = st.start || d.start
  const end = st.end || d.end
  const keepTime = (day, ts, fallback) => (day ? `${day}T${(ts || '').slice(11, 19) || fallback}` : null)
  return (
    <div className={s.dates}>
      <label className={s.dateField}>
        <span>Starts</span>
        <input type="date" value={localDay(start) || ''} onChange={(e) => onChange({ start: keepTime(e.target.value, start, '09:00:00') })} data-ui="date-start" />
      </label>
      <label className={s.dateField}>
        <span>Ends</span>
        <input type="date" value={localDay(end) || ''} min={localDay(start) || undefined} onChange={(e) => onChange({ end: keepTime(e.target.value, end, '18:00:00') })} />
      </label>
      <p className={s.fine}>{d.start ? 'From the first and last photo, as the camera saw the time.' : 'These photos carry no date. Pick when it happened.'}</p>
    </div>
  )
}

function PlaceBody({ state, onChange }) {
  const st = state.settings
  const d = state.draft
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const current = st.place ?? d.place
  const run = async (e) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    setBusy(true)
    setErr(null)
    try {
      setFound(await apiFetch('/geocoding/search', { query: { query: q.trim(), limit: 5 } }))
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={s.place}>
      <p className={s.current}>
        <Icon name="pin" size={18} />
        <span>{current ? shortPlace(current, 3) : 'No place yet'}</span>
      </p>
      {d.place && current !== d.place ? (
        <Button size="sm" variant="quiet" onClick={() => onChange({ place: null, placeLatLng: null })}>Use the place from the photos: {shortPlace(d.place)}</Button>
      ) : null}
      <form className={s.search} onSubmit={run} role="search">
        <label className="a-sr" htmlFor="ofsa-place-q">Search for a place</label>
        <input id="ofsa-place-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a place" autoComplete="off" />
        <Button size="sm" variant="ghost" type="submit" busy={busy}>Search</Button>
      </form>
      {err ? <p className={s.err} role="alert">{err}</p> : null}
      {found ? (
        <ul className={s.results}>
          {found.length ? found.map((r, i) => (
            <li key={i}>
              <button type="button" className={s.result} onClick={() => { onChange({ place: r.name, placeLatLng: { lat: r.latitude, lng: r.longitude } }); setFound(null); setQ('') }}>
                <Icon name="pin" size={16} /> {shortPlace(r.name, 3)}
              </button>
            </li>
          )) : <li className="a-mute a-small">Nothing found. Try a town or a landmark.</li>}
        </ul>
      ) : null}
      <p className={s.fine}>{d.stops.length ? 'The map keeps every stop from your photos. This is the one place shown on the story card and the world map.' : 'These photos carry no location. A place puts the story on the world map.'}</p>
    </div>
  )
}

function CategoryBody({ value, suggested, onChange }) {
  const [own, setOwn] = useState(value && !CATEGORIES.some((c) => c.value === value) ? value : '')
  return (
    <div className={s.cats}>
      <div className={s.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} selected={value === c.value} onClick={() => onChange({ category: value === c.value ? null : c.value, categoryEdited: true })}>{c.label}</Chip>
        ))}
      </div>
      <form className={s.search} onSubmit={(e) => { e.preventDefault(); if (own.trim()) onChange({ category: own.trim(), categoryEdited: true }) }}>
        <label className="a-sr" htmlFor="ofsa-cat-own">Your own category</label>
        <input id="ofsa-cat-own" value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Or your own, like Wedding" maxLength={40} />
        <Button size="sm" variant="ghost" type="submit">Use</Button>
      </form>
      {suggested ? <p className={s.fine}>The write-up suggested {categoryLabel(suggested)}.</p> : null}
    </div>
  )
}

function CoverBody({ state, urlOf, onChange }) {
  const cur = state.settings.cover || state.draft.cover
  return (
    <div className={s.covers} role="radiogroup" aria-label="Cover photo">
      {state.draft.photos.map((p, i) => (
        <button key={p.id} type="button" role="radio" aria-checked={cur === p.id} className={cx(s.cover, cur === p.id && s.on)} onClick={() => onChange({ cover: p.id })} aria-label={`Photo ${i + 1}${p.id === state.draft.cover ? ', suggested' : ''}`} data-ui="cover-option">
          {urlOf(p.id) ? <img src={urlOf(p.id)} alt="" loading="lazy" /> : <span className={s.noThumb}>HEIC</span>}
          {p.id === state.draft.cover ? <span className={s.sugg}>Suggested</span> : null}
          {cur === p.id ? <span className={s.tick}><Icon name="check" size={14} /></span> : null}
        </button>
      ))}
    </div>
  )
}

function TitleBody({ state, onChange }) {
  const st = state.settings
  const cur = st.title || state.draft.title
  const ideas = [...new Set([state.write.suggested?.title, state.draft.title].filter(Boolean))]
  return (
    <div className={s.titleBody}>
      <label className="a-sr" htmlFor="ofsa-title">Title</label>
      <input id="ofsa-title" className={s.titleInput} value={cur} onChange={(e) => onChange({ title: e.target.value, titleEdited: true })} maxLength={120} data-ui="title-input" />
      {ideas.length > 1 || (ideas[0] && ideas[0] !== cur) ? (
        <div className={s.chips}>
          {ideas.filter((t) => t !== cur).map((t) => <Chip key={t} size="sm" onClick={() => onChange({ title: t, titleEdited: true })}>{t}</Chip>)}
        </div>
      ) : null}
    </div>
  )
}

const SHEET_TITLES = { title: 'Title', audience: 'Who can open this story', people: 'Who is in it', dates: 'Dates', place: 'Place', category: 'Category', cover: 'Cover photo' }

export function SettingsSheet({ which, onClose, state, maker, urlOf, groups, choices }) {
  const set = (patch) => maker.setting(patch)
  const body = {
    title: () => <TitleBody state={state} onChange={set} />,
    audience: () => <AudienceBody value={state.settings.audience} groupId={state.settings.groupId} groups={groups} onChange={set} />,
    people: () => (
      <>
        <PeoplePicker people={state.people} onAdd={(p) => maker.addPerson(p)} onRemove={(p) => maker.removePerson(p)} choices={choices} limit={14} />
        <p className={s.fine}>Tagged people are added when you publish, and their names help the write-up.</p>
      </>
    ),
    dates: () => <DatesBody state={state} onChange={set} />,
    place: () => <PlaceBody state={state} onChange={set} />,
    category: () => <CategoryBody value={state.settings.category} suggested={state.write.suggested?.category} onChange={set} />,
    cover: () => <CoverBody state={state} urlOf={urlOf} onChange={set} />,
  }[which]
  return (
    <Sheet open={!!which} onClose={onClose} title={SHEET_TITLES[which] || ''} placement="auto" footer={<Button full onClick={onClose}>Done</Button>}>
      {body ? body() : null}
    </Sheet>
  )
}

// ---------------------------------------------------------------- the two presentations
const ROWS = [
  ['audience', 'Audience', 'lock'],
  ['people', 'People', 'people'],
  ['dates', 'Dates', 'calendar'],
  ['place', 'Place', 'pin'],
  ['category', 'Category', 'stack'],
  ['cover', 'Cover', 'photo'],
]

export function SettingsRows({ sum, onOpen, urlOf, needs }) {
  return (
    <ul className={s.rows} data-ui="settings-rows">
      {ROWS.map(([k, label, icon]) => (
        <li key={k}>
          <button type="button" className={cx(s.row, needs === k && s.needs)} onClick={() => onOpen(k)} data-ui={`setting-${k}`}>
            <Icon name={icon} size={18} />
            <span className={s.rowLabel}>{label}</span>
            <span className={cx(s.rowValue, !sum[k] && s.empty)}>
              {k === 'cover' ? (urlOf(sum.cover) ? <img className={s.rowThumb} src={urlOf(sum.cover)} alt="" /> : 'Choose') : sum[k] || (k === 'people' ? 'Add' : 'Choose')}
            </span>
            <Icon name="arrow" size={16} />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function SettingsChips({ sum, onOpen, urlOf, needs }) {
  const ref = useRef(null)
  return (
    <div className={s.chipBar} ref={ref} data-ui="settings-chips">
      <button type="button" className={cx(s.sChip, s.titleChip)} onClick={() => onOpen('title')}>
        <Icon name="edit" size={15} /><span>Title</span>
      </button>
      {ROWS.map(([k, label, icon]) => (
        <button key={k} type="button" className={cx(s.sChip, needs === k && s.needs, k === 'audience' && s.audChip)} onClick={() => onOpen(k)} data-ui={`chip-${k}`}>
          {k === 'cover' && urlOf(sum.cover) ? <img className={s.chipThumb} src={urlOf(sum.cover)} alt="" /> : <Icon name={icon} size={15} />}
          <span>{k === 'cover' ? 'Cover' : sum[k] || label}</span>
        </button>
      ))}
    </div>
  )
}
