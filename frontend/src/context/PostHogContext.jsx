import { createContext, useContext, useEffect } from 'react'
import posthog from 'posthog-js'

const PostHogContext = createContext()

export function usePostHog() {
  return useContext(PostHogContext)
}

export function PostHogProvider({ children }) {
  useEffect(() => {
    // Read PostHog configuration from environment variables
    // Fallback to shared Bookmarker project key (public client key, safe to commit)
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_o34s8vv6TWjzDemdh39CAW8d4R52qFzVt2RZCnQEEKqx'
    const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

    // Only initialize PostHog if the key is provided
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        
        // Privacy settings - disable session recording
        disable_session_recording: true,
        
        // Mask all text and input fields for privacy
        mask_all_text: true,
        mask_all_element_attributes: true,
        
        // Capture minimal data
        capture_pageview: false, // We'll handle this manually with React Router
        capture_pageleave: false,
        
        // Respect user privacy
        respect_dnt: true,
        
        // Autocapture settings - disabled for privacy
        autocapture: false,
        capture_elementschain: false, // Don't capture element chains
        
        // Performance tracking
        capture_performance: true,
        
        // Feature flags - disabled as not needed
        disable_persistence: false,
        persistence: 'localStorage',
        
        // Advanced privacy
        property_blacklist: [
          '$current_url', // We'll send sanitized URLs
          '$screen_height',
          '$screen_width',
        ],
        
        // Bot filtering
        advanced_disable_decide: false, // Allow PostHog to identify bots
        
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

  // Track page views (called manually from route changes)
  const trackPageView = (path, properties = {}) => {
    if (!isEnabled()) return

    // Sanitize the path to remove any sensitive data
    const sanitizedPath = sanitizePath(path)
    
    posthog.capture('$pageview', {
      $current_url: sanitizedPath,
      ...properties,
    })
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

  // Helper to sanitize path - remove any IDs, usernames, or tokens
  const sanitizePath = (path) => {
    // Remove share tokens
    let sanitized = path.replace(/\/share\/[^/]+/g, '/share/:token')
    
    // Remove join tokens
    sanitized = sanitized.replace(/\/join\/[^/]+/g, '/join/:token')
    
    // Remove event IDs (numeric or slugs)
    sanitized = sanitized.replace(/\/event\/[^/]+/g, '/event/:id')
    
    // Remove usernames from profile paths
    sanitized = sanitized.replace(/\/profile\/[^/]+/g, '/profile/:username')
    
    // Remove tag profile IDs
    sanitized = sanitized.replace(/\/tag-profile\/[^/]+/g, '/tag-profile/:id')
    
    return sanitized
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
