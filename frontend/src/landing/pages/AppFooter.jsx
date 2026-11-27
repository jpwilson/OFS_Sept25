// Story variant only (scripts/landing/story-pages.mjs swaps this in for Layout's Footer).
// On a story marketing page the frame draws the landing's footer instead.
import Footer from '../../components/Footer.jsx'
import { useStoryChrome } from './chrome.js'

export default function AppFooter() {
  return useStoryChrome() ? null : <Footer />
}
