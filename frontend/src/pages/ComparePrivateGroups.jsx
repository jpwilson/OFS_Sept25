import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function ComparePrivateGroups() {
  return <MarketingPage page={pageByPath('/compare/facebook-groups')} />
}
