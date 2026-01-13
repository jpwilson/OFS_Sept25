import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : import.meta.env.VITE_API_URL || 'https://ofs-sept25.vercel.app'

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
        // Apply theme from user profile (fallback to localStorage, then dark)
        const theme = profileData.theme_preference || localStorage.getItem('theme') || 'dark'
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
      } else {
        // Profile doesn't exist yet - create it automatically
        // This happens when email confirmation is enabled and user just confirmed their email
        console.log('Profile not found, creating automatically...')

        // Get username, display_name, and invite_token from Supabase user metadata
        const username = supabaseUser.user_metadata?.username
        const displayName = supabaseUser.user_metadata?.display_name || username
        const inviteToken = supabaseUser.user_metadata?.invite_token

        if (!username) {
          console.error('No username in Supabase user metadata')
          setUser(null)
          setLoading(false)
          return
        }

        // Create profile
        try {
          const profileData = {
            username,
            display_name: displayName,
            supabase_token: token
          }
          // Include invite token if present
          if (inviteToken) {
            profileData.invite_token = inviteToken
          }

          const createResponse = await fetch(`${API_URL}/api/v1/auth/supabase/create-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData)
          })

          if (createResponse.ok) {
            const profile = await createResponse.json()
            setUser(profile)
            // Apply default theme for new users
            const theme = profile.theme_preference || localStorage.getItem('theme') || 'dark'
            document.documentElement.setAttribute('data-theme', theme)
            localStorage.setItem('theme', theme)
            console.log('Profile created successfully!')
          } else {
            const errorData = await createResponse.json()
            console.error('Failed to create profile:', errorData)
            setUser(null)
          }
        } catch (createError) {
          console.error('Error creating profile:', createError)
          setUser(null)
        }
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
        // Check if it's an email not confirmed error
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          return {
            success: false,
            error: 'Please verify your email before logging in. Check your inbox for the confirmation link.'
          }
        }

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

  const register = async (email, password, username, displayName, inviteToken = null) => {
    try {
      // Sign up with Supabase Auth, storing username/displayName in metadata
      const metadata = {
        username: username,
        display_name: displayName || username
      }
      // Store invite token in metadata if present
      if (inviteToken) {
        metadata.invite_token = inviteToken
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata
        }
      })

      if (error) throw error

      if (data.session) {
        // Email confirmation disabled - create profile immediately
        const profileData = {
          username,
          display_name: displayName || username,
          supabase_token: data.session.access_token
        }
        // Include invite token if present
        if (inviteToken) {
          profileData.invite_token = inviteToken
        }

        const profileResponse = await fetch(`${API_URL}/api/v1/auth/supabase/create-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData)
        })

        if (!profileResponse.ok) {
          throw new Error('Failed to create profile')
        }

        const profile = await profileResponse.json()
        setUser(profile)
        return {
          success: true,
          message: 'Account created successfully!'
        }
      }

      // Email confirmation enabled - profile will be created after email is confirmed
      return {
        success: true,
        message: 'Please check your email to verify your account. Check spam if you don\'t see it!'
      }
    } catch (error) {
      // Handle specific Supabase errors
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        return {
          success: false,
          error: 'This email is already registered. If you haven\'t verified your email yet, please check your inbox. Otherwise, try logging in.'
        }
      }
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

  // Subscription helper values (derived from user object)
  const subscriptionStatus = user?.subscription_status || 'trial'
  const subscriptionTier = user?.subscription_tier || 'free'
  const subscriptionStartedAt = user?.subscription_started_at ? new Date(user.subscription_started_at) : null
  const subscriptionEndsAt = user?.subscription_ends_at ? new Date(user.subscription_ends_at) : null
  const trialDaysRemaining = user?.trial_days_remaining ?? 30 // Default to 30 if not set
  const isWithinFirst5Days = user?.is_within_first_5_days || false
  // canAccessContent from backend, defaults to true for logged-in users
  const canAccessContent = user?.can_access_content ?? true
  // Trial is active if user has days remaining OR if trial was never started (legacy user)
  const hasTrialDates = user?.trial_end_date != null
  const isTrialActive = subscriptionStatus === 'trial' && (trialDaysRemaining > 0 || !hasTrialDates)
  // User is paid subscriber if active OR canceled (they still have access until period ends)
  const isPaidSubscriber = ['active', 'canceled'].includes(subscriptionStatus) && ['premium', 'family'].includes(subscriptionTier)
  // Subscription is set to cancel at end of period
  const isSubscriptionCanceled = subscriptionStatus === 'canceled' && ['premium', 'family'].includes(subscriptionTier)
  // Only expired if they HAD a trial and it's now over
  const isTrialExpired = subscriptionStatus === 'trial' && hasTrialDates && trialDaysRemaining <= 0

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
    isSupabaseAuth: !!session,
    // Subscription helpers
    subscriptionStatus,
    subscriptionTier,
    subscriptionStartedAt,
    subscriptionEndsAt,
    trialDaysRemaining,
    isWithinFirst5Days,
    canAccessContent,
    isTrialActive,
    isPaidSubscriber,
    isSubscriptionCanceled,
    isTrialExpired
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
