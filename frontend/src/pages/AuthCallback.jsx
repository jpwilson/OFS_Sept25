import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function AuthCallback() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session) {
          // Email confirmed! Now create profile if it doesn't exist
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
            // Profile doesn't exist yet - create it using metadata from Supabase
            const { data: { user: supabaseUser } } = await supabase.auth.getUser()

            const username = supabaseUser?.user_metadata?.username
            const displayName = supabaseUser?.user_metadata?.display_name

            if (!username) {
              // No username in metadata - something went wrong
              navigate('/login?error=missing_username')
              return
            }

            // Create the profile
            const createProfileResponse = await fetch(`${API_URL}/api/v1/auth/supabase/create-profile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username,
                display_name: displayName || username,
                supabase_token: session.access_token
              })
            })

            if (!createProfileResponse.ok) {
              const errorData = await createProfileResponse.json()
              throw new Error(errorData.detail || 'Failed to create profile')
            }

            // Profile created! Redirect to feed
            navigate('/feed')
          } else {
            // Profile exists - redirect to feed
            navigate('/feed')
          }
        } else {
          // No session - redirect to login
          navigate('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError(error.message)
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate, getToken])

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>Authentication Error</h1>
        <p>{error}</p>
        <p>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      <h1>Confirming your email...</h1>
      <p>Please wait while we set up your account.</p>
    </div>
  )
}

export default AuthCallback
