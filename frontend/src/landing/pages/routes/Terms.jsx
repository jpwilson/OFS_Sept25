// Story variant only: the Terms page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/Terms.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/Terms.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryTerms() {
  return (
    <Frame path="/terms" standalone>
      <Page />
    </Frame>
  )
}
