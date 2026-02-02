import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import styles from './AdminDashboard.module.css'

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedProjects, setExpandedProjects] = useState({ landingRedesign: true })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      const data = await apiService.getAdminStats()
      setStats(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load admin stats:', err)
      setError(`Failed to load statistics: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const landingVariations = [
    { id: 1, name: 'Refined Current', desc: 'Enhanced animations & typography' },
    { id: 2, name: 'Emotional Narrative', desc: 'Scroll-through story chapters' },
    { id: 3, name: 'Visual Gallery', desc: 'Photo-forward masonry layout' },
    { id: 4, name: 'Apple Minimal', desc: 'Ultra-clean whitespace design' },
    { id: 5, name: 'Bento Grid', desc: 'Modern SaaS style' },
    { id: 6, name: 'Dark Premium', desc: 'Glassmorphism & glows' },
    { id: 7, name: 'Split Screen', desc: '50/50 text & visual layout' },
    { id: 8, name: 'Social Proof', desc: 'Community-focused design' },
  ]

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Manage users, events, feedback, and projects</p>
      </header>

      {/* Stats Grid - Show even if loading with placeholder */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        {loading ? (
          <div className={styles.loading}>Loading statistics...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
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
              <div className={styles.statValue}>{stats?.new_feedback || 0}</div>
              <div className={styles.statLabel}>New Feedback</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🛡️</div>
              <div className={styles.statValue}>{stats?.superusers || 0}</div>
              <div className={styles.statLabel}>Superusers</div>
            </div>
          </div>
        )}
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

      {/* Projects Section */}
      <section className={styles.projectsSection}>
        <h2 className={styles.sectionTitle}>Projects</h2>

        {/* Current Projects */}
        <div className={styles.projectCategory}>
          <h3 className={styles.categoryTitle}>
            <span className={styles.categoryIcon}>🔄</span>
            Current
          </h3>

          {/* Landing Page Redesign Project */}
          <div className={styles.projectCard}>
            <button
              className={styles.projectHeader}
              onClick={() => toggleProject('landingRedesign')}
            >
              <div className={styles.projectInfo}>
                <span className={styles.projectIcon}>🎨</span>
                <div>
                  <h4>Landing Page Redesign</h4>
                  <p>A/B test 8 different landing page variations</p>
                </div>
              </div>
              <span className={`${styles.chevron} ${expandedProjects.landingRedesign ? styles.expanded : ''}`}>
                ▼
              </span>
            </button>

            {expandedProjects.landingRedesign && (
              <div className={styles.projectContent}>
                <div className={styles.variationsList}>
                  {landingVariations.map(v => (
                    <Link
                      key={v.id}
                      to={`/admin/landing-${v.id}`}
                      className={styles.variationItem}
                    >
                      <span className={styles.variationNumber}>{v.id}</span>
                      <div className={styles.variationInfo}>
                        <span className={styles.variationName}>{v.name}</span>
                        <span className={styles.variationDesc}>{v.desc}</span>
                      </div>
                      <span className={styles.variationArrow}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feed Card Design Project */}
          <Link to="/admin/design" className={styles.projectCardLink}>
            <div className={styles.projectInfo}>
              <span className={styles.projectIcon}>🖼️</span>
              <div>
                <h4>Feed Card Hover Effects</h4>
                <p>Preview 4 glass overlay variations for feed cards</p>
              </div>
            </div>
            <span className={styles.projectArrow}>→</span>
          </Link>
        </div>

        {/* Completed Projects */}
        <div className={styles.projectCategory}>
          <h3 className={styles.categoryTitle}>
            <span className={styles.categoryIcon}>✅</span>
            Completed
          </h3>
          <p className={styles.emptyState}>No completed projects yet</p>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
