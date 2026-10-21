import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function Alternatives() {
  return <MarketingPage page={pageByPath('/alternatives')} />
}
