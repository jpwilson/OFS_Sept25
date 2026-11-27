// The admin scene for scripts/daylight/capture.mjs (owner: ADMIN): the Overview and Members
// tabs screen by screen at the owner's iPhone size (393x680 visible in Chrome) and on
// desktop, then each state the page has.
//   node scripts/daylight/capture.mjs --scene admin --out admin-analytics --base http://127.0.0.1:5381
// The sample has no superuser: the scene answers /users/me with is_superuser, as the overlap
// sweep does. It sets the sample's admin states through /__fx/admin-state and
// /__fx/admin-posthog and puts them back at the end.

export async function adminScene(page, device, { base, settle, shoot, report }) {
  const B = base
  const phone = device === 'phone'
  if (phone) await page.setViewportSize({ width: 393, height: 680 })
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const res = await route.fetch()
    const json = await res.json().catch(() => null)
    return json ? route.fulfill({ response: res, json: { ...json, is_superuser: true } }) : route.fulfill({ response: res })
  })
  const state = (q) => page.request.get(`${B}/__fx/admin-state?${q}`)
  const posthog = (on) => page.request.get(`${B}/__fx/admin-posthog?on=${on}`)
  const go = async (path, wait = '[data-ui="admin-page"]') => {
    await page.goto(`${B}${path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(wait, { timeout: 20000 })
    await settle(page)
  }
  /** Shoot the page a screen at a time, top to bottom (at most `max` screens). */
  const screens = async (label, max = 6) => {
    const { h, total } = await page.evaluate(() => ({ h: innerHeight, total: document.scrollingElement.scrollHeight }))
    const step = Math.round(h * 0.86)
    const n = Math.min(max, Math.max(1, Math.ceil((total - h) / step) + 1))
    for (let i = 0; i < n; i++) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), i * step)
      await page.waitForTimeout(200)
      await shoot(page, device, `${label} ${i + 1}/${n}`)
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  }
  const section = async (name, fn) => {
    try {
      await fn()
    } catch (e) {
      report.errors.push(`${device} admin scene, ${name}: ${e.message.split('\n')[0]}`)
      await shoot(page, device, `FAILED: ${name}`).catch(() => {})
    }
  }

  await state('overview=ok&delay=0')
  await posthog('1')
  await section('overview', async () => {
    await go('/admin', '[data-ui="admin-overview"]')
    await screens('Overview · 7d')
  })
  await section('chart selected', async () => {
    const area = page.locator('[data-ui="chart-visitors"] [data-ui="chart-area"]')
    await page.evaluate(() => {
      const el = document.querySelector('[data-ui="chart-visitors"]')
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 120, behavior: 'instant' })
    })
    const box = await area.boundingBox()
    await page.mouse.click(box.x + box.width * 0.79, box.y + box.height * 0.6)
    await page.waitForTimeout(250)
    await shoot(page, device, 'Visitors: a bar selected (readout above)')
  })
  await section('24h hourly', async () => {
    await go('/admin?range=24h', '[data-ui="admin-overview"]')
    await shoot(page, device, 'Overview · 24h hourly')
  })
  await section('unfinished', async () => {
    await go('/admin', '[data-ui="admin-overview"]')
    await page.locator('[data-ui="admin-unfinished-link"]').scrollIntoViewIfNeeded()
    await page.click('[data-ui="admin-unfinished-link"]')
    await page.waitForSelector('[data-ui="admin-unfinished"] li')
    await page.waitForTimeout(500)
    await shoot(page, device, 'Did not finish (sheet)')
    await page.keyboard.press('Escape')
  })
  await section('members', async () => {
    await go('/admin?tab=members', '[data-ui="member-card"], [data-ui="member-table"]')
    await screens('Members', 4)
  })
  await section('filters', async () => {
    await page.click('[data-ui="admin-filters-button"]')
    await page.waitForSelector('[data-ui="admin-filter-sheet"]')
    await page.getByRole('button', { name: 'Google' }).first().click()
    await page.getByRole('button', { name: 'Found us' }).first().click()
    await page.waitForTimeout(600)
    await shoot(page, device, 'Filters (sheet)')
    await page.click('[data-ui="admin-filters-done"]')
    await page.waitForTimeout(600)
    await shoot(page, device, 'Members: Google, found us')
  })
  await section('tools', async () => {
    await go('/admin?tab=tools', '[data-ui="admin-tools"]')
    await page.waitForTimeout(800)
    await shoot(page, device, 'Tools (the classic dashboard)')
  })
  await section('visitors not set up', async () => {
    await posthog('0')
    await go('/admin', '[data-ui="admin-visitors-setup"]')
    await shoot(page, device, 'Visitors not set up')
    await page.locator('[data-ui="admin-visitors-setup"]').scrollIntoViewIfNeeded()
    await shoot(page, device, 'Visitors not set up: the steps')
  })
  await section('posthog failing', async () => {
    await posthog('fail')
    await go('/admin', '[data-ui="admin-overview"]')
    await shoot(page, device, 'PostHog failing')
  })
  await posthog('1')
  await section('sessions fallback', async () => {
    await state('overview=sessions')
    await go('/admin', '[data-ui="admin-signins"]')
    await page.locator('[data-ui="admin-signins"]').scrollIntoViewIfNeeded()
    await shoot(page, device, 'Sign-ins from sessions (fallback)')
  })
  await section('no auth', async () => {
    await state('overview=noauth')
    await go('/admin', '[data-ui="admin-overview"]')
    await screens('Supabase auth not readable', 2)
  })
  await section('empty', async () => {
    await state('overview=empty')
    await go('/admin?range=24h', '[data-ui="admin-overview"]')
    await shoot(page, device, 'Empty: nobody in range')
    await go('/admin?tab=members', '[data-ui="admin-members"] [data-ui="empty-state"]')
    await shoot(page, device, 'Members: empty')
  })
  await section('not updated', async () => {
    await state('overview=404')
    await go('/admin', '[data-ui="empty-state"]')
    await shoot(page, device, 'Server not updated yet (404)')
  })
  await section('error', async () => {
    await state('overview=error')
    await go('/admin', '[data-ui="empty-state"]')
    await shoot(page, device, 'Overview failed (500)')
  })
  await section('loading', async () => {
    await state('overview=ok&delay=8000')
    await page.goto(`${B}/admin`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ui="loading"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    await shoot(page, device, 'Loading')
  })
  await state('overview=ok&delay=0')
}
