// Prices (owner: book ENGINE).
//
// WORKING PRICES. BOOKS.md decision 9: prices are the owner's. These are working figures for
// the interface ($39 up to 40 pages, then bands to 120 pages; shipping at cost), kept in
// this one table, labelled as working prices, and never typed into a component. The owner
// replaces them before anything can be paid for (phase two).
//
//   WORKING_PRICES                 the table (label, currency, bands)
//   bookPrice(pageCount, {quantity}) -> {unit, total, band, currency, working: true, label}
//   printerCost(productId, pageCount) -> {unit, currency, source}   RPI's catalog formula (what we pay)
//   shippingCost(quantity, {speed}) -> {total, currency, speed, source}   RPI's US rates, at cost
import { getProduct, pageLimits, SHIPPING } from './products.js'

export const WORKING_PRICES = Object.freeze({
  label: 'Working prices: placeholders until the owner sets the real ones (BOOKS.md decision 9)',
  working: true,
  currency: 'USD',
  bands: Object.freeze([
    Object.freeze({ upTo: 40, price: 39 }),
    Object.freeze({ upTo: 60, price: 49 }),
    Object.freeze({ upTo: 80, price: 59 }),
    Object.freeze({ upTo: 100, price: 69 }),
    Object.freeze({ upTo: 120, price: 79 }),
  ]),
})

export function bookPrice(pageCount, { quantity = 1, productId } = {}) {
  if (productId) {
    const lim = pageLimits(productId)
    if (pageCount < lim.min || pageCount > lim.max) throw new Error(`a book has ${lim.min} to ${lim.max} pages`)
  }
  const band = WORKING_PRICES.bands.find((b) => pageCount <= b.upTo)
  if (!band) throw new Error(`no working price for ${pageCount} pages`)
  return { unit: band.price, total: band.price * quantity, band: band.upTo, currency: WORKING_PRICES.currency, working: true, label: WORKING_PRICES.label }
}

// round half to even, to the cent (RPI docs, "How a price is computed")
function cents(v) {
  const x = v * 100
  const f = Math.floor(x)
  const d = x - f
  const r = Math.abs(d - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x)
  return r / 100
}

export function printerCost(productId, pageCount) {
  const p = getProduct(productId)
  const extra = Math.max(0, pageCount - p.catalogPages.min)
  return { unit: cents(p.price.base + p.price.perPage * extra), currency: p.price.currency, source: 'RPI catalog: base price + per-page price × pages above the minimum' }
}

export function shippingCost(quantity = 1, { speed = 'standard' } = {}) {
  const tier = SHIPPING.US.find((t) => t.classification === speed)
  if (!tier) throw new Error(`no ${speed} shipping`)
  let total = 0
  for (let unit = 1; unit <= quantity; unit++) {
    const band = tier.priceBands.find((b) => unit >= b.minQuantity && (b.maxQuantity == null || unit <= b.maxQuantity))
    total += band.unitPrice
  }
  return { total: cents(total), currency: SHIPPING.currency, speed, source: 'RPI US shipping rates (progressive, at cost)' }
}
