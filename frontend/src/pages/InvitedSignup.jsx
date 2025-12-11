import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './InvitedSignup.module.css'

export default function InvitedSignup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register, user } = useAuth()
  const { showToast } = useToast()

  const inviteToken = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  // Validate invite token
  useEffect(() => {
    if (!inviteToken) {
      setError('No invitation token provided')
      setLoading(false)
      return
    }

    validateInvite()
  }, [inviteToken])

  async function validateInvite() {
    try {
      const data = await apiService.validateInviteToken(inviteToken)
      setInviteData(data)
      // Pre-fill email from invitation
      if (data.invited_email) {
        setFormData(prev => ({ ...prev, email: data.invited_email }))
      }
      // Pre-fill display name if available
      if (data.invited_name) {
        setFormData(prev => ({ ...prev, displayName: data.invited_name }))
      }
    } catch (err) {
      console.error('Invalid invite token:', err)
      setError('This invitation link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.username,
        formData.displayName,
        inviteToken
      )

      if (result.success) {
        showToast(result.message || 'Account created! Please check your email to verify.', 'success', 0)
        navigate('/login')
      } else {
        setError(result.error || 'Registration failed')
        showToast(result.error || 'Registration failed', 'error')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Validating invitation...</div>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>!</div>
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <Link to="/login?signup=true" className={styles.linkButton}>
            Sign up without invitation
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>
          Our Family Socials
        </Link>
      </div>

      <div className={styles.formWrapper}>
        <div className={styles.inviteBanner}>
          <div className={styles.inviteIcon}>
            <span className={styles.inviteEmoji}>!</span>
          </div>
          <h2>You've been invited!</h2>
          <p>
            <strong>@{inviteData?.inviter_username}</strong> invited you to join Our Family Socials
          </p>
        </div>

        <div className={styles.trialInfo}>
          <h3>What you'll get:</h3>
          <ul>
            <li>30-day free trial with full access</li>
            <li>See {inviteData?.inviter_display_name || inviteData?.inviter_username}'s family events</li>
            <li>Upgrade anytime for unlimited features</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="username">Username (@handle)</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="yourhandle"
              required
              pattern="[a-zA-Z0-9_]+"
              title="Username can only contain letters, numbers, and underscores"
            />
            <small>Your permanent @handle (cannot be changed later)</small>
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
            <small>How your name appears (can be changed anytime)</small>
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
              placeholder="..........."
              required
              minLength={6}
            />
            <small>Minimum 6 characters</small>
          </div>

          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Join Our Family Socials'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
