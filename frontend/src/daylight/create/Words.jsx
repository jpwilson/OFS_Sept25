// "Make it better" (owner: CREATE): the write-up's honest state, the author's own words as
// editable cards, and question cards. All optional. PLAN-DAYLIGHT 4.2 step 4.
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { Label } from '../../landing/ui/Label.jsx'
import { cx } from '../ui/cx.js'
import { AI_PER_DAY } from './maker.js'
import { Recording } from './Dock.jsx'
import { PeoplePicker } from './Settings.jsx'
import { clock } from './useRecorder.js'
import s from './Words.module.css'

const COST = `Uses 1 of the day's ${AI_PER_DAY} AI actions.`
const STANDS = 'Your photo story is complete as it is, with its days, places and map. You can publish it now.'

export function WriteNotice({ state, maker }) {
  const w = state.write
  const left = Math.max(0, AI_PER_DAY - state.ai.used)
  if (w.state === 'failed') {
    return (
      <div className={cx(s.notice, s.warn)} role="alert" data-ui="write-failed">
        <Icon name="warning" size={20} />
        <div>
          <p className={s.nTitle}>The write-up did not arrive.</p>
          <p>{w.error} {STANDS}</p>
          <div className={s.nActions}>
            <Button size="sm" onClick={() => maker.write()}>Try the write-up again</Button>
            <span className={s.cost}>{COST}</span>
          </div>
        </div>
      </div>
    )
  }
  if (w.state === 'limit') {
    return (
      <div className={cx(s.notice, s.warn)} role="status" data-ui="write-limit">
        <Icon name="warning" size={20} />
        <div>
          <p className={s.nTitle}>Today's AI actions are used up.</p>
          <p>{w.error} {STANDS}</p>
        </div>
      </div>
    )
  }
  if (w.state === 'noaccess') {
    return (
      <div className={s.notice} role="status" data-ui="write-noaccess">
        <Icon name="info" size={20} />
        <div>
          <p className={s.nTitle}>The write-up needs Pro or the free trial.</p>
          <p>{STANDS} Any words you add open the story.</p>
          <div className={s.nActions}><Button size="sm" variant="ghost" to="/billing">See the plans</Button></div>
        </div>
      </div>
    )
  }
  if (w.state === 'done' && w.stale) {
    return (
      <div className={cx(s.notice, s.fresh)} data-ui="write-stale">
        <Icon name="sparkle" size={20} />
        <div>
          <p className={s.nTitle}>You added more since it was written.</p>
          <div className={s.nActions}>
            <Button size="sm" onClick={() => maker.write()} disabled={!left}>Rewrite with this</Button>
            <span className={s.cost}>{left ? COST : 'No AI actions left today.'}</span>
          </div>
        </div>
      </div>
    )
  }
  if (w.state === 'done') {
    return (
      <div className={cx(s.notice, s.quiet)} data-ui="write-done">
        <Icon name="sparkle" size={20} />
        <div>
          <p>Written by AI from your photos{state.words.some((x) => x.kind === 'voice' && x.state === 'ready') ? ' and your voice note' : state.words.length ? ' and your words' : ''}. Read it through and check names before you publish.</p>
        </div>
      </div>
    )
  }
  return null
}

function WordCard({ w, maker }) {
  const title = w.kind === 'voice' ? 'What you said' : 'What you wrote'
  return (
    <article className={cx(s.card, s.word)} data-ui={`word-${w.kind}`} data-state={w.state}>
      <header className={s.cardHead}>
        <span className={s.badge} data-wash={w.kind === 'voice' ? 'fizz' : 'sun'}><Icon name={w.kind === 'voice' ? 'mic' : 'pen'} size={15} /></span>
        <Label>{title}{w.seconds ? ` · ${clock(w.seconds)}` : ''}</Label>
        <button type="button" className={s.remove} onClick={() => maker.removeWord(w.id)} aria-label={`Remove ${title.toLowerCase()}`}>
          <Icon name="close" size={16} />
        </button>
      </header>
      {w.state === 'transcribing' ? (
        <p className={s.working}><Spinner size={16} /> Turning your voice note into text</p>
      ) : w.state === 'failed' ? (
        <div className={s.failed} role="alert">
          <p>{w.error}</p>
          <Button size="sm" variant="ghost" onClick={() => maker.retryVoice(w.id)}>Try again</Button>
        </div>
      ) : (
        <textarea className={s.edit} value={w.text} onChange={(e) => maker.editWord(w.id, e.target.value)} rows={Math.min(5, Math.max(2, Math.ceil(w.text.length / 64)))} aria-label={title} data-ui="word-edit" />
      )}
    </article>
  )
}

function AnswerCard({ a, maker, rec, voiceFor, canUseAI }) {
  const recording = rec.state === 'recording' && voiceFor === a.id
  return (
    <article className={cx(s.card, s.q)} data-ui="question-card">
      <p className={s.question}>{a.question}</p>
      {recording ? (
        <Recording rec={rec} compact />
      ) : (
        <>
          <textarea className={s.answer} value={a.answer} onChange={(e) => maker.answer(a.id, e.target.value)} rows={2} placeholder="Your answer, if you like" aria-label={a.question} />
          <div className={s.qFoot}>
            {a.transcribing ? <span className={s.working}><Spinner size={14} /> Turning it into text</span> : null}
            {a.error ? <span className={s.err}>{a.error}</span> : null}
            {canUseAI && !a.transcribing ? (
              <button type="button" className={s.small} onClick={() => rec.startFor(a.id)} disabled={rec.state === 'recording'}>
                <Icon name="mic" size={16} /> Answer out loud
              </button>
            ) : null}
            {a.source === 'asked' ? <span className={s.by}>Asked by AI</span> : null}
          </div>
        </>
      )}
    </article>
  )
}

/** Inline, above the preview: the write-up's state and the author's own words. */
export function Inline({ state, maker }) {
  const words = state.words
  const notice = <WriteNotice state={state} maker={maker} />
  if (!words.length && !['failed', 'limit', 'noaccess', 'done'].includes(state.write.state)) return null
  return (
    <section className={s.words} data-ui="create-words" aria-label="Your words">
      {notice}
      {words.length ? <div className={s.list}>{words.map((w) => <WordCard key={w.id} w={w} maker={maker} />)}</div> : null}
    </section>
  )
}

/** The question cards: in the dock's tray on a desktop, in a sheet on a phone. */
export function Questions({ state, maker, rec, voiceFor, canUseAI, choices, phone }) {
  const left = Math.max(0, AI_PER_DAY - state.ai.used)
  const q = state.questions
  const ready = state.uploadsDone > 0 && !state.uploadsBusy
  return (
    <div className={cx(s.questions, phone && s.stack)} data-ui="create-questions">
      <article className={cx(s.card, s.q, s.who)} data-ui="question-who">
        <p className={s.question}>Who is in it?</p>
        <PeoplePicker people={state.people} onAdd={(p) => maker.addPerson(p)} onRemove={(p) => maker.removePerson(p)} choices={choices} limit={phone ? 6 : 8} />
      </article>
      {state.answers.map((a) => <AnswerCard key={a.id} a={a} maker={maker} rec={rec} voiceFor={voiceFor} canUseAI={canUseAI} />)}
      {canUseAI && q.state !== 'done' ? (
        <article className={cx(s.card, s.q, s.ask)} data-ui="question-ask">
          <p className={s.question}>Want a few questions about these photos?</p>
          <p className={s.askBody}>Written by AI after it looks at them. {COST}</p>
          {q.state === 'failed' ? <p className={s.err} role="alert">{q.error}</p> : null}
          <div>
            <Button size="sm" variant="ghost" icon="sparkle" busy={q.state === 'running'} onClick={() => maker.askQuestions()} disabled={!ready || !left}>
              {q.state === 'failed' ? 'Try again' : 'Ask me questions'}
            </Button>
          </div>
          {!ready ? <p className={s.askBody}>Ready when the photos are up.</p> : !left ? <p className={s.askBody}>No AI actions left today.</p> : null}
        </article>
      ) : null}
    </div>
  )
}

/** How many questions are waiting for an answer (the dock's badge). */
export const openQuestions = (state) => 1 + state.answers.filter((a) => !a.answer?.trim()).length - (state.people.length ? 1 : 0)
