// Story variant only: the About page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/About.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/About.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryAbout() {
  return (
    <Frame path="/about">
      <Page />
    </Frame>
  )
}
