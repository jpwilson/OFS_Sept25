// The one door to Supabase Auth for the new pages (owner: AUTH). AUTH.md decisions 3, 9, 10.
// Every call returns { data, error } as auth-js does and never throws for an auth failure.
// Nothing here logs a token, a code, a password or an address.
import { supabase } from '../../../lib/supabaseClient.js'

export { supabase }

const origin = () => window.location.origin
export const CALLBACK_PATH = '/auth/callback'
export const RESET_PATH = '/reset-password'

/** Wait for the client's start-up, which exchanges a ?code= by itself. Returns its error, if any. */
export async function ready() {
  try {
    const r = await supabase.auth.initialize()
    return r?.error || null
  } catch (e) {
    return e
  }
}

export async function currentSession() {
  await ready()
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

/** Synchronous: is a session (or a legacy token) stored in this browser? Decides whether the
 * sign-in page paints the form at once or first checks who is here. */
export function hasStoredSession() {
  try {
    return !!(localStorage.getItem(supabase.auth.storageKey) || (localStorage.getItem('token') && localStorage.getItem('user')))
  } catch {
    return false
  }
}

/** True while this browser holds a PKCE verifier (a Google or email flow started here). */
export function hasVerifier() {
  try {
    return !!localStorage.getItem(`${supabase.auth.storageKey}-code-verifier`)
  } catch {
    return false
  }
}

/** Leaves for Google (through Supabase). redirectTo never carries a query string. */
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: origin() + CALLBACK_PATH, queryParams: { prompt: 'select_account' } },
  })
}

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password })
}

export function signUpWithEmail(email, password, { invite } = {}) {
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: origin() + CALLBACK_PATH, data: invite ? { invite_token: invite } : {} },
  })
}

export function resendConfirmation(email) {
  return supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: origin() + CALLBACK_PATH } })
}

export function sendPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin() + RESET_PATH })
}

/** A go-live template link: ?token_hash=…&type=email|recovery. Works on any device. */
export function verifyTokenHash(tokenHash, type) {
  return supabase.auth.verifyOtp({ token_hash: tokenHash, type })
}

export function setPassword(password) {
  return supabase.auth.updateUser({ password })
}

/** Signs out this browser only (AUTH.md decision 9): the phone stays signed in. Pass
 * AuthContext's logout to clear its state and the legacy keys afterwards; with no session
 * left, its own global sign-out has nothing to send. */
export async function signOutHere(logout) {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    /* already signed out */
  }
  if (logout) await logout()
}

/** The legacy password check, for accounts made before Supabase (PLAN-AUTH section 9, item 4).
 * One constant turns it off once the owner's count of such accounts is zero. */
export const LEGACY_FALLBACK = true
