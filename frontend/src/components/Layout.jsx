import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'
import Footer from './Footer'
import TrialBanner from './TrialBanner'
import WelcomeModal from './WelcomeModal'
import FeedbackWidget from './FeedbackWidget'

function Layout() {
  const { isDemoAccount, logout } = useAuth()
  const navigate = useNavigate()

  const handleDemoSignup = () => {
    logout()
    navigate('/login?signup=true')
  }

  return (
    <>
      <WelcomeModal />
      {isDemoAccount && (
        <div style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          position: 'sticky',
          top: 0,
          zIndex: 1001,
        }}>
          You're viewing a demo —{' '}
          <button
            onClick={handleDemoSignup}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              padding: 0,
            }}
          >
            Create your own account
          </button>
        </div>
      )}
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