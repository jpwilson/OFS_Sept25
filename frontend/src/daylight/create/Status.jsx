// The three background jobs, told honestly (owner: CREATE): uploads, place names, the write-up,
// plus the day's AI allowance. PLAN-DAYLIGHT 2.8 moment 1.
import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import { AI_PER_DAY } from './maker.js'
import { clock } from './useRecorder.js'
import s from './Status.module.css'

function useElapsed(since) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!since) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [since])
  return since ? Math.floor((Date.now() - since) / 1000) : 0
}

function Job({ tone, children, action, ui }) {
  return (
    <li className={cx(s.job, s[tone])} data-ui={ui} data-tone={tone}>
      <span className={s.icon} aria-hidden="true">
        {tone === 'busy' ? <Spinner size={14} /> : <Icon name={tone === 'done' ? 'check' : tone === 'bad' ? 'warning' : 'info'} size={15} />}
      </span>
      <span className={s.text}>{children}</span>
      {action}
    </li>
  )
}

export function uploadsLine(u) {
  if (u.busy) return { tone: 'busy', text: `Uploading ${u.done} of ${u.total}` }
  if (u.failed) return { tone: 'bad', text: `${u.failed} of ${u.total} ${u.total === 1 ? 'photo' : 'photos'} did not upload` }
  return { tone: 'done', text: `${u.total} ${u.total === 1 ? 'photo' : 'photos'} uploaded` }
}

export function placesLine(p) {
  if (!p.total) return { tone: 'idle', text: 'No locations in these photos' }
  if (p.state === 'running') return { tone: 'busy', text: `Naming places ${p.done} of ${p.total}` }
  if (p.state === 'failed') return { tone: 'bad', text: 'Place names did not load' }
  const named = p.total - p.failed
  return { tone: p.failed ? 'idle' : 'done', text: p.failed ? `${named} of ${p.total} places named` : `${p.total} ${p.total === 1 ? 'place' : 'places'} named` }
}

const HOLD = {
  uploads: 'Write-up starts when the photos are up',
  recording: 'Write-up waits for your voice note',
  transcribing: 'Write-up waits for your voice note',
  typing: 'Write-up waits while you type',
  places: 'Write-up starts when the places are named',
  nophotos: 'Write-up needs at least one photo uploaded',
}

export function writeLine(w, hold, elapsed) {
  if (w.state === 'running') return { tone: 'busy', text: `Writing the story${elapsed ? ` ${clock(elapsed)}` : ''}` }
  if (w.state === 'done') return w.stale ? { tone: 'idle', text: 'Written, before your latest words' } : { tone: 'done', text: w.count > 1 ? 'Rewritten' : 'Written' }
  if (w.state === 'failed') return { tone: 'bad', text: 'The write-up did not arrive' }
  if (w.state === 'limit') return { tone: 'bad', text: "Today's AI actions are used up" }
  if (w.state === 'noaccess') return { tone: 'idle', text: 'Write-up needs Pro or the trial' }
  return { tone: 'idle', text: HOLD[hold] || 'Write-up starts in a moment' }
}

export function Status({ uploads, places, write, hold, used, onRetryUploads, onRetryWrite, compact }) {
  const elapsed = useElapsed(write.state === 'running' ? write.startedAt : null)
  const u = uploadsLine(uploads)
  const p = placesLine(places)
  const w = writeLine(write, hold, elapsed)
  return (
    <div className={cx(s.wrap, compact && s.compact)} data-ui="create-status">
      <ul className={s.jobs} aria-label="What is happening" aria-live="polite">
        <Job ui="job-uploads" tone={u.tone} action={uploads.failed && !uploads.busy ? <button type="button" className={s.act} onClick={onRetryUploads}>Retry</button> : null}>{u.text}</Job>
        <Job ui="job-places" tone={p.tone}>{p.text}</Job>
        <Job ui="job-write" tone={w.tone} action={write.state === 'failed' ? <button type="button" className={s.act} onClick={onRetryWrite}>Try again</button> : null}>{w.text}</Job>
      </ul>
      {write.state !== 'noaccess' ? (
        <p className={s.meter} data-ui="ai-meter" title={`Up to ${AI_PER_DAY} AI actions a day, shared by write-ups, voice notes and questions.`}>
          <span className="a-mono">AI {Math.min(used, AI_PER_DAY)} of {AI_PER_DAY} today</span>
          <span className={s.pips} aria-hidden="true">
            {Array.from({ length: AI_PER_DAY }, (_, i) => <span key={i} className={cx(s.pip, i < used && s.on)} />)}
          </span>
        </p>
      ) : null}
    </div>
  )
}
