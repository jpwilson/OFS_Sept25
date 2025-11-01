import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import styles from './Login.module.css'

function Login() {
  const navigate = useNavigate()
  const { login, register, resetPassword } = useAuth()
  const { showToast } = useToast()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isResettingPassword) {
      // Handle password reset
      const result = await resetPassword(formData.email)
      if (result.success) {
        showToast(result.message, 'success')
        setIsResettingPassword(false)
        setFormData({ ...formData, password: '' })
      } else {
        setError(result.error || 'Failed to send reset email')
        showToast('Failed to send reset email', 'error')
      }
      return
    }

    if (isRegistering) {
      // Handle registration with Supabase Auth
      const result = await register(
        formData.email,
        formData.password,
        formData.username,
        formData.displayName
      )

      if (result.success) {
        showToast(result.message || 'Account created! Please check your email to verify.', 'success')
        // Don't auto-navigate - wait for email verification
      } else {
        setError(result.error || 'Registration failed')
        showToast(result.error || 'Registration failed', 'error')
      }
    } else {
      // Handle login
      const result = await login(formData.email, formData.password)
      if (result.success) {
        showToast('Welcome back!', 'success')
        navigate('/')
      } else {
        setError(result.error || 'Invalid email or password')
        showToast('Invalid credentials', 'error')
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>
          Our Family Socials
        </Link>
      </div>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>
          {isResettingPassword ? 'Reset Password' : isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          {isRegistering && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username (@handle)</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="yourhandle"
                  required={isRegistering}
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
            </>
          )}

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

          {!isResettingPassword && (
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
              />
              {isRegistering && <small>Minimum 6 characters</small>}
            </div>
          )}

          <button type="submit" className={styles.submitButton}>
            {isResettingPassword ? 'Send Reset Link' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className={styles.toggleSection}>
          {isResettingPassword ? (
            <p>
              Remember your password?
              <button
                type="button"
                className={styles.toggleButton}
                onClick={() => {
                  setIsResettingPassword(false)
                  setError('')
                }}
              >
                Sign In
              </button>
            </p>
          ) : (
            <>
              <p>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => {
                    setIsRegistering(!isRegistering)
                    setError('')
                  }}
                >
                  {isRegistering ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
              {!isRegistering && (
                <p>
                  Forgot your password?
                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => {
                      setIsResettingPassword(true)
                      setError('')
                    }}
                  >
                    Reset Password
                  </button>
                </p>
              )}
            </>
          )}
        </div>

        <Link to="/" className={styles.backLink}>
          ← Back to Feed
        </Link>
      </div>
    </div>
  )
}

export default Login
