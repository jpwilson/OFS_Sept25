import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './CloudflareTest.module.css'

function CloudflareTest() {
  // HEIC state
  const [heicFile, setHeicFile] = useState(null)
  const [heicConverting, setHeicConverting] = useState(false)
  const [heicResult, setHeicResult] = useState(null)
  const [heicError, setHeicError] = useState(null)

  // Video trim state
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(10)
  const [ffmpegLoading, setFfmpegLoading] = useState(false)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [trimming, setTrimming] = useState(false)
  const [trimProgress, setTrimProgress] = useState(0)
  const [trimResult, setTrimResult] = useState(null)
  const [ffmpegError, setFfmpegError] = useState(null)

  const ffmpegRef = useRef(null)

  // ─── HEIC ───────────────────────────────────────────────────────────────────

  const handleHeicUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setHeicFile(file)
    setHeicResult(null)
    setHeicError(null)
  }

  const convertHeic = async () => {
    if (!heicFile) return
    setHeicConverting(true)
    setHeicError(null)
    try {
      const heic2any = (await import('heic2any')).default
      const result = await heic2any({ blob: heicFile, toType: 'image/jpeg', quality: 0.9 })
      const blob = Array.isArray(result) ? result[0] : result
      setHeicResult({
        url: URL.createObjectURL(blob),
        originalSize: heicFile.size,
        convertedSize: blob.size,
      })
    } catch (err) {
      setHeicError(err.message || 'Conversion failed')
    } finally {
      setHeicConverting(false)
    }
  }

  // ─── FFMPEG ─────────────────────────────────────────────────────────────────

  const loadFfmpeg = async () => {
    setFfmpegLoading(true)
    setFfmpegError(null)
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress }) => setTrimProgress(Math.round(progress * 100)))
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegRef.current = ffmpeg
      setFfmpegLoaded(true)
    } catch (err) {
      setFfmpegError(err.message || 'Failed to load FFmpeg')
    } finally {
      setFfmpegLoading(false)
    }
  }

  const handleVideoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setVideoFile(file)
    setTrimResult(null)
    setVideoUrl(URL.createObjectURL(file))
  }

  const handleVideoLoaded = (e) => {
    const dur = e.target.duration
    setVideoDuration(dur)
    setStartTime(0)
    setEndTime(Math.min(dur, 30))
  }

  const trimVideo = async () => {
    if (!ffmpegRef.current || !videoFile) return
    setTrimming(true)
    setTrimProgress(0)
    setFfmpegError(null)
    try {
      const { fetchFile } = await import('@ffmpeg/util')
      const ffmpeg = ffmpegRef.current
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', String(startTime.toFixed(2)),
        '-to', String(endTime.toFixed(2)),
        '-c', 'copy',
        'output.mp4',
      ])
      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data.buffer], { type: 'video/mp4' })
      setTrimResult({
        url: URL.createObjectURL(blob),
        originalSize: videoFile.size,
        trimmedSize: blob.size,
        duration: endTime - startTime,
      })
    } catch (err) {
      setFfmpegError(err.message || 'Trimming failed')
    } finally {
      setTrimming(false)
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const fmt = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  const fmtTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/admin" className={styles.backLink}>← Back to Dashboard</Link>
        <h1>Cloudflare Migration Test</h1>
        <p className={styles.subtitle}>
          Proof-of-concept for the two browser-side features needed before migrating from Cloudinary ($100/mo) to Cloudflare (~$15–40/mo). Nothing here changes the existing app.
        </p>
      </header>

      {/* ── Cost estimate ───────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Cost Estimate</h2>
        <div className={styles.costGrid}>
          <div className={`${styles.costCard} ${styles.current}`}>
            <h3>Cloudinary (Current)</h3>
            <div className={styles.bigPrice}>$100<span>/mo</span></div>
            <ul>
              <li>Image storage + CDN</li>
              <li>On-the-fly image transforms</li>
              <li>Video transcoding + streaming</li>
              <li>HEIC conversion (server-side)</li>
              <li>Video trimming (server-side)</li>
            </ul>
          </div>

          <div className={`${styles.costCard} ${styles.proposed}`}>
            <h3>Cloudflare (Proposed)</h3>
            <div className={styles.bigPrice}>~$15–40<span>/mo</span></div>
            <ul>
              <li>
                <strong>Cloudflare Images</strong> — $5/100k images stored +
                $1/100k delivered + transforms cached per unique combo
              </li>
              <li>
                <strong>R2</strong> — $0.015/GB stored, <em>$0 egress</em>
              </li>
              <li>
                <strong>Stream</strong> — $5/1,000 min stored + $1/1,000 min
                delivered (60s max video = 1 min; 1,000 videos = ~$5)
              </li>
              <li>HEIC → handled in browser (heic2any, Test 1 below)</li>
              <li>Trimming → handled in browser (ffmpeg.wasm, Test 2 below)</li>
            </ul>
            <div className={styles.saving}>Estimated saving: $60–85/mo</div>
          </div>
        </div>
        <p className={styles.note}>
          Cloudflare Stream also gives you adaptive bitrate HLS (Netflix-style quality switching) — better than Cloudinary&apos;s fixed-quality URLs.
        </p>
      </section>

      {/* ── Test 1: HEIC ────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Test 1: HEIC Conversion in Browser (heic2any)</h2>
        <p className={styles.desc}>
          iPhone photos are .heic files that browsers can&apos;t display. Currently Cloudinary converts them server-side. This proves we can convert them in the browser before uploading to Cloudflare Images — no server involved.
        </p>

        <div className={styles.testArea}>
          <div className={styles.uploadRow}>
            <input
              type="file"
              accept=".heic,.heif,image/heic,image/heif"
              onChange={handleHeicUpload}
              id="heic-input"
              className={styles.fileInput}
            />
            <label htmlFor="heic-input" className={styles.uploadLabel}>
              {heicFile ? `📷 ${heicFile.name}` : 'Choose a .heic file'}
            </label>
            {heicFile && (
              <span className={styles.fileSize}>{fmt(heicFile.size)}</span>
            )}
          </div>

          {heicFile && !heicResult && (
            <button onClick={convertHeic} disabled={heicConverting} className={styles.btn}>
              {heicConverting ? 'Converting...' : 'Convert to JPEG in browser'}
            </button>
          )}

          {heicError && <div className={styles.error}>{heicError}</div>}

          {heicResult && (
            <div className={styles.result}>
              <img src={heicResult.url} alt="Converted from HEIC" className={styles.previewImg} />
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Original (.heic)</span>
                  <span className={styles.statValue}>{fmt(heicResult.originalSize)}</span>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Converted (.jpg)</span>
                  <span className={styles.statValue}>{fmt(heicResult.convertedSize)}</span>
                </div>
                <div className={styles.successBadge}>✓ Converted in browser — ready to upload to Cloudflare Images</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Test 2: Video Trim ───────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Test 2: Video Trimming in Browser (ffmpeg.wasm)</h2>
        <p className={styles.desc}>
          Currently the app sends the full video to Cloudinary which trims it server-side via eager transformations. This proves we can trim in the browser first, then upload only the trimmed clip to Cloudflare Stream. FFmpeg WASM is ~30MB and loads once (cached after first load).
        </p>

        <div className={styles.testArea}>
          {!ffmpegLoaded && (
            <button onClick={loadFfmpeg} disabled={ffmpegLoading} className={styles.btn}>
              {ffmpegLoading ? 'Loading FFmpeg (~30MB)...' : 'Load FFmpeg'}
            </button>
          )}

          {ffmpegLoaded && (
            <>
              <div className={styles.uploadRow}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  id="video-input"
                  className={styles.fileInput}
                />
                <label htmlFor="video-input" className={styles.uploadLabel}>
                  {videoFile ? `🎬 ${videoFile.name}` : 'Choose a video file'}
                </label>
                {videoFile && (
                  <span className={styles.fileSize}>{fmt(videoFile.size)}</span>
                )}
              </div>
            </>
          )}

          {videoUrl && (
            <div className={styles.videoSection}>
              <video
                src={videoUrl}
                controls
                onLoadedMetadata={handleVideoLoaded}
                className={styles.videoEl}
              />

              <div className={styles.trimControls}>
                <div className={styles.sliderRow}>
                  <label>Start: <strong>{fmtTime(startTime)}</strong></label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    className={styles.slider}
                  />
                </div>
                <div className={styles.sliderRow}>
                  <label>End: <strong>{fmtTime(endTime)}</strong></label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value))}
                    className={styles.slider}
                  />
                </div>
                <div className={styles.trimMeta}>
                  Duration after trim: <strong>{fmtTime(endTime - startTime)}</strong>
                  {' · '}Total: <strong>{fmtTime(videoDuration)}</strong>
                </div>

                <button
                  onClick={trimVideo}
                  disabled={trimming || endTime <= startTime}
                  className={styles.btn}
                >
                  {trimming ? `Trimming... ${trimProgress}%` : 'Trim in browser'}
                </button>
              </div>
            </div>
          )}

          {ffmpegError && <div className={styles.error}>{ffmpegError}</div>}

          {trimResult && (
            <div className={styles.result}>
              <video src={trimResult.url} controls className={styles.videoEl} />
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Original</span>
                  <span className={styles.statValue}>{fmt(trimResult.originalSize)}</span>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Trimmed clip</span>
                  <span className={styles.statValue}>{fmt(trimResult.trimmedSize)}</span>
                </div>
                <div className={styles.successBadge}>
                  ✓ Trimmed in browser — ready to upload to Cloudflare Stream
                </div>
                <a href={trimResult.url} download="trimmed.mp4" className={styles.downloadLink}>
                  Download trimmed clip
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Migration checklist ──────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2>Migration Checklist (if we go ahead)</h2>
        <p className={styles.desc}>Nothing below has been done yet — this is the roadmap.</p>
        <div className={styles.checklist}>
          {[
            {
              done: true,
              title: 'Browser HEIC conversion',
              detail: 'Replace Cloudinary server-side HEIC handling with heic2any before upload — proven above',
            },
            {
              done: true,
              title: 'Browser video trimming',
              detail: 'Replace Cloudinary eager transformations with ffmpeg.wasm client-side trim — proven above',
            },
            {
              done: false,
              title: 'Image upload endpoint',
              detail: 'Backend generates a one-time Cloudflare Images direct-creator-upload URL; frontend posts directly to it (same pattern as Cloudinary unsigned uploads)',
            },
            {
              done: false,
              title: 'Image URL transforms',
              detail: 'Rewrite cloudinaryUrl.js — swap Cloudinary URL params for Cloudflare Images URL syntax (e.g. /cdn-cgi/image/width=400,quality=80/)',
            },
            {
              done: false,
              title: 'Video upload to Cloudflare Stream',
              detail: 'Upload trimmed file to Stream API, receive UID, store UID instead of Cloudinary public_id',
            },
            {
              done: false,
              title: 'Video playback',
              detail: 'Replace Cloudinary video URLs with Cloudflare Stream HLS manifest URLs — adaptive bitrate comes for free',
            },
            {
              done: false,
              title: 'Video thumbnails',
              detail: 'Use Cloudflare Stream automatic thumbnail URLs (/{videoUID}/thumbnails/thumbnail.jpg)',
            },
            {
              done: false,
              title: 'Video deletion',
              detail: 'Update backend image_cleanup.py to call Cloudflare Stream DELETE API instead of Cloudinary Admin API',
            },
            {
              done: false,
              title: 'Environment variables',
              detail: 'Add CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN to Vercel; remove CLOUDINARY_* vars',
            },
          ].map((item, i) => (
            <div key={i} className={`${styles.checkItem} ${item.done ? styles.checkDone : ''}`}>
              <span className={styles.checkIcon}>{item.done ? '✓' : '○'}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default CloudflareTest
