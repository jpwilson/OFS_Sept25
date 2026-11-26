// What to capture and how to reach it. Each scene opens one page (fresh context) and
// returns { id: pngBuffer | 'reason it was not captured' }.
// Pages are reached the way a person reaches them: some routes (/family-tree, /profile)
// bounce a direct load to /login before auth resolves, so those are entered from the header.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { HERE, REPO, readManifest } from './media.mjs';
import { KITCHEN_UPLOADS, IMPORT_ORDER } from './api.mjs';

const B = 'http://localhost:5325';
const sharp = createRequire(path.join(REPO, 'landing-art/package.json'))('sharp');
const $c = (name) => `[class*="${name}"]`; // CSS-module class, any hash

// ---------------------------------------------------------------- helpers
async function go(page, settle, url, wait, ms = 900) {
  await page.goto(B + url);
  if (wait) await page.waitForSelector(wait, { timeout: 20000 });
  await settle(page, ms);
}
async function viaHeader(page, settle, linkText, wait) {
  await go(page, settle, '/feed', $c('eventCard'), 300);
  await page.locator('header').getByRole('link', { name: linkText, exact: true }).first().click();
  if (wait) await page.waitForSelector(wait, { timeout: 20000 });
  await settle(page, 1200);
}
async function tiles(page, ms = 1200) {
  await page.waitForFunction(() => {
    const t = [...document.querySelectorAll('.leaflet-tile')];
    return t.length > 0 && t.every((i) => i.complete && i.classList.contains('leaflet-tile-loaded'));
  }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
}
const shot = (loc, opts = {}) => loc.screenshot({ animations: 'disabled', ...opts });
// Screenshot from the top of one element to the bottom of another with the sticky header kept
// out of the way: grow the viewport so the whole span fits below the header, then clip.
async function tallClip(page, topLoc, bottomLoc = topLoc, pad = 16) {
  const vp = page.viewportSize();
  const span = await page.evaluate(([a, b]) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().top, [await topLoc.elementHandle(), await bottomLoc.elementHandle()]);
  await page.setViewportSize({ width: vp.width, height: Math.max(vp.height, Math.ceil(span) + 2 * pad + 260) });
  await topLoc.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 200));
  await page.waitForTimeout(500);
  const a = await topLoc.boundingBox(), b = await bottomLoc.boundingBox();
  const x = Math.min(a.x, b.x) - pad, right = Math.max(a.x + a.width, b.x + b.width) + pad;
  const buf = await page.screenshot({ clip: { x, y: a.y - pad, width: right - x, height: b.y + b.height - a.y + 2 * pad }, animations: 'disabled' });
  await page.setViewportSize(vp);
  return buf;
}
// a region from the top of one element to the bottom of another, full container width
async function region(page, topSel, bottomSel, pad = 16, xSel = null) {
  const box = await page.evaluate(([a, b, p, x]) => {
    const ra = document.querySelector(a).getBoundingClientRect();
    const rb = document.querySelector(b).getBoundingClientRect();
    const rx = x ? document.querySelector(x).getBoundingClientRect() : { left: 0, width: innerWidth };
    return { x: rx.left, y: ra.top + scrollY - p, width: rx.width, height: rb.bottom - ra.top + 2 * p };
  }, [topSel, bottomSel, pad, xSel]);
  return page.screenshot({ clip: box, fullPage: true, animations: 'disabled' });
}

// sample photos as JPEG files to put into file inputs (what a camera roll would give)
const FILES = path.join(HERE, '_files');
async function photoFiles(ids) {
  fs.mkdirSync(FILES, { recursive: true });
  const m = readManifest();
  const out = [];
  for (const id of ids) {
    const f = path.join(FILES, `${id}.jpg`);
    if (!fs.existsSync(f)) await sharp(path.join(REPO, 'frontend/public', m[id].src)).resize({ width: 1600 }).jpeg({ quality: 86 }).toFile(f);
    out.push(f);
  }
  return out;
}

async function bgImages(page) {
  await page.evaluate(async () => {
    const urls = [...document.querySelectorAll('[style*="background-image"]')].map((e) => (e.style.backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean);
    await Promise.all(urls.map((u) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  });
  await page.waitForTimeout(300);
}
async function openStory(page, settle, slug) {
  await go(page, settle, `/event/${slug}`, $c('richContent'), 1200);
  await bgImages(page);
}
async function openGrid(page) {
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /View all \d+ items/.test(b.textContent))?.click());
  await page.waitForSelector(`[class*="gallerySection"] [class*="gridItem"]`);
  await bgImages(page);
}
async function streetLayer(page) {
  const b = page.locator($c('layerToggle')).getByRole('button', { name: 'Street' });
  if (await b.count()) await b.click();
  await tiles(page);
}
async function openQuickAdd(page, settle) {
  await go(page, settle, '/feed', $c('eventCard'), 300);
  await page.locator($c('createSplitButton')).hover();
  await page.locator($c('createSplitOption')).filter({ hasText: 'AI Create' }).first().click();
  await page.waitForSelector($c('creationModeSelector'));
  await page.locator($c('creationModeCard')).filter({ hasText: 'AI Draft' }).click();
  await page.waitForTimeout(300);
}
async function addKitchenPhotos(page, state) {
  state.uploadIds = KITCHEN_UPLOADS;
  state.uploaded = [];
  const files = await photoFiles(KITCHEN_UPLOADS);
  await page.locator(`${$c('modal')} input[type="file"]`).setInputFiles(files);
  await page.waitForFunction(() => document.querySelectorAll('[class*="mediaItem"] img').length >= 6 && !document.querySelector('[class*="uploadingOverlay"]'), null, { timeout: 30000 });
  await page.waitForTimeout(1500); // reverse-geocode badges
}

// ---------------------------------------------------------------- scenes
const feedScene = (id, phone, theme) => ({
  name: id, ids: [id], phone, theme,
  async run(page, { settle }) {
    await go(page, settle, '/feed', $c('eventCard'), 1500);
    await page.evaluate(() => document.querySelector('[class*="FeedbackWidget"], [class*="feedbackButton"]')?.remove());
    if (phone) return { [id]: await page.screenshot({ animations: 'disabled' }) };
    return { [id]: await region(page, 'header', `${$c('feedContainer')}`, 0) };
  },
});

const CARDS = [
  ['ui-card-coast', 'A week on the Maine coast'], ['ui-card-tetons', 'Seven days in the Tetons'], ['ui-card-maui', 'Spring break in Maui'],
  ['ui-card-wedding', 'Kate and Marcus get married'], ['ui-card-kitchen', 'Six weeks without a kitchen'], ['ui-card-race', "Dad's first marathon"],
  ['ui-card-year', 'Ivy turns nine'], ['ui-card-joe70', 'Grandpa Joe at seventy'],
];
const COAST = 'a-week-on-the-maine-coast';

const storyParts = (theme, suffix = '') => ({
  name: `story parts ${theme}`, ids: suffix ? [`ui-story-head${suffix}`] : ['ui-story-d', 'ui-story-head', 'ui-story-toc', 'ui-story-text', 'ui-story-journey', 'ui-story-gallery', 'ui-story-comments'], theme,
  viewer: 'ruth', // a reader: Nana Ruth follows Maya and is ticked Close Family
  async run(page, { settle }) {
    await openStory(page, settle, COAST);
    const out = {};
    out[`ui-story-head${suffix}`] = await shot(page.locator($c('heroImage')).first());
    if (suffix) return out;
    await page.locator($c('mapSection')).scrollIntoViewIfNeeded();
    await streetLayer(page);
    await page.locator(`${$c('mapSection')} .leaflet-control-zoom-out`).click({ force: true });
    await page.waitForTimeout(700);
    await tiles(page);
    await openGrid(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 800);
    await page.evaluate(() => document.querySelector('[class*="feedbackButton"], [class*="FeedbackWidget"]')?.remove());
    out['ui-story-d'] = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const toc = page.locator('nav, aside, div').filter({ has: page.getByText('View journey map') }).filter({ hasText: 'The last lighthouse' }).last();
    out['ui-story-toc'] = await tallClip(page, toc, toc, 0);
    // a section of text with an inline captioned photo: "The top of Cadillac" heading to the end of its caption paragraph
    out['ui-story-text'] = await page.evaluate(() => {
      const h = [...document.querySelectorAll('[class*="richContent"] h1')].find((e) => e.textContent.trim() === 'The top of Cadillac');
      const cap = [...document.querySelectorAll('[class*="richContent"] .image-caption')].find((e) => e.textContent.startsWith('The top of Cadillac'));
      const end = cap.nextElementSibling || cap;
      const content = document.querySelector('[class*="richContent"]').getBoundingClientRect();
      const a = h.getBoundingClientRect(), b = end.getBoundingClientRect();
      return { x: content.left - 40, y: a.top + scrollY - 32, width: content.width + 80, height: b.bottom - a.top + 64 };
    }).then((clip) => page.screenshot({ clip, fullPage: true, animations: 'disabled' }));
    out['ui-story-journey'] = await shot(page.locator($c('mapSection')).first());
    out['ui-story-gallery'] = await shot(page.locator($c('gallerySection')).first());
    out['ui-story-comments'] = await shot(page.locator($c('commentsSection')).first());
    return out;
  },
});

const lightboxScene = (theme, suffix = '') => ({
  name: `lightbox ${theme}`, ids: [`ui-lightbox${suffix}`], theme,
  viewer: 'sam', // the race story is Custom Group: Run club; Sam is in it
  async run(page, { settle }) {
    await openStory(page, settle, 'dads-first-marathon');
    await openGrid(page);
    // the star-sign photo: Ivy and Leo at the barrier
    const items = page.locator(`${$c('gallerySection')} ${$c('gridItem')}`);
    const n = await items.count();
    let idx = 3;
    for (let i = 0; i < n; i++) if ((await items.nth(i).getAttribute('style'))?.includes('photo-race-kids')) idx = i;
    await items.nth(idx).click();
    await page.waitForSelector('.yarl__root');
    await settle(page, 1200);
    await page.locator(`.yarl__toolbar ${$c('reactionContainer')}`).hover();
    await page.waitForSelector($c('reactionPickerPortal'));
    await page.waitForTimeout(500);
    return { [`ui-lightbox${suffix}`]: await page.screenshot({ animations: 'disabled' }) };
  },
});

export const SCENES = [
  feedScene('ui-feed-d', false),
  feedScene('ui-feed-m', true),
  feedScene('ui-feed-d-dark', false, 'dark'),
  {
    name: 'cards', ids: CARDS.map(([id]) => id),
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 1500);
      const out = {};
      for (const [id, title] of CARDS) {
        const card = page.locator($c('eventCard')).filter({ hasText: title }).first();
        await card.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200));
        await page.waitForTimeout(300);
        await page.mouse.move(5, 5);
        await card.hover();
        await page.waitForTimeout(700);
        out[id] = await card.screenshot({ animations: 'allow' });
      }
      return out;
    },
  },
  {
    name: 'view toggle', ids: ['ui-viewtoggle'],
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 800);
      return { 'ui-viewtoggle': await shot(page.locator('button[aria-pressed]').first().locator('..')) };
    },
  },
  {
    name: 'filters phone', ids: ['ui-filters'], phone: true,
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 800);
      await page.locator('button', { hasText: 'Show Filters' }).click();
      await page.waitForTimeout(600);
      return { 'ui-filters': await region(page, 'h1', `${$c('chipLabel')}`, 20) };
    },
  },
  {
    name: 'calendar phone', ids: ['ui-calendar'], phone: true,
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 300);
      await page.locator('button[aria-pressed]').filter({ hasText: 'Calendar' }).click();
      await page.waitForSelector($c('calendarContainer'));
      for (let i = 0; i < 12 && !(await page.getByText('August 2026').count()); i++) {
        await page.locator(`${$c('calendarHeader')} button`).first().click();
        await page.waitForTimeout(150);
      }
      await settle(page, 1000);
      return { 'ui-calendar': await page.screenshot({ animations: 'disabled' }) };
    },
  },
  {
    name: 'timeline phone', ids: ['ui-timeline'], phone: true,
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 300);
      await page.locator('button[aria-pressed]').filter({ hasText: 'Timeline' }).click();
      await page.waitForSelector($c('timeline'));
      await settle(page, 1200);
      return { 'ui-timeline': await page.screenshot({ animations: 'disabled' }) };
    },
  },
  ...[['ui-worldmap', true], ['ui-worldmap-d', false]].map(([id, phone]) => ({
    name: id, ids: [id], phone,
    async run(page, { settle }) {
      await go(page, settle, '/feed', $c('eventCard'), 300);
      await page.locator('button[aria-pressed]').filter({ hasText: 'Map' }).click();
      await page.waitForSelector('.leaflet-container');
      await settle(page, 800);
      await tiles(page, 800);
      // fold the timeline strip so no pin hides under it, then zoom out to the whole world
      await page.locator('button[aria-label="Collapse timeline"]').click().catch(() => {});
      for (let i = 0; i < 2; i++) { await page.locator('.leaflet-control-zoom-out').click(); await page.waitForTimeout(700); }
      if (phone) { // the world is wider than a phone: centre North America so Maui, Juneau, the Tetons and the east-coast cluster all show
        const box = await page.locator('.leaflet-container').boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2 - 20, { steps: 10 });
        await page.mouse.up();
      }
      await tiles(page, 1500);
      return { [id]: phone ? await page.screenshot({ animations: 'disabled' }) : await shot(page.locator($c('mapContainer')).first()) };
    },
  })),
  storyParts('light'),
  storyParts('dark', '-dark'),
  lightboxScene('light'),
  lightboxScene('dark', '-dark'),
  {
    name: 'race story phone', ids: ['ui-story-race-m'], phone: true, viewer: 'sam',
    async run(page, { settle }) {
      await openStory(page, settle, 'dads-first-marathon');
      return { 'ui-story-race-m': await page.screenshot({ animations: 'disabled' }) };
    },
  },
  {
    name: 'quick add', ids: ['ui-quickadd-modes', 'ui-quickadd-input', 'ui-quickadd-recording', 'ui-quickadd-review'],
    async run(page, { settle }, state) {
      await openQuickAdd(page, settle);
      const modal = page.locator($c('modal')).first();
      const out = {};
      out['ui-quickadd-modes'] = await shot(modal);
      await addKitchenPhotos(page, state);
      out['ui-quickadd-input'] = await shot(modal);
      await page.locator($c('voiceButton')).click();
      await page.waitForSelector($c('recordingButton'), { timeout: 10000 });
      await page.waitForTimeout(3300);
      out['ui-quickadd-recording'] = await shot(modal);
      await page.locator($c('recordingButton')).click();
      await page.waitForFunction(() => document.querySelector('textarea')?.value?.length > 20, null, { timeout: 15000 });
      await page.locator($c('generateButton')).click();
      await page.waitForSelector($c('resultPanels'), { timeout: 20000 });
      await settle(page, 1200);
      await page.evaluate(() => {
        const m = document.querySelector('[class*="modalExpanded"]');
        const label = [...m.querySelectorAll('label')].find((l) => l.textContent.trim() === 'AI Result');
        m.scrollTop = label.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 24;
      });
      await page.waitForFunction(() => !document.querySelector('[class*="_toast_"]'), null, { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(500);
      out['ui-quickadd-review'] = await shot(modal);
      return out;
    },
  },
  {
    name: 'smart import', ids: ['ui-import-drop', 'ui-import-albums'],
    async run(page, { settle }) {
      await go(page, settle, '/import', 'h1, h2', 800);
      await page.waitForSelector('input[type="file"]', { state: 'attached' });
      const out = {};
      out['ui-import-drop'] = await shot(page.locator('button', { hasText: 'Choose photos' }).locator('xpath=ancestor::div[contains(@class,"drop") or contains(@class,"Drop")][1]'));
      await page.locator('input[type="file"]').setInputFiles(await photoFiles(IMPORT_ORDER));
      await page.waitForSelector($c('albumCard'), { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5500); // place names arrive one per 1.1 s
      await settle(page, 800);
      out['ui-import-albums'] = await tallClip(page, page.locator('h1, h2', { hasText: 'We found' }).first(), page.getByText('Start over with different photos'), 32);
      return out;
    },
  },
  {
    name: 'create page', ids: ['ui-privacy', 'ui-category'],
    async run(page, { settle }) {
      await go(page, settle, '/create', '.ProseMirror', 800);
      const out = {};
      const privacy = page.locator('label', { hasText: 'Who can see this event?' }).locator('..');
      out['ui-privacy'] = await tallClip(page, privacy, privacy, 14);
      await page.locator('#title').fill('Six weeks without a kitchen');
      const cat = page.locator($c('labelRow')).filter({ hasText: 'Event Category' }).locator('..');
      if (await cat.getByText('1/2 selected').count()) await cat.locator('button', { hasText: 'Daily Life' }).first().click();
      await cat.locator('button', { hasText: 'Projects' }).first().click();
      await page.waitForTimeout(300);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);
      out['ui-category'] = await tallClip(page, cat, cat, 14);
      return out;
    },
  },
  {
    // The Create page cannot take an inline photo with stubs or in production today (see report):
    // the same editor is captured on the kitchen story's Edit page, which holds captioned photos.
    name: 'editor', ids: ['ui-editor'],
    async run(page, { settle }) {
      await openStory(page, settle, 'six-weeks-without-a-kitchen');
      await page.locator('button', { hasText: 'Edit' }).first().click();
      await page.waitForSelector('.ProseMirror img', { timeout: 20000 });
      await settle(page, 1200);
      await page.getByText(/Multimedia captions/i).first().click();
      await page.waitForSelector($c('captionItem'));
      await bgImages(page);
      await settle(page, 800);
      return { 'ui-editor': await shot(page.locator('form').first()) };
    },
  },
  {
    name: 'tetons journey', ids: ['ui-story-tetons-journey'], viewer: 'ruth',
    async run(page, { settle }) {
      await openStory(page, settle, 'seven-days-in-the-tetons');
      await page.locator($c('mapSection')).scrollIntoViewIfNeeded();
      await streetLayer(page);
      // The map opens at zoom 10 on the average of the stops, which puts the northern stops under the
      // fade at the section's top edge. Pan once with Leaflet's own keyboard control (the fade overlay
      // sits over the map and takes mouse drags); zooming in would no longer fit the route.
      await page.locator(`${$c('mapSection')} .leaflet-container`).focus();
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);
      await page.mouse.move(2, 2);
      await tiles(page);
      return { 'ui-story-tetons-journey': await shot(page.locator($c('mapSection')).first()) };
    },
  },
  {
    name: 'tetons phone', ids: ['ui-story-tetons-m'], phone: true, viewer: 'ruth',
    async run(page, { settle }) {
      await openStory(page, settle, 'seven-days-in-the-tetons');
      return { 'ui-story-tetons-m': await page.screenshot({ animations: 'disabled' }) };
    },
  },
  {
    name: 'wedding gallery + lightbox', ids: ['ui-story-wedding-gallery', 'ui-lightbox-wedding'], viewer: 'ruth',
    async run(page, { settle }) {
      await openStory(page, settle, 'kate-and-marcus-get-married');
      await openGrid(page);
      const out = {};
      out['ui-story-wedding-gallery'] = await tallClip(page, page.locator($c('gallerySection')).first(), page.locator($c('gallerySection')).first(), 0);
      // the cover is the confetti photo (cover-wedding is cropped from photo-wedding-confetti)
      await page.locator(`${$c('gallerySection')} ${$c('gridItem')}`).first().click();
      await page.waitForSelector('.yarl__root');
      await settle(page, 1200);
      await page.locator(`.yarl__toolbar ${$c('reactionContainer')}`).hover();
      await page.waitForSelector($c('reactionPickerPortal'));
      await page.waitForTimeout(500);
      out['ui-lightbox-wedding'] = await page.screenshot({ animations: 'disabled' });
      return out;
    },
  },
  {
    name: 'share modal', ids: ['ui-share'],
    async run(page, { settle }) {
      await openStory(page, settle, COAST);
      await page.locator('button', { hasText: 'Share' }).first().click();
      await page.waitForSelector($c('daysSelector'));
      await page.locator($c('dayButton')).filter({ hasText: '3 days' }).click();
      await page.waitForTimeout(400);
      return { 'ui-share': await shot(page.locator(`${$c('overlay')} ${$c('modal')}`).first()) };
    },
  },
  {
    name: 'sharing page', ids: ['ui-groups'],
    async run(page, { settle }) {
      await viaHeader(page, settle, 'Sharing', 'table');
      await page.getByText('Run club', { exact: true }).waitFor();
      const card = page.locator('h3', { hasText: 'Run club' }).locator('xpath=ancestor::div[.//button][1]');
      await card.locator('button', { hasText: '▼' }).first().click().catch(() => {});
      await settle(page, 800);
      const top = page.locator('div').filter({ has: page.locator('h2', { hasText: 'Your Followers' }) }).filter({ hasText: '@deb' }).last();
      const bottom = page.locator('div').filter({ has: page.locator('h2', { hasText: 'Custom Groups' }) }).filter({ hasText: 'Run club' }).last();
      return { 'ui-groups': await tallClip(page, top, bottom, 16) };
    },
  },
  {
    name: 'profile', ids: ['ui-profile'],
    async run(page, { settle }) {
      await viaHeader(page, settle, 'Profile', null);
      await settle(page, 1500);
      return { 'ui-profile': await page.screenshot({ animations: 'disabled' }) };
    },
  },
  {
    name: 'family tree', ids: ['ui-tree'],
    async run(page, { settle }) {
      await viaHeader(page, settle, 'Family', 'h1');
      await page.locator('button', { hasText: /^Tree$/ }).click();
      await page.waitForSelector('.react-flow__node', { timeout: 20000 });
      await bgImages(page);
      await settle(page, 800);
      // the layout puts Kate's card on top of Tom's; move it aside the way a person would, by dragging
      const kate = page.locator('.react-flow__node', { hasText: 'Kate Hartley' });
      const tom = page.locator('.react-flow__node', { hasText: 'Tom Hartley' });
      const kb = await kate.boundingBox(), tb = await tom.boundingBox();
      if (kb && tb && Math.abs(kb.x - tb.x) < tb.width) {
        await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
        await page.mouse.down();
        await page.mouse.move(kb.x + kb.width / 2 + 60, kb.y + kb.height / 2 - 120, { steps: 12 });
        await page.mouse.up();
        await page.mouse.move(5, 5);
      }
      await settle(page, 1500);
      return { 'ui-tree': await page.screenshot({ animations: 'disabled' }) };
    },
  },
];
