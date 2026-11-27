// node --test src/daylight/auth/lib/   (Node 22's built-in runner; no dependency)
import test from 'node:test'
import assert from 'node:assert/strict'
import { safeNext, savePending, readPending, hasPending, clearPending, rememberPath, lastPath, PENDING_LIFE_MS } from './intent.js'
import { messageFor, errorCode, isFreshLink } from './errors.js'
import { cleanHandle, checkHandle, suggestHandle, alternatives, HANDLE_RE } from './handle.js'
import { classifyArrival, readParams, cleanUrl } from './arrival.js'
import { isInAppBrowser } from './inApp.js'

const mem = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('safeNext keeps same-origin app paths', () => {
  assert.equal(safeNext('/notifications'), '/notifications')
  assert.equal(safeNext('/event/110?x=1#c'), '/event/110?x=1#c')
  assert.equal(safeNext('/feed?view=map'), '/feed?view=map')
})

test('safeNext refuses other origins and tricks', () => {
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '\\\\evil.example', 'evil', '', ' /feed', '/feed\n', 'javascript:alert(1)', null, undefined, 42, '/' + 'a'.repeat(600)]) {
    assert.equal(safeNext(bad), '/feed', String(bad))
  }
})

test('safeNext never returns an auth route', () => {
  for (const p of ['/login', '/login?signup=true', '/auth/callback', '/reset-password', '/join/abc', '/signup', '/demo-login', '/__fx/signin', '/LOGIN']) assert.equal(safeNext(p), '/feed', p)
  assert.equal(safeNext('/loginx'), '/loginx')
  assert.equal(safeNext('/login', null), null)
})

test('pending record: saved, read, expires, cleared, holds no unsafe next', () => {
  const s = mem()
  savePending({ next: '//evil.example', invite: 'ruth-link', intent: 'signup', wash: 'sun' }, s, 1000)
  assert.deepEqual(readPending(s, 2000), { next: '/feed', invite: 'ruth-link', intent: 'signup', wash: 'sun', at: 1000 })
  assert.equal(hasPending(s, 1000 + PENDING_LIFE_MS + 1), false)
  clearPending(s)
  assert.equal(readPending(s, 2000), null)
  s.setItem('ofs.auth.pending', '{not json')
  assert.equal(readPending(s), null)
})

test('last path is remembered for ten minutes, only when safe', () => {
  const s = mem()
  rememberPath('/notifications', s, 0)
  assert.equal(lastPath(s, 1000), '/notifications')
  assert.equal(lastPath(s, 11 * 60 * 1000), null)
  rememberPath('/login', s, 0)
  assert.equal(lastPath(s, 10), '/notifications')
})

test('error codes map to the planned lines', () => {
  assert.match(messageFor({ code: 'invalid_credentials' }).line, /don't match/)
  assert.equal(messageFor({ code: 'email_not_confirmed' }).action, 'resend')
  assert.match(messageFor('access_denied').line, /closed before it finished/)
  assert.match(messageFor({ code: 'over_email_send_rate_limit' }).line, /lot of tries/)
  assert.match(messageFor({ status: 429 }).line, /lot of tries/)
  assert.match(messageFor({ code: 'weak_password' }).line, /8 characters/)
  assert.match(messageFor({ code: 'same_password' }).line, /haven't used/)
  for (const c of ['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier', 'no_verifier']) assert.ok(isFreshLink(c), c)
  assert.match(messageFor({ name: 'AuthRetryableFetchError', status: 0 }).line, /couldn't reach/)
  assert.equal(errorCode({ details: { code: 'provider_email_needs_verification' } }), 'provider_email_needs_verification')
  assert.match(messageFor('something_new').line, /didn't go through/)
})

test('handle rules', () => {
  assert.equal(cleanHandle(' @Maya Hartley '), 'maya_hartley')
  assert.equal(checkHandle('ab').reason, 'short')
  assert.equal(checkHandle('a'.repeat(21)).reason, 'long')
  assert.equal(checkHandle('maya.h').reason, 'chars')
  assert.equal(checkHandle('me').reason, 'short')
  assert.equal(checkHandle('admin').reason, 'reserved')
  assert.equal(checkHandle('search').reason, 'reserved')
  assert.equal(checkHandle('maya_h'), null)
})

test('handle suggestions are valid', () => {
  assert.equal(suggestHandle({ name: 'Maya Hartley' }), 'maya_hartley')
  assert.equal(suggestHandle({ name: 'Zoë Ångström-Lee' }), 'zoe_lee')
  assert.equal(suggestHandle({ name: '', email: 'alex.rivera@example.test' }), 'alex_rivera')
  assert.equal(suggestHandle({ name: 'Bartholomew Fitzwilliamson' }), 'bartholomew_fitzwill')
  assert.equal(suggestHandle({}), '')
  const alts = alternatives('maya', { name: 'Maya Brennan' })
  assert.equal(alts[0], 'maya_b')
  assert.ok(alts.every((h) => HANDLE_RE.test(h) && h !== 'maya'))
  assert.ok(alternatives('a'.repeat(20)).every((h) => h.length <= 20))
  assert.ok(alternatives('me').length > 0)
})

test('arrival classification', () => {
  assert.deepEqual(classifyArrival({ params: { error: 'access_denied', error_code: 'access_denied' } }), { kind: 'error', code: 'access_denied' })
  assert.deepEqual(classifyArrival({ params: { error_description: 'x' } }), { kind: 'error', code: 'unknown' })
  assert.deepEqual(classifyArrival({ params: { token_hash: 'h', type: 'recovery' } }), { kind: 'token-hash', tokenHash: 'h', type: 'recovery' })
  assert.deepEqual(classifyArrival({ params: {}, hasSession: true }), { kind: 'session' })
  assert.deepEqual(classifyArrival({ params: { code: 'c' } }), { kind: 'no-verifier' })
  assert.deepEqual(classifyArrival({ params: { code: 'c' }, initError: { code: 'bad_code_verifier' } }), { kind: 'error', code: 'bad_code_verifier' })
  assert.deepEqual(classifyArrival({ params: {} }), { kind: 'nothing' })
  assert.deepEqual(readParams('https://x.test/auth/callback?code=1#error=e&code=2'), { error: 'e', code: '1' })
  assert.equal(cleanUrl('https://x.test/auth/callback?code=1&keep=2#a=b'), '/auth/callback?keep=2')
  assert.equal(cleanUrl('https://x.test/reset-password?token_hash=1&type=recovery'), '/reset-password')
})

test('in-app browsers', () => {
  assert.equal(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0'), true)
  assert.equal(isInAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]'), true)
  assert.equal(isInAppBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36'), true)
  assert.equal(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'), false)
  assert.equal(isInAppBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36'), false)
  assert.equal(isInAppBrowser(''), false)
})
