import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './InviteLanding.module.css'

// Category icons matching the app
const CATEGORY_ICONS = {
  'Birthday': '🎂',
  'Anniversary': '💝',
  'Vacation': '✈️',
  'Family Gathering': '👨‍👩‍👧‍👦',
  'Holiday': '🎄',
  'Project': '🛠️',
  'Daily Life': '☕',
  'Milestone': '🏆'
}

export default function InviteLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, register } = useAuth()
  const { showToast } = useToast()
  const formRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, redirect to feed
  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  // Validate invite token
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setLoading(false)
      return
    }
    validateInvite()
  }, [token])

  async function validateInvite() {
    try {
      const data = await apiService.validateInviteToken(token)
      if (!data.valid) {
        setError(data.message || 'Invalid invitation')
      } else {
        setInviteData(data)
        // Pre-fill email if provided
        if (data.invited_email) {
          setFormData(prev => ({ ...prev, email: data.invited_email }))
        }
        if (data.invited_name) {
          setFormData(prev => ({ ...prev, displayName: data.invited_name }))
        }
      }
    } catch (err) {
      console.error('Failed to validate invite:', err)
      setError('Failed to validate invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleJoinClick() {
    setShowForm(true)
    // Scroll to form after it renders
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.username,
        formData.displayName,
        token
      )

      if (result.success) {
        showToast(result.message || 'Account created! Please check your email to verify.', 'success', 0)
        navigate('/login')
      } else {
        showToast(result.error || 'Registration failed', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>!</div>
          <h2>Invitation Not Found</h2>
          <p>{error}</p>
          <Link to="/login?signup=true" className={styles.linkButton}>
            Sign up for Our Family Socials
          </Link>
        </div>
      </div>
    )
  }

  const inviter = inviteData?.inviter || {}
  const recentEvents = inviteData?.recent_events || []
  const inviterName = inviter.display_name || inviter.username || 'Someone'

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>Our Family Socials</Link>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.inviterCard}>
          <div className={styles.avatarWrapper}>
            {inviter.avatar_url ? (
              <img src={inviter.avatar_url} alt={inviterName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {inviterName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className={styles.headline}>
            <span className={styles.inviterName}>{inviterName}</span>
            <span className={styles.inviteText}>invited you to join their Family Socials page</span>
          </h1>

          {inviter.bio && (
            <div className={styles.bioSection}>
              <span className={styles.bioLabel}>{inviterName}'s bio:</span>
              <blockquote className={styles.bio}>
                "{inviter.bio}"
              </blockquote>
            </div>
          )}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{inviter.event_count || 0}</span>
              <span className={styles.statLabel}>Events</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{inviter.follower_count || 0}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Events Preview Section */}
      {recentEvents.length > 0 && (
        <section className={styles.eventsSection}>
          <h2 className={styles.sectionTitle}>
            See what {inviterName} is sharing
          </h2>
          <div className={styles.eventsGrid}>
            {recentEvents.map(event => (
              <div key={event.id} className={styles.eventCard}>
                <div
                  className={styles.eventImage}
                  style={{ backgroundImage: event.cover_image_url ? `url(${event.cover_image_url})` : 'none' }}
                >
                  {!event.cover_image_url && (
                    <div className={styles.eventPlaceholder}>
                      {CATEGORY_ICONS[event.category] || '📅'}
                    </div>
                  )}
                  <div className={styles.eventOverlay}>
                    <span className={styles.eventCategory}>
                      {CATEGORY_ICONS[event.category] || '📅'}
                    </span>
                  </div>
                </div>
                <div className={styles.eventInfo}>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDate}>{formatDate(event.start_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Value Proposition Section */}
      <section className={styles.valueSection}>
        <h2 className={styles.sectionTitle}>
          Why families love Our Family Socials
        </h2>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🔒</span>
            <div>
              <h3>Private & Ad-Free</h3>
              <p>Just family, no algorithms, no ads, no data selling</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📖</span>
            <div>
              <h3>Rich Event Stories</h3>
              <p>Share photos, locations, and memories beautifully</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🗺️</span>
            <div>
              <h3>Maps & Timeline</h3>
              <p>See where your family has been on an interactive map</p>
            </div>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎁</span>
            <div>
              <h3>30-Day Free Trial</h3>
              <p>Try everything free, no credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        {!showForm ? (
          <>
            <button className={styles.ctaButton} onClick={handleJoinClick}>
              Join {inviterName}'s Family Circle
            </button>
            <p className={styles.ctaSubtext}>
              Already have an account? <Link to="/login" className={styles.signInLink}>Sign in</Link>
            </p>
          </>
        ) : (
          <div className={styles.formSection} ref={formRef}>
            <h2 className={styles.formTitle}>Create Your Account</h2>
            <p className={styles.formSubtitle}>
              Join {inviterName} and start sharing family memories
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>@</span>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="yourname"
                    required
                    pattern="[a-zA-Z0-9_]+"
                    title="Letters, numbers, and underscores only"
                  />
                </div>
                <small>Your unique handle (can't be changed later)</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Your Name"
                />
                <small>How you'll appear to family (can be changed)</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Create Account & Join'}
              </button>

              <p className={styles.terms}>
                By signing up, you agree to our{' '}
                <Link to="/terms">Terms of Service</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>
              </p>
            </form>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; 2024 Our Family Socials. Made with love for families everywhere.</p>
      </footer>
    </div>
  )
}
