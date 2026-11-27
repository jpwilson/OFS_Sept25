// Story variant only: the Blog page in the landing's frame. The page itself, and every
// word on it, is the original src/pages/Blog.jsx; its stylesheet is swapped for one in
// ../css/ with the same class names (scripts/landing/story-pages.mjs).
import Page from '../../../pages/Blog.jsx'
import { Frame } from '../Frame.jsx'

export default function StoryBlog() {
  return (
    <Frame path="/blog">
      <Page />
    </Frame>
  )
}
