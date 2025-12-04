import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TrialBanner from './TrialBanner'

function Layout() {
  return (
    <>
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