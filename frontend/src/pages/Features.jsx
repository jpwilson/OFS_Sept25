import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function Features() {
  return <MarketingPage page={pageByPath('/features')} />
}
