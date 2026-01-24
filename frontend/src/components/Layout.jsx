import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TrialBanner from './TrialBanner'
import WelcomeModal from './WelcomeModal'
import FeedbackWidget from './FeedbackWidget'

function Layout() {
  return (
    <>
      <WelcomeModal />
      <TrialBanner />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <FeedbackWidget />
    </>
  )
}

export default Layout