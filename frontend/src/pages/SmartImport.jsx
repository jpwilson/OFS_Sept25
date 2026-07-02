import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import { useAuth } from '../context/AuthContext'
import { extractImportMetadata } from '../utils/exifExtractor'
import { useToast } from '../components/Toast'
import styles from './SmartImport.module.css'

/**
 * Smart Import — drop a batch of photos, we find the stories.
 *
 * Act 1 (drop):      pick/drop up to 300 photos
 * Act 2 (scanning):  client-side EXIF extraction (no uploads) -> cluster cards
 * Act 3 (uploading): only the chosen album's photos upload to R2
 * Act 4 (writing):   AI narrates the album (existing generate-story)
 * Act 5 (review):    edit title, rewrite with a hint, publish
 */

const MAX_PHOTOS = 300
const UPLOAD_CONCURRENCY = 3

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateRange(startIso, endIso) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const sTxt = `${MONTHS[s.getMonth()]} ${s.getDate()}`
  if (s.toDateString() === e.toDateString()) return sTxt
  const eTxt = s.getMonth() === e.getMonth() ? `${e.getDate()}` : `${MONTHS[e.getMonth()]} ${e.getDate()}`
  return `${sTxt}–${eTxt}`
}

function cityFromAddress(address = {}) {
  return (
    address.city || address.town || address.village ||
    address.suburb || address.county || address.state || null
  )
}

function isHeicFile(file) {
  const name = (file.name || '').toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

// Substitute the geocoded place into a title hint like 'Weekend in {place}'
function titleFor(album, place) {
  let hintText = album?.title_hint || 'A moment'
  if (hintText.includes('{place}')) {
    hintText = place ? hintText.replace('{place}', place) : hintText.replace(/ (in|to) \{place\}/, '')
  }
  return hintText
}

// EXIF timestamps use 'YYYY:MM:DD HH:MM:SS' — convert to ISO for the API
function toIsoTimestamp(ts) {
  if (!ts) return null
  const s = String(ts).trim()
  const exifMatch = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](.+)$/)
  const iso = exifMatch ? `${exifMatch[1]}-${exifMatch[2]}-${exifMatch[3]}T${exifMatch[4]}` : s
  return isNaN(new Date(iso).getTime()) ? null : iso
}

export default function SmartImport() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, isSuperuser, isPaidSubscriber, isTrialActive } = useAuth()
  const hasAIAccess = isSuperuser || isPaidSubscriber || isTrialActive

  const [stage, setStage] = useState('drop') // drop|scanning|clusters|uploading|writing|review|publishing
  const [photos, setPhotos] = useState([]) // [{id, file, previewUrl, meta, url?}]
  const [scanProgress, setScanProgress] = useState(0)
  const [albums, setAlbums] = useState([])
  const [unsortedCount, setUnsortedCount] = useState(0)
  const [placeNames, setPlaceNames] = useState({}) // albumIdx -> city
  const [selected, setSelected] = useState(null) // album index
  const [uploadDone, setUploadDone] = useState(0)
  const [aiResult, setAiResult] = useState(null)
  const [title, setTitle] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const photosRef = useRef(photos)
  photosRef.current = photos
  // Ref mirror so async callbacks always see the latest geocoded names
  // (chooseAlbum/generateStory are created before place names resolve)
  const placeNamesRef = useRef(placeNames)
  placeNamesRef.current = placeNames

  // ---------- Act 1 -> 2: scan ----------
  const handleFiles = useCallback(async (fileList) => {
    const allFiles = Array.from(fileList).filter(f => f.type.startsWith('image/') || isHeicFile(f))
    const files = allFiles.slice(0, MAX_PHOTOS)
    if (files.length === 0) {
      showToast('No photos found — pick some images to import', 'error')
      return
    }
    if (allFiles.length > MAX_PHOTOS) {
      showToast(`That's a lot of memories! We scanned the first ${MAX_PHOTOS} photos.`, 'info')
    }

    // Release any previous batch's preview URLs (failed/retried imports)
    photosRef.current.forEach(r => r.previewUrl && URL.revokeObjectURL(r.previewUrl))

    setStage('scanning')
    setError(null)
    setAlbums([])
    setPlaceNames({})
    setSelected(null)
    setAiResult(null)

    const records = files.map((file, i) => ({
      id: i,
      file,
      previewUrl: isHeicFile(file) ? null : URL.createObjectURL(file),
      meta: null,
      url: null,
    }))
    setPhotos(records)

    // Concurrency-limited EXIF extraction (all local, no uploads)
    let done = 0
    const queue = [...records]
    const workers = Array.from({ length: 8 }, async () => {
      while (queue.length > 0) {
        const rec = queue.shift()
        rec.meta = await extractImportMetadata(rec.file)
        done += 1
        if (done % 5 === 0 || done === records.length) setScanProgress(done)
      }
    })
    await Promise.all(workers)
    setPhotos([...records])

    // ---------- cluster ----------
    try {
      const payload = records.map(r => ({
        id: r.id,
        timestamp: r.meta?.timestamp || null,
        latitude: r.meta?.latitude ?? null,
        longitude: r.meta?.longitude ?? null,
        width: r.meta?.width || 0,
        height: r.meta?.height || 0,
        has_camera_exif: r.meta?.hasCameraExif ?? false,
      }))
      const result = await apiService.clusterPhotos(payload)
      if (!result.albums || result.albums.length === 0) {
        setError("We couldn't find dates in these photos. Try photos taken with a camera or phone.")
        setStage('drop')
        return
      }
      setAlbums(result.albums)
      setUnsortedCount(result.unsorted_photo_ids?.length || 0)
      setStage('clusters')
    } catch (e) {
      console.error('Clustering failed:', e)
      setError(e.message)
      setStage('drop')
    }
  }, [showToast])

  // Lazy place names for cluster cards (Nominatim ~1req/s — sequential)
  useEffect(() => {
    if (stage !== 'clusters') return
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < albums.length; i++) {
        if (cancelled) return
        const c = albums[i].centroid
        if (!c || placeNames[i]) continue
        try {
          const geo = await apiService.reverseGeocode(c.latitude, c.longitude)
          if (cancelled) return
          const city = cityFromAddress(geo?.address)
          if (city) setPlaceNames(prev => ({ ...prev, [i]: city }))
        } catch { /* place name is a nice-to-have */ }
        await new Promise(r => setTimeout(r, 1100))
      }
    })()
    return () => { cancelled = true }
  }, [stage, albums]) // eslint-disable-line react-hooks/exhaustive-deps

  const albumTitle = useCallback(
    (album, idx) => titleFor(album, placeNames[idx]),
    [placeNames]
  )

  // ---------- Act 3: upload chosen album ----------
  const chooseAlbum = useCallback(async (idx) => {
    const album = albums[idx]
    setSelected(idx)
    setStage('uploading')
    setUploadDone(0)
    setError(null)

    const records = photosRef.current
    const toUpload = album.photo_ids.map(id => records[id]).filter(Boolean)

    let done = 0
    let failed = 0
    const queue = [...toUpload]
    const workers = Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const rec = queue.shift()
        try {
          if (!rec.url) {
            const data = await apiService.uploadImage(rec.file)
            rec.url = data.url || data.urls?.medium
          }
        } catch (e) {
          console.warn('Upload failed for one photo:', e.message)
          failed += 1
        }
        done += 1
        setUploadDone(done)
      }
    })
    await Promise.all(workers)
    setPhotos([...records])

    const uploaded = toUpload.filter(r => r.url)
    if (uploaded.length === 0) {
      setError('Uploads failed — please check your connection and try again.')
      setStage('clusters')
      return
    }
    if (failed > 0) {
      showToast(`${failed} photo${failed === 1 ? '' : 's'} couldn't be uploaded — continuing with the rest`, 'info')
    }

    generateStory(idx, uploaded)
  }, [albums]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Act 4: narrate ----------
  const generateStory = useCallback(async (idx, uploadedRecords, extraHint = '') => {
    const album = albums[idx]
    setStage('writing')
    setError(null)

    // Read via ref: place names geocode lazily and this callback may have
    // been captured before they resolved
    const place = placeNamesRef.current[idx]
    const hintTitle = titleFor(album, place)
    const photosPayload = uploadedRecords.map(r => ({
      image_url: r.url,
      place_name: place || null,
      latitude: r.meta?.latitude ?? null,
      longitude: r.meta?.longitude ?? null,
      timestamp: r.meta?.timestamp || null,
    }))

    // Fold the cluster's structure into the prompt as context
    const structure = [
      `These photos were automatically grouped as one ${album.is_trip ? 'trip' : 'event'}: "${hintTitle}".`,
      `${album.photo_count} photos across ${album.days} day${album.days === 1 ? '' : 's'} (${formatDateRange(album.start_ts, album.end_ts)}).`,
      album.days > 1 ? `Structure the story day by day — one <h1> section per day.` : '',
      extraHint ? `The user adds: "${extraHint}"` : '',
    ].filter(Boolean).join(' ')

    try {
      const result = await apiService.generateAIStory(photosPayload, structure)
      setAiResult(result)
      setTitle(result.suggested_title || hintTitle)
      setStage('review')
    } catch (e) {
      console.error('Story generation failed:', e)
      setError(e.message)
      setStage('review')
    }
  }, [albums])

  const handleRewrite = useCallback(() => {
    const records = photosRef.current
    const album = albums[selected]
    const uploaded = album.photo_ids.map(id => records[id]).filter(r => r?.url)
    generateStory(selected, uploaded, hint)
    setHint('')
  }, [albums, selected, hint, generateStory])

  // ---------- Act 5: publish ----------
  const handlePublish = useCallback(async () => {
    if (!aiResult || selected === null) return
    setStage('publishing')

    const records = photosRef.current
    const album = albums[selected]
    const coverRec = records[album.cover_photo_id]
    const place = placeNames[selected]

    try {
      const eventData = {
        title: title.trim() || aiResult.suggested_title || 'Untitled memory',
        description: aiResult.story_html,
        start_date: album.start_ts,
        end_date: album.end_ts,
        cover_image_url: coverRec?.url || records[album.photo_ids[0]]?.url || '',
        privacy_level: 'followers',
        category: aiResult.suggested_category || 'Daily Life',
        location_name: aiResult.location_name || place || null,
        latitude: album.centroid?.latitude ?? null,
        longitude: album.centroid?.longitude ?? null,
        has_multiple_locations: true,
      }
      const event = await apiService.createEvent(eventData, true)

      // Save AI captions (+ GPS so the journey map fills in)
      const byUrl = {}
      album.photo_ids.forEach(id => {
        const r = records[id]
        if (r?.url) byUrl[r.url] = r
      })
      const captions = aiResult.photo_captions || []
      for (let i = 0; i < captions.length; i++) {
        const cap = captions[i]
        if (!cap.image_url || !cap.caption) continue
        const rec = byUrl[cap.image_url]
        try {
          await apiService.createEventImage({
            event_id: event.id,
            image_url: cap.image_url,
            caption: cap.caption,
            order_index: i,
            latitude: rec?.meta?.latitude ?? null,
            longitude: rec?.meta?.longitude ?? null,
            timestamp: toIsoTimestamp(rec?.meta?.timestamp),
          })
        } catch (e) {
          console.warn('Failed to save caption:', e.message)
        }
      }

      showToast('Your album is live! AI wrote this draft — give it a read.', 'success')
      navigate(`/event/${event.slug || event.id}`)
    } catch (e) {
      console.error('Publish failed:', e)
      showToast(e.message || 'Failed to publish', 'error')
      setStage('review')
    }
  }, [aiResult, selected, albums, placeNames, title, navigate, showToast])

  const handleDiscard = useCallback(() => {
    setAiResult(null)
    setSelected(null)
    setError(null)
    setStage('clusters')
  }, [])

  const handleStartOver = useCallback(() => {
    photosRef.current.forEach(r => r.previewUrl && URL.revokeObjectURL(r.previewUrl))
    setPhotos([])
    setAlbums([])
    setPlaceNames({})
    setSelected(null)
    setAiResult(null)
    setError(null)
    setStage('drop')
  }, [])

  const dismissAlbum = useCallback((idx, e) => {
    e.stopPropagation()
    setAlbums(prev => prev.filter((_, i) => i !== idx))
    setPlaceNames(prev => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        const n = Number(k)
        if (n < idx) next[n] = v
        else if (n > idx) next[n - 1] = v
      })
      return next
    })
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => () => {
    photosRef.current.forEach(r => r.previewUrl && URL.revokeObjectURL(r.previewUrl))
  }, [])

  // ---------- render ----------
  if (!user) return null
  if (!hasAIAccess) {
    return (
      <div className={styles.page}>
        <div className={styles.gateCard}>
          <h1>Smart Import</h1>
          <p>Drop in a batch of photos and AI turns them into beautiful albums — stories, captions, maps and all.</p>
          <p className={styles.gateNote}>Smart Import is part of Premium.</p>
          <button className={styles.primaryBtn} onClick={() => navigate('/billing')}>Go Premium</button>
        </div>
      </div>
    )
  }

  const album = selected !== null ? albums[selected] : null

  return (
    <div className={styles.page}>
      {/* ---------- Act 1: drop ---------- */}
      {stage === 'drop' && (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.dropInner}>
            <div className={styles.dropIcon}>✨</div>
            <h1 className={styles.dropTitle}>Drop in your photos.<br />We&apos;ll find the stories.</h1>
            <p className={styles.dropSub}>
              Select a big batch — a trip, a month, your whole camera roll from the holidays.
              We&apos;ll group them into albums and write the first draft for you.
            </p>
            <button className={styles.primaryBtn} type="button">Choose photos</button>
            <p className={styles.dropHint}>Up to {MAX_PHOTOS} photos · nothing uploads until you pick an album</p>
            {error && <p className={styles.errorText}>{error}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className={styles.hiddenInput}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* ---------- Act 2a: scanning ---------- */}
      {stage === 'scanning' && (
        <div className={styles.centerStage}>
          <div className={styles.scanWall}>
            {photos.slice(0, 60).map(p => (
              p.previewUrl
                ? <img key={p.id} src={p.previewUrl} alt="" className={styles.scanThumb} loading="lazy" />
                : <div key={p.id} className={`${styles.scanThumb} ${styles.scanThumbGlass}`} />
            ))}
          </div>
          <h2 className={styles.stageTitle}>
            {scanProgress < photos.length
              ? `Reading photo ${scanProgress} of ${photos.length}…`
              : 'Finding the stories…'}
          </h2>
          <p className={styles.stageSub}>All on your device — nothing has been uploaded yet.</p>
        </div>
      )}

      {/* ---------- Act 2b: cluster cards ---------- */}
      {stage === 'clusters' && (
        <div className={styles.clustersStage}>
          <h1 className={styles.clustersTitle}>
            We found {albums.length} {albums.length === 1 ? 'story' : 'stories'} in your photos
          </h1>
          <p className={styles.clustersSub}>Pick one to bring to life — you can come back for the rest.</p>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.cardGrid}>
            {albums.map((a, idx) => {
              const coverRec = photos[a.cover_photo_id]
              const mosaic = a.photo_ids
                .filter(id => photos[id]?.previewUrl && id !== a.cover_photo_id)
                .slice(0, 3)
              return (
                <button
                  key={`${a.start_ts}-${idx}`}
                  className={`${styles.albumCard} ${a.confidence === 'low' ? styles.lowConfidence : ''}`}
                  style={{ '--i': idx }}
                  onClick={() => chooseAlbum(idx)}
                >
                  <div className={styles.cardMosaic}>
                    <div className={styles.cardCover}>
                      {coverRec?.previewUrl
                        ? <img src={coverRec.previewUrl} alt="" />
                        : <div className={styles.glassFill} />}
                    </div>
                    <div className={styles.cardSide}>
                      {mosaic.map(id => (
                        <img key={id} src={photos[id].previewUrl} alt="" />
                      ))}
                    </div>
                    <div className={styles.cardScrim} />
                    <span
                      className={styles.dismissBtn}
                      role="button"
                      tabIndex={0}
                      aria-label="Don't suggest this"
                      title="Don't suggest this"
                      onClick={e => dismissAlbum(idx, e)}
                      onKeyDown={e => { if (e.key === 'Enter') dismissAlbum(idx, e) }}
                    >✕</span>
                    <div className={styles.cardText}>
                      <h3>{albumTitle(a, idx)}</h3>
                      <p className={styles.evidence}>
                        {a.photo_count} photos · {formatDateRange(a.start_ts, a.end_ts)}
                        {a.days > 1 ? ` · ${a.days} days` : ''}
                        {a.confidence === 'low' ? ' · not sure about this one' : ''}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {albums.length === 0 && (
            <p className={styles.unsortedNote}>All suggestions dismissed — start over to pick different photos.</p>
          )}
          {unsortedCount > 0 && (
            <p className={styles.unsortedNote}>
              {unsortedCount} photo{unsortedCount === 1 ? '' : 's'} set aside (screenshots or missing dates)
            </p>
          )}
          <button className={styles.ghostBtn} onClick={handleStartOver}>← Start over with different photos</button>
        </div>
      )}

      {/* ---------- Act 3: uploading ---------- */}
      {stage === 'uploading' && album && (
        <div className={styles.centerStage}>
          <div className={styles.progressRing}>
            <span>{uploadDone}<em>/{album.photo_count}</em></span>
          </div>
          <h2 className={styles.stageTitle}>Uploading “{albumTitle(album, selected)}”…</h2>
          <p className={styles.stageSub}>Only this album&apos;s photos are uploading — the rest stay on your device.</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(uploadDone / album.photo_count) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ---------- Act 4: writing ---------- */}
      {stage === 'writing' && album && (
        <div className={styles.centerStage}>
          <div className={styles.writingShimmer}>
            <div className={styles.shimmerLine} style={{ width: '55%' }} />
            <div className={styles.shimmerLine} style={{ width: '92%' }} />
            <div className={styles.shimmerLine} style={{ width: '86%' }} />
            <div className={styles.shimmerLine} style={{ width: '68%' }} />
          </div>
          <h2 className={styles.stageTitle}>Reading your {album.photo_count} photos and writing the story…</h2>
          <p className={styles.stageSub}>This usually takes under a minute for a big album.</p>
        </div>
      )}

      {/* ---------- Act 5: review ---------- */}
      {(stage === 'review' || stage === 'publishing') && (
        <div className={styles.reviewStage}>
          <div className={styles.draftBanner}>
            <span className={styles.draftBadge}>✦ Drafted by AI — it&apos;s yours to edit</span>
          </div>
          {error && (
            <div className={styles.errorCard}>
              <p>{error}</p>
              <button className={styles.secondaryBtn} onClick={handleRewrite}>Try again</button>
            </div>
          )}
          {aiResult && (
            <>
              <input
                className={styles.titleInput}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Album title"
                aria-label="Album title"
              />
              <div className={styles.storyMeta}>
                {aiResult.suggested_category && <span className={styles.categoryPill}>{aiResult.suggested_category}</span>}
                {album && <span className={styles.metaText}>{album.photo_count} photos · {formatDateRange(album.start_ts, album.end_ts)}</span>}
              </div>
              <div
                className={styles.storyPreview}
                dangerouslySetInnerHTML={{ __html: aiResult.story_html }}
              />
            </>
          )}
          <div className={styles.reviewBar}>
            <input
              className={styles.hintInput}
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Tell the AI what to change… (optional)"
              aria-label="Rewrite hint"
            />
            <div className={styles.reviewActions}>
              <button className={styles.ghostBtn} onClick={handleDiscard} disabled={stage === 'publishing'}>Discard</button>
              <button className={styles.secondaryBtn} onClick={handleRewrite} disabled={stage === 'publishing'}>Rewrite</button>
              <button className={styles.primaryBtn} onClick={handlePublish} disabled={stage === 'publishing' || !aiResult}>
                {stage === 'publishing' ? 'Publishing…' : 'Keep & publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
