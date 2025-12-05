import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TrialBanner from './TrialBanner'
import WelcomeModal from './WelcomeModal'

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
    </>
  )
}

export default Layout