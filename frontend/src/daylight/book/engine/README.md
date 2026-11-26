# Book engine

Pure JavaScript (no React, no DOM, no clock, no time zone) that turns a story into a fully laid-out photo book: the **display list**. The flip-through preview and the PDF writer both draw from it and make no layout decision of their own. Same input, same bytes (`bookToJSON`). Spec: `docs/app/BOOKS.md`.

Load it lazily (it is about 80 KB minified, most of it the saved catalog); it imports only `styles/tokens.js`, `lib/format.js` and `lib/geo.js`.

## Using it

```js
import { loadFonts, measurePhotos, buildSource, layoutBook, FONT_BASE } from './engine/index.js'
import { parseStory } from '../lib/storyBlocks.js'
import { buildJourney } from '../lib/journey.js'

const fonts = await loadFonts((file) => fetch(FONT_BASE + file).then((r) => r.arrayBuffer()))   // once
const parsed = parseStory(event.description, event.event_images)
const journey = buildJourney(event, parsed)
// real pixel sizes: the stored width/height are often missing or wrong (BOOKS.md decision 3)
const measured = await measurePhotos(parsed.media.map((m) => m.src),
  (src) => fetch(src, { headers: { Range: 'bytes=0-131071' } }).then((r) => r.arrayBuffer()))
const source = buildSource({ event, parsed, journey, tags, mediaStats, measured })
const book = layoutBook(source, { fonts, edits })      // edits: see "Edits"
```

| Export | What it does |
|---|---|
| `loadFonts(readBytes)`, `makeFonts(bytesById)` | Parse the book's TTFs (`daylight-public/book/fonts/`, served at `FONT_BASE` = `/book/fonts/`). `FONT_FILES` maps font id to file. |
| `measurePhotos(srcs, readHead)`, `imageSize(bytes)` | Pixel size from a file's first bytes (JPEG with EXIF orientation, PNG, WebP, GIF). |
| `buildSource({event, parsed, journey, tags, mediaStats, measured})` | Story to neutral book source (sections from chapters, units of text and the photos after it, stops, route, people, cover candidates). |
| `layoutBook(source, {fonts, edits})` | The Book (below). |
| `bookToJSON(book)` | Stable serialisation. |
| `checkBook(book)` | The rules re-checked on a finished book: even count in range, every image at or above its floor, crop caps, nothing outside the safe zone, nothing past the page edge. Returns a list of problems. |
| `coverGeometry(productId, pageCount)`, `layoutCover(...)`, `coverStyleFor(...)` | The one-piece cover. |
| `PRODUCTS`, `LAUNCH_PRODUCTS`, `DEFAULT_PRODUCT`, `getProduct`, `pageLimits`, `spineWidth`, `CATALOG_INFO` | Products from the saved RPI catalog (`data/rpi-catalog.js`, written by `scripts/daylight/book/fetch-catalog.mjs`). |
| `bookPrice`, `WORKING_PRICES`, `printerCost`, `shippingCost` | Working prices (labelled as such), RPI's cost formula, RPI's US shipping bands. |
| `applyEdits`, `normaliseEdits`, `COVER_STYLES` | Edits as constraints. |

## The display list (frozen format, version 1)

**Units are points (1/72 inch). Every page has its own coordinate space: origin at the top left of its media box (the bleed box), y down.** A PDF writer flips y (`pdfY = page.size.h - y`) and sets `MediaBox = BleedBox = [0 0 size.w size.h]`, `TrimBox = trim`. Colours are opaque sRGB hex strings. Numbers are rounded to 0.01 pt.

```
Book {
  format: 'ofs-book-display-list', version: 1, engine: '1.0.0', units: 'pt', origin: '...'
  story: {id, slug, title}
  title                     the title as printed (after edits)
  product: {id, sku, label, binding, trim:{w,h}, bleed:{top,bottom,inside,outside}, safe:{...}, catalog:{catalogGeneratedAt, fetchedAt, source}}
  pageCount, limits: {min, max, step}
  fonts:  {[fontId]: {file, family, weight, style, url}}         only the fonts the book uses
  images: {[photoId]: {src, px:{w,h}, sizeFrom:'measured'|'stored'|'assumed', caption}}
  cover:  Cover
  pages:  [Page]
  sections: [{id, kind:'intro'|'chapter'|'more', title, label, firstPage, lastPage}]
  notices: [{code, message, ...}]   for the person; codes: slim, too-long, held-small (photoId, page),
                                    videos (count), missing-glyphs (chars), cover-style
  edits: {...normalised edits, applied:[string], ignored:[string]}
  stats: {templates:{[template]: n}, minPpi, measure, contentBox, margins}
}

Page {
  index (0-based), number (1-based; odd = right page), side: 'left'|'right'
  kind:     title | dedication | map | opener | opener-text | opener-photo | text | text-photo |
            text-photo-side | photo-text | photos | people | colophon | blank
  template: kind, or for kind 'photos': full-bleed | framed | pair-stack | pair-side | pair-stagger | trio | grid
  section:  section id or null
  size:{w,h}                media box (trim + bleed)
  trim, bleed, safe, content: {x,y,w,h}   in this page's coordinates (bleed = the media box)
  background: '#RRGGBB'     fill the whole media box with it first
  folio: bool               whether a page number is among the items
  photos: [photoId]         in drawing order
  text: {unit, from, to, ends} | null      which story text the page carries (for the builder)
  items: [Item]             draw in order; later items on top
}

Cover {
  style: 'photo'|'framed'|'type', size:{w,h}, trim, bleed (= media), wrap:{top,bottom,left,right},
  panels:{back, spine, front} (each {x,y,w,h} at the trim), hinge:[back, front] (hardcover; keep faces and words out),
  safe:{back, front, spine}, spineWidth, spineText (bool: title on the spine from 56 pages),
  background, photo:{id, ppi}|null, items:[Item]          one PDF page; same coordinates as a page
}
```

Items (every field shown is always present unless marked optional):

```
{type:'rect',   x, y, w, h, fill|null, r? (corner radius), stroke?, strokeWidth?}
{type:'circle', cx, cy, r, fill|null, stroke?, strokeWidth?}
{type:'path',   d, fill?, stroke?, strokeWidth?, lineCap?, lineJoin?}
                d uses only absolute M, L, C and Z, in page points
{type:'text',   x, y, text, font, size, color, w, tracking?}
                ONE run on ONE line: x is the run's left edge, y its baseline. The line is already
                broken and positioned; never re-wrap, re-align or re-measure. font is a font id
                (book.fonts). tracking: extra space after each character, in points (CSS
                letter-spacing, PDF Tc). w is the advance width the engine measured, kerning
                included, so draw with the font's kerning on (browsers do by default; a PDF writer
                must lay the run out with GPOS kerning, as pdf-lib does with fontkit).
{type:'image',  ref, x, y, w, h, crop:{x,y,w,h}, ppi, floor, fit?:'bleed', frame?:'plain'|'mat'|'bleed'}
                Draw the crop rectangle of the source image (in its own pixels, book.images[ref].px)
                exactly into the box. crop has the box's aspect. ppi = the effective pixels per
                inch at this size (>= floor: 180, or 150 for a lead or cover photo). A mat's card is
                its own rect item, drawn before.
{type:'group',  rotate (degrees, clockwise), ox, oy, items:[Item]}
                rotate the group's items about (ox, oy): stickers (-2°) and spine text (90°)
```

A drawer needs: fill a rect (optionally rounded and stroked), a circle, a path, a text run in a given font at a given baseline with letter-spacing, an image clipped from a source rectangle, and one rotation. Nothing else. `scripts/daylight/book/lib/svg.mjs` is a complete reference drawer (about 80 lines).

## Edits

```
{ size: 'hc-8x8'|'hc-10x8'|..., title, subtitle, dedication,
  cover: {photoId, style:'photo'|'framed'|'type'},
  photos: {[photoId]: 'bigger'|'smaller'|'removed'},
  swaps: [[photoIdA, photoIdB]], sections: {[sectionId]: false}, map: true|false }
```

Keyed by photo and section ids, never by page, so they survive any reflow; `applyEdits` runs before the paginator every time. 'bigger' gives a photo a page of its own (still limited by its pixels); 'smaller' keeps it in a group or matted small; a cover style the photo cannot carry falls back (and says so in `notices`).

## How a book is made (what the code decides)

- **Order**: title page, dedication (if any), "Where we went" (when the route has two or more numbered stops), sections (one per chapter, opener first), "More photos" (attached but not placed in the text), "Who was there" (two or more people), the last page (a left page) with the wordmark. When the count would be odd, "Who was there" shares the last page.
- **Resolution decides size**: a slot is only as large as its pixels allow at 180 ppi (150 for a section's lead photo and the cover). A single photo that ends up under half the content area is matted on a paper card and centred; small photos in a group are matted too. Full bleed needs the pixels for the whole bleed box, so with today's 1448 px photos it is not earned; the framed single is the full-page photo.
- **Least cropping**: every template tries the photos' own shapes and tighter crops within the caps (15% framed, 25% full bleed); portraits keep their top.
- **Pagination**: a dynamic programme per section, chained by page parity. Cost = pages × density − Σ priority × √(share of the page) + 2.5 × crop + rhythm penalties. Priority: lead photo, cover photo, alone in its run, captioned, most reacted-to in its chapter, 'bigger'. Hard rules: the text before a photo ends on the same spread as that photo; full bleed faces a quiet page; at most two grid pages in a row; every section with photos gets a photo on most of a page unless its photos are all too small.
- **Text**: Literata 10.5/15, a measure of about 65 characters computed from the font's real widths, ragged right, no hyphenation; headings and stop labels keep with two lines; no single first or last line of a paragraph alone. Stop labels read `STOP 4 · JENNY LAKE · 9:20 AM`, numbered as on the map, the time read from the wall clock at the place.
- **Page count**: even, 20 to 120. Short: lower density, then one photo a page, then blank pages before the back matter and the notice "This story makes a slim book. Add another story, or give each photo its own page." Long: higher density, singles only for leads; past 120 the notice `too-long`.

## Files

`index.js` front door · `source.js` story to source · `edits.js` · `layout.js` paginator · `templates.js` photo templates and the text flow · `render.js` plans to items (opener, map, people, wordmark) · `cover.js` · `text.js` measuring and line breaking · `fontfile.js` a small TrueType reader (cmap, hmtx, GPOS/kern pair kerning; no dependency, so nothing is added to package.json) · `measure.js` image headers · `html.js` story HTML to styled runs · `products.js`, `data/rpi-catalog.js` · `price.js` · `style.js` colours, type, margins · `draw.js` item constructors.

Scripts (`frontend/scripts/daylight/book/`): `fetch-catalog.mjs`, `fetch-fonts.mjs`, `build-layouts.mjs` (fixtures; `--check` for determinism), `render-sheets.mjs` (contact sheets in `shots/daylight-book-engine/`), `check-parser.mjs` (the Node parser equals Chromium's), `engine.test.mjs` (`node --test scripts/daylight/book/engine.test.mjs`).
