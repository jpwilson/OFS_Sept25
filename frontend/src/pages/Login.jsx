import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import styles from './Login.module.css'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, resetPassword } = useAuth()
  const { showToast } = useToast()
  const [isRegistering, setIsRegistering] = useState(searchParams.get('signup') === 'true')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
        showToast(result.message || 'Account created! Please check your email to verify.', 'success', 0)
        // Clear form and switch to login mode
        setFormData({ email: '', password: '', username: '', displayName: '' })
        setIsRegistering(false)
        setError('') // Clear any errors
      } else {
        setError(result.error || 'Registration failed')
        showToast(result.error || 'Registration failed', 'error')
      }
    } else {
      // Handle login
      const result = await login(formData.email, formData.password)
      if (result.success) {
        showToast('Welcome back!', 'success')
        navigate('/feed')
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
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
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
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

export default Login
