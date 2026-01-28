import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import styles from './AdminDashboard.module.css'

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      const data = await apiService.getAdminStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load admin stats:', err)
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading admin dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Manage users, events, and feedback</p>
      </header>

      {/* Stats Grid */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statValue}>{stats?.total_users || 0}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statValue}>{stats?.premium_users || 0}</div>
            <div className={styles.statLabel}>Premium Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📅</div>
            <div className={styles.statValue}>{stats?.total_events || 0}</div>
            <div className={styles.statLabel}>Total Events</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💬</div>
            <div className={styles.statValue}>{stats?.total_feedback || 0}</div>
            <div className={styles.statLabel}>Feedback Items</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🆕</div>
            <div className={styles.statValue}>{stats?.pending_feedback || 0}</div>
            <div className={styles.statLabel}>Pending Feedback</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🛡️</div>
            <div className={styles.statValue}>{stats?.superusers || 0}</div>
            <div className={styles.statLabel}>Superusers</div>
          </div>
        </div>
      </section>

      {/* Management Links */}
      <section className={styles.linksSection}>
        <h2 className={styles.sectionTitle}>Management</h2>
        <div className={styles.linksGrid}>
          <Link to="/admin/users" className={styles.linkCard}>
            <div className={styles.linkIcon}>👥</div>
            <div className={styles.linkContent}>
              <h3>Users</h3>
              <p>View all users, toggle superuser status</p>
            </div>
            <div className={styles.linkArrow}>→</div>
          </Link>
          <Link to="/admin/events" className={styles.linkCard}>
            <div className={styles.linkIcon}>📅</div>
            <div className={styles.linkContent}>
              <h3>Events</h3>
              <p>View all events, hide/restore content</p>
            </div>
            <div className={styles.linkArrow}>→</div>
          </Link>
          <Link to="/admin/feedback" className={styles.linkCard}>
            <div className={styles.linkIcon}>💬</div>
            <div className={styles.linkContent}>
              <h3>Feedback</h3>
              <p>Review user feedback, update status</p>
            </div>
            <div className={styles.linkArrow}>→</div>
          </Link>
        </div>
      </section>

      {/* Landing Page Variations */}
      <section className={styles.landingSection}>
        <h2 className={styles.sectionTitle}>Landing Page Variations</h2>
        <p className={styles.sectionDescription}>
          Preview different landing page designs for A/B testing comparison
        </p>
        <div className={styles.landingGrid}>
          <Link to="/admin/landing-1" className={styles.landingCard}>
            <div className={styles.landingNumber}>1</div>
            <div className={styles.landingContent}>
              <h3>Refined Current</h3>
              <p>Enhanced animations & typography</p>
            </div>
          </Link>
          <Link to="/admin/landing-2" className={styles.landingCard}>
            <div className={styles.landingNumber}>2</div>
            <div className={styles.landingContent}>
              <h3>Emotional Narrative</h3>
              <p>Scroll-through story chapters</p>
            </div>
          </Link>
          <Link to="/admin/landing-3" className={styles.landingCard}>
            <div className={styles.landingNumber}>3</div>
            <div className={styles.landingContent}>
              <h3>Visual Gallery</h3>
              <p>Photo-forward masonry layout</p>
            </div>
          </Link>
          <Link to="/admin/landing-4" className={styles.landingCard}>
            <div className={styles.landingNumber}>4</div>
            <div className={styles.landingContent}>
              <h3>Apple Minimal</h3>
              <p>Ultra-clean whitespace design</p>
            </div>
          </Link>
          <Link to="/admin/landing-5" className={styles.landingCard}>
            <div className={styles.landingNumber}>5</div>
            <div className={styles.landingContent}>
              <h3>Bento Grid</h3>
              <p>Modern SaaS style</p>
            </div>
          </Link>
          <Link to="/admin/landing-6" className={styles.landingCard}>
            <div className={styles.landingNumber}>6</div>
            <div className={styles.landingContent}>
              <h3>Dark Premium</h3>
              <p>Glassmorphism & glows</p>
            </div>
          </Link>
          <Link to="/admin/landing-7" className={styles.landingCard}>
            <div className={styles.landingNumber}>7</div>
            <div className={styles.landingContent}>
              <h3>Split Screen</h3>
              <p>50/50 text & visual layout</p>
            </div>
          </Link>
          <Link to="/admin/landing-8" className={styles.landingCard}>
            <div className={styles.landingNumber}>8</div>
            <div className={styles.landingContent}>
              <h3>Social Proof</h3>
              <p>Community-focused design</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
