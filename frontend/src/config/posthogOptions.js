// PostHog initialisation options, shared by the app (context/PostHogContext.jsx) and the
// standalone landing (landing/lib/analytics.js). Edit in one place.
import { posthogBeforeSend } from './posthogPrivacy.js'

export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_o34s8vv6TWjzDemdh39CAW8d4R52qFzVt2RZCnQEEKqx'
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export function posthogOptions(posthogHost = POSTHOG_HOST) {
  return {
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
      '$screen_height',
      '$screen_width',
    ],

    // Every URL-like property ($current_url, $pathname, $referrer, $initial_*, ...)
    // loses its query string and hash, and token / id path segments are masked,
    // right before the event is sent. See config/posthogPrivacy.js.
    before_send: posthogBeforeSend,
    
    // Bot filtering
    advanced_disable_decide: false, // Allow PostHog to identify bots
  }
}
