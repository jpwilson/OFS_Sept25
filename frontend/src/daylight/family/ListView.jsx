// Your family as a list (owner: FAMILY). docs/app/FAMILY.md section 4, "List view": the
// accessible path to everyone, in family groups, each a heading with its count.
import { useMemo, useState } from 'react'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { LIST_GROUPS } from './kin.js'
import { cmpPeople, collator } from './arrange.js'
import { Face, FaceSticker } from './Person.jsx'
import { countLine } from './words.js'
import s from './ListView.module.css'

const SEARCH_FROM = 15

export default function ListView({ structure, pending, onOpen, onRequests }) {
  const [q, setQ] = useState('')
  const me = structure.people.get(structure.me)
  const groups = useMemo(() => {
    const by = new Map(LIST_GROUPS.map((g) => [g.key, []]))
    for (const p of structure.people.values()) {
      if (p.id === structure.me) continue
      if (p.status === 'asked') by.get('waiting').push(p)
      else by.get(by.has(p.info.group) ? p.info.group : 'more').push(p)
    }
    for (const [, list] of by) list.sort(cmpPeople)
    by.set('asking', pending.map((r) => ({ id: `r:${r.id}`, name: r.proposer_display_name || r.proposer_username, avatar: r.proposer_avatar_url, word: r.i_would_call_them, asking: true, kind: 'user' })))
    return LIST_GROUPS.map((g) => ({ ...g, people: by.get(g.key) || [] })).filter((g) => g.people.length)
  }, [structure, pending])
  const total = groups.reduce((n, g) => n + g.people.length, 0)
  const term = q.trim()
  const match = (p) => !term || collator.compare(p.name.slice(0, term.length), term) === 0 || p.name.toLowerCase().includes(term.toLowerCase())

  return (
    <div className={s.list} data-ui="family-list">
      <button type="button" className={s.you} onClick={() => onOpen(structure.me)} data-ui="list-you">
        <span className={s.youFace}>
          <Face name={me.name} src={me.avatar} size={56} you />
          <FaceSticker kind="you" />
        </span>
        <span className={s.youText}>
          <span className={s.youName}>{me.name}</span>
          <span className={s.youLine}>{countLine(structure)}</span>
        </span>
      </button>
      {total >= SEARCH_FROM ? (
        <Field label="Find someone in your family" className={s.search}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A name" autoComplete="off" />
        </Field>
      ) : null}
      <div className={s.groups}>
      {groups.map((g) => {
        const people = g.people.filter(match)
        if (!people.length) return null
        return (
          <section key={g.key} className={s.group} aria-labelledby={`grp-${g.key}`}>
            <h2 id={`grp-${g.key}`} className={s.groupHead}>
              {g.label} <span className={s.n}>{people.length}</span>
            </h2>
            <div className={s.rows}>
              {people.map((p) => {
                const state = p.asking ? { kind: 'asking', text: 'Asking you' } : p.status === 'asked' ? { kind: 'asked', text: 'Waiting' } : p.kind === 'tag' ? { kind: 'tag', text: 'No account' } : { kind: 'ok', text: 'Confirmed' }
                return (
                  <button key={p.id} type="button" className={s.row} onClick={() => (p.asking ? onRequests() : onOpen(p.id))} data-ui="list-person" data-id={p.id}>
                    <Face name={p.name} src={p.avatar} size={44} tag={p.kind === 'tag'} asked={p.status === 'asked'} />
                    <span className={s.text}>
                      <span className={s.name}>{p.name}</span>
                      {p.word ? <span className={s.word}>{p.word}</span> : null}
                    </span>
                    <span className={s.state} data-kind={state.kind} aria-label={state.text}>
                      {state.kind === 'ok' ? <Icon name="check" size={13} /> : null}
                      <span>{state.text}</span>
                    </span>
                    <Icon name="chevron-right" size={18} className={s.chev} />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      </div>
      {term && !groups.some((g) => g.people.some(match)) ? <p className={s.none}>Nobody called “{term}” in your family yet.</p> : null}
    </div>
  )
}
