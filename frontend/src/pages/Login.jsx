import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import styles from './Login.module.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: ''
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

    if (isRegistering) {
      // Handle registration
      const result = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (result.ok) {
        const data = await result.json()
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        showToast('Account created successfully!', 'success')
        window.location.href = '/'
      } else {
        setError('Registration failed. Email or username may already exist.')
        showToast('Registration failed. Please try again.', 'error')
      }
    } else {
      // Handle login
      const result = await login(formData.email, formData.password)
      if (result.success) {
        showToast('Welcome back!', 'success')
        navigate('/')
      } else {
        setError('Invalid email or password')
        showToast('Invalid credentials. Please try again.', 'error')
      }
    }
  }

  // Demo accounts for easy testing
  const demoAccounts = [
    { email: 'sarah@example.com', password: 'password123', name: 'Sarah Wilson' },
    { email: 'michael@example.com', password: 'password123', name: 'Michael Chen' },
    { email: 'emma@example.com', password: 'password123', name: 'Emma Rodriguez' }
  ]

  const handleDemoLogin = (account) => {
    setFormData({
      email: account.email,
      password: account.password,
      username: '',
      full_name: ''
    })
    setIsRegistering(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          {isRegistering && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required={isRegistering}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
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
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className={styles.toggleSection}>
          <p>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {!isRegistering && (
          <div className={styles.demoSection}>
            <h3>Demo Accounts</h3>
            <p>Click to auto-fill:</p>
            <div className={styles.demoAccounts}>
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.demoButton}
                  onClick={() => handleDemoLogin(account)}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link to="/" className={styles.backLink}>
          ← Back to Feed
        </Link>
      </div>
    </div>
  )
}

export default Login