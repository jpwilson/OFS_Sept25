import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function HowToSharePhotos() {
  return <MarketingPage page={pageByPath('/compare/how-to-share-photos-privately')} />
}
