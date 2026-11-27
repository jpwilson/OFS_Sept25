// "Notes and history" on the person sheet (owner: FAMILY). docs/app/FAMILY-NOTES.md "Page".
// After Stories: a History | Notes switch with counts; history as a mono date column and the
// words, notes with who wrote them and when. Bodies are plain text (white-space: pre-line,
// never HTML), clamped with Read more. Edit and Delete as the server allows (can_edit,
// can_delete). Asked once Stories has arrived and the block is near view (useNotes); hidden
// for people you only asked, and everywhere when the server has no notes yet (a 404).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Menu } from '../ui/Menu.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { cx } from '../ui/cx.js'
import { parseBackendDate } from '../lib/format.js'
import { partialLabel, stampParts } from './dates.js'
import { Face } from './Person.jsx'
import { noteActions, shown, useNotes } from './useNotes.js'
import { possessive } from './words.js'
import sh from './Sheets.module.css'
import s from './Notes.module.css'

const written = (iso) => {
  const d = parseBackendDate(iso)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}
const count = (page, kind) => `${shown(page, kind).length}${page.hasMore ? '+' : ''}`

/**
 * <Notes p you open ready canWrite tab onTab onWrite(note | null, kind) meId reveal />
 * reveal: a number that changes when the sheet comes back from writing (scroll the block into view).
 * tab: 'history' | 'note' | null (null: whichever has something, history first).
 */
export default function Notes({ p, you, open, ready, canWrite, tab, onTab, onWrite, meId, reveal }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!reveal) return undefined
    const f = requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(f)
  }, [reveal])
  const [near, setNear] = useState(false)
  useEffect(() => setNear(false), [p?.id])
  useEffect(() => {
    if (!open || !ready || near) return undefined
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return undefined
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '0px 0px 320px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [open, ready, near, p?.id])
  const n = useNotes(p, { enabled: open && ready && near })
  const [doomed, setDoomed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [moreError, setMoreError] = useState('')
  useEffect(() => {
    setDoomed(null)
    setError('')
    setMoreError('')
  }, [p?.id])

  if (!p || n.status === 'hidden') return null
  const name = you ? 'you' : p.first
  const history = shown(n.history, 'history')
  const notes = shown(n.notes, 'note')
  const ready_ = n.status === 'ready'
  const active = tab || (history.length || !notes.length ? 'history' : 'note')
  const list = active === 'history' ? history : notes
  const page = active === 'history' ? n.history : n.notes
  const writable = canWrite && n.canWrite && ready_

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await noteActions.remove(p, doomed.id)
      setDoomed(null)
    } catch (e) {
      setError(typeof e?.data?.detail === 'string' ? e.data.detail : 'That did not go through. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }
  const more = async () => {
    setMoreError('')
    try {
      await n.more(active)
    } catch {
      setMoreError('Those did not load. Try again in a moment.')
    }
  }

  return (
    <section ref={ref} className={cx(sh.block, s.notes)} data-ui="person-notes" data-state={n.status} aria-labelledby={`notes-${p.id}`}>
      <div className={s.head}>
        <h3 id={`notes-${p.id}`} className={sh.blockHead}>
          Notes and history
        </h3>
        {writable ? (
          <Button variant="ghost" size="sm" icon="pen" onClick={() => onWrite(null, active)} aria-label={`Write about ${name}`} data-ui="notes-write">
            Write
          </Button>
        ) : null}
      </div>

      {n.status === 'idle' || n.status === 'loading' ? (
        <div className={s.loading} aria-busy="true" data-ui="notes-loading">
          <span className="a-sr" role="status">Loading notes and history</span>
          <Skeleton h={40} r={14} />
          {[0, 1].map((i) => (
            <div key={i} className={s.skItem}>
              <Skeleton w={52} h={14} r={7} />
              <span className={s.skLines}>
                <Skeleton h={14} r={7} />
                <Skeleton h={14} r={7} w="70%" />
              </span>
            </div>
          ))}
        </div>
      ) : n.status === 'error' ? (
        <div className={s.state} data-ui="notes-error">
          <p>Notes did not load.</p>
          <Button variant="ghost" size="sm" onClick={n.reload}>
            Try again
          </Button>
        </div>
      ) : n.status === 'forbidden' ? (
        <p className={cx(s.state, 'a-mute')} data-ui="notes-forbidden">
          {typeof n.error?.data?.detail === 'string' ? n.error.data.detail : `Notes about ${p.first} are for ${possessive(p.first)} family.`}
        </p>
      ) : !history.length && !notes.length ? (
        <p className={cx(s.state, 'a-mute')} data-ui="notes-empty">
          Nothing written about {name} yet. Add a memory, or something that happened and when.
        </p>
      ) : (
        <>
          <Segmented
            label="Show"
            value={active}
            onChange={onTab}
            size="sm"
            full
            options={[
              { value: 'history', label: `History ${count(n.history, 'history')}` },
              { value: 'note', label: `Notes ${count(n.notes, 'note')}` },
            ]}
          />
          {list.length ? (
            <ol className={s.list} data-ui="notes-list" data-kind={active}>
              {list.map((x) => (
                <Item key={x.id} note={x} meId={meId} canWrite={canWrite} onEdit={() => onWrite(x, x.kind)} onDelete={() => { setError(''); setDoomed(x) }} />
              ))}
            </ol>
          ) : (
            <p className={cx(s.state, 'a-mute')}>
              {active === 'history' ? `Nothing in ${you ? 'your' : possessive(p.first)} history yet. Add something that happened, and when.` : `No notes about ${name} yet. Add a memory.`}
            </p>
          )}
          {page.hasMore ? (
            <Button variant="ghost" size="sm" onClick={more} busy={n.loadingMore === active} data-ui="notes-more">
              Show more
            </Button>
          ) : null}
          {moreError ? <p className={sh.error} role="alert">{moreError}</p> : null}
        </>
      )}

      <Dialog
        open={!!doomed}
        onClose={() => setDoomed(null)}
        title="Delete this note?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDoomed(null)}>
              Keep
            </Button>
            <Button variant="danger" busy={busy} onClick={remove} data-ui="note-delete-confirm">
              Delete
            </Button>
          </>
        }
      >
        <p className={sh.done}>It goes for everyone in {you ? 'your' : possessive(p.first)} family.</p>
        {error ? <p className={sh.error} role="alert">{error}</p> : null}
      </Dialog>
    </section>
  )
}

/** One entry: history with its date column, a note with its author. */
function Item({ note, meId, canWrite, onEdit, onDelete }) {
  const history = note.kind === 'history'
  const items = canWrite
    ? [note.can_edit && { label: 'Edit', icon: 'edit', onClick: onEdit }, note.can_delete && { label: 'Delete', icon: 'trash', danger: true, onClick: onDelete }].filter(Boolean)
    : []
  const menu = items.length ? (
    <Menu
      label={history ? 'This entry' : 'This note'}
      align="end"
      width={200}
      items={items}
      trigger={(props) => <IconButton {...props} icon="more" label={history ? 'More for this entry' : 'More for this note'} className={s.itemMenu} data-ui="note-menu" />}
    />
  ) : null
  if (history) {
    const st = stampParts(note.happened_on, note.happened_precision)
    return (
      <li className={s.item} data-ui="note-item" data-kind="history">
        <span className={s.stamp} aria-hidden="true">
          {st.head ? <span>{st.head}</span> : null}
          {st.year ? <span className={s.stampYear}>{st.year}</span> : null}
        </span>
        <div className={s.main}>
          <span className="a-sr">{partialLabel(note.happened_on, note.happened_precision) || 'Undated'}: </span>
          <Body text={note.body} />
        </div>
        {menu}
      </li>
    )
  }
  const a = note.author || {}
  const mine = meId != null && a.id === meId
  const who = mine ? 'You' : a.display_name || a.username || 'Someone'
  return (
    <li className={cx(s.item, s.noteItem)} data-ui="note-item" data-kind="note">
      <Face name={a.display_name || a.username || '?'} src={a.avatar_url || null} size={36} className={s.face} />
      <div className={s.main}>
        <p className={s.byline}>
          <span className={s.author}>{who}</span>
          <span className={s.when}>
            {written(note.created_at)}
            {note.edited_at ? ' · Edited' : ''}
          </span>
        </p>
        <Body text={note.body} />
      </div>
      {menu}
    </li>
  )
}

/** The words as written: plain text, new lines kept, clamped with Read more. */
function Body({ text }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || open) return undefined
    const check = () => setLong(el.scrollHeight > el.clientHeight + 2)
    check()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, open])
  return (
    <>
      <p ref={ref} className={cx(s.body, !open && s.clamp)} data-ui="note-body">
        {text}
      </p>
      {long && !open ? (
        <button type="button" className={s.readMore} onClick={() => setOpen(true)}>
          Read more
        </button>
      ) : null}
    </>
  )
}
