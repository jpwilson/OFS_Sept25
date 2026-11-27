# PAGES handover: the marketing pages in the landing's look

The pages the new landing links to (`/alternatives`, the five `/compare/*`, `/features`, `/pricing`, `/faq`, `/about`, `/contact`, `/blog`, `/privacy`, `/terms` and the 404) now render in the landing's brand in a **story** build. A **classic** build is byte-for-byte what it was. No words, prices, headings, links, titles, descriptions or structured data changed.

## How it is gated

One Vite plugin, `frontend/scripts/landing/story-pages.mjs`, registered in `vite.config.js` only when the variant is `story`:

```js
LANDING_VARIANT === 'story' && storyPages(...)
```

In a classic build the plugin does not exist, so no app file is compiled any differently. The plugin swaps modules at resolve time; no app page, component or stylesheet was edited:

| App module | Story module | What it does |
|---|---|---|
| `src/components/MarketingPage.jsx` | `src/landing/pages/MarketingPage.jsx` | Renders the same `marketing.js` blocks for `/features`, `/alternatives`, `/compare/*`: wash head (back pill, display h1 with the last word on a sticker, lede, the page's own CTA, date, cut-out on the floor), then one keylined sheet per h2. Runs of h3 + paragraph become wash-topped cards. |
| `src/pages/{FAQ,PricingPage,About,Contact,Blog,Privacy,Terms,NotFound}.jsx` | `src/landing/pages/routes/<Name>.jsx` | A three-line wrapper: `<Frame path><OriginalPage/></Frame>`. The page and every word on it is the original file. |
| `src/pages/{FAQ,PricingPage,About,Contact,Blog,Legal}.module.css` | `src/landing/pages/css/<Name>.module.css` | Same class names, story styles. |
| `src/pages/Compare.module.css`, only when imported by `NotFound.jsx` | `src/landing/pages/css/NotFound.module.css` | (Classic `Landing.jsx` also imports Compare.module.css and is left alone.) |
| `src/components/Header.jsx` / `Footer.jsx`, only when imported by `Layout.jsx` | `src/landing/pages/AppHeader.jsx` / `AppFooter.jsx` | Step aside while a story page is mounted (see below). |

A wrapper reaches the original it wraps because nothing is swapped for an importer inside `src/landing/pages/`.

## The frame (`src/landing/pages/Frame.jsx`)

- Root `<div class="ofsl">` (no `data-ofsl`, which the app-boot hide rule targets) with the landing's fonts, tokens, base and `css/shared.css`; adds `html.ofsl-on` (paper ground) on mount.
- Signed-out visitors: the landing's own `Nav` (with `base="/"`, so "How it works" etc. lead to `/#lp-…` on the landing) and the landing's `Footer`.
- The page's look comes from `look.js` by path: a wash and one cut-out id from `art/manifest.json` (`small: true` for heads with one line of copy). The frame looks the id up with `maybeArt()` and passes it as CSS variables (`--ph-art`, `--ph-ar`, `--ph-ax`); the page head draws it standing on the deep-wash floor with a contact shadow. MarketingPage uses the real `<Cutout>` primitive instead.
- `chrome.js`: a tiny store the frame claims in a layout effect, so Layout's header and footer re-render before paint and never flash under the landing nav.

## Signed-in members

- Inside the app Layout (`/faq`, `/pricing`, `/about`, `/blog`, `/features`, `/alternatives`, `/compare/*`, 404): they keep the app header (and the trial banner, feedback button) they navigate with, then the bright page, then the landing footer. No landing nav (no "Log in / Start free" for someone signed in).
- `/privacy`, `/terms`, `/contact` (outside Layout, as before): no landing nav; the page's own small "Our Family Socials" logo bar shows as a white pill (it is hidden only when the landing nav is shown).
- While auth is still loading and storage holds a session hint, the frame shows no nav at all rather than flashing the signed-out nav.
- Verified with a mocked Supabase session (scratch script, not committed): `/faq` and `/alternatives` show the app header and no landing nav; `/privacy` shows the logo pill.

## Specificity rules (read before editing the CSS)

- `css/shared.css` is a plain global sheet loaded once by the frame. Every rule is one class strong: `:where(.ofsl) .ph-x`. Page modules pick them up with `composes: ph-x from global`.
- Every rule in a page module is two classes strong: `:global(.ofsl) .y`. That beats both the landing reset and shared.css whatever order the bundler emits the sheets in.
- Do not `composes: … from './some.module.css'` here: Vite re-embeds the composed file into every composing module, and the later copies override earlier pages' rules.
- `composes` only works on a single-class selector; put the page's own declarations in a separate `:global(.ofsl) .y` rule.

## Prerender and SEO

- `scripts/prerender.mjs`: in the story variant only, the static shell uses `STORY_SHELL_STYLE` (paper ground, ink text, the h1 on a tide wash, the nav as a white keylined pill) instead of the dark one. Classic keeps `SHELL_STYLE`. The body markup (`renderBody`) is unchanged, so the static HTML carries the same full copy, one `<h1>`, title, description and JSON-LD.
- `prerender.mjs`, `check-seo.mjs` and `serve-dist.mjs` accept `OFS_DIST` (and prerender `OFS_DIST_SSR`) to work on a build outside the shared `dist/`. Defaults unchanged.

Check without touching `dist/`:

```sh
cd frontend
S=<scratch>; SSR=node_modules/.cache/ofs-pages-ssr   # SSR output must sit under frontend/ to resolve react
VITE_LANDING=story npx vite build --outDir $S/story --emptyOutDir
VITE_LANDING=story npx vite build --config vite.landing-ssr.config.js --outDir $SSR --emptyOutDir
VITE_LANDING=story OFS_DIST=$S/story OFS_DIST_SSR=$SSR node scripts/prerender.mjs
VITE_LANDING=story OFS_DIST=$S/story node scripts/check-seo.mjs
```

## How to shoot it

```sh
cd frontend
VITE_LANDING=story npx vite --port 5348 --strictPort --host 127.0.0.1      # or: OFS_DIST=$S/story node scripts/serve-dist.mjs 5349
node scripts/landing/page-shots.mjs --url http://127.0.0.1:5348            # --only m,tp,tl,d  --pages /faq,/pricing
```

Writes `shots/pages-<m|tp|tl|d>/<nn>-<page>.jpg` (full page) and `sheet.jpg` (every page side by side): phone 390x844, iPad portrait 820x1180, iPad landscape 1180x820, desktop 1440x900. It prints console errors, sideways scroll, and on touch sizes any link or control under 44px. On `/faq` it opens the first question. A `--pages` run keeps the other shots but rewrites the sheet with only those pages. The 404 for `/_vercel/insights/script.js` on a local static server is expected.

## Files

New: `scripts/landing/story-pages.mjs`, `scripts/landing/page-shots.mjs`, `src/landing/pages/` (`Frame.jsx`, `Frame.module.css`, `MarketingPage.jsx`, `MarketingPage.module.css`, `AppHeader.jsx`, `AppFooter.jsx`, `chrome.js`, `look.js`, `routes/*.jsx`, `css/shared.css`, `css/*.module.css`).

Changed (shared): `vite.config.js` (registers the plugin in story only), `src/landing/close/Nav.jsx` (optional `base` prefix for its section links; default `''`, so the landing is unchanged), `scripts/prerender.mjs` (story shell style, `OFS_DIST`/`OFS_DIST_SSR`), `scripts/check-seo.mjs` and `scripts/serve-dist.mjs` (`OFS_DIST`).

## Known weak spots

- Short heads (`/pricing`, `/contact`, `/blog`) leave an empty stretch of wash beside a small cut-out on desktop; on phones the cut-out on those pages stands alone under one or two lines.
- `/about` hides the app's emoji feature icons (no emoji as icons in the brand); the cards carry colour instead of an icon.
- The app's blue round feedback button (Layout) floats over the right edge of the bright pages on every size; it belongs to the app.
- Signed-in members see the app header in its own (dark by default) theme above a bright page.
- Footer links in the landing footer are made 44px tall only inside the frame (pointer: coarse); the landing page's own footer still has 34px rows.
- `/pricing` on iPad stacks the three plans in one column (560px wide) rather than three narrow ones.
- The prerendered shell is a first-paint approximation in system fonts, not the designed page; the app replaces it on mount.
