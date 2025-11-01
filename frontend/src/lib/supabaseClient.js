import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vrquvdzoelvmwsxixqkt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXV2ZHpvZWx2bXdzeGl4cWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NjQwMjksImV4cCI6MjA3NzI0MDAyOX0.UnM51J58dpP8Cg20waSI2jw_hzu8sXvhgai8gLBQ0AI'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce' // Use PKCE flow for better security
  }
})

// Helper to get the current session
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Helper to get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
