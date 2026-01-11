import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'
import NotificationDot from './NotificationDot'
import QuickAddModal from './QuickAddModal'
import styles from './Header.module.css'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notificationCounts, setNotificationCounts] = useState({
    total: 0,
    follow_requests: 0,
    tag_requests: 0,
    profile_claims: 0
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!user) return

    // Load initial counts
    loadNotificationCounts()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotificationCounts, 30000)

    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    // Check if user has dismissed notifications this session
    // Use sessionStorage so it resets when browser closes
    const dismissedTotal = sessionStorage.getItem('dismissedNotificationTotal')
    if (dismissedTotal && parseInt(dismissedTotal) >= notificationCounts.total) {
      setIsDismissed(true)
    } else {
      // New notifications came in, show the dot again
      setIsDismissed(false)
    }
  }, [notificationCounts.total])

  async function loadNotificationCounts() {
    try {
      const data = await apiService.getNotificationCounts()
      setNotificationCounts(data)
    } catch (error) {
      console.error('Failed to load notification counts:', error)
    }
  }

  function handleDismiss() {
    // Store in sessionStorage so it resets on new browser session
    sessionStorage.setItem('dismissedNotificationTotal', notificationCounts.total.toString())
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
        {user && (
          <button
            className={styles.quickAddButton}
            onClick={() => setShowQuickAdd(true)}
            title="Quick Add"
          >
            <span className={styles.quickAddIcon}>+</span>
            <span className={styles.quickAddText}>Quick Add</span>
          </button>
        )}
        <Link to="/feed">Explore</Link>
        <Link to="/groups">Sharing</Link>
        {user && <Link to="/family-tree">Family</Link>}
        <Link to="/create">Create</Link>
        {user ? (
          <span className={styles.profileLink}>
            <Link to={`/profile/${user.username}`}>Profile</Link>
            {notificationCounts.total > 0 && !isDismissed && (
              <NotificationDot
                count={notificationCounts.total}
                dismissable={true}
                onDismiss={handleDismiss}
                size="small"
              />
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
            {user && (
              <button
                className={styles.quickAddButtonMobile}
                onClick={() => { setShowQuickAdd(true); closeMobileMenu() }}
              >
                + Quick Add
              </button>
            )}
            {user && user.subscription_tier === 'free' && (
              <Link to="/billing" className={styles.premiumLink} onClick={closeMobileMenu}>Go Premium</Link>
            )}
            <Link to="/feed" onClick={closeMobileMenu}>Explore</Link>
            <Link to="/groups" onClick={closeMobileMenu}>Sharing</Link>
            {user && <Link to="/family-tree" onClick={closeMobileMenu}>Family</Link>}
            <Link to="/create" onClick={closeMobileMenu}>Create</Link>
            {user ? (
              <span className={styles.profileLink}>
                <Link to={`/profile/${user.username}`} onClick={closeMobileMenu}>
                  Profile
                </Link>
                {notificationCounts.total > 0 && !isDismissed && (
                  <NotificationDot
                    count={notificationCounts.total}
                    dismissable={true}
                    onDismiss={handleDismiss}
                    size="small"
                  />
                )}
              </span>
            ) : (
              <Link to="/login" onClick={closeMobileMenu}>Login</Link>
            )}
          </nav>
        </div>
      )}

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />
    </header>
  )
}

export default Header