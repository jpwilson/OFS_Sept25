// What a return to /auth/callback or /reset-password carries (owner: AUTH). AUTH.md decision 11.
// Pure: the page reads the URL and the session, this decides.
//
//   readParams(href) -> params from the query and the hash (the query wins, as in auth-js)
//   classifyArrival({ params, hasSession, initError }) ->
//     { kind: 'error', code }        Google or the email link reported an error, or the
//                                    library's exchange failed (initError)
//     { kind: 'token-hash', tokenHash, type }   a go-live template link: verify it
//     { kind: 'session' }            signed in (the library exchanged ?code= itself)
//     { kind: 'no-verifier' }        a ?code= this browser cannot exchange (another device)
//     { kind: 'nothing' }            no parameters and no session
//   OWN_PARAMS: the parameters the page strips once it has read them

export const OWN_PARAMS = ['error', 'error_code', 'error_description', 'token_hash', 'type', 'code', 'sb']

export function readParams(href) {
  const out = {}
  let u
  try {
    u = new URL(href)
  } catch {
    return out
  }
  if (u.hash.length > 1) {
    try {
      new URLSearchParams(u.hash.slice(1)).forEach((v, k) => (out[k] = v))
    } catch {
      /* the hash is not a query string */
    }
  }
  u.searchParams.forEach((v, k) => (out[k] = v))
  return out
}

function initCode(initError) {
  if (!initError) return null
  return initError.details?.code && initError.details.code !== 'unspecified_code' ? initError.details.code : initError.code || 'unknown'
}

export function classifyArrival({ params = {}, hasSession = false, initError = null } = {}) {
  if (params.error || params.error_code || params.error_description) {
    return { kind: 'error', code: params.error_code || params.error || 'unknown' }
  }
  if (params.token_hash) return { kind: 'token-hash', tokenHash: params.token_hash, type: params.type || 'email' }
  if (hasSession) return { kind: 'session' }
  const ic = initCode(initError)
  if (ic) return { kind: 'error', code: ic }
  if (params.code) return { kind: 'no-verifier' }
  return { kind: 'nothing' }
}

/** The URL with our own parameters removed (path, the rest of the query, no hash). */
export function cleanUrl(href) {
  const u = new URL(href)
  for (const k of OWN_PARAMS) u.searchParams.delete(k)
  u.hash = ''
  return u.pathname + (u.search === '?' ? '' : u.search)
}
