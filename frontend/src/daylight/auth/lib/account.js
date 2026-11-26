// Membership: a Supabase user is a member once a users row exists (owner: AUTH).
// AUTH.md decision 4. Uses only endpoints that exist today.
//
//   resolveAccount() -> { state: 'member', user } | { state: 'needs-profile' }
//                     | { state: 'signed-out' } | { state: 'unreachable', error }
//   handleFree(handle, { signal }) -> true | false        GET /users/{handle}: 404 means free
//   findFreeHandle(handle, { name, signal }) -> the first free alternative, or null
//   createProfile({ handle, name, invite }) -> user        never creates twice
//   readInvite(token) -> validate-invite's answer          inviteLink() -> { token, invite_url }
//   legacyLogin(email, password) -> { access_token, user } (the old endpoint)
import { apiFetch, HttpError } from '../../lib/http.js'
import { supabase, currentSession } from './client.js'
import { alternatives, checkHandle } from './handle.js'

const NO_PROFILE = /profile not found/i

export async function resolveAccount() {
  try {
    const user = await apiFetch('/users/me')
    return { state: 'member', user }
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return NO_PROFILE.test(e.message) ? { state: 'needs-profile' } : { state: 'signed-out' }
    return { state: 'unreachable', error: e }
  }
}

export async function handleFree(handle, { signal } = {}) {
  if (checkHandle(handle)) return false
  try {
    await apiFetch(`/users/${encodeURIComponent(handle)}`, { auth: false, signal })
    return false
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return true
    throw e
  }
}

export async function findFreeHandle(handle, { name, signal } = {}) {
  for (const h of alternatives(handle, { name }).slice(0, 6)) {
    if (await handleFree(h, { signal })) return h
  }
  return null
}

export class ProfileError extends Error {
  constructor(code, extra = {}) {
    super(code)
    this.code = code
    Object.assign(this, extra)
  }
}

export async function createProfile({ handle, name, invite }) {
  const before = await resolveAccount()
  if (before.state === 'member') return before.user
  if (before.state === 'signed-out') throw new ProfileError('signed_out')
  if (before.state === 'unreachable') throw new ProfileError('network')
  const s = await currentSession()
  if (!s) throw new ProfileError('signed_out')
  let user
  try {
    user = await apiFetch('/auth/supabase/create-profile', {
      method: 'POST',
      auth: false,
      body: { username: handle, display_name: name, supabase_token: s.access_token, ...(invite ? { invite_token: invite } : {}) },
    })
  } catch (e) {
    // Re-check before saying anything: a retry after a lost answer must not fail.
    const again = await resolveAccount()
    if (again.state === 'member') user = again.user
    else if (e instanceof HttpError && e.status === 400) {
      const free = await handleFree(handle).catch(() => true)
      throw new ProfileError(free ? 'email_registered' : 'handle_taken')
    } else throw new ProfileError(e instanceof HttpError && e.status === 0 ? 'network' : 'unknown')
  }
  // The name shows everywhere only from full_name (PLAN-AUTH defect 5). Not fatal.
  if (name) await apiFetch('/users/me/profile', { method: 'PUT', body: { full_name: name } }).catch(() => null)
  // Tells AuthContext (USER_UPDATED) to load the new profile.
  await supabase.auth.updateUser({ data: { username: handle, display_name: name } }).catch(() => null)
  return user
}

export function readInvite(token) {
  return apiFetch(`/auth/validate-invite/${encodeURIComponent(token)}`, { auth: false })
}

export function inviteLink() {
  return apiFetch('/invitations/link', { method: 'POST' })
}

export function legacyLogin(email, password) {
  return apiFetch('/auth/login', { method: 'POST', auth: false, body: { email: email.trim(), password } })
}
