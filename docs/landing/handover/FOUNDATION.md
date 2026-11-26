# What the foundation gives you (read after SPEC.md, before your own brief)

The foundation is built and checked. This file is its handover: the interfaces exactly as exported, and the rules every package builder follows. Where it differs from SPEC.md's "Contracts", this file is what the code does.

## Interfaces as exported

```js
// lib/scroll.js
startScroll() -> stop        // ref-counted; Lenis lerp 0.09; no Lenis under reduced motion. Page already calls it; do not call it again.
onFrame(fn({scrollY, vh, vw, time})) -> unsubscribe
stageProgress(el) -> 0..1
scrollToId(id, {offset, immediate})   scrollToY(y, {immediate})   setScrollLocked(bool)
prefersReducedMotion() -> bool        refreshScroll()
// lib/math.js
clamp(v,min=0,max=1) lerp invLerp remap(v,inA,inB,outA,outB) smoothstep easeOutCubic easeInOutCubic easeOutBack win(p,a,b)
// lib/analytics.js
track(name, props)
// art/manifest.js
art(id) -> {id,src,srcM,wM,w,h,kind,alpha,feet,headTop,ax}   // a missing id returns the same shape with missing:true
maybeArt(id) -> entry | null (logs once)   hasArt(id)   ART_IDS
// content/facts.js
fact(id) -> string (throws on an unknown id)   factList(id) -> string[]   FACTS {id:{value,src,list?}}   registerFacts(obj)
PRICES {free:{name,price,period}, pro:{name,perMonthBilledYearly,perYear,perMonth}, lifetime:{name,price,period}, currency}
//   price fact ids: priceFree priceProMonthBilledYearly priceProYear priceProMonthly priceLifetime
//   also shareLinkDaysMin, shareLinkDaysMax, and every id in SPEC's facts table
// content/routes.js
ROUTES {home, signup:'/login?signup=true', login:'/login', pricing, faq, features, about, alternatives,
        compare:[{href,label,name} x5], privacy, terms, contact}   SECTION_IDS   OLD_HASHES
// content/cast.js
CAST (13)  person(id)  AUTHOR  HOUSEHOLD  FOLLOWERS  CLOSE_FAMILY  RUN_CLUB{name,members}
AUDIENCE_OPENERS  COUNTS{cast,household,followers,closeFamily,runClub}  STORIES (5)
// content/common.js   SMALL_PRINT  BRAND
// ui/index.js
<Head as="h2" before mark after size="head|hero|sm|none" className />
//   spaces around the mark are added for you; the sticker and the punctuation right after it never wrap apart;
//   size sm is clamp(26px, 3.2vw, 44px); the size class is one class strong, so your className can set font-size
<Sticker tilt size="md|sm">word</Sticker>   // sm: 2px shadow, tighter padding, for nav and label sizes
<Button variant="solid|ghost" size="md|lg" href onClick arrow icon trackAs />   // an href of '#id' glides if the element exists
<Label strong dot as>   <Readout label value unit note size="sm|md|lg" valueRef />   <GhostWord center>
<Cutout id alt className style priority sizes shadow imgRef />
<Shot id alt caption />        // caption: a string prefix, or false; otherwise always prints "Real interface. Sample family."
<Print id alt caption tilt />   <Device id alt caption width />   // width: px number or CSS length, default 320px, capped at 100%
<ArtImg id alt className priority sizes fit />   // a bare manifest image (or labelled placeholder), no frame
//   Cutout, Print, Shot, Device and ArtImg use the manifest's wM for the phone copy's srcset width (half of w if absent)
<Section id wash tone="wash|paper|white" pad="md|sm|none" inner="wrap|none" floor as sectionRef />
<Stage id svh wash floor pinned onProgress(p, pinEl, frame) pinClassName stageRef />
<Reveal as delay i ...rest />   watchReveal(el)   // id, data-*, aria-* pass through; style is merged
<AudienceSwitch value onChange(name) name label hideLabel />   AUDIENCES [{name,slug}]   AUDIENCE_DEFAULT
<Icon name size title />       // arrow arrow-down play pin lock people heart close check plus
<Stub name pkg id wash tone note />   Missing   useFrame(fn)   cx   WASHES
```

- `AudienceSwitch` is a fieldset carrying `data-aud`. Input values are the slugs `private`, `custom`, `close`, `followers`, `public`; each input also carries `data-aud-name` with the app's name. It works before hydration. Style state from CSS, for example `.scene:has([data-aud] input[value='close']:checked) .crowd { ... }`.
- Global utility classes inside `.ofsl`: `l-wrap l-hero l-head l-head-sm l-lede l-mute l-story l-mono l-small l-sr l-nowrap`. `l-hero`, `l-head` and `l-head-sm` are one class strong (`:where(.ofsl) .l-head`), so a package class loaded after them can change font-size or line-height without `!important`.
- Tokens as in SPEC, plus raw colours `--l-tide`, `--l-tide-deep` and so on for each wash, and `--l-shadow`, `--l-keyline`, `--l-r-*`, `--l-gutter`, `--l-horizon`, `--l-nav-h`, `--l-ease-out`, `--l-ease-pop`.
- See every primitive on every wash: run your dev server and open `/?only=ui`. The sheet is `frontend/shots/f0-ui-d/sheet.jpg`.

## Your package

- `src/landing/<pkg>/index.js` currently re-exports stubs from `Stubs.jsx` (`Film.jsx` for film). Replace the stubs and keep the export names. A `.js` file cannot hold JSX: put components in `.jsx`.
- The Film stub carries the page's one `<h1>`, the hero lines and a live `AudienceSwitch`; the film builder keeps exactly one `<h1>` on the page. Nobody else renders an `<h1>`.
- `content/<pkg>.js` is plain data: no JSX, no browser globals, explicit `.js` extensions on imports (Node scripts import these files). It also exports `SEO_BLOCKS`, an array in the marketing block format (`{h2:'…'}`, `{p:'…'}`, `{ul:['…']}`) carrying your sections' real text for `llms-full.txt`.

## Numbers

- Every product number is printed through `fact(id)`. A build check fails on a digit inside a string literal in `content/<pkg>.js`. Template literals are fine: `` `${fact('trialDays')}-DAY TRIAL` ``.
- Sample content that needs digits (sample captions, coordinates, a sample timer, sample counts) lives in `content/<pkg>.sample.js`, which the check skips. On the page it always sits under a visible sample label.
- A product number that is not in SPEC's table goes in `content/<pkg>.facts.js` as `export default { id: { value, src: 'path:line' } }`, where you have read that line yourself. Then `import F from './<pkg>.facts.js'; registerFacts(F)` in `content/<pkg>.js` before calling `fact()` on those ids. An entry without a `src` fails the check.

## Server rendering

The page is rendered to HTML at build time and hydrated. So: no `window`, `document`, `localStorage`, `matchMedia`, `Date`, or `Math.random` at module scope or during render; put them in effects. What the server renders must equal the first client render. Content that `Reveal` hides is hidden only after mount, so the static page is complete.

## Working alongside the others

Several builders are in this repo at once.
- **Do not run `npm run build`.** It writes the shared `frontend/dist` and `frontend/dist-ssr` and would collide with the others. To prove your code compiles, run `npx vite build --outDir /tmp/ofsl-<pkg>-dist --emptyOutDir` from `frontend/` and delete that folder afterwards. The director runs the full build and the server render at integration.
- Work from the dev server on your own port: `npx vite --port <port> --strictPort` from `frontend/`, then `http://127.0.0.1:<port>/?only=<pkg>` shows only your package, so a half-written sibling cannot break your view. Ports: film 5321, explain 5322, proof 5323, close 5324. Stop the server when you finish.
- Screenshots: `node scripts/landing/shots.mjs --url 'http://127.0.0.1:<port>/?only=<pkg>' --out shots/<pkg>-d --steps 12` (add `--phone` for 390x844; `--selector`, `--from`, `--to`, `--w`, `--h`, `--reduced`, `--click`, `--press` as needed). It writes numbered JPEGs and a `sheet.jpg`, and prints console errors and whether the page scrolls sideways. Read the sheet as an image before you report.
- Art is finished: 97 images. The manifest is `src/landing/art/manifest.json`; see them all on colour in `landing-art/sheets/wash-*.jpg`, `detail-people-*.jpg`, `detail-things-*.jpg`, `photos-*.jpg`, `plates.jpg`, `kitchen-overlay.jpg`. Note: for poses with arms up, `headTop` marks the hand, not the crown.
- Real-interface captures (`kind: "ui"`, ids in `CAPTURE.md`) are still being made. Until an id appears in the manifest, `Shot` and `Device` render a labelled placeholder; build against the ids and re-shoot later.
