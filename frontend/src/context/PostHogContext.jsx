import { createContext, useContext, useEffect } from 'react'
import posthog from 'posthog-js'
import { POSTHOG_KEY, POSTHOG_HOST, posthogOptions } from '../config/posthogOptions.js'

const PostHogContext = createContext()

export function usePostHog() {
  return useContext(PostHogContext)
}

export function PostHogProvider({ children }) {
  useEffect(() => {
    // Read PostHog configuration from environment variables
    // Fallback to shared Bookmarker project key (public client key, safe to commit)
    // The options live in config/posthogOptions.js, shared with the landing page.
    const posthogKey = POSTHOG_KEY
    const posthogHost = POSTHOG_HOST

    // Only initialize PostHog if the key is provided
    if (posthogKey) {
      posthog.init(posthogKey, {
        ...posthogOptions(posthogHost),
        
        loaded: (posthog) => {
          // Register super property to distinguish app
          posthog.register({ app: 'ofs' })
          
          if (import.meta.env.DEV) {
            console.log('PostHog analytics initialized for Our Family Socials')
          }
        },
      })
    } else {
      if (import.meta.env.DEV) {
        console.log('PostHog analytics disabled (no API key provided)')
      }
    }

    return () => {
      // Cleanup on unmount
      if (posthogKey) {
        posthog.reset()
      }
    }
  }, [])

  // Helper to check if PostHog is enabled
  const isEnabled = () => {
    return posthog.__loaded
  }

  // Track page views (called manually from route changes). PostHog fills in
  // $current_url / $pathname itself; the before_send hook in config/posthogOptions.js
  // drops the query string and hash and masks tokens and ids in every URL property.
  const trackPageView = (_path, properties = {}) => {
    if (!isEnabled()) return
    posthog.capture('$pageview', { ...properties })
  }

  // Track custom events
  const trackEvent = (eventName, properties = {}) => {
    if (!isEnabled()) return
    
    // Sanitize properties to ensure no sensitive data
    const sanitizedProperties = sanitizeProperties(properties)
    
    posthog.capture(eventName, sanitizedProperties)
  }

  // Identify user (only with anonymous/internal ID, never email or name)
  const identifyUser = (userId) => {
    if (!isEnabled() || !userId) return
    
    // Only use the numeric user ID, never email, username, or name
    posthog.identify(`user_${userId}`)
  }

  // Reset user identity (on logout)
  const resetUser = () => {
    if (!isEnabled()) return
    posthog.reset()
  }

  // Helper to sanitize properties - remove any PII
  const sanitizeProperties = (properties) => {
    const sanitized = { ...properties }
    
    // Remove any fields that might contain PII
    const blockedKeys = [
      'email', 'name', 'username', 'display_name', 'displayName',
      'firstName', 'lastName', 'first_name', 'last_name',
      'phone', 'address', 'location', 'caption', 'content',
      'title', 'description', 'bio', 'about',
      'photo_url', 'image_url', 'avatar_url', 'media_url'
    ]
    
    blockedKeys.forEach(key => {
      delete sanitized[key]
    })
    
    return sanitized
  }

  const value = {
    isEnabled,
    trackPageView,
    trackEvent,
    identifyUser,
    resetUser,
  }

  return (
    <PostHogContext.Provider value={value}>
      {children}
    </PostHogContext.Provider>
  )
}

export default PostHogContext
