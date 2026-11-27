// Story variant only: the NotFound page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/NotFound.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/NotFound.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryNotFound() {
  return (
    <Frame path="/404">
      <Page />
    </Frame>
  )
}
