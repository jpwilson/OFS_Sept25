import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import styles from './AuthCallback.module.css'

function AuthCallback() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔵 AuthCallback: Starting...')

        // Get the session from the URL (Supabase auto-creates it on email verify)
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('🔴 getSession error:', error)
          throw error
        }

        if (session) {
          console.log('🟢 Session found! User:', session.user.email)

          const API_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:8000'
            : 'https://ofs-sept25.vercel.app'

          // Check if profile exists
          const profileResponse = await fetch(`${API_URL}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })

          if (!profileResponse.ok) {
            // Profile doesn't exist yet - create it
            const { data: { user: supabaseUser } } = await supabase.auth.getUser()
            const username = supabaseUser?.user_metadata?.username
            const displayName = supabaseUser?.user_metadata?.display_name
            const inviteToken = supabaseUser?.user_metadata?.invite_token

            if (!username) {
              throw new Error('Missing username in account data')
            }

            const createProfileResponse = await fetch(`${API_URL}/api/v1/auth/supabase/create-profile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username,
                display_name: displayName || username,
                supabase_token: session.access_token,
                invite_token: inviteToken
              })
            })

            if (!createProfileResponse.ok) {
              const errorData = await createProfileResponse.json()
              // If profile already exists, that's fine
              if (!errorData.detail?.includes('already')) {
                throw new Error(errorData.detail || 'Failed to create profile')
              }
            }

            console.log('🟢 Profile created successfully!')
          }

          // Sign them out so they can log in properly
          console.log('🔵 Signing out after email verification...')
          await supabase.auth.signOut()

          // Show success message
          setStatus('success')
        } else {
          // No session - might be expired or invalid link
          throw new Error('Verification link expired or invalid')
        }
      } catch (error) {
        console.error('🔴 Auth callback error:', error)
        setError(error.message)
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [])

  if (status === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconError}>✕</div>
          <h1>Verification Failed</h1>
          <p className={styles.message}>{error}</p>
          <Link to="/login" className={styles.button}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconSuccess}>✓</div>
          <h1>Email Verified!</h1>
          <p className={styles.message}>
            Your email has been successfully verified. You can now sign in to your account.
          </p>
          <Link to="/login" className={styles.button}>
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinner}></div>
        <h1>Verifying your email...</h1>
        <p className={styles.message}>Please wait while we confirm your account.</p>
      </div>
    </div>
  )
}

export default AuthCallback
