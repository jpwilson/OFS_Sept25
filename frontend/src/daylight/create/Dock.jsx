// "Tell it more" (owner: CREATE): the mic and a text field, both optional. PLAN-DAYLIGHT 2.8
// moment 2. One tap starts a voice note, one tap stops it; a live waveform and timer while
// it records; a caught permission error with Type instead.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { cx } from '../ui/cx.js'
import { AI_PER_DAY } from './maker.js'
import { clock } from './useRecorder.js'
import s from './Dock.module.css'

export function Waveform({ levels, live }) {
  return (
    <span className={cx(s.wave, live && s.live)} aria-hidden="true" data-ui="waveform">
      {levels.map((l, i) => (
        <span key={i} className={s.bar} style={{ transform: `scaleY(${Math.max(0.08, l)})` }} />
      ))}
    </span>
  )
}

const MIC_TROUBLE = {
  denied: 'The microphone is blocked for this site. Allow it in your browser settings, or type instead.',
  nodevice: 'No microphone was found. You can type instead.',
  unsupported: 'This browser cannot record a voice note here. You can type instead.',
  error: 'The recording could not start. You can try again, or type instead.',
}

/** The recording strip: stop, waveform, timer, cancel. Used by the dock and by answer cards. */
export function Recording({ rec, compact }) {
  return (
    <div className={cx(s.recording, compact && s.recCompact)} data-ui="recording" role="group" aria-label="Recording a voice note">
      <button type="button" className={s.stop} onClick={rec.stop} aria-label="Stop recording" data-ui="mic-stop">
        <Icon name="stop" size={22} />
      </button>
      <Waveform levels={rec.levels} live />
      <span className={cx(s.timer, 'a-mono')} aria-live="off">
        <span className={s.recDot} aria-hidden="true" />
        {clock(rec.seconds)}
        <span className={s.max}> / {clock(rec.maxSeconds)}</span>
      </span>
      <button type="button" className={s.cancel} onClick={rec.cancel}>Cancel</button>
    </div>
  )
}

export function MicTrouble({ state, onType, onRetry }) {
  if (!MIC_TROUBLE[state]) return null
  return (
    <div className={s.trouble} role="alert" data-ui="mic-trouble">
      <Icon name="warning" size={18} />
      <p>{MIC_TROUBLE[state]}</p>
      <div className={s.troubleActions}>
        <Button size="sm" variant="ghost" onClick={onType}>Type instead</Button>
        {state === 'error' || state === 'denied' ? <Button size="sm" variant="quiet" onClick={onRetry}>Try again</Button> : null}
      </div>
    </div>
  )
}

function useTextHold(maker, text) {
  useEffect(() => {
    maker.setHold({ typing: !!text.trim() })
  }, [maker, text])
}

/** Desktop: a card pinned to the bottom of the preview column. */
export function Dock({ maker, state, rec, voiceFor, canUseAI, tray, trayCount, trayOpen, onTray }) {
  const [text, setText] = useState('')
  const area = useRef(null)
  useTextHold(maker, text)
  const commit = () => {
    if (!text.trim()) return
    maker.addTyped(text)
    setText('')
  }
  const busy = state.uploadsBusy
  const recording = rec.state === 'recording' && voiceFor === null
  const lead = busy ? 'While these upload, tell us about it.' : state.write.state === 'done' ? 'Tell us more, and rewrite it with your words.' : 'Tell us about it, if you like.'
  return (
    <div className={s.dock} data-ui="create-dock">
      {trayOpen ? (
        <div className={s.tray} data-ui="dock-tray">
          <div className={s.trayHead}>
            <p className={s.lead}>Make it better, if you like. All optional.</p>
            <button type="button" className={s.cancel} onClick={onTray}>Hide</button>
          </div>
          <div className={s.trayBody}>{tray}</div>
        </div>
      ) : null}
      {recording ? (
        <>
          <p className={s.lead}>Recording. Tap the square when you are done.</p>
          <Recording rec={rec} />
        </>
      ) : (
        <>
          <div className={s.leadRow}>
            <p className={s.lead}>{canUseAI ? lead : 'Add a few words, if you like. They open the story.'}{canUseAI ? <span className={s.fine}> Each voice note uses 1 of today's {AI_PER_DAY} AI actions.</span> : null}</p>
            {!trayOpen ? (
              <button type="button" className={s.qBtn} onClick={onTray} data-ui="questions-toggle">
                <Icon name="sparkle" size={16} /> Questions{trayCount ? <span className={s.qCount}>{trayCount}</span> : null}
              </button>
            ) : null}
          </div>
          <div className={s.row}>
            {canUseAI ? (
              <button type="button" className={s.mic} onClick={() => rec.startFor(null)} aria-label="Record a voice note" data-ui="mic" disabled={rec.state === 'asking' || rec.state === 'recording'}>
                <Icon name="mic" size={28} />
              </button>
            ) : null}
            <label className={s.field}>
              <span className="a-sr">A few words about it</span>
              <textarea
                ref={area}
                rows={1}
                value={text}
                placeholder={canUseAI ? 'Or type a few lines: who was there, what you will remember' : 'Who was there, what happened, what you will remember'}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit() }}
                data-ui="words-input"
              />
            </label>
            <Button variant="ghost" onClick={commit} disabled={!text.trim()}>Add</Button>
          </div>
          <MicTrouble state={rec.state} onType={() => { rec.reset(); area.current?.focus() }} onRetry={() => rec.startFor(null)} />
        </>
      )}
    </div>
  )
}

/** Phone: the thumb-zone bar. Mic, a words pill that opens a sheet, and Publish. */
export function PhoneDock({ maker, state, rec, voiceFor, canUseAI, onPublish, publishLabel, publishBusy, settingsBar }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  useTextHold(maker, open ? text : '')
  const commit = () => {
    if (text.trim()) maker.addTyped(text)
    setText('')
    setOpen(false)
  }
  const recording = rec.state === 'recording' && voiceFor === null
  return (
    <div className={s.phone} data-ui="create-phone-bar">
      {settingsBar}
      {recording ? (
        <Recording rec={rec} compact />
      ) : (
        <div className={s.phoneRow}>
          {canUseAI ? (
            <button type="button" className={cx(s.mic, s.micPhone)} onClick={() => rec.startFor(null)} aria-label="Record a voice note" data-ui="mic" disabled={rec.state === 'asking'}>
              <Icon name="mic" size={26} />
            </button>
          ) : null}
          <button type="button" className={s.pill} onClick={() => setOpen(true)} data-ui="words-pill">
            {state.uploadsBusy && canUseAI ? 'Talk or type while they upload' : 'Add a few words'}
          </button>
          <Button onClick={onPublish} busy={publishBusy} className={s.publish}>{publishLabel || 'Publish'}</Button>
        </div>
      )}
      {!recording && rec.state !== 'idle' && rec.state !== 'asking' && voiceFor === null ? (
        <MicTrouble state={rec.state} onType={() => { rec.reset(); setOpen(true) }} onRetry={() => rec.startFor(null)} />
      ) : null}
      <Sheet
        open={open}
        onClose={commit}
        title="A few words"
        placement="bottom"
        footer={<Button full onClick={commit} disabled={!text.trim()}>Add to the story</Button>}
      >
        <p className={s.sheetLead}>Who was there, what happened, what you will remember. {canUseAI ? 'The write-up uses it.' : 'It opens the story.'}</p>
        <textarea className={s.sheetArea} value={text} onChange={(e) => setText(e.target.value)} rows={6} autoFocus data-ui="words-input" aria-label="A few words about it" />
      </Sheet>
    </div>
  )
}
