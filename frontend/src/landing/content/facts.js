// Every number the landing prints comes from here, through fact(id). (owner: F0)
// value is the text exactly as printed; src is where it was verified in the code.
//
// A package that needs a product number not in this table declares it in
// content/<pkg>.facts.js as  export default { id: { value, src: 'path/file.py:42' } }
// and, in content/<pkg>.js, calls registerFacts(thatObject) before fact() on those ids.
//
// Plain data: imported by the browser, the server render and Node build scripts, so
// imports use explicit .js extensions and nothing here touches a browser global.
import { PRICING } from '../../content/site.js'

/** @typedef {{ value: string, src: string, list?: string[] }} Fact */

/** @type {Record<string, Fact>} */
export const FACTS = {
  audiences: {
    value: '5',
    list: ['Private', 'Custom Group', 'Close Family', 'Followers', 'Public'],
    src: 'frontend/src/components/PrivacySelector.jsx:38-69',
  },
  audienceDefault: { value: 'Followers', src: 'frontend/src/pages/CreateEvent.jsx:35' },
  shareLinkDays: { value: '1 to 5 days', src: 'backend/app/api/share_links.py:14-60' },
  shareLinkDaysMin: { value: '1', src: 'backend/app/api/share_links.py:14-60' },
  shareLinkDaysMax: { value: '5', src: 'backend/app/api/share_links.py:14-60' },
  photosPro: { value: '300', src: 'backend/app/api/upload.py:338' },
  photosTrial: { value: '50', src: 'backend/app/api/upload.py:338' },
  videoSeconds: { value: '60', src: 'frontend/src/components/VideoTrimmer.jsx:95' },
  videosPerStory: { value: '50', src: 'frontend/src/components/RichTextEditor.jsx:19-20' },
  reactions: { value: '10', src: 'frontend/src/components/ImageGallery.jsx:19-30' },
  replyLevels: { value: '3', src: 'frontend/src/pages/EventDetail.jsx:717' },
  mapLayers: { value: '3', list: ['Street', 'Satellite', 'Terrain'], src: 'frontend/src/components/EventMap.jsx:18-30' },
  views: { value: '4', list: ['Feed', 'Calendar', 'Map', 'Timeline'], src: 'frontend/src/components/ViewToggle.jsx:4-7' },
  categories: {
    value: '8',
    list: ['Birthdays', 'Anniversaries', 'Vacations', 'Family Gatherings', 'Holidays', 'Projects', 'Daily Life', 'Milestones'],
    src: 'frontend/src/components/CategorySelector.jsx:5-22',
  },
  categoriesPerStory: { value: '2', src: 'frontend/src/components/CategorySelector.jsx:5-22' },
  aiModes: { value: '3', list: ['Quick Publish', 'AI Draft', 'AI Interview'], src: 'frontend/src/components/QuickAddModal.jsx:688-710' },
  aiPerDay: { value: '5', src: 'backend/app/api/ai_creator.py:22' },
  importMax: { value: '300', src: 'frontend/src/pages/SmartImport.jsx:20' },
  trialDays: { value: '30', src: 'backend/app/api/auth.py:238-252' },
  trialStories: { value: '5', src: 'backend/app/api/events.py:320-331' },
  ads: { value: '0', src: 'no ad code in the repo' },

  // Prices, read from frontend/src/content/site.js (PRICING) at build time.
  priceFree: { value: '$' + PRICING.free.price, src: 'frontend/src/content/site.js:17-22' },
  priceProMonthBilledYearly: { value: '$' + PRICING.proAnnual.price, src: 'frontend/src/content/site.js:17-22' },
  priceProYear: { value: '$' + PRICING.proAnnual.billed, src: 'frontend/src/content/site.js:17-22' },
  priceProMonthly: { value: '$' + PRICING.proMonthly.price, src: 'frontend/src/content/site.js:17-22' },
  priceLifetime: { value: '$' + PRICING.lifetime.price, src: 'frontend/src/content/site.js:17-22' },
}

/** Prices as printed, with the app's plan names. */
export const PRICES = {
  free: { name: 'Free to View', price: FACTS.priceFree.value, period: 'forever' },
  pro: {
    name: 'Pro',
    perMonthBilledYearly: FACTS.priceProMonthBilledYearly.value,
    perYear: FACTS.priceProYear.value,
    perMonth: FACTS.priceProMonthly.value,
  },
  lifetime: { name: 'Lifetime', price: FACTS.priceLifetime.value, period: 'once' },
  currency: PRICING.proAnnual.currency,
}

// A src must name a file and a line: 'backend/app/utils/photo_clustering.py:42'.
export const FACT_SRC_RE = /[\w./-]+\.\w+:\d+/

/**
 * Add a package's own facts (from content/<pkg>.facts.js). Each entry needs a value and a
 * src naming a file and a line. Re-registering an id with the same value is fine; a
 * different value throws.
 * @param {Record<string, {value: string|number, src: string, list?: string[]}>} obj
 */
export function registerFacts(obj) {
  for (const [id, f] of Object.entries(obj || {})) {
    if (!f || f.value == null || !FACT_SRC_RE.test(String(f.src || ''))) {
      throw new Error(`registerFacts: "${id}" needs a value and a src like 'path/file.py:42'`)
    }
    const value = String(f.value)
    if (FACTS[id] && FACTS[id].value !== value) {
      throw new Error(`registerFacts: "${id}" is already ${FACTS[id].value}, cannot become ${value}`)
    }
    FACTS[id] = { ...f, value }
  }
}

/** The fact as printed. Throws on an unknown id, so a typo fails the build, not the page. */
export function fact(id) {
  const f = FACTS[id]
  if (!f) throw new Error(`fact: unknown id "${id}"`)
  return f.value
}

/** The named list behind a counted fact (views, mapLayers, aiModes, categories, audiences). */
export function factList(id) {
  const f = FACTS[id]
  if (!f || !f.list) throw new Error(`factList: "${id}" has no list`)
  return f.list
}
