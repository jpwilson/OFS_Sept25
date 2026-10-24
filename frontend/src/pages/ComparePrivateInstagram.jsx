import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function ComparePrivateInstagram() {
  return <MarketingPage page={pageByPath('/compare/private-instagram')} />
}
