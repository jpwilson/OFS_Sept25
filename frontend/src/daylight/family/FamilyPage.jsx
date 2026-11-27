// The family tree page, /family-tree (owner: FAMILY). docs/app/FAMILY.md sections 4 and 5.
//
// Phone: the lime band (title, count, More), requests when someone has asked, a toolbar
// (Tree | List, Waiting for N, Add), the tree in its frame, Friends and more. iPad puts the
// toolbar in the band's row; desktop adds Save image. Every sheet is in the URL, so Back
// closes it: ?person=u:2, ?person=t:41, ?add=1 (?add=tag), ?requests=1, ?tray=cousins.
// Data through useFamily (lib/http.js underneath: a failure shows an honest error with Retry).
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDesktop, useMedia } from '../lib/capability.js'
import { ONLY_ENABLED } from '../dev/only.js'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Menu } from '../ui/Menu.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { arrange } from './arrange.js'
import { useFamily } from './useFamily.js'
import TreeView from './TreeView.jsx'
import ListView from './ListView.jsx'
import PersonSheet from './PersonSheet.jsx'
import AddSheet from './AddSheet.jsx'
import EmptyTree from './EmptyTree.jsx'
import { RequestsSheet, RequestsStrip } from './Requests.jsx'
import { Face, FaceSticker } from './Person.jsx'
import { countLine } from './words.js'
import sh from './Sheets.module.css'
import s from './FamilyPage.module.css'

const SHEETS = ['person', 'add', 'requests', 'tray']
const VIEWS = [
  { value: 'tree', label: 'Tree', icon: 'family' },
  { value: 'list', label: 'List', icon: 'menu' },
]

export default function FamilyPage() {
  const auth = useAuth() || {}
  const { user, loading: authLoading, canAccessContent, isExpired, isTrialExpired, isDemoAccount } = auth
  const navigate = useNavigate()
  const loc = useLocation()
  const [sp, setSp] = useSearchParams()
  const desktop = useDesktop()
  const wide = useMedia('(min-width: 600px)')
  const fam = useFamily()
  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [authLoading, user, navigate])

  const planEnded = !!user && !canAccessContent && (isExpired || isTrialExpired)
  const canWrite = !!user && !isDemoAccount && !planEnded

  // dev only: what a Stage-2 endpoint would add (FAMILY.md section 8), never in production
  const [links, setLinks] = useState(null)
  const preview = ONLY_ENABLED && sp.get('links') === 'preview'
  useEffect(() => {
    if (!preview || fam.status !== 'ready' || !user) { setLinks(null); return undefined }
    let live = true
    import('./dev/preview.js').then((m) => live && setLinks(m.previewLinks(user, fam))).catch(() => {})
    return () => { live = false }
  }, [preview, fam.status, fam.relationships, fam.tags, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const input = useMemo(
    () => (user ? { me: user, relationships: fam.relationships, tags: fam.tags, sent: fam.sent, links: links || [] } : null),
    [user, fam.relationships, fam.tags, fam.sent, links],
  )
  const structure = useMemo(() => (input && fam.status === 'ready' ? arrange(input) : null), [input, fam.status])
  const hold = ONLY_ENABLED && sp.get('grow') != null ? Number(sp.get('grow')) : null
  const view = sp.get('view') === 'list' ? 'list' : 'tree'

  // ---- sheets live in the URL
  const openSheet = (key, value) => {
    const next = new URLSearchParams(sp)
    for (const k of SHEETS) next.delete(k)
    next.set(key, value)
    navigate({ search: `?${next}` }, { state: { sheet: (loc.state?.sheet || 0) + 1 } })
  }
  const closeSheet = () => {
    if (loc.state?.sheet) navigate(-1)
    else {
      const next = new URLSearchParams(sp)
      for (const k of SHEETS) next.delete(k)
      setSp(next, { replace: true })
    }
  }
  const setView = (v) => {
    const next = new URLSearchParams(sp)
    if (v === 'list') next.set('view', 'list')
    else next.delete('view')
    setSp(next, { replace: true })
  }
  const personId = sp.get('person')
  const addStart = sp.get('add')
  const trayId = sp.get('tray')

  // ---- Save image
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const saveImage = async () => {
    if (!input || saving) return
    setSaving(true)
    setSaved('')
    try {
      const { saveTreeImage } = await import('./exportImage.js')
      const how = await saveTreeImage({ input: { ...input, sent: [] }, phone: !desktop })
      if (how !== 'cancelled') setSaved(how === 'shared' ? 'Your tree is ready to share.' : 'Saved as family-tree.png.')
    } catch {
      setSaved('The picture did not save. Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  const menuItems = [
    { label: saving ? 'Saving the picture…' : 'Save image', icon: 'download', onClick: saveImage },
    { divider: true },
    { label: 'Tags', to: '/tags', icon: 'user', note: 'People without an account, and pets' },
    { label: 'Sharing and groups', to: '/groups', icon: 'people' },
    { label: 'Requests about your tags', to: '/notifications', icon: 'bell' },
  ]
  const more = (
    <Menu
      label="More"
      align="end"
      items={desktop ? menuItems.slice(2) : menuItems}
      trigger={(p) => <IconButton {...p} icon="more" label="More" variant="keyline" className={s.more} data-ui="family-more" />}
    />
  )
  const waiting = fam.sent.length ? (
    <button type="button" className={s.waiting} onClick={() => openSheet('requests', '1')} data-ui="waiting-chip">
      <Icon name="clock" size={16} /> Waiting for {fam.sent.length}
    </button>
  ) : null
  const empty = structure && structure.people.size === 1 && !fam.pending.length

  const header = (
    <header className={s.band} data-wash="lime">
      <div className={s.bandInner}>
        <div className={s.titleBlock}>
          <Head as="h1" size="page" before="Your family" mark="tree" after="." />
          {structure && !empty ? (
            <p className={s.count}>
              <span>{countLine(structure)}</span>
              {wide ? waiting : null}
            </p>
          ) : null}
        </div>
        <div className={s.bandActions}>
          {wide && structure && !empty ? <Segmented label="Show your family as" value={view} onChange={setView} options={VIEWS} size="sm" /> : null}
          {desktop && structure && !empty ? (
            <Button variant="ghost" icon="download" onClick={saveImage} busy={saving} data-ui="save-image" wash="lime">
              Save image
            </Button>
          ) : null}
          {wide && canWrite && structure && !empty ? (
            <Button icon="plus" onClick={() => openSheet('add', '1')} data-ui="add-relative">
              Add a relative
            </Button>
          ) : null}
          {user ? more : null}
        </div>
      </div>
    </header>
  )

  let main
  if (!user || fam.status === 'loading' || (!structure && fam.status !== 'error')) {
    main = (
      <div className={s.skeleton} aria-busy="true" data-ui="family-loading">
        <span className="a-sr" role="status">Loading your family tree</span>
        {[1, 2, 3].map((n) => (
          <div key={n} className={s.skRow}>
            {Array.from({ length: n }, (_, i) => <Skeleton key={i} w={64} h={64} r={32} />)}
          </div>
        ))}
      </div>
    )
  } else if (fam.status === 'error') {
    main = (
      <EmptyState
        tone="error"
        icon="warning"
        title="Your family tree did not load."
        body={fam.error?.status === 0 ? 'Check your connection, then try again.' : 'Something went wrong on our side. Try again in a moment.'}
        action={<Button onClick={fam.reload}>Try again</Button>}
      />
    )
  } else if (empty) {
    main = <EmptyTree me={structure.people.get(structure.me)} canWrite={canWrite} onAdd={() => openSheet('add', '1')} onAddTag={() => openSheet('add', 'tag')} />
  } else if (view === 'list') {
    main = <ListView structure={structure} pending={fam.pending} onOpen={(id) => openSheet('person', id)} onRequests={() => openSheet('requests', '1')} />
  } else {
    main = (
      <div className={s.treeArea}>
        <a className={s.skip} href="?view=list" onClick={(e) => { e.preventDefault(); setView('list') }}>
          Show your family as a list
        </a>
        <TreeView
          structure={structure}
          hold={hold}
          fresh={fam.fresh}
          readOnly={!canWrite}
          onOpen={(id) => openSheet('person', id)}
          onAdd={() => openSheet('add', '1')}
          onTray={(id) => openSheet('tray', id)}
        />
      </div>
    )
  }

  const shelf = structure && structure.shelf.length && view === 'tree' && !empty ? (
    <section className={s.shelf} aria-labelledby="family-shelf" data-ui="family-shelf">
      <h2 id="family-shelf" className={s.shelfHead}>
        Friends and more <span>{structure.shelf.length}</span>
      </h2>
      <div className={s.shelfRow}>
        {structure.shelf.map((id) => {
          const p = structure.people.get(id)
          return (
            <button key={id} type="button" className={s.friend} onClick={() => openSheet('person', id)} data-ui="shelf-person">
              <span className={s.friendFace}>
                <Face name={p.name} src={p.avatar} size={64} tag={p.kind === 'tag'} />
              </span>
              <span className={s.friendName}>{p.first}</span>
              {p.word ? <span className={s.friendWord}>{p.word}</span> : null}
            </button>
          )
        })}
      </div>
    </section>
  ) : null

  const tray = structure && trayId ? structure.trays.find((t) => t.id === trayId) : null

  return (
    <div className={s.page} data-ui="family-page" data-family-view={view}>
      {header}
      <div className={s.body}>
        {planEnded ? (
          <div className={s.plan} data-wash="lime" data-ui="plan-card">
            <span className={s.planText}>
              <strong>Your family, all in one place.</strong>
              <span>Pick a plan to add relatives and answer requests.</span>
            </span>
            <Button to="/billing">See plans</Button>
          </div>
        ) : null}
        {structure ? <RequestsStrip fam={fam} canWrite={canWrite} onSeeAll={() => openSheet('requests', '1')} /> : null}
        {!wide && structure && !empty ? (
          <div className={s.toolbar} data-ui="family-toolbar">
            <Segmented label="Show your family as" value={view} onChange={setView} options={waiting ? VIEWS.map(({ icon, ...o }) => o) : VIEWS} size="sm" />
            {waiting}
            <span className={s.grow} />
            {canWrite ? (
              <Button icon="plus" size="sm" onClick={() => openSheet('add', '1')} data-ui="add-relative">
                Add
              </Button>
            ) : null}
          </div>
        ) : null}
        {main}
        {saved ? <p className={s.hint} role="status">{saved}</p> : null}
        {shelf}
      </div>

      {structure ? (
        <>
          <PersonSheet open={!!personId && structure.people.has(personId)} id={personId} structure={structure} fam={fam} canWrite={canWrite} onClose={closeSheet} />
          <AddSheet
            open={!!addStart && canWrite}
            start={addStart === 'tag' ? 'tag' : 'who'}
            tagWord={addStart === 'tag' ? '' : undefined}
            fam={fam}
            user={user}
            onClose={closeSheet}
            onOpenPerson={(id) => openSheet('person', id)}
            onOpenRequests={() => openSheet('requests', '1')}
          />
          <RequestsSheet open={sp.get('requests') === '1'} onClose={closeSheet} fam={fam} canWrite={canWrite} />
          <Sheet open={!!tray} onClose={closeSheet} title={tray?.caption || 'Family'} wash="lime">
            {tray ? (
              <div className={sh.rows} data-ui="tray-sheet">
                {tray.members.map((id) => {
                  const p = structure.people.get(id)
                  return (
                    <button key={id} type="button" className={sh.row} onClick={() => openSheet('person', id)} data-ui="tray-person">
                      <span style={{ position: 'relative' }}>
                        <Face name={p.name} src={p.avatar} size={48} tag={p.kind === 'tag'} asked={p.status === 'asked'} />
                        {p.status === 'asked' ? <FaceSticker kind="asked" /> : null}
                      </span>
                      <span className={sh.rowText}>
                        <span className={sh.rowName}>{p.name}</span>
                        {p.word ? <span className={sh.rowWord}>{p.word}</span> : null}
                      </span>
                      <Icon name="chevron-right" size={18} className={sh.chev} />
                    </button>
                  )
                })}
              </div>
            ) : null}
          </Sheet>
        </>
      ) : null}
    </div>
  )
}
