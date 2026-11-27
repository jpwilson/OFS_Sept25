// /import, "Find stories in a big batch" (owner: CREATE). Smart Import restyled, with one
// addition (PLAN-DAYLIGHT 2.8): select several albums and Combine into one story. A run of
// albums that looks like one trip (no more than 40 hours apart and within 200km, the
// clusterer's own trip constants, photo_clustering.py:38-39) is offered as one story,
// because the server only merges a trip when the batch also holds photos from home.
// Choosing an album, or several, opens the same instant-draft flow as From photos.
// Endpoints: POST /admin/ai/cluster-photos (metadata only, no AI use counted),
// GET /geocoding/reverse per album, 1.1s apart; then the flow's own.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { apiFetch } from '../lib/http.js'
import { km } from '../lib/geo.js'
import { dateRange, plural, parseBackendDate } from '../lib/format.js'
import { useChrome } from '../shell/chrome.js'
import { FACTS } from '../../landing/content/facts.js'
import { Head } from '../ui/Head.jsx'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Label } from '../../landing/ui/Label.jsx'
import { cx } from '../ui/cx.js'
import { readMeta } from './draft.js'
import { placeName } from './maker.js'
import { Reading, ACCEPT } from './Picker.jsx'
import NewStoryPage from './NewStoryPage.jsx'
import s from './ImportPage.module.css'

const MAX = Number(FACTS.importMax.value) // SmartImport.jsx:20
const TRIP_GAP_H = 40
const TRIP_KM = 200
const isPhoto = (f) => /^image\//.test(f.type || '') || /\.(heic|heif)$/i.test(f.name || '')
const hoursBetween = (a, b) => (parseBackendDate(b) - parseBackendDate(a)) / 3600000

function titleFor(album, place) {
  const t = album.title_hint || 'A moment'
  if (!t.includes('{place}')) return t
  return place ? t.replace('{place}', place) : t.replace(/ (in|to) \{place\}/, '')
}

/** Runs of neighbouring albums that look like one trip. */
export function tripRuns(albums) {
  const runs = []
  let cur = [0]
  for (let i = 1; i < albums.length; i++) {
    const a = albums[i - 1], b = albums[i]
    const near = !a.centroid || !b.centroid || km({ lat: a.centroid.latitude, lng: a.centroid.longitude }, { lat: b.centroid.latitude, lng: b.centroid.longitude }) <= TRIP_KM
    if (hoursBetween(a.end_ts, b.start_ts) <= TRIP_GAP_H && near) cur.push(i)
    else { if (cur.length > 1) runs.push(cur); cur = [i] }
  }
  if (cur.length > 1) runs.push(cur)
  return runs
}

function AlbumCard({ album, idx, photos, place, selected, onToggle, onOpen }) {
  const cover = photos[album.cover_photo_id]
  const side = album.photo_ids.filter((id) => id !== album.cover_photo_id && photos[id]?.url).slice(0, 3)
  const title = titleFor(album, place)
  return (
    <article className={cx(s.card, selected && s.on, album.confidence === 'low' && s.low)} data-ui="album-card" data-selected={selected || undefined}>
      <button type="button" className={s.mosaic} onClick={() => onOpen(idx)} aria-label={`Make a story from ${title}`}>
        <span className={s.coverImg}>{cover?.url ? <img src={cover.url} alt="" loading="lazy" /> : null}</span>
        <span className={s.side}>{side.map((id) => <img key={id} src={photos[id].url} alt="" loading="lazy" />)}</span>
      </button>
      <label className={s.check}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(idx)} data-ui="album-select" />
        <span className={s.box} aria-hidden="true">{selected ? <Icon name="check" size={16} /> : null}</span>
        <span className="a-sr">Select {title}</span>
      </label>
      <div className={s.text}>
        <h3 className={s.title}>{title}</h3>
        <p className={cx(s.meta, 'a-mono')}>
          {plural(album.photo_count, 'photo')} · {dateRange(album.start_ts, album.end_ts, { short: true })}{album.days > 1 ? ` · ${album.days} days` : ''}
        </p>
        {album.confidence === 'low' ? <p className={s.unsure}>Not sure about this one</p> : null}
      </div>
    </article>
  )
}

export default function ImportPage() {
  const auth = useAuth() || {}
  const canUseAI = !!(auth.isSuperuser || auth.isPaidSubscriber || auth.isTrialActive)
  useChrome({ footer: false })
  const input = useRef(null)
  const [stage, setStage] = useState('drop') // drop | reading | finding | albums | story
  const [read, setRead] = useState({ done: 0, total: 0 })
  const [photos, setPhotos] = useState([]) // [{file, url, meta}]
  const [albums, setAlbums] = useState([])
  const [unsorted, setUnsorted] = useState([])
  const [places, setPlaces] = useState({})
  const [sel, setSel] = useState([])
  const [chosen, setChosen] = useState(null) // {files, metaOf}
  const [error, setError] = useState(null)
  const [over, setOver] = useState(false)
  const [cut, setCut] = useState(0)

  useEffect(() => () => photos.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [photos])

  const handle = async (list) => {
    const all = [...list].filter(isPhoto)
    if (!all.length) { setError('None of those files are photos.'); return }
    const files = all.slice(0, MAX)
    setCut(all.length - files.length)
    setError(null)
    setStage('reading')
    setRead({ done: 0, total: files.length })
    const recs = files.map((file) => ({ file, url: /\.(heic|heif)$/i.test(file.name) ? null : URL.createObjectURL(file), meta: null }))
    let done = 0, i = 0
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (i < recs.length) {
        const r = recs[i++]
        r.meta = await readMeta(r.file)
        setRead({ done: ++done, total: recs.length })
      }
    }))
    setPhotos(recs)
    setStage('finding')
    try {
      const res = await apiFetch('/admin/ai/cluster-photos', {
        method: 'POST',
        body: { photos: recs.map((r, id) => ({ id, timestamp: r.meta.ts, latitude: r.meta.lat, longitude: r.meta.lng, width: r.meta.w || 0, height: r.meta.h || 0, has_camera_exif: r.meta.camera })) },
      })
      if (!res?.albums?.length) {
        setError("These photos carry no dates, so they can't be sorted. Try photos taken with a camera or phone.")
        setStage('drop')
        return
      }
      setAlbums(res.albums)
      setUnsorted(res.unsorted_photo_ids || [])
      setPlaces({})
      setSel([])
      setStage('albums')
    } catch (e) {
      setError(e.status === 403 ? 'Smart Import needs Pro or the free trial.' : e.message)
      setStage('drop')
    }
  }

  // place names for the cards, one request a second
  useEffect(() => {
    if (stage !== 'albums') return
    let live = true
    ;(async () => {
      for (let i = 0; i < albums.length && live; i++) {
        const c = albums[i].centroid
        if (!c) continue
        try {
          const r = await apiFetch('/geocoding/reverse', { query: { latitude: c.latitude.toFixed(6), longitude: c.longitude.toFixed(6) } })
          const name = r?.address?.city || r?.address?.town || r?.address?.village || placeName(r)
          if (live && name) setPlaces((p) => ({ ...p, [i]: name }))
        } catch { /* a card without a place still works */ }
        await new Promise((res) => setTimeout(res, 1100))
      }
    })()
    return () => { live = false }
  }, [stage, albums])

  const runs = useMemo(() => tripRuns(albums), [albums])
  const toggle = (i) => setSel((x) => (x.includes(i) ? x.filter((k) => k !== i) : [...x, i].sort((a, b) => a - b)))
  /** Set-aside photos (dated, but too few to make an album) that fall inside the chosen span. */
  const strays = (idxs, slackH) => {
    const a = parseBackendDate(albums[idxs[0]].start_ts) - slackH * 3600000
    const b = parseBackendDate(albums[idxs[idxs.length - 1]].end_ts).getTime() + slackH * 3600000
    return unsorted.filter((id) => {
      const t = parseBackendDate(photos[id]?.meta?.ts)?.getTime()
      return t != null && t >= a && t <= b
    })
  }
  const open = (idxs, slackH = 0) => {
    const ids = [...new Set([...idxs.flatMap((i) => albums[i].photo_ids), ...(idxs.length > 1 ? strays(idxs, slackH) : [])])]
    const recs = ids.map((id) => photos[id]).filter(Boolean)
    const metas = new Map(recs.map((r) => [r.file, r.meta]))
    setChosen({ files: recs.map((r) => r.file), metaOf: (f) => metas.get(f) })
    setStage('story')
  }
  const selPhotos = sel.reduce((n, i) => n + albums[i].photo_count, 0)
  const selRange = sel.length ? dateRange(albums[sel[0]].start_ts, albums[sel[sel.length - 1]].end_ts, { short: true }) : ''

  if (!auth.user) return null
  if (stage === 'story' && chosen) {
    return <NewStoryPage files={chosen.files} metaOf={chosen.metaOf} onBack={() => { setChosen(null); setStage('albums') }} backLabel="Back to the albums" />
  }
  if (!canUseAI) {
    return (
      <div className={s.page}>
        <div className={s.wrap} style={{ paddingTop: 32 }}>
          <EmptyState wash="fizz" icon="stack" before="Smart Import is part of" mark="Pro" after="." body="It reads the time and place of up to a few hundred photos on your device and sorts them into albums. It needs Pro or the free trial. You can still make a story from photos." action={<><Button to="/billing">See the plans</Button><Button variant="ghost" to="/create?from=photos">Make a story from photos</Button></>} />
        </div>
      </div>
    )
  }
  if (stage === 'reading') return <Reading done={read.done} total={read.total} />
  if (stage === 'finding') {
    return (
      <div className={s.finding} role="status" data-ui="import-finding">
        <div className={s.wall} aria-hidden="true">{photos.slice(0, 24).map((p, i) => (p.url ? <img key={i} src={p.url} alt="" /> : <span key={i} />))}</div>
        <p className={s.findT}>Finding the stories in {plural(photos.length, 'photo')}</p>
        <p className="a-mute">Only times and places are sent to be grouped. No photo has uploaded.</p>
      </div>
    )
  }
  if (stage === 'albums') {
    return (
      <div className={s.page} data-ui="import-albums">
        <div className={s.wrap}>
          <header className={s.head}>
            <Label strong>Find stories in a big batch</Label>
            <Head as="h1" size="page" before={`${plural(albums.length, 'album')} in your`} mark="photos" after="." />
            <p className={s.sub}>Tap an album to make it a story. Or select several and combine them into one.</p>
          </header>
          {runs.map((run) => {
            const extra = strays(run, TRIP_GAP_H).length
            const n = run.reduce((k, i) => k + albums[i].photo_count, 0) + extra
            return (
              <div key={run.join('-')} className={s.hint} data-ui="trip-hint">
                <Icon name="route" size={22} />
                <div>
                  <p className={s.hintT}>{run.length === albums.length ? 'These all look like one trip' : `${run.length} of these look like one trip`}</p>
                  <p>{plural(n, 'photo')}{extra ? `, with ${extra} set aside from the same days` : ''}. The albums are no more than {TRIP_GAP_H} hours apart and within {TRIP_KM} km of each other.</p>
                </div>
                <div className={s.hintActions}>
                  <Button variant="ghost" size="sm" onClick={() => setSel(run)}>Select them</Button>
                  <Button size="sm" onClick={() => open(run, TRIP_GAP_H)}>Make one story</Button>
                </div>
              </div>
            )
          })}
          <div className={s.grid}>
            {albums.map((a, i) => (
              <AlbumCard key={`${a.start_ts}-${i}`} album={a} idx={i} photos={photos} place={places[i]} selected={sel.includes(i)} onToggle={toggle} onOpen={(k) => open([k])} />
            ))}
          </div>
          {unsorted.length ? <p className={s.aside}>{plural(unsorted.length, 'photo')} set aside: no date, or too few near the others to make an album. Combining albums brings back the ones from the same days.</p> : null}
          {cut ? <p className={s.aside}>Only the first {MAX} photos were read. Run the rest as another batch.</p> : null}
          <Button variant="quiet" icon="swap" onClick={() => { setStage('drop'); setAlbums([]) }}>Start over with different photos</Button>
        </div>
        {sel.length ? (
          <div className={s.bar} data-ui="combine-bar">
            <div className={s.barIn}>
              <p className={s.barT}><strong>{plural(sel.length, 'album')} selected</strong><span className="a-mono a-mute"> · {plural(selPhotos, 'photo')} · {selRange}</span></p>
              <div className={s.barActions}>
                <Button variant="quiet" onClick={() => setSel([])}>Clear</Button>
                <Button onClick={() => open(sel)} data-ui="combine">{sel.length > 1 ? 'Combine into one story' : 'Make this story'}</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }
  return (
    <div className={s.page} data-ui="import-drop">
      <section className={s.band} data-wash="fizz">
        <div className={s.wrap}>
          <Label strong>Find stories in a big batch</Label>
          <Head as="h1" size="page" before="Drop in the camera roll. Out come the vacations, the birthdays, the" mark="weekends" after="." />
          <p className={s.sub}>Choose up to {MAX} photos. The time and place of each are read on this device, and only those details are sent to be grouped into albums. No photo uploads until you pick one.</p>
        </div>
      </section>
      <div className={s.wrap}>
        <div className={cx(s.drop, over && s.over)} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files) }} data-ui="import-drop-zone">
          <span className={s.disc} aria-hidden="true"><Icon name="stack" size={32} /></span>
          <Button size="lg" icon="plus" onClick={() => input.current?.click()}>Choose photos</Button>
          <p className="a-mute a-small">or drop a folder's worth here</p>
          <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { handle(e.target.files); e.target.value = '' }} data-ui="import-input" />
          {error ? <p className={s.err} role="alert">{error}</p> : null}
        </div>
        <nav className={s.other}>
          <Button variant="ghost" icon="photos" to="/create?from=photos">One story from photos</Button>
          <Button variant="ghost" icon="pen" to="/create">Write it yourself</Button>
        </nav>
      </div>
    </div>
  )
}
