import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'
import styles from './Header.module.css'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [requestCount, setRequestCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!user) return

    // Load initial count
    loadRequestCount()

    // Poll for new requests every 30 seconds
    const interval = setInterval(loadRequestCount, 30000)

    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    // Check if user has dismissed this count
    const dismissedCount = localStorage.getItem('dismissedFollowRequestCount')
    if (dismissedCount && parseInt(dismissedCount) === requestCount) {
      setIsDismissed(true)
    } else {
      setIsDismissed(false)
    }
  }, [requestCount])

  async function loadRequestCount() {
    try {
      const data = await apiService.getFollowRequestCount()
      setRequestCount(data.count || 0)
    } catch (error) {
      console.error('Failed to load follow request count:', error)
    }
  }

  function handleDismiss(e) {
    e.preventDefault()
    e.stopPropagation()
    localStorage.setItem('dismissedFollowRequestCount', requestCount.toString())
    setIsDismissed(true)
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        Our Family Socials
      </Link>

      {/* Hamburger button for mobile */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>

      {/* Desktop nav */}
      <nav className={styles.nav}>
        {user && user.subscription_tier === 'free' && (
          <Link to="/billing" className={styles.premiumLink}>Go Premium</Link>
        )}
        <Link to="/feed">Feed</Link>
        <Link to="/map">Map</Link>
        <Link to="/timeline">Timeline</Link>
        <Link to="/groups">Groups</Link>
        <Link to="/create">Create</Link>
        {user ? (
          <span className={styles.profileLink}>
            <Link to={`/profile/${user.username}`}>Profile</Link>
            {requestCount > 0 && !isDismissed && (
              <span className={styles.badge}>
                {requestCount}
                <button
                  className={styles.dismissButton}
                  onClick={handleDismiss}
                  title="Dismiss notification"
                >
                  ×
                </button>
              </span>
            )}
          </span>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu}>
          <nav className={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
            {user && user.subscription_tier === 'free' && (
              <Link to="/billing" className={styles.premiumLink} onClick={closeMobileMenu}>Go Premium</Link>
            )}
            <Link to="/feed" onClick={closeMobileMenu}>Feed</Link>
            <Link to="/map" onClick={closeMobileMenu}>Map</Link>
            <Link to="/timeline" onClick={closeMobileMenu}>Timeline</Link>
            <Link to="/groups" onClick={closeMobileMenu}>Groups</Link>
            <Link to="/create" onClick={closeMobileMenu}>Create</Link>
            {user ? (
              <span className={styles.profileLink}>
                <Link to={`/profile/${user.username}`} onClick={closeMobileMenu}>
                  Profile
                </Link>
                {requestCount > 0 && !isDismissed && (
                  <span className={styles.badge}>
                    {requestCount}
                    <button
                      className={styles.dismissButton}
                      onClick={handleDismiss}
                      title="Dismiss notification"
                    >
                      ×
                    </button>
                  </span>
                )}
              </span>
            ) : (
              <Link to="/login" onClick={closeMobileMenu}>Login</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header