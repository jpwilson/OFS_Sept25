# Photo books: decisions (26 November 2026)

> **Paused on 26 November 2026 at the owner's request**, after the layout engine's first pass (`frontend/src/daylight/book/engine/`, committed, with tests and saved layouts; nothing imports it). He wants the landing page and the app's new look out first, with no backend, Supabase or Vercel changes; selling books needs all three. Resume from "Phase one packages" below: PREVIEW, PDF and BUILDER are not started.

The owner: "I actually want you to build out the photo book functionality. Find the best photo book companies in the US and then we should be able to integrate with their software so we offer photo books."

Two planners researched print partners and planned this independently. They reached the same partner, the same prices, the same constraint and the same phase one. This file records the decisions.

## Decisions

1. **Print partner: RPI Print's self-service Print API** (the printer behind every Blurb book). Self-serve, free sandbox, unbranded boxes, signed webhooks, public machine-readable prices and page geometry. **Fallback: Lulu Print API** (same two-file model). The consumer favourites (Mixbook, Printique, Shutterfly) have no public API.
   - Catalog, the source of truth for sizes, page limits, bleed, wrap and spine: `https://products.api.rpiprint.com/catalog/v1/products.json` (readable without an account). Docs: `https://docs.api.rpiprint.com/`. Never hard-code a number that the catalog gives.
   - Verified cost on 26 Nov 2026: 8x8 hardcover, 40 pages, $14.40; US standard shipping $6.99, then $2.50 each for copies two to five.
2. **Launch product:** hardcover, image-wrap cover, in **8x8 square** and **10x8 landscape** (same print cost; 10x8 fits 4:3 photos without cropping). 20 to 120 pages, always even. The engine is parametric in trim size so Lulu's 8.5x8.5 and other sizes are a table entry.
3. **The constraint that shapes the layout:** most existing photos are stored at 1500 px on the long edge (2048 px from this checkout's new creation flow) and the original is not kept. So **resolution decides size**: a photo is only given a slot where it prints at 180 pixels per inch or better (150 for a section's lead photo); otherwise the engine frames it smaller by itself. Full-bleed pages are earned. Keeping print-quality originals is a backend change proposed for phase two.
4. **One layout engine, pure JavaScript, no React and no DOM.** It turns a story (through `parseStory` and `buildJourney`) into a fully resolved **display list**: every page, every image rectangle with its crop, every pre-broken line of text with its position, in points. The flip-through preview draws from it and the PDF writer draws from it. Nothing downstream reflows text, so what a family flips through is what prints. Same input, same book, every time.
5. **Phase one (now, this checkout, sample stories, no backend, no partner account):** the engine, the flip-through preview, the few edits worth having, and a downloadable proof PDF made in the browser. Phase two: ordering against the sandbox (backend tables and routes, Stripe one-time payment, the printer). Phase three: live orders. How the print files are rendered for real orders (the same JavaScript in a small Node function, or a drawer in the Python backend fed the display list) is decided at phase two.
6. **How it arrives:** as query views on existing seams, like the map: `/event/:id?view=book` (the builder for one story) and `/feed?view=books` (the shelf). Package name `book`, folder `frontend/src/daylight/book/**`. The PDF library and fonts load lazily and never join the main bundle.
7. **The map page** in phase one is the route as vector art (the `RouteSketch` geometry): sharp at any size, no tiles, no credit needed.
8. **Type in print:** the brand faces as full static TTF files with their SIL Open Font Licence texts (the site ships Latin subsets as WOFF2, which are not enough): Literata for story text, Bricolage Grotesque for titles and captions, DM Mono for labels. A check lists any character with no glyph.
9. **Prices are the owner's.** Working figures for the interface: $39 for up to 40 pages, then bands to 120 pages; shipping at cost. They live in one table, are labelled as working prices in code, and are never typed into components.
10. **Before any book can be paid for (phase two), two things in today's Stripe code must change:** a completed one-time payment currently makes the buyer a lifetime member (`backend/app/api/stripe_api.py:278-283`), and promotion codes must be off for books.
11. **Voice** per `docs/landing/ROUND4.md` section 1. The words "resolution", "ppi" and "bleed" never appear to a customer. A quality note shows only when it helps: "This photo is small, so we've kept it small in the book."

## What a book is

Order: cover (front, spine, back as one wrap; spine text only from 56 pages), title page, optional dedication, the map page ("Where we went") when the story has a journey, sections (one per chapter: an opener, then text and photo pages), photos attached but not placed in the text, "Who was there", a last page with a small wordmark.

Templates at launch: section opener, full bleed, framed single, pair (two landscapes stacked or two portraits side by side), trio (one large and two small), grid of four, text page, text with photo, map, title, dedication, colophon. No image crosses the gutter.

Rules:
- Classify each photo (panorama, landscape, squarish, portrait, tall) and fill pages from each run with a short look-ahead; choose the template with the least cropping; never crop away more than about 15% in a framed slot or 25% for full bleed; keep the top of portraits.
- Who gets the big pages: the story's cover, the first photo of each chapter, a photo alone in its run, photos with captions, and the photo the family reacted to most in its chapter. Always subject to decision 3.
- Text in Literata about 10.5 on 15 points, about 65 characters a line, ragged right, no hyphenation; short text sits beside its photos, longer text gets its own page; a paragraph stays with the first photo that follows it; captions under their photo, never truncated; headings kept with their first lines.
- Stops print as a small label ("STOP 4 · JENNY LAKE · 10:15 AM", local time at the place) matching the numbers on the map page.
- Rhythm: every section has at least one full-page photo; a full-bleed page faces a quiet one; never more than two grid pages in a row.
- Page count even, 20 to 120. Too short: open up to one photo a page, then say "This story makes a slim book. Add another story, or give each photo its own page."
- Margins wider than the printer's safe zone (about 0.5 in outside, 0.625 in at the gutter); bleed and trim from the catalog.

## Phase one packages

| Package | Owns | Delivers |
|---|---|---|
| ENGINE (first) | `book/engine/**`, `frontend/scripts/daylight/book/**` | The product table read from RPI's catalog (a small script saves the entries we use into the repo with the date fetched); story to book source; the paginator and templates; line breaking with real font metrics; the resolution rules; cover geometry; the price function; the display-list format, documented; tests, and saved layouts for the sample stories that the other packages build against |
| PREVIEW | `book/preview/**` | Pages drawn from the display list; the closed cover; the flip-through (one page on a phone, spreads when wide); thumbnails |
| PDF | `book/pdf/**`, `frontend/daylight-public/book/fonts/**` | Interior and cover proof PDFs in the browser in a worker, lazily loaded; fonts embedded; a script that builds every sample story and checks page size, count and fonts against the catalog |
| BUILDER | `book/BookPage.jsx`, `book/ShelfPage.jsx`, `book/builder/**`, `book/sample.js` | The screens: the book already made, flip through, make it yours (cover photo and style, title, dedication, per-photo bigger, smaller, swap, remove; sections on or off; size), and a sample order flow and timeline answered by `sample.js` |
| Director | seams, `dev/only.js`, menus, `check-bundle` | The two views and entry points ("Make a book" on a story, "Books" under You) |

Done when: "Seven days in the Tetons" opens as a book in two taps on a 390-wide phone; every sample story yields an even page count in range with no photo under 150 pixels per inch in its slot; the proof PDF's page sizes match the catalog for the same product and page count; the same input gives the same layout twice; the classic build is still byte-identical and the PDF library is in a lazy chunk.

## What only the owner can do (phase two and three)

Open the RPI Print account and accept its terms; put its keys in the backend's environment (never chat or git); decide prices, the member perk and shipping charges; sales tax registration with an accountant; terms of sale and a reprint policy; order two or three real books and approve paper and finish; say when the photo-book card on the landing page goes live.
