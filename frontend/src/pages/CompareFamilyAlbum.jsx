import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function CompareFamilyAlbum() {
  return <MarketingPage page={pageByPath('/compare/familyalbum')} />
}
