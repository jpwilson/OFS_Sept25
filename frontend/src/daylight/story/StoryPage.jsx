// The story page, /event/:id and /share/:token (stub by F0; STORY owns this file).
// Proves the data layer: useStory, useStoryExtras, parseStory, buildJourney, StoryView
// and the JourneyMap stub side by side, with the honest blocked and error states.
import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStory, useStoryExtras } from '../lib/data.js'
import { useParsedStory } from './useParsedStory.js'
import { useJourneySync } from '../map/useJourneySync.js'
import JourneyMap from '../map/JourneyMap.jsx'
import StoryView from './StoryView.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Loading, Skeleton, SkeletonText } from '../ui/Skeleton.jsx'
import { Stub } from '../ui/Stub.jsx'
import s from './StoryPage.module.css'

export default function StoryPage({ isShareMode = false }) {
  const { id, token } = useParams()
  const story = useStory(isShareMode ? null : id, { shareToken: isShareMode ? token : undefined })
  const extras = useStoryExtras(story.event?.id, { shareToken: isShareMode ? token : undefined })
  const { parsed, journey } = useParsedStory(story.event)
  const bodyRef = useRef(null)
  const { activeStopId, scrollToStop } = useJourneySync({ journey, containerRef: bodyRef })

  if (story.loading)
    return (
      <Loading label="Loading the story" className="a-wrap">
        <div style={{ display: 'grid', gap: 16, paddingBlock: 24 }}>
          <Skeleton h={260} r={20} />
          <Skeleton w="60%" h={44} r={10} />
          <SkeletonText lines={5} size={16} />
        </div>
      </Loading>
    )
  if (story.privacyError)
    return (
      <div className="a-wrap" style={{ paddingBlock: 32 }}>
        <EmptyState
          icon="lock"
          wash="violet"
          title={story.privacyError.status === 403 ? 'This story is shared with a smaller group.' : story.privacyError.kind === 'expired' ? 'This share link has ended.' : 'This story is not here.'}
          body={story.privacyError.privacy_description || story.privacyError.message}
        />
      </div>
    )
  if (story.error)
    return (
      <div className="a-wrap" style={{ paddingBlock: 32 }}>
        <EmptyState tone="error" icon="warning" title="The story did not load." body={story.error.message} action={<Button onClick={story.reload}>Try again</Button>} />
      </div>
    )
  return (
    <div className={`a-wrap ${s.page}`}>
      <Stub pkg="story" name="Story page" note={`Stub. ${parsed?.blocks.length || 0} blocks, ${parsed?.chapters.length || 0} chapters, ${journey ? `${journey.stops.length} stops over ${journey.days.length} days` : 'no journey'}, ${extras.comments.length} comments, ${extras.likes.like_count} likes.`} />
      <div className={journey ? s.split : s.single}>
        <div ref={bodyRef}>
          <StoryView event={story.event} parsed={parsed} journey={journey} extras={extras} mode={isShareMode ? 'share' : 'read'} activeStopId={activeStopId} />
        </div>
        {journey ? (
          <aside className={s.side}>
            <JourneyMap journey={journey} activeStopId={activeStopId} onStopSelect={scrollToStop} mode="panel" />
          </aside>
        ) : null}
      </div>
    </div>
  )
}
