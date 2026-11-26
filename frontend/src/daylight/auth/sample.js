// The stub sign-in for sample mode (owner: AUTH). docs/app/AUTH.md, PLAN-AUTH section 6.
// Pure ESM (no Node or browser globals beyond WebCrypto), loaded by dev/sampleApi.js.
//
// It lets the real Supabase client run end to end against the sample server:
//   /__sb/auth/v1/authorize     a plainly labelled stand-in for Google's account chooser
//   /__sb/auth/v1/__choose      the persona picked there: a ?code= back to redirect_to, or
//                               Google's error parameters
//   /__sb/auth/v1/token         grant_type=pkce (checks the verifier against the challenge),
//                               password and refresh_token
//   /__sb/auth/v1/signup, /resend, /recover   write to the stub inbox instead of sending
//   /__sb/auth/v1/verify        GET: the link in an email (confirms, then ?code= back);
//                               POST: token_hash links (the go-live email templates)
//   /__sb/auth/v1/user          GET and PUT (password, metadata)
//   /__fx/inbox                 the stub inbox: every confirmation and reset link
// and, on the API side, a session with no profile (401 "User profile not found"), handle
// lookups, create-profile, the profile name, invitations and the legacy and demo logins.
//
// Accounts: every cast member is <key>@example.test with the password "sample-password".
// Special addresses: paused@example.test (account paused), busy@example.test (rate limited),
// legacy@example.test (has an old-style account: create-profile refuses the address).
// Nothing here is a real credential, and nothing is sent anywhere.

const PASSWORD = 'sample-password'
const LINK_LIFE_MS = 60 * 60 * 1000
const CODE_LIFE_MS = 5 * 60 * 1000
const RESEND_GAP_MS = 60 * 1000
const FAR = 4102444800 // 2100-01-01: stub sessions never expire

// The stand-in Google chooser's people. `member` signs in as Maya (an existing member);
// the others are new to Our Family Socials.
const PERSONAS = {
  member: { label: 'Maya Hartley', email: 'maya@example.test', note: 'Already a member: goes straight to her stories' },
  new: { label: 'Alex Rivera', email: 'alex.rivera@example.test', note: 'New here: meets the first-run step' },
  taken: { label: 'Sam Okafor', email: 'sam.okafor@example.test', note: 'New here, and @sam is already taken' },
  legacy: { label: 'Lee Old', email: 'legacy@example.test', note: 'Has an old-style account with this address' },
  unverified: { label: 'Pat Morgan', email: 'pat.morgan@example.test', note: 'Google has not verified this address' },
  cancel: { label: 'Close the window', note: 'As if you closed Google before finishing' },
  error: { label: 'Google answers with an error', note: 'As if Google could not finish' },
}

const uidOf = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const json = (status, body) => ({ status, json: body })
const sbErr = (status, code, msg) => ({ status, json: { code, error_code: code, msg, message: msg } })
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const now = () => Date.now()
const bearer = (h) => (String(h || '').match(/^Bearer\s+(.+)$/i) || [])[1] || null

function auth(st) {
  if (st.auth) return st.auth
  const accounts = {}
  for (const [key, u] of Object.entries(st.db.users)) {
    const email = `${key}@example.test`
    accounts[email] = { uid: uidOf(u.id), email, password: PASSWORD, confirmed: true, profile: key, providers: ['email'], meta: {} }
  }
  accounts['paused@example.test'] = { uid: uidOf(9001), email: 'paused@example.test', password: PASSWORD, confirmed: true, profile: null, providers: ['email'], meta: {}, paused: true }
  accounts['busy@example.test'] = { uid: uidOf(9002), email: 'busy@example.test', password: PASSWORD, confirmed: true, profile: null, providers: ['email'], meta: {}, busy: true }
  st.auth = { accounts, codes: {}, tokens: {}, links: {}, inbox: [], sent: {}, seq: 1, nextUid: 9100, nextUserId: 1000 }
  return st.auth
}

function rand(a) {
  const n = a.seq++
  let x = (n * 2654435761) >>> 0
  return `${n.toString(36)}${x.toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`
}

function userJson(acct) {
  const google = acct.providers.includes('google')
  return {
    id: acct.uid,
    aud: 'authenticated',
    role: 'authenticated',
    email: acct.email,
    email_confirmed_at: acct.confirmed ? '2026-11-26T12:00:00Z' : null,
    confirmed_at: acct.confirmed ? '2026-11-26T12:00:00Z' : null,
    app_metadata: { provider: acct.providers[0], providers: acct.providers },
    user_metadata: { ...(google ? { full_name: acct.name, name: acct.name, email: acct.email, email_verified: true } : {}), ...acct.meta },
    identities: acct.providers.map((p) => ({ provider: p, identity_id: `${acct.uid}-${p}`, user_id: acct.uid })),
    created_at: '2026-11-26T12:00:00Z',
  }
}

function session(a, acct) {
  const access = `sample.${acct.uid}.${rand(a)}`
  a.tokens[access] = acct.email
  a.tokens[`r-${access}`] = acct.email
  return { access_token: access, token_type: 'bearer', expires_in: FAR - Math.floor(now() / 1000), expires_at: FAR, refresh_token: `r-${access}`, user: userJson(acct) }
}

const acctOfToken = (a, tok) => (tok && a.tokens[tok] ? a.accounts[a.tokens[tok]] : null)

async function challengeOf(verifier, method) {
  if (method === 'plain') return verifier
  const bytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function withParams(url, params, { hash = false } = {}) {
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) (hash ? null : u.searchParams.set(k, v))
  if (hash) u.hash = new URLSearchParams(params).toString()
  return u.toString()
}

/** redirect_to must be this origin; anything else falls back to the site (as Supabase does). */
function allowedRedirect(st, to, fallbackPath = '/') {
  try {
    const u = new URL(to)
    if (u.origin === st.origin && !u.search) return u.toString()
  } catch {}
  return `${st.origin}${fallbackPath}`
}

function newCode(a, acct, challenge, method, kind) {
  const code = rand(a)
  a.codes[code] = { email: acct.email, challenge, method: method || 's256', kind, at: now() }
  return code
}

function mail(st, acct, kind, redirectTo, challenge, method) {
  const a = auth(st)
  const token = rand(a)
  const hash = rand(a)
  a.links[token] = { email: acct.email, kind, redirectTo, challenge, method, at: now(), hash }
  a.links[`h:${hash}`] = { email: acct.email, kind, at: now() }
  const verify = `${st.origin}/__sb/auth/v1/verify?token=${token}&type=${kind === 'recovery' ? 'recovery' : 'signup'}&redirect_to=${encodeURIComponent(redirectTo)}`
  const hashLink = kind === 'recovery' ? `${st.origin}/reset-password?token_hash=${hash}&type=recovery` : `${st.origin}/auth/callback?token_hash=${hash}&type=email`
  a.inbox.unshift({ id: a.seq++, to: acct.email, kind, verify, hashLink, at: new Date().toISOString() })
  a.inbox.length = Math.min(a.inbox.length, 40)
}

function tooSoon(a, email, kind) {
  const k = `${kind}:${email}`
  const last = a.sent[k] || 0
  if (now() - last < RESEND_GAP_MS) return true
  a.sent[k] = now()
  return false
}

function ensurePersona(a, key) {
  const p = PERSONAS[key]
  if (!p?.email) return null
  if (!a.accounts[p.email]) {
    a.accounts[p.email] = { uid: uidOf(a.nextUid++), email: p.email, password: null, confirmed: key !== 'unverified', profile: null, providers: ['google'], meta: {}, name: p.label, legacy: key === 'legacy' }
  }
  const acct = a.accounts[p.email]
  if (!acct.providers.includes('google')) acct.providers.push('google') // linked by address, as Supabase does
  acct.name = acct.name || p.label
  return acct
}

// ------------------------------------------------------------------ the stand-in chooser
function chooserPage(query) {
  const keep = { redirect_to: query.redirect_to || '', code_challenge: query.code_challenge || '', code_challenge_method: query.code_challenge_method || '' }
  const link = (persona) => `/__sb/auth/v1/__choose?${new URLSearchParams({ ...keep, persona })}`
  const rows = Object.entries(PERSONAS)
    .map(([k, p]) => `<a class="row${p.email ? '' : ' quiet'}" href="${esc(link(k))}" data-persona="${k}"><span class="dot">${esc((p.label || '?')[0])}</span><span><b>${esc(p.label)}</b>${p.email ? `<i>${esc(p.email)}</i>` : ''}<small>${esc(p.note)}</small></span></a>`)
    .join('')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Sample sign-in (stand-in for Google)</title>
<style>
body{margin:0;font:16px/1.45 system-ui,-apple-system,sans-serif;background:#eef1f5;color:#1f2328}
main{max-width:440px;margin:0 auto;padding:20px 16px 40px}
.tag{display:inline-block;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;background:#ffd43b;color:#101b3b;padding:6px 8px;border-radius:6px}
h1{font-size:22px;margin:14px 0 4px}p{margin:0 0 16px;color:#57606a;font-size:14px}
.card{background:#fff;border:1px solid #d0d7de;border-radius:12px;overflow:hidden}
.row{display:flex;gap:12px;align-items:center;padding:12px 14px;border-top:1px solid #eaeef2;color:inherit;text-decoration:none;min-height:44px}
.row:first-child{border-top:0}.row:hover,.row:focus{background:#f6f8fa;outline:none}.row:focus-visible{box-shadow:inset 0 0 0 3px #0969da}
.row span:last-child{display:flex;flex-direction:column}.row i{font-style:normal;font-size:14px;color:#57606a}.row small{font-size:12.5px;color:#6e7781}
.dot{flex:none;width:36px;height:36px;border-radius:50%;background:#dbe4ee;display:grid;place-items:center;font-weight:700}
.quiet .dot{background:#f3f4f6}
</style>
<main>
<span class="tag">Sample sign-in · not Google</span>
<h1>Choose an account</h1>
<p>This page stands in for Google's account chooser while the app runs against the sample server. No Google account is used and nothing leaves this computer.</p>
<div class="card" data-ui="stub-chooser">${rows}</div>
</main></html>`
}

// ------------------------------------------------------------------ the stub inbox
function inboxPage(st, query) {
  const a = auth(st)
  if (query.go) {
    const m = a.inbox.find((x) => (!query.kind || x.kind === query.kind) && (!query.to || x.to === query.to))
    if (!m) return { html: '<!doctype html><meta charset="utf-8"><p>No email yet.</p>', status: 404 }
    return { redirect: query.go === 'hash' ? m.hashLink : m.verify }
  }
  const rows = a.inbox.length
    ? a.inbox
        .map((m) => `<article data-kind="${m.kind}" data-to="${esc(m.to)}"><h2>${m.kind === 'recovery' ? 'Choose a new password' : 'Confirm your email'}</h2><p>To ${esc(m.to)} · ${esc(m.at.slice(11, 19))} UTC</p>
<a class="btn" href="${esc(m.verify)}" data-link="verify">${m.kind === 'recovery' ? 'Reset password' : 'Confirm my email'}</a>
<a class="alt" href="${esc(m.hashLink)}" data-link="hash">Same email with the go-live template (token_hash link)</a></article>`)
        .join('')
    : '<p>No emails yet. Sign up or ask for a new password, then come back.</p>'
  return {
    html: `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sample inbox</title>
<style>body{margin:0;font:16px/1.45 system-ui,sans-serif;background:#eef1f5;color:#1f2328}main{max-width:560px;margin:0 auto;padding:20px 16px 40px}
.tag{display:inline-block;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;background:#ffd43b;color:#101b3b;padding:6px 8px;border-radius:6px}
article{background:#fff;border:1px solid #d0d7de;border-radius:12px;padding:16px;margin:12px 0}h2{font-size:18px;margin:0}p{margin:4px 0 12px;color:#57606a;font-size:14px}
.btn{display:inline-block;background:#1f6feb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600}.alt{display:block;margin-top:10px;font-size:14px;color:#0969da}</style>
<main><span class="tag">Sample inbox · nothing is sent</span><h1 style="font-size:22px">Emails the stub would have sent</h1>${rows}</main></html>`,
  }
}

export function fixturePage(req, st) {
  if (req.path === '/__fx/inbox') return inboxPage(st, req.query || {})
  return null
}

// ------------------------------------------------------------------ the stub auth server
export async function answerSupabase(req, st) {
  const a = auth(st)
  const { method: m, query: q = {}, body: b = {} } = req
  const p = req.path
  const body = b || {}

  if (m === 'GET' && p === '/auth/v1/authorize') {
    if (q.provider !== 'google') return sbErr(400, 'validation_failed', 'Unsupported provider')
    return { status: 200, html: chooserPage(q) }
  }

  if (m === 'GET' && p === '/auth/v1/__choose') {
    const to = allowedRedirect(st, q.redirect_to)
    if (q.persona === 'cancel') return { status: 302, redirect: withParams(to, { error: 'access_denied', error_code: 'access_denied', error_description: 'The user closed the sign-in window' }) }
    if (q.persona === 'error') return { status: 302, redirect: withParams(to, { error: 'server_error', error_code: 'unexpected_failure', error_description: 'Unable to exchange external code' }) }
    const acct = ensurePersona(a, q.persona)
    if (!acct) return sbErr(400, 'validation_failed', 'Unknown persona')
    if (!acct.confirmed) {
      mail(st, acct, 'confirm', to, q.code_challenge, q.code_challenge_method)
      return { status: 302, redirect: withParams(to, { error: 'access_denied', error_code: 'provider_email_needs_verification', error_description: 'Unverified email with google. A confirmation email has been sent to your google email' }) }
    }
    const code = newCode(a, acct, q.code_challenge, q.code_challenge_method, 'oauth')
    return { status: 302, redirect: withParams(to, { code }) }
  }

  if (m === 'POST' && p === '/auth/v1/token') {
    const grant = q.grant_type
    if (grant === 'pkce') {
      const c = a.codes[body.auth_code]
      if (!c) return sbErr(404, 'flow_state_not_found', 'invalid flow state, no valid flow state found')
      delete a.codes[body.auth_code]
      if (now() - c.at > CODE_LIFE_MS) return sbErr(400, 'flow_state_expired', 'invalid flow state, flow state has expired')
      if (!body.code_verifier || (await challengeOf(body.code_verifier, c.method)) !== c.challenge) return sbErr(400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier')
      return json(200, session(a, a.accounts[c.email]))
    }
    if (grant === 'password') {
      const acct = a.accounts[String(body.email || '').trim().toLowerCase()]
      if (acct?.busy) return sbErr(429, 'over_request_rate_limit', 'Request rate limit reached')
      if (!acct || !acct.password || acct.password !== body.password) return sbErr(400, 'invalid_credentials', 'Invalid login credentials')
      if (acct.paused) return sbErr(400, 'user_banned', 'User is banned')
      if (!acct.confirmed) return sbErr(400, 'email_not_confirmed', 'Email not confirmed')
      return json(200, session(a, acct))
    }
    if (grant === 'refresh_token') {
      const acct = a.accounts[a.tokens[body.refresh_token]]
      if (!acct) return sbErr(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found')
      return json(200, session(a, acct))
    }
    return sbErr(400, 'validation_failed', 'unsupported grant_type')
  }

  if (m === 'POST' && p === '/auth/v1/signup') {
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sbErr(400, 'email_address_invalid', 'Email address is invalid')
    if (String(body.password || '').length < 8) return { status: 422, json: { code: 'weak_password', error_code: 'weak_password', msg: 'Password should be at least 8 characters.', weak_password: { reasons: ['length'] } } }
    const existing = a.accounts[email]
    if (existing && existing.confirmed) {
      // Supabase answers an existing address with an obfuscated success and sends nothing.
      return json(200, { ...userJson({ ...existing, uid: uidOf(a.nextUid++), providers: [] }), identities: [] })
    }
    const acct = existing || { uid: uidOf(a.nextUid++), email, confirmed: false, profile: null, providers: ['email'], meta: {} }
    acct.password = body.password
    acct.meta = { ...(body.data || {}) }
    a.accounts[email] = acct
    if (tooSoon(a, email, 'confirm')) return sbErr(429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 60 seconds.')
    acct.challenge = body.code_challenge
    acct.method = body.code_challenge_method
    mail(st, acct, 'confirm', allowedRedirect(st, q.redirect_to, '/auth/callback'), body.code_challenge, body.code_challenge_method)
    return json(200, userJson(acct))
  }

  if (m === 'POST' && p === '/auth/v1/resend') {
    const acct = a.accounts[String(body.email || '').trim().toLowerCase()]
    if (acct && tooSoon(a, acct.email, 'confirm')) return sbErr(429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 60 seconds.')
    if (acct && !acct.confirmed) mail(st, acct, 'confirm', allowedRedirect(st, q.redirect_to, '/auth/callback'), acct.challenge, acct.method)
    return json(200, {})
  }

  if (m === 'POST' && p === '/auth/v1/recover') {
    const acct = a.accounts[String(body.email || '').trim().toLowerCase()]
    if (acct && tooSoon(a, acct.email, 'recovery')) return sbErr(429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 60 seconds.')
    if (acct) mail(st, acct, 'recovery', allowedRedirect(st, q.redirect_to, '/reset-password'), body.code_challenge, body.code_challenge_method)
    return json(200, {}) // the same answer whether or not the address has an account
  }

  if (m === 'GET' && p === '/auth/v1/verify') {
    const l = a.links[q.token]
    const to = l?.redirectTo || allowedRedirect(st, q.redirect_to)
    if (!l || now() - l.at > LINK_LIFE_MS) return { status: 303, redirect: withParams(to, { error: 'access_denied', error_code: 'otp_expired', error_description: 'Email link is invalid or has expired' }, { hash: true }) }
    delete a.links[q.token]
    const acct = a.accounts[l.email]
    acct.confirmed = true
    if (!l.challenge) return { status: 303, redirect: `${to}` }
    const code = newCode(a, acct, l.challenge, l.method, l.kind)
    return { status: 303, redirect: withParams(to, { code }) }
  }

  if (m === 'POST' && p === '/auth/v1/verify') {
    const l = a.links[`h:${body.token_hash}`]
    if (!l || now() - l.at > LINK_LIFE_MS) return sbErr(403, 'otp_expired', 'Email link is invalid or has expired')
    delete a.links[`h:${body.token_hash}`]
    const acct = a.accounts[l.email]
    acct.confirmed = true
    return json(200, session(a, acct))
  }

  if (p === '/auth/v1/user') {
    const tok = bearer(req.auth)
    const acct = acctOfToken(a, tok)
    if (!acct) return undefined // the shared sample session ('sample.sample.sample'): the core answers
    if (m === 'GET') return json(200, userJson(acct))
    if (m === 'PUT') {
      if (body.password != null) {
        if (String(body.password).length < 8) return { status: 422, json: { code: 'weak_password', error_code: 'weak_password', msg: 'Password should be at least 8 characters.', weak_password: { reasons: ['length'] } } }
        if (body.password === acct.password) return sbErr(422, 'same_password', 'New password should be different from the old password.')
        acct.password = body.password
      }
      if (body.data) acct.meta = { ...acct.meta, ...body.data }
      return json(200, userJson(acct))
    }
  }

  if (m === 'POST' && p === '/auth/v1/logout') {
    const tok = bearer(req.auth)
    if (tok && a.tokens[tok] && q.scope !== 'local') {
      const email = a.tokens[tok]
      for (const k of Object.keys(a.tokens)) if (a.tokens[k] === email) delete a.tokens[k]
    } else if (tok) delete a.tokens[tok]
    return { status: 204, json: null }
  }
  return undefined
}

// ------------------------------------------------------------------ the API side
const RESERVED_ROUTES = new Set(['me', 'search'])

function inviteFor(st, token) {
  const db = st.db
  if (token === 'used-invite') return { valid: false, message: 'This invitation has already been used' }
  const m = String(token).match(/^([a-z0-9_]+)-(link|email)$/)
  const key = m && db.users[m[1]] ? m[1] : null
  if (!key) return { valid: false, message: 'Invalid or expired invitation' }
  const u = db.users[key]
  const p = db.profiles[key] || {}
  const recent = db.list
    .filter((e) => e.author_username === u.username && ['public', 'followers'].includes(e.privacy_level))
    .sort((x, y) => String(y.start_date).localeCompare(String(x.start_date)))
    .slice(0, 3)
    .map((e) => ({ id: e.id, title: e.title, cover_image_url: e.cover_image_url, start_date: e.start_date, category: e.category }))
  return {
    valid: true,
    inviter: { username: u.username, display_name: u.display_name || u.full_name, avatar_url: u.avatar_url, bio: u.bio, event_count: p.event_count || recent.length, follower_count: p.follower_count || 0 },
    recent_events: recent,
    invited_email: m[2] === 'email' ? 'jordan.lee@example.test' : null,
    invited_name: m[2] === 'email' ? 'Jordan Lee' : null,
    message: null,
    inviter_name: u.full_name,
    inviter_username: u.username,
  }
}

function createUser(st, acct, username, name) {
  const a = auth(st)
  const db = st.db
  const id = a.nextUserId++
  const base = { id, username, full_name: name || username, display_name: name || username, avatar_url: null, bio: null, email: acct.email, is_active: true, created_at: '2026-11-26T12:00:00Z' }
  db.users[username] = base
  db.me[username] = {
    ...base, banner_url: null, theme_preference: 'light', subscription_tier: 'free', subscription_status: 'trial', subscription_started_at: '2026-11-26T12:00:00Z',
    subscription_ends_at: null, trial_end_date: '2026-12-26T12:00:00', trial_days_remaining: 30, is_within_first_5_days: true, can_access_content: true,
    event_count: 0, follower_count: 0, following_count: 0, is_superuser: false, is_demo_account: false,
  }
  db.profiles[username] = { id, username, full_name: base.full_name, display_name: base.display_name, bio: null, avatar_url: null, banner_url: null, event_count: 0, follower_count: 0, following_count: 0, created_at: base.created_at, is_active_member: true, subscription_tier: 'free' }
  acct.profile = username
  return db.me[username]
}

export function answer(req, st, h) {
  const a = auth(st)
  const { method: m, path: p, body } = req
  const db = st.db
  const acct = acctOfToken(a, bearer(req.auth))
  let r

  if (m === 'GET' && p === '/users/me' && acct) {
    if (!acct.profile) return h.err(401, 'User profile not found. Please complete registration.')
    st.viewer = acct.profile
    return undefined // the core answers for the viewer
  }
  if (acct?.profile && p.startsWith('/users/me')) st.viewer = acct.profile

  if (m === 'GET' && (r = p.match(/^\/users\/([^/]+)$/)) && !RESERVED_ROUTES.has(r[1]) && !db.profiles[r[1]]) {
    return h.err(404, 'User not found')
  }

  if (m === 'POST' && p === '/auth/supabase/create-profile') {
    const who = acctOfToken(a, body?.supabase_token)
    if (!who) return h.err(401, 'Invalid Supabase token')
    if (who.profile) return h.ok(db.me[who.profile])
    const username = String(body?.username || '')
    if (!username) return h.err(400, 'Username is required')
    if (who.legacy || db.users[username] || Object.values(db.users).some((u) => u.email === who.email)) return h.err(400, 'Email or username already registered')
    if (body?.invite_token) who.invitedBy = inviteFor(st, body.invite_token)?.inviter?.username || null
    const me = createUser(st, who, username, body?.display_name)
    st.viewer = username
    return h.ok(me)
  }

  if (m === 'PUT' && p === '/users/me/profile') {
    const key = acct ? acct.profile : st.viewer
    if (!key || !db.me[key]) return h.err(401, 'User profile not found. Please complete registration.')
    if (body?.full_name) {
      for (const t of [db.me[key], db.users[key], db.profiles[key]]) if (t) t.full_name = body.full_name
    }
    return h.ok(db.me[key])
  }

  if (m === 'GET' && (r = p.match(/^\/auth\/validate-invite\/([^/]+)$/))) return h.ok(inviteFor(st, decodeURIComponent(r[1])))

  if (m === 'POST' && p === '/invitations/link') {
    const key = acct ? acct.profile : st.viewer
    if (!key) return h.err(401, 'Not authenticated')
    const token = db.users[key] ? `${key}-link` : 'maya-link'
    return h.ok({ token, invite_url: `${st.origin}/join/${token}`, message: 'Retrieved existing invite link' })
  }

  if (m === 'POST' && p === '/auth/login') return h.err(401, 'Incorrect email or password')

  if (m === 'POST' && p === '/auth/demo-login') {
    if (body?.password !== 'sample-demo') return h.err(401, 'Incorrect password')
    st.viewer = 'maya'
    return h.ok({ access_token: 'legacy.demo', token_type: 'bearer', user: { ...db.me.maya, is_demo_account: true, demo_event_ids: [] } })
  }
  return undefined
}
