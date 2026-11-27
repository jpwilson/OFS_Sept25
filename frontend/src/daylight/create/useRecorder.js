// The voice note recorder (owner: CREATE). PLAN-DAYLIGHT 4.2 step 4.
//   const rec = useRecorder({onDone(recording), maxSeconds = 180})
//   rec.state   'idle' | 'asking' | 'recording' | 'denied' | 'nodevice' | 'unsupported' | 'error'
//   rec.seconds, rec.levels (the last 40 input levels, 0..1, for the live waveform)
//   rec.start()  rec.stop()  rec.cancel()  rec.reset()
// recording: {blob, mime, fileName, seconds}. The file name matches what the browser
// recorded (Safari records MP4; today's app always says recording.webm, api.js:2798).
// Errors are caught and named; nothing is thrown at the caller (useVoiceRecorder.js:57-60 rethrows).
import { useEffect, useRef, useState } from 'react'

const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']
const BARS = 40

export function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}
export function fileNameFor(mime) {
  const m = String(mime || '')
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'voice-note.m4a'
  if (m.includes('ogg')) return 'voice-note.ogg'
  if (m.includes('wav')) return 'voice-note.wav'
  return 'voice-note.webm'
}

export function useRecorder({ onDone, maxSeconds = 180 } = {}) {
  const [state, setState] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState(() => new Array(BARS).fill(0))
  const r = useRef({})
  const done = useRef(onDone)
  done.current = onDone

  const cleanup = () => {
    const x = r.current
    cancelAnimationFrame(x.raf)
    clearInterval(x.timer)
    x.stream?.getTracks().forEach((t) => t.stop())
    x.ctx?.close?.().catch(() => {})
    r.current = {}
  }
  useEffect(() => cleanup, [])

  const start = async () => {
    if (state === 'recording' || state === 'asking') return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setState('unsupported'); return }
    setState('asking')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      const n = e?.name || ''
      setState(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'nodevice' : 'error')
      return
    }
    const mime = pickMime()
    let mr
    try {
      mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 })
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      setState('error')
      return
    }
    const chunks = []
    const x = { stream, mr, chunks, started: Date.now(), cancelled: false }
    r.current = x
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    mr.onstop = () => {
      const secs = Math.max(1, Math.round((Date.now() - x.started) / 1000))
      const type = mr.mimeType || mime || 'audio/webm'
      const cancelled = x.cancelled
      cleanup()
      setLevels(new Array(BARS).fill(0))
      setState('idle')
      if (cancelled || !chunks.length) return
      const blob = new Blob(chunks, { type })
      done.current?.({ blob, mime: type, fileName: fileNameFor(type), seconds: secs })
    }
    // the live waveform: input level sampled about twelve times a second
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      const an = ctx.createAnalyser()
      an.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.fftSize)
      let last = 0
      const tick = (t) => {
        x.raf = requestAnimationFrame(tick)
        if (t - last < 80) return
        last = t
        an.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
        const lvl = Math.min(1, Math.sqrt(sum / buf.length) * 4)
        setLevels((prev) => [...prev.slice(1), lvl])
      }
      x.ctx = ctx
      x.raf = requestAnimationFrame(tick)
    } catch {
      // no waveform, the recording still works
    }
    x.timer = setInterval(() => {
      const s = Math.floor((Date.now() - x.started) / 1000)
      setSeconds(s)
      if (s >= maxSeconds && mr.state === 'recording') mr.stop()
    }, 250)
    setSeconds(0)
    mr.start(1000)
    setState('recording')
  }
  const stop = () => {
    const mr = r.current.mr
    if (mr && mr.state !== 'inactive') mr.stop()
  }
  const cancel = () => {
    if (r.current.mr) {
      r.current.cancelled = true
      stop()
    } else setState('idle')
  }
  const reset = () => setState('idle')
  return { state, seconds, levels, start, stop, cancel, reset, maxSeconds }
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
