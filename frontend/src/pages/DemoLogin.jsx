import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import styles from './Login.module.css'

function DemoLogin() {
  const navigate = useNavigate()
  const { demoLogin } = useAuth()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await demoLogin(password)
    if (result.success) {
      showToast('Welcome to the demo!', 'success')
      navigate('/feed')
    } else {
      setError(result.error || 'Incorrect password')
    }
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>
          Our Family Socials
        </Link>
      </div>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Investor Demo</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            Enter the demo password to preview the app
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="password">Demo Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Enter password"
              required
              autoFocus
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Entering...' : 'Enter Demo'}
          </button>
        </form>

        <Link to="/login?signup=true" className={styles.backLink}>
          ← Back to Sign Up
        </Link>
      </div>
    </div>
  )
}

export default DemoLogin
