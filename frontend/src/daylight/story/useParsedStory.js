// The parsed story and its journey for an event, memoised (owner: F0).
//   useParsedStory(event) -> {parsed, journey}
import { useMemo } from 'react'
import { parseStory } from '../lib/storyBlocks.js'
import { buildJourney } from '../lib/journey.js'

export function useParsedStory(event) {
  return useMemo(() => {
    if (!event) return { parsed: null, journey: null }
    const parsed = parseStory(event.description || '', event.event_images || [])
    return { parsed, journey: buildJourney(event, parsed) }
  }, [event])
}
