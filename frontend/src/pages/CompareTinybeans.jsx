import MarketingPage from '../components/MarketingPage'
import { pageByPath } from '../content/marketing.js'

export default function CompareTinybeans() {
  return <MarketingPage page={pageByPath('/compare/tinybeans')} />
}
