// Book engine tests (owner: book ENGINE).   node --test scripts/daylight/book/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadSamples, nodeFonts, photoPath } from './lib/samples.mjs'
import { syntheticStory, everyShape } from './lib/synthetic.mjs'
import {
  layoutBook, bookToJSON, checkBook, coverGeometry, applyEdits, imageSize, pageLimits,
  bookPrice, printerCost, shippingCost, PRODUCTS, LAUNCH_PRODUCTS, spineWidth,
} from '../../../src/daylight/book/engine/index.js'
import { templateBoxes } from '../../../src/daylight/book/engine/products.js'
import { buildFlow, fillText } from '../../../src/daylight/book/engine/templates.js'
import { makeContext } from '../../../src/daylight/book/engine/layout.js'
import { collect } from '../../../src/daylight/book/engine/render.js'

const fonts = await nodeFonts()
const samples = await loadSamples()
const SIZES = LAUNCH_PRODUCTS
const books = []
for (const s of samples) for (const size of SIZES) books.push({ s, size, book: layoutBook(s.source, { fonts, edits: { size } }) })
const tetons = samples.find((s) => /teton/i.test(s.event.title))

// a story with every shape and some photos too small to print large
const mixed = everyShape()
for (const size of SIZES) books.push({ s: mixed, size, book: layoutBook(mixed.source, { fonts, edits: { size } }) })

const spread = (n) => Math.floor(n / 2) // page 1 alone, then 2-3, 4-5, ...

test('determinism: the same input gives the same display list, byte for byte', () => {
  for (const size of SIZES) {
    const a = bookToJSON(layoutBook(tetons.source, { fonts, edits: { size } }))
    const b = bookToJSON(layoutBook(tetons.source, { fonts, edits: { size } }))
    assert.equal(a, b)
  }
  // and the saved fixtures match a fresh build
  const fx = path.resolve(import.meta.dirname, 'fixtures')
  for (const { s, size, book } of books) {
    const f = path.join(fx, `${s.event.slug}.${size}.json`)
    if (!fs.existsSync(f)) continue
    assert.equal(bookToJSON(book) + '\n', fs.readFileSync(f, 'utf8'), `${path.basename(f)} is stale: run build-layouts.mjs`)
  }
})

test('page count: even, between 20 and 120, slim books say so', () => {
  for (const { s, size, book } of books) {
    const lim = pageLimits(size)
    assert.equal(book.pageCount % 2, 0, `${s.event.title} ${size}`)
    assert.ok(book.pageCount >= lim.min && book.pageCount <= lim.max, `${s.event.title} ${size}: ${book.pageCount}`)
    assert.equal(book.pages[book.pages.length - 1].kind, 'colophon')
    assert.equal(book.pages[book.pages.length - 1].side, 'left')
    const blanks = book.pages.filter((p) => p.kind === 'blank').length
    if (blanks > 1) assert.ok(book.notices.some((n) => n.code === 'slim'), `${s.event.title}: blank pages without the slim notice`)
  }
  const galway = books.find((b) => /galway/i.test(b.s.event.title)).book
  assert.equal(galway.notices.find((n) => n.code === 'slim').message, 'This story makes a slim book. Add another story, or give each photo its own page.')
})

test('long books tighten, and say so when they cannot fit', () => {
  const chapters = Array.from({ length: 14 }, (_, i) => ({ title: `Day ${i + 1}: somewhere`, paras: 3, photos: Array.from({ length: 9 }, () => [2400, 1800]) }))
  const long = syntheticStory({ id: 9200, chapters })
  const book = layoutBook(long.source, { fonts, edits: { size: 'hc-8x8' } })
  assert.ok(book.pageCount <= 120 || book.notices.some((n) => n.code === 'too-long'), `${book.pageCount} pages`)
  assert.equal(book.pageCount % 2, 0)
  const huge = syntheticStory({ id: 9300, chapters: Array.from({ length: 40 }, (_, i) => ({ title: `Part ${i + 1}`, paras: 8, sentences: 7, photos: Array.from({ length: 6 }, () => [2400, 1800]) })) })
  const hb = layoutBook(huge.source, { fonts, edits: { size: 'hc-8x8' } })
  assert.ok(hb.pageCount > 120)
  assert.ok(hb.notices.some((n) => n.code === 'too-long'))
})

test('resolution: no photo prints under its floor; small photos are kept small and said so', () => {
  for (const { s, size, book } of books) {
    for (const page of book.pages) {
      for (const it of collect(page.items, (x) => x.type === 'image')) {
        assert.ok(it.floor >= 150, 'floors are 180, or 150 for a lead or cover photo')
        assert.ok(it.ppi >= it.floor, `${s.event.title} ${size} p${page.number}: ${it.ref} ${it.ppi} < ${it.floor}`)
      }
    }
    for (const it of collect(book.cover.items, (x) => x.type === 'image')) assert.ok(it.ppi >= 150)
  }
  const mb = books.find((b) => b.s === mixed && b.size === 'hc-8x8').book
  const held = mb.notices.filter((n) => n.code === 'held-small')
  assert.ok(held.length >= 1, 'the 543 x 911 photo is held small')
  assert.equal(held[0].message, "This photo is small, so we've kept it small in the book.")
  for (const h of held) {
    const page = mb.pages[h.page - 1]
    const img = collect(page.items, (x) => x.type === 'image' && x.ref === h.photoId)[0]
    assert.equal(img.frame, 'mat', 'a small photo is matted, not stretched')
  }
})

test('safe zone and crop caps: checkBook finds nothing in any book', () => {
  for (const { s, size, book } of books) assert.deepEqual(checkBook(book), [], `${s.event.title} ${size}`)
})

test('no image crosses the gutter or leaves its page', () => {
  for (const { book } of books) {
    for (const page of book.pages) {
      for (const it of collect(page.items, (x) => x.type === 'image')) {
        assert.ok(it.x >= -0.01 && it.x + it.w <= page.size.w + 0.01)
        if (it.fit !== 'bleed') {
          const gutter = page.side === 'left' ? page.trim.x + page.trim.w : page.trim.x
          assert.ok(page.side === 'left' ? it.x + it.w <= gutter : it.x >= gutter, 'clear of the gutter')
        }
      }
    }
  }
})

test('keep-together: a paragraph shares a spread with the first photo after it', () => {
  for (const { s, size, book } of books) {
    const { source } = applyEdits(s.source, { size })
    for (const page of book.pages) {
      if (!page.text || !page.text.ends) continue
      const sec = source.sections.find((x) => x.id === page.section)
      const unit = sec.units[page.text.unit]
      if (!unit.photos.length) continue
      const photoPage = book.pages.find((p) => p.photos.includes(unit.photos[0]))
      assert.ok(photoPage, `${unit.photos[0]} is in the book`)
      assert.equal(spread(photoPage.number), spread(page.number), `${s.event.title} ${size}: text ends p${page.number}, its photo is on p${photoPage.number}`)
    }
  }
})

test('keep-together: headings and stop labels stay with their first lines; no single-line orphans or widows', () => {
  const ctx = makeContext(PRODUCTS['hc-8x8'], fonts)
  for (const sec of tetons.source.sections) {
    for (const u of sec.units) {
      const flow = buildFlow(ctx, u.paras)
      // 60 points is smaller than any real text area: there only progress is required
      for (const avail of [60, 120, 200, 333, 495]) {
        let a = 0
        while (a < flow.length) {
          const b = fillText(flow, a, avail)
          assert.ok(b > a)
          if (b < flow.length) {
            const last = flow[b - 1], next = flow[b]
            if (avail >= 120) assert.ok(last.kind === 'line', `a ${last.kind} is not the last thing on a page`)
            if (next.kind === 'line' && next.idx > 0) {
              const paraStart = b - next.idx
              if (paraStart > a && avail >= 120) {
                assert.ok(next.idx >= 2, 'no first line of a paragraph alone at the foot of a page')
                assert.ok(next.n - next.idx >= 2, 'no last line of a paragraph alone at the top of a page')
              }
            }
          }
          a = b
        }
      }
    }
  }
})

test('rhythm: each section has a full-page photo; never three grid pages running; full bleed faces a quiet page', () => {
  for (const { s, size, book } of books) {
    let run = 0
    for (const page of book.pages) {
      run = page.template === 'grid' ? run + 1 : 0
      assert.ok(run <= 2)
      if (page.template === 'full-bleed') {
        const facing = book.pages[page.side === 'left' ? page.index + 1 : page.index - 1]
        assert.ok(!facing || ['text', 'opener', 'opener-text', 'title', 'map', 'blank', 'dedication'].includes(facing.kind) || facing.template === 'framed')
      }
    }
    for (const sec of book.sections) {
      const pages = book.pages.filter((p) => p.section === sec.id)
      const photos = pages.flatMap((p) => p.photos)
      if (!photos.length) continue
      const big = pages.some((p) => {
        const imgs = collect(p.items, (x) => x.type === 'image')
        return imgs.length === 1 && imgs[0].w * imgs[0].h >= 0.45 * p.content.w * p.content.h
      })
      // exempt: a section whose photos are all too small to fill half a page at 150 ppi
      const C = pages[0].content
      const allSmall = photos.every((id) => { const px = book.images[id].px; return (px.w / 150) * 72 * (px.h / 150) * 72 < 0.45 * C.w * C.h })
      assert.ok(big || allSmall, `${s.event.title} ${size}: section ${sec.id} has no full-page photo`)
    }
  }
})

test('cover geometry matches the printer\'s own templates', () => {
  for (const id of ['hc-8x8', 'hc-10x8', 'sc-8x8']) {
    const boxes = templateBoxes(id)
    assert.ok(boxes, `templates saved for ${id}`)
    for (const [n, b] of Object.entries(boxes.cover)) {
      const g = coverGeometry(id, +n)
      assert.ok(Math.abs(g.size.w - b.MediaBox[2]) < 0.01, `${id} ${n} pages: width ${g.size.w} vs ${b.MediaBox[2]}`)
      assert.ok(Math.abs(g.size.h - b.MediaBox[3]) < 0.01)
      assert.ok(Math.abs(g.trim.x - b.TrimBox[0]) < 0.01 && Math.abs(g.trim.x + g.trim.w - b.TrimBox[2]) < 0.01)
      assert.ok(Math.abs(g.trim.y - b.TrimBox[1]) < 0.01 && Math.abs(g.trim.y + g.trim.h - b.TrimBox[3]) < 0.01)
      if (g.binding === 'hardcover') assert.equal(g.spineText, +n >= 56, 'spine text from 56 pages')
      else assert.ok(!g.spineText || +n >= 56)
      assert.ok(Math.abs(g.panels.front.x + g.panels.front.w - (g.trim.x + g.trim.w)) < 1e-9)
      if (g.binding === 'hardcover') assert.equal(g.hinge.length, 2)
    }
    // interior pages: trim plus bleed
    const p = boxes.pages
    const book = books.find((x) => x.size === id)
    if (book) {
      assert.equal(book.book.pages[1].size.w, p.MediaBox[2])
      assert.equal(book.book.pages[1].size.h, p.MediaBox[3])
    }
  }
  // spine grows with the page count, by the catalog's bands
  assert.ok(spineWidth('hc-8x8', 56) > spineWidth('hc-8x8', 54))
  assert.equal(spineWidth('sc-8x8', 40), 9)
})

test('edits are constraints, reapplied the same way after any reflow', () => {
  const ids = Object.keys(tetons.source.photos)
  const big = ids[5], gone = ids[8], swapA = ids[10], swapB = ids[20]
  const sectionOff = tetons.source.sections[3].id
  const edits = { photos: { [big]: 'bigger', [gone]: 'removed' }, swaps: [[swapA, swapB]], sections: { [sectionOff]: false }, cover: { photoId: ids[12], style: 'framed' }, title: 'Our Tetons', dedication: 'For Leo, who saw the moose first.', map: false }
  const results = []
  for (const size of SIZES) {
    const book = layoutBook(tetons.source, { fonts, edits: { ...edits, size } })
    results.push(book)
    const where = (id) => book.pages.find((p) => p.photos.includes(id))
    assert.ok(!where(gone), 'removed photo is gone')
    const bp = where(big)
    assert.equal(bp.photos.length, 1, 'bigger photo has its own page')
    assert.ok(!book.pages.some((p) => p.section === sectionOff), 'section left out')
    assert.ok(!book.pages.some((p) => p.kind === 'map'), 'map off')
    assert.ok(book.pages.some((p) => p.kind === 'dedication'))
    assert.equal(book.title, 'Our Tetons')
    assert.equal(book.cover.photo.id, ids[12])
    assert.equal(book.cover.style, 'framed')
    assert.ok(where(swapA).number > where(swapB).number, 'swapped photos traded places')
    assert.deepEqual(book.edits.ignored, [])
    assert.deepEqual(checkBook(book), [])
    // the same edits again give the same bytes
    assert.equal(bookToJSON(book), bookToJSON(layoutBook(tetons.source, { fonts, edits: { ...edits, size } })))
  }
  // a photo made smaller never gets a page to itself
  const small = layoutBook(tetons.source, { fonts, edits: { photos: { [ids[3]]: 'smaller' } } })
  const sp = small.pages.find((p) => p.photos.includes(ids[3]))
  assert.ok(sp.photos.length > 1 || collect(sp.items, (x) => x.type === 'image')[0].w * collect(sp.items, (x) => x.type === 'image')[0].h < 0.35 * sp.content.w * sp.content.h)
  // an edit naming a photo that is not there is ignored, not fatal
  const odd = layoutBook(tetons.source, { fonts, edits: { photos: { 'img-nope': 'bigger' } } })
  assert.equal(odd.edits.ignored.length, 1)
})

test('prices: the catalog\'s printer cost, RPI shipping, and working prices clearly labelled', () => {
  assert.equal(printerCost('hc-8x8', 40).unit, 14.4) // BOOKS.md: verified $14.40 on 26 Nov 2026
  assert.equal(printerCost('hc-8x8', 20).unit, 12.6)
  assert.equal(shippingCost(1).total, 6.99)
  assert.equal(shippingCost(3).total, 11.99)
  const p = bookPrice(40)
  assert.equal(p.unit, 39)
  assert.equal(p.working, true)
  assert.match(p.label, /[Ww]orking prices/)
  assert.ok(bookPrice(41).unit > 39 && bookPrice(120).unit >= bookPrice(100).unit)
  assert.throws(() => bookPrice(122))
})

test('type: every character in every sample book has a glyph', () => {
  for (const { s, book } of books) assert.ok(!book.notices.some((n) => n.code === 'missing-glyphs'), s.event.title)
})

test('photo sizes come from the files, not the stored numbers', () => {
  const file = photoPath(tetons.event.cover_image_url)
  assert.deepEqual(imageSize(fs.readFileSync(file)), { w: 1200, h: 750, type: 'webp' })
  assert.equal(tetons.event.event_images[0].width, 1448, 'the stored width is wrong for this file')
  const cover = Object.values(tetons.source.photos).find((p) => p.cover)
  assert.deepEqual(cover.px, { w: 1200, h: 750 })
  assert.equal(cover.sizeFrom, 'measured')
})
