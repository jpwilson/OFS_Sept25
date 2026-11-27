// Story variant only (scripts/landing/story-pages.mjs swaps this in for Layout's Header).
// On a story marketing page a signed-out visitor gets the landing's nav from the frame, so
// the app header steps aside; a signed-in member keeps the app header they navigate with.
import Header from '../../components/Header.jsx'
import { useAuth } from '../../context/AuthContext'
import { useStoryChrome } from './chrome.js'

export default function AppHeader() {
  const story = useStoryChrome()
  const { user } = useAuth()
  if (story && !user) return null
  return <Header />
}
