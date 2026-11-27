// /create?from=photos, "From photos" (owner: CREATE). PLAN-DAYLIGHT 2.8 and 4.2.
// Pick photos and the story appears straight away from their own time and place; uploads,
// place names and the write-up improve it in place; a voice note, a few words or answers
// make it better; nothing is posted until Publish or Save draft.
//   <NewStoryPage />                                   the route
//   <NewStoryPage files metaOf onBack backLabel />     Smart Import hands over an album
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChrome } from '../shell/chrome.js'
import { useMaker, StoryMaker } from './maker.js'
import CreateFlow from './CreateFlow.jsx'
import { Picker, Reading } from './Picker.jsx'

function Running({ maker, onLeave, leaveLabel, canUseAI, onEmpty }) {
  const st = useMaker(maker)
  useEffect(() => {
    if (st.phase === 'nophotos') onEmpty()
  }, [st.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  if (st.phase !== 'ready') return <Reading done={st.read.done} total={st.read.total} />
  return <CreateFlow maker={maker} onLeave={onLeave} leaveLabel={leaveLabel} canUseAI={canUseAI} />
}

export default function NewStoryPage({ files: given, metaOf, onBack, backLabel }) {
  const auth = useAuth() || {}
  const canUseAI = !!(auth.isSuperuser || auth.isPaidSubscriber || auth.isTrialActive)
  const [maker, setMaker] = useState(null)
  const [error, setError] = useState(null)
  const started = useRef(null)
  useChrome({ footer: false })

  const begin = (files) => {
    setError(null)
    const m = new StoryMaker({ author: auth.user, canUseAI })
    setMaker(m)
    m.start(files, { metaOf })
  }
  useEffect(() => {
    if (given?.length && started.current !== given) {
      started.current = given
      begin(given)
    }
  }, [given]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => maker?.destroy(), [maker])

  const leave = () => {
    setMaker(null)
    if (onBack) onBack()
  }
  if (maker) {
    return (
      <Running
        maker={maker}
        canUseAI={canUseAI}
        onLeave={leave}
        leaveLabel={backLabel || 'Start over'}
        onEmpty={() => { setMaker(null); setError('None of those files are photos. Pick photos from your camera roll or a folder.') }}
      />
    )
  }
  if (given?.length) return <Reading done={0} total={given.length} />
  return <Picker onFiles={begin} error={error} canUseAI={canUseAI} />
}
