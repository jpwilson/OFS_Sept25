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
        console.log('🔵 AuthCallback: Starting...')
        console.log('🔵 Current URL:', window.location.href)

        // Get the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔵 getSession result:', { session: !!session, error })

        if (error) {
          console.error('🔴 getSession error:', error)
          throw error
        }

        if (session) {
          console.log('🟢 Session found! User:', session.user.email)

          // Email confirmed! Now create profile if it doesn't exist
          const API_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:8000'
            : 'https://ofs-sept25.vercel.app'

          console.log('🔵 Using API URL:', API_URL)

          // Check if profile exists
          console.log('🔵 Checking if profile exists...')
          const profileResponse = await fetch(`${API_URL}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })

          console.log('🔵 Profile check response:', profileResponse.status)

          if (!profileResponse.ok) {
            console.log('🟡 Profile does not exist, creating...')

            // Profile doesn't exist yet - create it using metadata from Supabase
            const { data: { user: supabaseUser } } = await supabase.auth.getUser()
            console.log('🔵 Supabase user metadata:', supabaseUser?.user_metadata)

            const username = supabaseUser?.user_metadata?.username
            const displayName = supabaseUser?.user_metadata?.display_name

            console.log('🔵 Username from metadata:', username)
            console.log('🔵 Display name from metadata:', displayName)

            if (!username) {
              console.error('🔴 No username in metadata!')
              navigate('/login?error=missing_username')
              return
            }

            // Create the profile
            console.log('🔵 Calling create-profile API...')
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

            console.log('🔵 Create profile response:', createProfileResponse.status)

            if (!createProfileResponse.ok) {
              const errorData = await createProfileResponse.json()
              console.error('🔴 Create profile error:', errorData)

              // If profile already exists, that's fine - just redirect
              if (errorData.detail?.includes('already exists') || errorData.detail?.includes('Username already taken')) {
                console.log('🟡 Profile already exists, redirecting to feed')
                navigate('/feed')
                return
              }

              throw new Error(errorData.detail || 'Failed to create profile')
            }

            console.log('🟢 Profile created successfully!')
            // Profile created! Redirect to feed
            navigate('/feed')
          } else {
            console.log('🟢 Profile already exists, redirecting to feed')
            // Profile exists - redirect to feed
            navigate('/feed')
          }
        } else {
          console.log('🔴 No session found, redirecting to login')
          // No session - redirect to login
          navigate('/login')
        }
      } catch (error) {
        console.error('🔴 Auth callback error:', error)
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
