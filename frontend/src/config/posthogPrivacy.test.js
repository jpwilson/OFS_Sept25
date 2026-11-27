// node --test src/config/posthogPrivacy.test.js   Every URL-like property sent to PostHog loses its query string
// and hash, and token / id path segments are masked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanUrl, posthogBeforeSend } from './posthogPrivacy.js'

const SITE = 'https://www.ourfamilysocials.com'

test('token routes are masked and query strings and hashes dropped', () => {
  const cases = [
    [`${SITE}/join/inv_secret123?ref=email`, `${SITE}/join/:token`],
    [`${SITE}/share/shr_secret456`, `${SITE}/share/:token`],
    [`${SITE}/share/shr_secret456/`, `${SITE}/share/:token/`],
    [`${SITE}/signup/invited?token=inv_secret123&email=a%40b.c`, `${SITE}/signup/invited`],
    [`${SITE}/auth/callback?code=signin_code_789`, `${SITE}/auth/callback`],
    [`${SITE}/auth/callback#access_token=jwt.secret&refresh_token=r`, `${SITE}/auth/callback`],
    [`${SITE}/reset-password#access_token=jwt.secret&type=recovery`, `${SITE}/reset-password`],
    [`${SITE}/reset-password?code=reset_code`, `${SITE}/reset-password`],
    [`${SITE}/event/42?photo=3`, `${SITE}/event/:id`],
    [`${SITE}/event/42/edit`, `${SITE}/event/:id/edit`],
    [`${SITE}/profile/grandma-jo`, `${SITE}/profile/:username`],
    [`${SITE}/tag-profile/17`, `${SITE}/tag-profile/:id`],
    [`${SITE}/feed?view=map`, `${SITE}/feed`],
    ['/join/inv_secret123?x=1', '/join/:token'],
    ['https://mail.example.com/inbox/msg?id=abc#x', 'https://mail.example.com/inbox/msg'],
    ['$direct', '$direct'],
    ['', ''],
  ]
  for (const [input, expected] of cases) assert.equal(cleanUrl(input), expected, input)
  assert.equal(cleanUrl(null), null)
  assert.equal(cleanUrl(5), 5)
})

test('before_send cleans automatic, initial, session-entry and $set properties', () => {
  const secretUrl = `${SITE}/join/inv_secret123?token=inv_secret123#access_token=jwt.secret`
  const event = {
    event: '$pageview',
    properties: {
      $current_url: secretUrl,
      $pathname: '/join/inv_secret123',
      $referrer: `${SITE}/signup/invited?token=inv_secret123`,
      $initial_current_url: secretUrl,
      $initial_pathname: '/share/shr_secret456',
      $initial_referrer: 'https://mail.example.com/read?msg=inv_secret123',
      $session_entry_url: secretUrl,
      $session_entry_pathname: '/join/inv_secret123',
      $session_entry_referrer: `${SITE}/auth/callback?code=signin_code_789`,
      $prev_pageview_pathname: '/share/shr_secret456',
      path: '/join/inv_secret123',
      $referring_domain: 'mail.example.com',
      $host: 'www.ourfamilysocials.com',
      utm_source: 'newsletter',
      app: 'ofs',
      $set: { $current_url: secretUrl },
      $set_once: { $initial_current_url: secretUrl },
    },
    $set: { $current_url: secretUrl, $pathname: '/share/shr_secret456' },
    $set_once: {
      $initial_current_url: secretUrl,
      $initial_pathname: '/join/inv_secret123',
      $initial_referrer: `${SITE}/reset-password#access_token=jwt.secret`,
    },
  }

  const out = posthogBeforeSend(event)
  const sent = JSON.stringify(out)
  for (const secret of ['inv_secret123', 'shr_secret456', 'signin_code_789', 'jwt.secret', 'msg=']) {
    assert.ok(!sent.includes(secret), `${secret} reached PostHog: ${sent}`)
  }
  assert.equal(out.properties.$current_url, `${SITE}/join/:token`)
  assert.equal(out.properties.$pathname, '/join/:token')
  assert.equal(out.$set_once.$initial_referrer, `${SITE}/reset-password`)
  // Non-URL properties are left alone
  assert.equal(out.properties.utm_source, 'newsletter')
  assert.equal(out.properties.$referring_domain, 'mail.example.com')
  assert.equal(out.properties.app, 'ofs')
})

test('before_send passes null through and keeps events without URL properties', () => {
  assert.equal(posthogBeforeSend(null), null)
  const plain = { event: 'checkout_started', properties: { plan: 'annual' } }
  assert.deepEqual(posthogBeforeSend(plain), { event: 'checkout_started', properties: { plan: 'annual' } })
})
