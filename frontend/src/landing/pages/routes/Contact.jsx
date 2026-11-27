// Story variant only: the Contact page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/Contact.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/Contact.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryContact() {
  return (
    <Frame path="/contact" standalone>
      <Page />
    </Frame>
  )
}
