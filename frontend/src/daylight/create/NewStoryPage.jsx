// /create?from=photos (stub by F0; CREATE owns this file). Proves buildDraft ->
// draftToEvent -> StoryView + JourneyMap with no network.
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { buildDraft, draftToEvent } from './draft.js'
import { useParsedStory } from '../story/useParsedStory.js'
import StoryView from '../story/StoryView.jsx'
import JourneyMap from '../map/JourneyMap.jsx'
import { Head } from '../ui/Head.jsx'
import { Button } from '../ui/Button.jsx'
import { Stub } from '../ui/Stub.jsx'
import { useChrome } from '../shell/chrome.js'

export default function NewStoryPage() {
  const { user } = useAuth() || {}
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  useChrome({ footer: false })
  const event = useMemo(() => (draft ? draftToEvent(draft, { author: user }) : null), [draft, user])
  const { parsed, journey } = useParsedStory(event)
  const pick = async (e) => {
    if (!e.target.files?.length) return
    setBusy(true)
    try {
      setDraft(await buildDraft(e.target.files))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="a-wrap" style={{ paddingBlock: 20, display: 'grid', gap: 16 }} data-wash="fizz">
      <Head as="h1" before="A story from your" mark="photos" after="." />
      <Stub pkg="create" name="New story from photos" note="Stub: pick photos to see the instant draft through the shared StoryView and journey. Uploads, voice, questions and Publish arrive with CREATE.">
        <div>
          <Button icon="photos" busy={busy} onClick={() => document.getElementById('ofsa-create-pick')?.click()}>Pick photos</Button>
          <input id="ofsa-create-pick" type="file" accept="image/*" multiple hidden onChange={pick} data-ui="photo-input" />
        </div>
        {draft ? <p className="a-mono a-small">{draft.photos.length} photos · {draft.days.length} days · {draft.stops.length} stops</p> : null}
      </Stub>
      {event ? (
        <>
          {journey ? <JourneyMap journey={journey} mode="strip" /> : null}
          <StoryView event={event} parsed={parsed} journey={journey} mode="preview" />
        </>
      ) : null}
    </div>
  )
}
