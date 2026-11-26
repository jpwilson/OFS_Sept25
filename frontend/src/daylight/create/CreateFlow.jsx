// The one screen that keeps improving the same draft (owner: CREATE). PLAN-DAYLIGHT 2.8.
// Desktop: the story preview on the left with the dock pinned under it; the journey map and
// the publish settings in a sticky rail on the right. Phone: its own layout; a contextual top
// bar, the preview full width, and one thumb-zone bar (settings chips, mic, words, Publish);
// every setting opens as a bottom sheet.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDesktop } from '../lib/capability.js'
import { dateRange, plural } from '../lib/format.js'
import { useChrome } from '../shell/chrome.js'
import { parseStory } from '../lib/storyBlocks.js'
import { buildJourney } from '../lib/journey.js'
import StoryView from '../story/StoryView.jsx'
import JourneyMap from '../map/JourneyMap.jsx'
import { useJourneySync } from '../map/useJourneySync.js'
import { Button } from '../ui/Button.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Readout } from '../ui/Readout.jsx'
import { Label } from '../../landing/ui/Label.jsx'
import { cx } from '../ui/cx.js'
import { useMaker } from './maker.js'
import { previewStory } from './draft.js'
import { useRecorder } from './useRecorder.js'
import { Status } from './Status.jsx'
import { Dock, PhoneDock } from './Dock.jsx'
import { Inline, Questions, openQuestions } from './Words.jsx'
import { SettingsRows, SettingsChips, SettingsSheet, summaries, usePeopleChoices, useGroups } from './Settings.jsx'
import s from './CreateFlow.module.css'

function Summary({ state, journey, phone, onStop, activeStopId }) {
  const d = state.draft
  const located = d.photos.filter((p) => p.hasGps).length
  const undated = d.untimed.length
  const notes = []
  if (!located) notes.push('These photos carry no location, so there is no map yet. Add a place in the settings to put the story on the world map.')
  else if (located < d.photos.length) notes.push(`${plural(d.photos.length - located, 'photo')} with no location ${d.photos.length - located === 1 ? 'sits' : 'sit'} with the nearest stop in time.`)
  if (undated) notes.push(`${plural(undated, 'photo')} with no date ${undated === 1 ? 'is' : 'are'} at the end.`)
  if (d.skipped.length) notes.push(`${plural(d.skipped.length, 'file')} left out: clips and other files are added by editing the story after you publish.`)
  const days = d.days.length ? d.days[d.days.length - 1].n : 0
  return (
    <section className={s.summary} data-ui="create-summary" aria-label="What your photos say">
      <div className={s.readouts}>
        <Readout size="sm" label="Photos" value={d.photos.length} />
        <Readout size="sm" label="Days" value={days || '–'} />
        <Readout size="sm" label="Stops" value={d.stops.length || '–'} />
        <Readout size="sm" label="When" value={d.start ? dateRange(d.start, d.end, { short: true }) : 'No date'} />
      </div>
      {phone && journey ? (
        <div className={s.strip}>
          <JourneyMap journey={journey} mode="strip" activeStopId={activeStopId} onStopSelect={onStop} />
        </div>
      ) : null}
      {notes.length ? (
        <ul className={s.notes}>
          {notes.map((n) => <li key={n}><Icon name="info" size={16} />{n}</li>)}
        </ul>
      ) : null}
    </section>
  )
}

function PublishDialogs({ state, maker, onOpen, navigate }) {
  const p = state.publish
  const u = state.uploadCounts
  const close = () => maker.clearPublish()
  if (p.state === 'needs' && p.step === 'failed-uploads') {
    return (
      <Dialog open onClose={close} title={`${plural(u.failed, 'photo')} did not upload`} actions={
        <>
          <Button variant="ghost" onClick={() => { close(); maker.retryUploads() }}>Try {u.failed === 1 ? 'it' : 'them'} again</Button>
          <Button onClick={() => maker.publish({ asDraft: p.asDraft, withoutFailed: true })}>{p.asDraft ? 'Save' : 'Publish'} without {u.failed === 1 ? 'it' : 'them'}</Button>
        </>
      }>
        <p>The other {plural(u.done, 'photo')} are up. You can try again, or leave {u.failed === 1 ? 'that one' : 'those'} out of the story.</p>
      </Dialog>
    )
  }
  if (p.state === 'failed') {
    return (
      <Dialog open onClose={close} title={p.asDraft ? 'The draft did not save' : 'The story did not publish'} actions={
        p.limit ? (
          <>
            <Button variant="ghost" to="/billing">See the plans</Button>
            <Button onClick={() => maker.publish({ asDraft: true, withoutFailed: true })}>Save as a draft</Button>
          </>
        ) : <Button onClick={() => maker.publish({ asDraft: p.asDraft, withoutFailed: true })}>Try again</Button>
      }>
        <p>{p.error}</p>
        <p className="a-mute a-small">Everything here is still on this page. Nothing has been posted.</p>
      </Dialog>
    )
  }
  if (p.state === 'done' && p.result?.warnings?.length) {
    const ev = p.result.event
    return (
      <Dialog open onClose={() => navigate(`/event/${ev.slug || ev.id}`)} title={p.result.asDraft ? 'Saved as a draft' : 'Published'} actions={<Button onClick={() => navigate(`/event/${ev.slug || ev.id}`)}>Open the story</Button>}>
        {p.result.warnings.map((w) => <p key={w}>{w}</p>)}
      </Dialog>
    )
  }
  return null
}

export default function CreateFlow({ maker, onLeave, leaveLabel = 'Start over', canUseAI }) {
  const state = useMaker(maker)
  const desktop = useDesktop()
  const navigate = useNavigate()
  const { user } = useAuth() || {}
  useChrome(desktop ? { footer: false } : { footer: false, tabBar: false, topBar: false })
  const [sheet, setSheet] = useState(null)
  const [trayOpen, setTrayOpen] = useState(false)
  const [qSheet, setQSheet] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const mainRef = useRef(null)
  const choices = usePeopleChoices()
  const groups = useGroups(sheet === 'audience' || state.settings.audience === 'custom_group')

  // one recorder, aimed at the story or at one answer
  const target = useRef(null)
  const [voiceFor, setVoiceFor] = useState(null)
  const recorder = useRecorder({ onDone: (r) => maker.addVoice(r, { target: target.current }) })
  const rec = { ...recorder, startFor: (t) => { target.current = t; setVoiceFor(t); recorder.start() } }
  useEffect(() => {
    maker.setHold({ recording: recorder.state === 'recording' || recorder.state === 'asking' })
  }, [maker, recorder.state])

  const uploadCounts = maker.uploadCounts()
  const view = { ...state, uploadCounts, uploadsBusy: uploadCounts.busy > 0, uploadsDone: uploadCounts.done }
  const urlOf = (id) => state.draft.photos.find((p) => p.id === id)?.url || state.uploads[id]?.url || null
  const html = useMemo(() => maker.tokenHtml(state), [maker, state.write.written, state.draft, state.words]) // eslint-disable-line react-hooks/exhaustive-deps
  const { event, parsed, journey } = useMemo(
    () => previewStory(state.draft, { author: user, html, captions: state.write.written?.captions, settings: { ...state.settings, title: state.settings.title || state.draft.title }, urlOf, parseStory, buildJourney }),
    [state.draft, html, state.write.written, state.settings, user, state.uploads], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const { activeStopId, scrollToStop } = useJourneySync({ journey, containerRef: mainRef })
  const sum = summaries(state, groups.groups)

  // publishing
  const p = state.publish
  useEffect(() => {
    if (p.state === 'done' && !p.result?.warnings?.length) {
      const ev = p.result.event
      navigate(`/event/${ev.slug || ev.id}`, { replace: true })
    }
    if (p.state === 'needs' && (p.step === 'dates' || p.step === 'group')) {
      setSheet(p.step === 'dates' ? 'dates' : 'audience')
      maker.clearPublish()
    }
  }, [p.state, p.step]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const warn = (e) => {
      if (maker.getState().publish.state === 'done') return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [maker])

  const busy = p.state === 'running' || p.state === 'waiting'
  const pubLabel = p.state === 'waiting' ? `Uploading ${uploadCounts.done} of ${uploadCounts.total}` : p.state === 'running' ? (p.step === 'captions' ? 'Saving captions' : p.step === 'people' ? 'Tagging people' : p.asDraft ? 'Saving' : 'Publishing') : 'Publish'
  const publish = () => maker.publish({ asDraft: false })
  const saveDraft = () => maker.publish({ asDraft: true })
  const qCount = Math.max(0, openQuestions(state))
  const status = (
    <Status uploads={uploadCounts} places={state.places} write={state.write} hold={maker.holdReason()} used={state.ai.used} onRetryUploads={() => maker.retryUploads()} onRetryWrite={() => maker.write()} compact={!desktop} />
  )
  const questions = <Questions state={view} maker={maker} rec={rec} voiceFor={voiceFor} canUseAI={canUseAI} choices={choices} phone={!desktop} />
  const preview = (
    <div className={s.preview} data-ui="create-preview">
      <StoryView event={event} parsed={parsed} journey={journey} mode="preview" activeStopId={activeStopId} />
    </div>
  )

  return (
    <div className={cx(s.page, desktop ? s.desk : s.phone)} data-ui="create-flow" data-phase={state.phase}>
      {desktop ? (
        <header className={s.head}>
          <div className={s.headMain}>
            <Label strong>New story · from photos</Label>
            {status}
          </div>
          <Button variant="quiet" size="sm" onClick={() => setLeaving(true)}>{leaveLabel}</Button>
        </header>
      ) : (
        <header className={s.pbar} data-ui="create-phone-top">
          <IconButton icon="close" label="Leave this story" onClick={() => setLeaving(true)} />
          <p className={s.pTitle}>New story</p>
          <Button variant="quiet" size="sm" onClick={saveDraft} disabled={busy}>Save draft</Button>
        </header>
      )}
      {!desktop ? <div className={s.pStatus}>{status}</div> : null}

      <div className={s.grid}>
        <div className={s.main} ref={mainRef}>
          <Summary state={state} journey={journey} phone={!desktop} onStop={scrollToStop} activeStopId={activeStopId} />
          <Inline state={view} maker={maker} />
          {preview}
          {desktop ? (
            <div className={s.dockWrap}>
              <Dock maker={maker} state={view} rec={rec} voiceFor={voiceFor} canUseAI={canUseAI} tray={questions} trayCount={qCount} trayOpen={trayOpen} onTray={() => setTrayOpen((o) => !o)} />
            </div>
          ) : null}
        </div>

        {desktop ? (
          <aside className={s.rail} data-ui="create-rail">
            <div className={s.mapBox}>
              {journey ? <JourneyMap journey={journey} mode="panel" activeStopId={activeStopId} onStopSelect={scrollToStop} /> : (
                <div className={s.noMap}><Icon name="map" size={28} /><p>{state.draft.stops.length === 1 ? 'One stop: a map needs two.' : 'No locations in these photos.'}</p></div>
              )}
            </div>
            <section className={s.pub} aria-label="Publish">
              <button type="button" className={s.titleBtn} onClick={() => setSheet('title')} data-ui="setting-title">
                <span className={s.titleText}>{sum.title}</span>
                <Icon name="edit" size={18} />
              </button>
              <SettingsRows sum={sum} onOpen={setSheet} urlOf={urlOf} />
              <div className={s.pubActions}>
                <Button variant="ghost" onClick={saveDraft} disabled={busy}>Save draft</Button>
                <Button size="lg" onClick={publish} busy={busy} data-ui="publish">{pubLabel}</Button>
              </div>
              <p className={s.fine}>Publishing tells your followers by email{state.settings.audience === 'private' ? ', except for a Private story, which stays quiet' : ''}. Save draft tells no one.</p>
            </section>
          </aside>
        ) : null}
      </div>

      {!desktop ? (
        <PhoneDock
          maker={maker} state={view} rec={rec} voiceFor={voiceFor} canUseAI={canUseAI}
          onPublish={publish} publishBusy={busy} publishLabel={busy ? pubLabel : 'Publish'}
          settingsBar={
            <div className={s.chipRow}>
              <button type="button" className={s.qChip} onClick={() => setQSheet(true)} data-ui="questions-toggle">
                <Icon name="sparkle" size={15} /> Questions{qCount ? <span className={s.qCount}>{qCount}</span> : null}
              </button>
              <SettingsChips sum={sum} onOpen={setSheet} urlOf={urlOf} />
            </div>
          }
        />
      ) : null}

      <SettingsSheet which={sheet} onClose={() => setSheet(null)} state={state} maker={maker} urlOf={urlOf} groups={groups} choices={choices} />
      <Sheet open={qSheet} onClose={() => setQSheet(false)} title="Make it better" placement="bottom" size="full" footer={<Button full onClick={() => setQSheet(false)}>Done</Button>}>
        <p className={s.sheetLead}>All optional. Answers go into the write-up.</p>
        {questions}
      </Sheet>
      <PublishDialogs state={view} maker={maker} navigate={navigate} />
      <Dialog open={leaving} onClose={() => setLeaving(false)} title="Leave this story?" actions={
        <>
          <Button variant="ghost" onClick={() => setLeaving(false)}>Keep working</Button>
          <Button variant="danger" onClick={() => { setLeaving(false); onLeave() }}>Leave</Button>
        </>
      }>
        <p>Nothing has been posted. Your photos stay on your device; the words and settings here will be lost.</p>
      </Dialog>
    </div>
  )
}
