import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import styles from './AdminDashboard.module.css'

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedProjects, setExpandedProjects] = useState({ landingRedesign: false })
  const [demoPassword, setDemoPassword] = useState('')
  const [demoSaving, setDemoSaving] = useState(false)
  const [demoMessage, setDemoMessage] = useState(null)
  const [demoInfo, setDemoInfo] = useState(null)

  // AI Model state
  const [aiModelData, setAiModelData] = useState(null)
  const [aiModelSaving, setAiModelSaving] = useState(false)
  const [aiModelMessage, setAiModelMessage] = useState(null)

  useEffect(() => {
    loadStats()
    loadDemoInfo()
    loadAIModel()
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

  async function loadDemoInfo() {
    try {
      const data = await apiService.getDemoAccountInfo()
      setDemoInfo(data)
    } catch (err) {
      console.error('Failed to load demo info:', err)
    }
  }

  async function loadAIModel() {
    try {
      const data = await apiService.getAIModelSetting()
      setAiModelData(data)
    } catch (err) {
      console.error('Failed to load AI model setting:', err)
    }
  }

  async function handleAIModelChange(modelId) {
    setAiModelSaving(true)
    setAiModelMessage(null)
    try {
      const result = await apiService.updateAIModelSetting(modelId)
      setAiModelMessage({ type: 'success', text: result.message })
      setAiModelData(prev => ({ ...prev, current_model: modelId }))
    } catch (err) {
      setAiModelMessage({ type: 'error', text: err.message || 'Failed to update' })
    } finally {
      setAiModelSaving(false)
    }
  }

  async function handleDemoPasswordUpdate(e) {
    e.preventDefault()
    if (!demoPassword.trim()) return
    setDemoSaving(true)
    setDemoMessage(null)
    try {
      await apiService.updateDemoPassword(demoPassword)
      setDemoMessage({ type: 'success', text: 'Demo password updated' })
      setDemoPassword('')
      loadDemoInfo()
    } catch (err) {
      setDemoMessage({ type: 'error', text: err.message || 'Failed to update' })
    } finally {
      setDemoSaving(false)
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
    { id: 9, name: 'Emotional Convert', desc: 'Heart-first anti-social-media pitch' },
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

      {/* Demo Account */}
      <section className={styles.linksSection}>
        <h2 className={styles.sectionTitle}>Demo Account</h2>
        <div className={styles.linkCard} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', cursor: 'default' }}>
          {demoInfo && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Username: <strong style={{ color: 'var(--text-primary)' }}>{demoInfo.username}</strong>
              {demoInfo.updated_at && (
                <span style={{ marginLeft: '16px' }}>
                  Last updated: {new Date(demoInfo.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          <form onSubmit={handleDemoPasswordUpdate} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={demoPassword}
              onChange={(e) => setDemoPassword(e.target.value)}
              placeholder="New demo password"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <button
              type="submit"
              disabled={demoSaving || !demoPassword.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#667eea',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: demoSaving || !demoPassword.trim() ? 0.5 : 1,
              }}
            >
              {demoSaving ? 'Saving...' : 'Update Password'}
            </button>
          </form>
          {demoMessage && (
            <div style={{
              fontSize: '13px',
              color: demoMessage.type === 'success' ? '#22c55e' : '#ef4444',
            }}>
              {demoMessage.text}
            </div>
          )}
        </div>
      </section>

      {/* AI Model Settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>AI Model</h2>
        <div className={styles.card}>
          {aiModelData ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '13px' }}>
                  Current AI model for story generation:
                </label>
                <select
                  value={aiModelData.current_model}
                  onChange={(e) => handleAIModelChange(e.target.value)}
                  disabled={aiModelSaving}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#ddd',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {aiModelData.available_models.map(model => (
                    <option
                      key={model.id}
                      value={model.id}
                      disabled={model.provider === 'openrouter' && !aiModelData.has_openrouter_key}
                    >
                      {model.name} ({model.provider}){model.provider === 'openrouter' && !aiModelData.has_openrouter_key ? ' - API key not set' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {!aiModelData.has_openrouter_key && (
                <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0' }}>
                  Set OPENROUTER_API_KEY in Vercel env vars to enable OpenRouter models.
                </p>
              )}
              {aiModelMessage && (
                <p style={{
                  fontSize: '13px',
                  marginTop: '8px',
                  color: aiModelMessage.type === 'success' ? '#22c55e' : '#ef4444'
                }}>
                  {aiModelMessage.text}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: '#888' }}>Loading AI model settings...</p>
          )}
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
                  <p>A/B test 9 different landing page variations</p>
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

          {/* Landing Page Social Proof Project */}
          <Link to="/admin/landing-9" className={styles.projectCardLink}>
            <div className={styles.projectInfo}>
              <span className={styles.projectIcon}>📸</span>
              <div>
                <h4>Landing Page Social Proof</h4>
                <p>Emotional, conversion-focused design with anti-social-media positioning</p>
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
