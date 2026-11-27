import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabaseClient'
import styles from './Login.module.css'

function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword, resetPassword } = useAuth()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSession, setHasSession] = useState(null) // null until the client has initialised
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)

  // getSession waits for the Supabase client to finish initialising, which includes
  // exchanging the ?code from the emailed link (PKCE) for a session.
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setHasSession(!!session)
    })
    return () => { active = false }
  }, [])

  const handleRequestLink = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    const result = await resetPassword(email)
    setIsSubmitting(false)
    if (result.success) {
      setLinkSent(true)
      showToast('Password reset email sent! Check your inbox.', 'success')
    } else {
      setError(result.error || 'Failed to send reset email')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updatePassword(password)
      if (result.success) {
        showToast('Password updated! Welcome back!', 'success')
        navigate('/feed', { replace: true })
      } else {
        setError(result.error || 'Failed to update password')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>Our Family Socials</Link>
      </div>

      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Set New Password</h1>

        {hasSession === null && (
          <div className={styles.toggleSection}>Checking your reset link...</div>
        )}

        {hasSession === false && (linkSent ? (
          <div className={styles.toggleSection}>
            We've sent a new reset link to {email}. Open it in this browser to choose your new password.
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleRequestLink}>
            <p className={styles.error}>
              This reset link has expired or was opened in a different browser.
              Enter your email and we'll send you a fresh link.
            </p>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="Enter your email"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send New Reset Link'}
            </button>
          </form>
        ))}

        {hasSession && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter new password"
              autoFocus
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
