// Story variant only: the PricingPage page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/PricingPage.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/PricingPage.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryPricingPage() {
  return (
    <Frame path="/pricing">
      <Page />
    </Frame>
  )
}
