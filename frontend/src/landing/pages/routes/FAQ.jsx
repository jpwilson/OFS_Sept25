// Story variant only: the FAQ page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/FAQ.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/FAQ.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryFAQ() {
  return (
    <Frame path="/faq">
      <Page />
    </Frame>
  )
}
