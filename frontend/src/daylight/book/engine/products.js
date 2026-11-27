// The products a book can be printed as (owner: book ENGINE). Every size, page limit,
// bleed, safe zone, cover allowance, spine width and printer price comes from the saved
// copy of RPI Print's catalog (data/rpi-catalog.js, written by
// scripts/daylight/book/fetch-catalog.mjs). Nothing here types one of those numbers.
//
//   PRODUCTS                  {[id]: Product}, ids 'hc-8x8' 'hc-10x8' (launch), 'hc-8.5x11', 'sc-8x8', 'sc-10x8', 'sc-8.5x11'
//   LAUNCH_PRODUCTS           ['hc-8x8', 'hc-10x8']
//   DEFAULT_PRODUCT           'hc-8x8'
//   getProduct(id) -> Product (throws on an unknown id)
//   pageLimits(product) -> {min, max, step}   the book's own range inside the catalog's (20 to 120, even)
//   spineWidth(product, pageCount) -> points  catalog rule: BY_PAGECOUNT_RANGES or CALCULATED_SOFTCOVER
//   CATALOG_INFO              {catalogGeneratedAt, fetchedAt, source}
//
// Product: {id, label, launch, sku, name, description, binding:'hardcover'|'softcover',
//   orientation:'square'|'landscape'|'portrait', trim:{w,h}, bleed:{top,bottom,inside,outside},
//   safe:{top,bottom,inside,outside}, minPpi, catalogPages:{min,max,step}, cover:{...cover_spec,
//   rule, hasHinge, sheetsPerInch, minPagesForSpine}, price:{base, perPage, currency}}
import CATALOG from './data/rpi-catalog.js'

/** BOOKS.md decision 2: a book is 20 to 120 pages, always even (inside the catalog's own range). */
export const BOOK_PAGES = { min: 20, max: 120 }
export const LAUNCH_PRODUCTS = Object.values(CATALOG.products).filter((p) => p.launch).map((p) => p.id)
export const DEFAULT_PRODUCT = 'hc-8x8'
export const CATALOG_INFO = { catalogGeneratedAt: CATALOG.catalogGeneratedAt, fetchedAt: CATALOG.fetchedAt, source: CATALOG.source }

function toProduct({ id, label, launch, record }) {
  const spec = record.specification
  const pages = spec.pages_spec
  const a = record.attributes
  const w = pages.post_trim_width, h = pages.post_trim_height
  return {
    id,
    label,
    launch,
    sku: record.manufacturingSku,
    name: record.name,
    description: record.description,
    binding: a.coverType === 'SCIW' ? 'softcover' : 'hardcover',
    orientation: w === h ? 'square' : w > h ? 'landscape' : 'portrait',
    trim: { w, h },
    bleed: { ...pages.bleeds },
    safe: { ...pages.safe_zone },
    minPpi: spec.minimum_image_ppi,
    catalogPages: { min: pages.min_page_count, max: pages.max_page_count, step: pages.page_count_mod },
    cover: {
      ...spec.cover_spec,
      rule: spec.rules.cover_rule,
      hasHinge: !!spec.rules.has_hinge,
      sheetsPerInch: spec.rules.paper_rules.paper_sheets_per_inch,
      minPagesForSpine: spec.rules.paper_rules.min_page_count_for_spine,
    },
    price: { base: Number(record.basePrice), perPage: Number(record.perPagePrice), currency: CATALOG.currency },
  }
}

export const PRODUCTS = Object.fromEntries(Object.values(CATALOG.products).map((p) => [p.id, toProduct(p)]))

export function getProduct(id = DEFAULT_PRODUCT) {
  const p = typeof id === 'object' && id ? id : PRODUCTS[id]
  if (!p) throw new Error(`unknown book product "${id}"`)
  return p
}

export function pageLimits(product) {
  const p = getProduct(product)
  const step = p.catalogPages.step
  const min = Math.max(BOOK_PAGES.min, p.catalogPages.min)
  const max = Math.min(BOOK_PAGES.max, p.catalogPages.max)
  return { min: Math.ceil(min / step) * step, max: Math.floor(max / step) * step, step }
}

/** Spine width in points for a page count, by the catalog's own rule for this product. */
export function spineWidth(product, pageCount) {
  const p = getProduct(product)
  const c = p.cover
  if (c.width_calculation_type === 'BY_PAGECOUNT_RANGES') {
    const r = c.per_pagecount_specs.find((x) => pageCount >= x.from && pageCount <= x.to)
    if (!r) throw new Error(`${p.id}: no spine width for ${pageCount} pages`)
    return r.spine_width
  }
  if (c.width_calculation_type === 'CALCULATED_SOFTCOVER') {
    // RPI docs, "Spine width": ceil(pageCount × 16 / sheetsPerInch) × 72 / 16
    return (Math.ceil((pageCount * 16) / c.sheetsPerInch) * 72) / 16
  }
  throw new Error(`${p.id}: unknown spine rule ${c.width_calculation_type}`)
}

/** The printer's saved template page boxes, for checks (only for the products fetched with templates). */
export function templateBoxes(id) {
  return CATALOG.templates?.boxes?.[id] || null
}

/** The printer's US shipping tiers as saved (used by price.js). */
export const SHIPPING = CATALOG.shipping
