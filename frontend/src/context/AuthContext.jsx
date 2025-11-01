import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://ofs-sept25.vercel.app'

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Fetch user profile from our backend
        fetchUserProfile(session.access_token)
      } else {
        // Fallback: check for old JWT auth (for demo accounts)
        const storedUser = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        if (storedUser && token) {
          setUser(JSON.parse(storedUser))
        }
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.access_token)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (token) => {
    try {
      // Get Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(token)

      if (!supabaseUser) {
        setLoading(false)
        return
      }

      // Fetch profile from our backend
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        setUser(profileData)
      } else {
        // Profile doesn't exist yet - might be right after signup
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      // Try Supabase Auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Fallback to old auth for demo accounts
        return await loginLegacy(email, password)
      }

      if (data.session) {
        await fetchUserProfile(data.session.access_token)
        return { success: true }
      }

      return { success: false, error: 'Login failed' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const loginLegacy = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) throw new Error('Login failed')

      const data = await response.json()
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const register = async (email, password, username, displayName) => {
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) throw error

      if (data.session) {
        // Create profile in our database
        const profileResponse = await fetch(`${API_URL}/api/v1/auth/supabase/create-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            display_name: displayName || username,
            supabase_token: data.session.access_token
          })
        })

        if (!profileResponse.ok) {
          throw new Error('Failed to create profile')
        }

        const profile = await profileResponse.json()
        setUser(profile)
        return {
          success: true,
          message: 'Please check your email to verify your account'
        }
      }

      return {
        success: true,
        message: 'Please check your email to verify your account'
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut()

    // Clear legacy auth
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setUser(null)
    setSession(null)
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.'
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { success: true, message: 'Password updated successfully' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const getToken = () => {
    if (session) {
      return session.access_token
    }
    return localStorage.getItem('token')
  }

  const value = {
    user,
    session,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateUser,
    getToken,
    loading,
    isSupabaseAuth: !!session
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
