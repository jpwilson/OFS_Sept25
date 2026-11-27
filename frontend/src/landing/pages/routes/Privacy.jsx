// Story variant only: the Privacy page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/Privacy.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/Privacy.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryPrivacy() {
  return (
    <Frame path="/privacy" standalone>
      <Page />
    </Frame>
  )
}
