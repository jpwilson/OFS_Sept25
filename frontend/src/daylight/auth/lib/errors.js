// Error codes to the line a person reads (owner: AUTH). PLAN-AUTH section 4. Matched on the
// error's code, as Supabase advises, never on its message. Logs nothing.
//
//   errorCode(error) -> 'invalid_credentials' | ... | 'network' | 'unknown'
//   messageFor(errorOrCode) -> { code, line, action?: 'resend'|'fresh-link'|'contact', field?: 'email'|'password' }

const LINES = {
  invalid_credentials: { line: "That email and password don't match. Try again, or get a new password.", field: 'password' },
  email_not_confirmed: { line: 'Confirm your email to finish. We can send the link again.', action: 'resend' },
  provider_email_needs_verification: { line: 'Check your inbox to confirm your email with Google, then come back and continue.' },
  access_denied: { line: "Google sign-in closed before it finished. Go again whenever you're ready." },
  rate_limited: { line: "That's a lot of tries in a short time. Give it a minute, then go again." },
  weak_password: { line: 'Make it 8 characters or more.', field: 'password' },
  same_password: { line: "Pick one you haven't used here before.", field: 'password' },
  fresh_link: { line: "That link has done its job or timed out. Let's get you a fresh one.", action: 'fresh-link' },
  user_banned: { line: "This account is paused. Get in touch and we'll sort it out together.", action: 'contact' },
  email_address_invalid: { line: 'Check the email address and go again.', field: 'email' },
  google_failed: { line: "Google couldn't finish signing you in. Go again, or use your email." },
  network: { line: "We couldn't reach Our Family Socials. Check your connection and go again." },
  unknown: { line: "That didn't go through. Go again in a moment." },
}

const ALIASES = {
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  over_sms_send_rate_limit: 'rate_limited',
  otp_expired: 'fresh_link',
  flow_state_expired: 'fresh_link',
  flow_state_not_found: 'fresh_link',
  bad_code_verifier: 'fresh_link',
  no_verifier: 'fresh_link',
  validation_failed: 'email_address_invalid',
  unexpected_failure: 'google_failed',
  server_error: 'google_failed',
  temporarily_unavailable: 'google_failed',
  bad_oauth_callback: 'google_failed',
  bad_oauth_state: 'google_failed',
  provider_disabled: 'google_failed',
}

/** The code of a Supabase AuthError, an HttpError, a URL error code, or a plain string. */
export function errorCode(e) {
  if (!e) return 'unknown'
  if (typeof e === 'string') return e
  if (e.code && typeof e.code === 'string') return e.code
  if (e.details?.code && e.details.code !== 'unspecified_code') return e.details.code
  if (e.status === 429) return 'over_request_rate_limit'
  if (e.status === 0 || e.name === 'AuthRetryableFetchError' || e.name === 'TypeError') return 'network'
  return 'unknown'
}

export function messageFor(e) {
  const code = errorCode(e)
  const key = LINES[code] ? code : ALIASES[code] || 'unknown'
  return { code, ...LINES[key] }
}

/** Codes that mean "this link or flow is spent": show the fresh-link screen. */
export function isFreshLink(e) {
  return messageFor(e).action === 'fresh-link'
}
