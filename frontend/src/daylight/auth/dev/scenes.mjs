// The auth scene for scripts/daylight/capture.mjs (owner: AUTH): every screen and state of
// AUTH.md decision 14, reached the way a person reaches it, against the stub.
//   node scripts/daylight/capture.mjs --scene auth --out auth --device all --base http://127.0.0.1:5336
// Phone also gets 320 wide, a 390x500 viewport standing in for an open keyboard, and the
// keyboard focus order (written to report.json as focusOrder).

export async function authScene(page, device, { base, settle, shoot, sideways, report }) {
  const B = base
  const fresh = async () => {
    await page.request.get(`${B}/__fx/reset`)
    await page.goto(`${B}/__fx/inbox`)
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }
  const go = async (path) => {
    await page.goto(`${B}${path}`, { waitUntil: 'domcontentloaded' })
    await settle(page)
  }
  const snap = async (label, { check = false } = {}) => {
    await page.waitForTimeout(250)
    await shoot(page, device, label)
    if (check && device === 'phone') await sideways(page, label)
  }
  const text = (t) => page.getByText(t, { exact: false }).first().waitFor({ timeout: 12000 })
  // Each section runs on its own: a failure is reported and shot, and the next section runs.
  const section = async (name, fn) => {
    try {
      await fn()
    } catch (e) {
      report.errors.push(`${device} auth scene, ${name}: ${e.message.split('\n')[0]}`)
      await shoot(page, device, `FAILED: ${name}`).catch(() => {})
      await page.context().setOffline(false).catch(() => {})
      await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {})
    }
  }
  const google = async (persona) => {
    await page.click('[data-ui="google"]')
    await page.waitForSelector(`[data-persona="${persona}"]`, { timeout: 12000 })
    await page.click(`[data-persona="${persona}"]`)
  }
  const signUp = async (email) => {
    await go('/login?signup=true')
    await page.fill('[data-ui="email"]', email)
    await page.fill('[data-ui="password"]', 'sample-password-2')
    await page.click('[data-ui="submit"]')
    await text('Check your')
  }
  const hold = (pattern, ms) =>
    page.route(pattern, async (route) => {
      await new Promise((r) => setTimeout(r, ms))
      await route.continue().catch(() => {})
    })

  // ---------------------------------------------------------------- the door
  await section('the door', async () => {
    await fresh()
    await go('/login')
    await snap('Log in', { check: true })

    await page.fill('[data-ui="email"]', 'maya@example.test')
    await page.fill('[data-ui="password"]', 'not-her-password')
    await page.click('[data-ui="submit"]')
    await text("don't match")
    await snap('Log in: wrong email or password')

    await go('/login?signup=true')
    await snap('Start free', { check: true })

    await signUp('robin.new@example.test')
    await settle(page)
    await snap('Start free: check your inbox', { check: true })

    await go('/login')
    await page.fill('[data-ui="email"]', 'robin.new@example.test')
    await page.fill('[data-ui="password"]', 'sample-password-2')
    await page.click('[data-ui="submit"]')
    await text('Confirm your email')
    await snap('Log in: email not confirmed, send the link again')

    await go('/login')
    await page.fill('[data-ui="email"]', 'busy@example.test')
    await page.fill('[data-ui="password"]', 'sample-password')
    await page.click('[data-ui="submit"]')
    await text('lot of tries')
    await snap('Log in: rate limited')

    await page.fill('[data-ui="email"]', 'paused@example.test')
    await page.click('[data-ui="submit"]')
    await text('paused')
    await snap('Log in: account paused')

    await page.context().setOffline(true)
    await page.fill('[data-ui="email"]', 'maya@example.test')
    await page.click('[data-ui="submit"]')
    await text("couldn't reach")
    await snap('Log in: offline')
    await page.context().setOffline(false)

    // busy: Google is opening. A 204 answer to the navigation keeps this page, so the busy
    // button can be seen; then the second press goes through to the stand-in chooser.
    await go('/login')
    await page.route('**/__sb/auth/v1/authorize**', (route) => route.fulfill({ status: 204, body: '' }))
    await page.click('[data-ui="google"]', { noWaitAfter: true })
    await page.waitForTimeout(600)
    await snap('Continue with Google: busy')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await go(`/__sb/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${B}/auth/callback`)}&code_challenge=x&code_challenge_method=s256`)
    await snap('The stand-in for Google (stub only)')
  })

  // ---------------------------------------------------------------- returning from Google
  await section('returning from Google', async () => {
    await fresh()
    await go('/login')
    await hold('**/api/v1/users/me', 5000)
    await google('member')
    await page.waitForURL(/\/auth\/callback/, { timeout: 12000 })
    await page.waitForTimeout(900)
    await snap('Returning from Google: opening the door')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 15000 })

    await fresh()
    await go('/login')
    await google('cancel')
    await text('closed before it finished')
    await settle(page)
    await snap('Google closed before finishing')

    await go('/login')
    await google('error')
    await text("couldn't finish")
    await settle(page)
    await snap('Google refused')
  })

  // ---------------------------------------------------------------- first run and welcome
  await section('first run and welcome', async () => {
    await fresh()
    await go('/login?signup=true')
    await google('new')
    await page.waitForSelector('[data-ui="handle"]', { timeout: 12000 })
    await text('is free.')
    await settle(page)
    await snap('First run (Google: name and handle filled in)', { check: true })

    await page.fill('[data-ui="handle"]', 'maya')
    await page.waitForFunction(() => /taken/.test(document.querySelector('[data-ui="handle-note"]')?.textContent || ''), null, { timeout: 12000 })
    await snap('First run: handle taken, with a suggestion')
    await page.click('[data-ui="use-alt"]')
    await text('is free.')
    await page.click('[data-ui="start"]')
    await text("You're in,")
    await settle(page)
    await snap('Welcome', { check: true })
    await page.click('[data-ui="get-link"]')
    await text('Copy')
    await snap('Welcome: invite your family')
  })

  // ---------------------------------------------------------------- invitations
  await section('invitations', async () => {
    await fresh()
    await go('/join/ruth-link')
    await snap('Invitation', { check: true })
    await google('new')
    await page.waitForSelector('[data-ui="handle"]', { timeout: 12000 })
    await text('is free.')
    await page.click('[data-ui="start"]')
    await text('follow each other')
    await settle(page)
    await snap('Welcome, by invitation')

    await fresh()
    await go('/join/used-invite')
    await snap('Invitation already used')

    await page.goto(`${B}/__fx/signin?as=maya&next=/feed`)
    await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 15000 })
    await go('/join/ruth-link')
    await text("You're already")
    await snap('Invitation, already signed in')
  })

  // ---------------------------------------------------------------- email links
  await section('email links', async () => {
    await fresh()
    await signUp('kim.new@example.test')
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('-code-verifier')).forEach((k) => localStorage.removeItem(k)))
    await go('/__fx/inbox?go=verify&kind=confirm')
    await text('One more')
    await settle(page)
    await snap('Email link opened on another device')
  })

  // ---------------------------------------------------------------- password reset
  await section('password reset', async () => {
    await fresh()
    await go('/reset-password')
    await snap('Forgot your password', { check: true })
    await page.fill('[data-ui="email"]', 'tom@example.test')
    await page.click('[data-ui="send-link"]')
    await text('on its way')
    await settle(page)
    await snap('Forgot: check your inbox')
    await go('/__fx/inbox?go=verify&kind=recovery')
    await page.waitForSelector('[data-ui="new-password"]', { timeout: 12000 })
    await settle(page)
    await snap('Choose a new password')
    await page.fill('[data-ui="new-password"]', 'short')
    await page.click('[data-ui="save-password"]')
    await text('8 characters')
    await snap('Choose a new password: too short')
    await page.fill('[data-ui="new-password"]', 'a-brand-new-one')
    await page.click('[data-ui="save-password"]')
    await text("You're all")
    await settle(page)
    await snap('Password saved')

    await fresh()
    await go('/reset-password?code=spent')
    await text('fresh')
    await snap('Link spent or opened without its start: a fresh link')

    await go('/demo-login')
    await snap('Investor demo (by address only)')
  })

  // ---------------------------------------------------------------- phone extras
  await section('phone extras', async () => {
    if (device === 'phone') {
      const vp = page.viewportSize()
      await fresh()
      await page.setViewportSize({ width: 320, height: 640 })
      await go('/login')
      await snap('Log in at 320 wide')
      await go('/login?signup=true')
      await snap('Start free at 320 wide')
      await page.setViewportSize({ width: 390, height: 500 })
      await go('/login')
      await page.focus('[data-ui="email"]')
      await snap('Log in, 390x500 (keyboard open): scene folds')
      await page.setViewportSize(vp)

      // keyboard focus order on the door
      await go('/login')
      const order = []
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab')
        order.push(
          await page.evaluate(() => {
            const el = document.activeElement
            return el?.dataset?.ui || el?.getAttribute('aria-label') || el?.textContent?.trim().slice(0, 30) || el?.tagName
          }),
        )
      }
      report.focusOrder = order
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await snap('Log in: keyboard focus (on the password Show button)')
    }
  })
}
