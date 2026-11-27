# What the foundation gives you (read after SPEC.md and PLAN-DAYLIGHT.md, before you write code)

The foundation (F0) is built and checked. This file is its handover: the rules, the interfaces exactly as exported, the tokens, how to run the sample and how to shoot. Where it differs from PLAN-DAYLIGHT.md section 7, this file is what the code does. Paths are relative to `frontend/` unless they start with `docs/`.

## The rules (read these first)

1. **A classic build must stay byte-identical** to the baseline (SPEC decision 2). The baseline is a classic build of the landing commit last merged into `app/daylight` (now `ff62cbc`, re-recorded at integration on 2026-11-26 after proving this branch's classic build identical to it); after each landing merge, prove the same and re-record with `check-classic.mjs --write <dir> --base <commit>`. Never edit an existing file under `src/` outside `src/daylight/`, `index.html`, `public/`, `vercel.json` or `scripts/prerender.mjs`. The seam plugin redirects six imports at build time instead. The director runs the proof at integration:
   `VITE_LANDING=classic VITE_APP_LOOK=classic npm run build && node scripts/daylight/check-classic.mjs`
2. **Edit only your own folder** (ownership below). If you need something in `ui/`, `lib/`, `shell/`, `styles/`, `dev/` or `seam/`, ask the director; do not edit it. You may ADD a file to `ui/` only if it is prefixed with your package name, but prefer your own folder.
3. **Do not run `npm run build`.** It writes the shared `dist/`. To prove your code compiles: `VITE_APP_LOOK=daylight npx vite build --outDir /tmp/ofsa-<pkg>-dist --emptyOutDir`, then delete that folder.
4. **No git commands that change state.** The director commits.
5. **Dev servers on your own port, with `--host 127.0.0.1`, stopped when you finish.** Ports: F0 5330, feed 5331, story 5332, map 5333, create 5334, capture/dist 5335.
6. **Phone first.** Every sheet you report starts with phone (390x844), then desktop (1440x900). Look at your own screenshots before you report.
7. **Light only. No emoji as icons. Nothing invented** (SPEC decision 10 and the landing's honesty rules): no user counts, no claims the code does not back. A product number comes from the code; say where.
8. **Never return mock data on failure.** `lib/data.js` throws; show an honest error with Retry.
9. **maplibre-gl is imported only by `map/engine.js`**, through `loadMapLibre()`. `scripts/daylight/check-bundle.mjs` fails the build if it reaches the main bundle or any other chunk statically.
10. Node 22: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`. Playwright comes from `/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/` (capture.mjs loads it for you); do not install it.

## Ownership

| Package | Owns | Its pages arrive through |
|---|---|---|
| F0 | `src/daylight/{seam,styles,lib,ui,shell,dev}/**`, `scripts/daylight/**` (except `fixtures/teton.mjs`), `app.config.json`, `docs/app/**` | |
| FEED | `src/daylight/feed/**`, `src/daylight/profile/**` | `seam/Feed.jsx` -> `feed/FeedPage.jsx` (/feed); `seam/Profile.jsx` -> `profile/ProfilePage.jsx` |
| STORY | `src/daylight/story/**`, `scripts/daylight/fixtures/teton.mjs` | `seam/EventDetail.jsx` -> `story/StoryPage.jsx` (/event/:id and /share/:token with `isShareMode`) |
| MAP | `src/daylight/map/**` | `seam/Feed.jsx` -> `map/WorldPage.jsx` when `?view=map` |
| CREATE | `src/daylight/create/**` | `seam/CreateEvent.jsx` -> `create/NewStoryPage.jsx` for `/create?from=photos` (plain `/create` stays the classic editor inside the new shell); `seam/SmartImport.jsx` -> `create/ImportPage.jsx` (/import) |

Every file in your folder today is a working stub with a header comment saying so. Replace the insides; keep the file names, default exports and props, because other packages import them.

## The gate

- `app.config.json` is `{"production":"classic","preview":"daylight"}`. `scripts/daylight/variant.mjs` resolves `VITE_APP_LOOK` if set (`classic`, `optin` or `daylight`), else `production` when `VERCEL_ENV=production`, else `preview`.
- `vite.config.js` defines `__APP_LOOK__` and adds `scripts/daylight/vite-seam.mjs` only when the look is not `classic`. The plugin redirects `./pages/Feed`, `./pages/EventDetail`, `./pages/CreateEvent`, `./pages/SmartImport`, `./pages/Profile` and `./components/Layout` imported by `src/App.jsx` to `src/daylight/seam/<Name>.jsx`, and fails the build if any of the six did not happen.
- At run time each seam calls `useLook()`: `optin` builds show classic unless the browser chose Daylight (`?look=daylight`); `daylight` builds show Daylight unless the browser chose classic (`?look=classic`, or "Use the previous look" in the You menu). The choice is `localStorage['ofs.look']`. In classic look a small pill offers the way back ("Back to the new look" in a daylight build; "Try the new look" in an optin build, only to someone who has tried it).
- A Daylight page that throws is caught by the seam: the person sees "This page did not load" with Try again and Use the previous look, never a blank screen.
- In a `daylight` build the plugin also sets a paper `theme-color`, the `default` iOS status bar and a Bricolage preload in `index.html`, paper PWA colours, keeps the map chunks out of the service-worker precache (cached at run time instead) and copies `daylight-public/` into `dist/`.

## Interfaces as exported

```js
// lib/look.js
useLook() -> 'daylight' | 'classic'      setLook('daylight' | 'classic')      getLook()
applyLookQuery(search) -> bool           BUILD_LOOK ('classic'|'optin'|'daylight')     LOOK_KEY ('ofs.look')

// lib/http.js   the one HTTP door: auth headers from services/api.js, never swallows a failure
apiFetch(path, {query, method, body, auth = true, signal, headers}) -> JSON      // body: object (JSON) or FormData
class HttpError {status, data, path, message}      // status 0 = network failure
API_URL  API_BASE

// lib/data.js   (throws on failure, never returns mock data)
useFeed({orderBy = 'event_date'|'upload_date'}) -> {events, loading, error, hasMore, loadMore, refresh, loadAll}
//   GET /events?order_by&skip&limit=100; one request at a time; cap 500; cached per order across mounts
//   (Back is instant; refetched in the background after 60s). loadAll() pages to the cap (calendar, map).
//   Items are production list items: no description, images, locations, counts, second category or avatar.
usePeople() -> {following, faceFor(username, fullName?), muted, refreshMuted, me, loading, loaded}
//   loaded: this person's follow and muted lists have arrived (always true signed out)
//   faceFor -> {username, name, avatarUrl|null}: real photos for people you follow and you; others null (use initials)
useStory(idOrSlug, {shareToken}) -> {event, images, locations, privacyError, error, shareContext, loading, reload}
//   privacyError: {status:403, ...server detail (privacy_level, privacy_display, privacy_description,
//   author_username, author_full_name, requires_auth, requires_follow, follow_request_pending)}
//   | {status:403, subscription_required:true, ...} | {status:404, kind:'not_found'} | {status:410, kind:'expired'}
//   StrictMode-safe: identical requests within 2s share one response (GET /events/{id} counts a view).
useStoryExtras(eventId, {shareToken}) -> {comments, tags, likes, loading, error, actions}
//   likes: {like_count, is_liked, recent_likes, all}; comments: the API's flat list with parent_id and depth
//   actions: like() unlike() toggleLike() comment(content, parentId) deleteComment(id)
//            reactToComment(id, type) unreactComment(id) reload()     (like is optimistic; share mode refuses writes)
useMediaStats(mediaIds) -> {stats, react(id, type), unreact(id), loading}
//   stats: {[event_image id]: {like_count, comment_count, is_liked, user_reaction, reaction_counts}}; optimistic
useNotificationCounts() -> {total, follow_requests, tag_requests, profile_claims}   // 30s poll, paused when hidden
searchPeople(query, {signal}) -> Promise<[{id, username, full_name, avatar_url}]>
imageSrc(url, 'micro'|'small'|'medium'|'original')   imageSrcSet(url) -> "… 400w, … 1200w" | undefined
HttpError

// lib/format.js   (American English; no toISOString: backend dates are naive wall-clock strings)
parseBackendDate(iso) -> Date|null      // naive = local wall time (same rule as OFS_iOS/App/Theme.swift); Z/offset = instant
dateRange(start, end, {short}) -> "June 14 – 20, 2026" | short "Jun 14 – 20"
shortPlace(name, parts = 2) -> "Jenny Lake, Wyoming"     // drops counties and postcodes first
readTime(html) -> whole minutes (>= 1)
localDay(d) toLocalISO(d) monthKey(d) monthLabel(d) "August 2026"  dayLabel(d) "Monday, June 15"
timeLabel(d) "9:26 AM"  daySpan(start, end)  plural(n, one, many)
// wall time AT THE PLACE: marker and photo stamps carry the place's offset; these read the clock
// in the string and ignore it, so every reader sees the same times and days (one implementation;
// the story page and the maps import these)
wallParts(ts) -> {y, mo, d, h, mi, date}   wallTime(ts) "9:26 AM"   wallTripDate(ts, pivotHour = 4) -> Date
wallTripDay(ts, pivotHour = 4) "2026-06-16"   wallDayLabel(ts, pivotHour = 4) "Tuesday, June 16"   wallMonthDay(ts) "June 16"

// lib/geo.js   (pure)
km(a, b)  isLatLng(lat, lng)  bboxOf(points) -> [minLng, minLat, maxLng, maxLat]  lngSpan(points)  centroid(points)
greatCircle(a, b, steps) -> [[lng, lat]...]   tripDay(ts, pivotHour = 4) -> "YYYY-MM-DD"   (a stamp string: wall time at the place)
clusterStops(points, {radiusKm = 0.5, minutes = 90, max = 20}) -> [{lat, lng, ts, ids}]

// lib/storyBlocks.js   (browser only: DOMParser; HTML is sanitised with utils/sanitizeHtml.js)
parseStory(html, eventImages, {localMedia}) -> {blocks, chapters, media, markers}
//  localMedia: true keeps blob: photo URLs through sanitising (the creation preview only)
//  a paragraph holding only location markers becomes the marker block alone (no leftover chip)
//  block: {type:'heading', level, id, text, chapterId} | {type:'html', html, chapterId}
//       | {type:'media', items, chapterId} | {type:'marker', stop, chapterId}
//  media item: {id, imageId, kind:'image'|'video', src, poster, caption, alt, w, h, lat, lng, ts, inBody}
//       id is "img-<event_images id>" when the photo matches a row, else "m<n>"; captions come from event_images
//  chapter: {id, title, level, index}      (H1s; H2s when a story has no H1)
//  marker stop: {anchorId, name, lat, lng, ts, placeId, chapterId, order}; the span in the html carries data-anchor-id
//  media also lists event_images not placed in the text (inBody:false), for the gallery
mediaKey(url)

// lib/journey.js   (pure)
buildJourney(event, parsed) -> {stops, legs, days, bbox, photos} | null     // null: fewer than 2 located stops
//  stop: {id, n, name, lat, lng, ts, dayIndex, photoIds, anchorId, chapterId, kind:'named'|'photo', source}
//  leg:  {id, from, to, seq, dayIndex, km, arc}        day: {index, date, label, stopIds, chapterId, bbox}
//  photos: {[media id]: {id, src, caption, lat, lng, ts, stopId}}
//  Days follow H1 chapters when every named stop sits in one (a photo stop outside every chapter, such
//  as the cover, joins the chapter of the stop before it), else the trip day at the place (4am pivot). Order by time when every
//  stop has one, else by place in the text. The event's own location is never a forced stop.
stopOfPhoto(journey, mediaId) -> stop|null

// lib/capability.js
mapLevel() -> 'full'|'lite'|'static'  (?maplevel= forces one)   hasWebGL2()  prefersReducedMotion()  saveData()
deviceMemory()  isPhone()  useMedia(query)  useDesktop()      // desktop = min-width 900px

// story/
<StoryView event images locations extras mode="read|preview|share" parsed? journey? activeStopId? />   (default export)
//  parsed and journey are optional (computed when absent); every marker and located photo has data-stop-id
useParsedStory(event) -> {parsed, journey}

// map/   (F0 ships these drawing the SVG sketch and the Places list; MAP replaces the insides)
<WorldMap events selectedId onSelect />                                                   (default export)
<JourneyMap journey activeStopId onStopSelect mode="panel|sheet|strip" playing onPlayingChange />  (default export)
useJourneySync({journey, containerRef}) -> {activeStopId, scrollToStop(stopId)}   // working: 38% reading line, 24px hysteresis
<RouteSketch journey activeStopId onStopSelect width height labels="named|none" />   dayColor(dayIndex)
<PlacesList events selectedId onSelect />   groupByPlace(events)
loadMapLibre() -> Promise<maplibregl>   createMap(container, options) -> Promise<Map>   class MapUnavailable {reason:'chunk'|'webgl2'|'init'|'style'}
buildStyle({globe, terrain, hillshade}) -> style JSON     OPENFREEMAP  MAPTERHORN  TILE_HOSTS
//  map/index.js re-exports WorldMap JourneyMap useJourneySync RouteSketch dayColor PlacesList groupByPlace

// create/   (stubs that work; CREATE replaces the insides)
buildDraft(files) -> Promise<Draft>   // EXIF via utils/exifExtractor.js, 8 at a time; no network
//  Draft: {photos:[{id, file, name, url, ts, lat, lng, w, h, hasGps}], stops:[{id, lat, lng, ts, photoIds, name}],
//          days:[{index, date, label, stopIds, photoIds}], start, end, title, place, cover, centroid}
draftToEvent(draft, {author}) -> an object shaped like GET /events/{id}, for StoryView and buildJourney
composeEvent(draft, ai, edits) -> {eventData, captions, tags}
draftHtml(draft)  markerSpan({name, lat, lng, ts})  exifTime("2026:06:14 10:30:00") -> "2026-06-14T10:30:00"

// shell/
useChrome({tabBar: false, topBar: false, footer: false})   // hide the parts your contextual bar replaces, while mounted
STORIES_RESELECT  // window event: Stories tapped while on Stories (the shell already scrolled to top; refetch)
NEW_CHOICES  NewChoices  NewSheet  SearchSheet  familyItems()

// dev/sampleApi.js
createState(snapshot)  answer({method, path, query, body, auth}, state) -> {status, json} | undefined
answerSupabase(...)  setViewer(state, as)  signinPage(as, next)  fixtureFile(urlPath)
//  Extend it without editing it: add src/daylight/<pkg>/sample.js exporting
//  answer(req, state, helpers) -> {status, json} | undefined   (asked before the core; helpers: ok, err, clone, detailOf, extrasOf)
```

### UI primitives (`src/daylight/ui/index.js`)

```js
<Button variant="solid|ghost|quiet|danger" size="md|lg|sm" to href onClick icon iconAfter busy full wash />
<IconButton icon label variant="plain|keyline|solid|float" size="md|lg" badge to href pressed />   // label is required
<Card as interactive pad="md|sm|none" tone="white|paper|wash" wash />   cardLink   // put className={cardLink} on the title link: the whole card clicks
<Chip selected onClick onRemove removeLabel wash dot icon size="md|sm">Label</Chip>
<Avatar name src size ring label />   <AvatarStack people={[{name, src}]} size max />   initialsOf(name)
<Sheet open onClose title hideTitle placement="auto|bottom|side|center" size="auto|full" footer wash />
<Dialog open onClose title actions />          // a centred card on every screen
<Menu trigger={(props, open) => <button {...props}/>} items={[{label, to|href|onClick, icon, note, danger} | {divider:true}]} align="start|end" label width />
<MenuList items onDone />                      // the same items as a list, for a phone Sheet
<Segmented label value onChange options={[{value, label, icon}]} size="md|sm" full hideLabels />
<Field label hint error optional hideLabel><input|textarea|select/></Field>   fieldControl
<Skeleton w h r />  <SkeletonText lines size gap />  <Loading label>…</Loading>
<EmptyState wash icon before mark after title body action tone="error" as />
<Head as size="page|story|lead|card|section" before mark after />   // one sticker word, page titles and empty states only
<Readout label value unit note size="sm|md" />
<Icon name size title strokeWidth />   ICON_NAMES (61, with clock)      <Spinner size />    <Stub pkg name note wash tall />
<Root>                                // .ofsa scope + html.ofsa-on; seams already wrap every page in it
<Sticker size="md|sm">  <Label strong dot as>   // the landing's, reused unchanged
WASHES  lockScroll()  overlayRoot()  useModal(open, ref, onClose)  cx(...)
```

Every control has a 44px hit area and the shared focus ring (2px ink, 2px outside). Overlays render in a portal (`#ofsa-overlays`, itself `.ofsa`), trap focus, close on Esc and on the scrim, return focus to the opener and always show a close button. See every primitive at `/feed?only=ui` (sheet: `shots/daylight-ui/sheet.jpg`).

## Tokens

CSS variables live on `.ofsa` (never `:root`), prefix `--a-`, in `src/daylight/styles/tokens.css`; the same values as JS in `styles/tokens.js` (for the map style, SVG and canvas) and as `docs/app/tokens.json` (for iOS).

- Colour: `--a-ink #101B3B`, `--a-paper #F4F7FB`, `--a-paper-deep #E3E9F2`, `--a-white`, `--a-line` (ink 14%), `--a-line-strong` (28%), `--a-mute` (ink 66%, 5.5:1 on white), `--a-scrim`, `--a-danger #C4253B`.
- Washes, each with `-deep` and `-tint`: `tide azure fizz zest lime sun violet` (`--a-tide`, `--a-tide-deep`, `--a-tide-tint`...). `data-wash="azure"` on any element sets `--a-wash`, `--a-wash-deep`, `--a-wash-tint`. **Text on a wash is always ink.**
- Destinations own a wash: Stories tide, Map azure, New fizz, Family lime, You zest. Day colours, in turn: azure fizz lime zest violet tide sun (`DAY_WASHES`, `dayColor(i)`). Category dots: `CATEGORY_WASH`.
- Type: `--a-font-ui` (Bricolage), `--a-font-story` (Literata), `--a-font-mono` (DM Mono); sizes `--a-size-page` clamp(28px, 3vw, 44px), `--a-size-story-title` clamp(34px, 4.4vw, 64px), `--a-size-lead`, `--a-size-card` 20px, `--a-size-story` 18px/1.61 phone, 19px/1.63 desktop; `--a-size-label` 11.5px, `--a-track-label` .12em.
- Shape: `--a-keyline` 2px ink, `--a-shadow-sm/--a-shadow/--a-shadow-lg` (3/4/6px hard ink), radii `--a-r-button 14`, `--a-r-card 20`, `--a-r-readout 12`, `--a-r-sticker 6`, `--a-r-sheet 24`, `--a-r-pill`. Shadows only on hover, focus and floating layers; resting cards are keyline only.
- Layout: `--a-target 44px`, `--a-bar-h` 52 phone / 64 desktop, `--a-tab-h 64`, `--a-safe-*`, `--a-gutter` 16 phone, `--a-max 1240`, `--a-bottom-clear` (tab bar plus safe area on phone, 0 on desktop: use it for anything fixed to the bottom).
- Motion: `--a-dur 200ms`, `--a-ease`, `--a-ease-pop`. Reduced motion collapses every transition inside `.ofsa`.
- Layers: `--a-z-bar 100`, `--a-z-float 200`, `--a-z-sheet 300`, `--a-z-dialog 400`, `--a-z-toast 500`.
- Utility classes (one class strong): `a-wrap a-sr a-mono a-label a-mute a-small a-page-title a-story a-nowrap a-focus-halo`.
- Style rules: CSS Modules for everything; no bare element selectors; page-level effects only on `html.ofsa-on`; MapLibre overrides scoped under your module with `:global(.maplibregl-…)`. Stamp `data-ui="…"` on your components so capture scripts never select by hashed class names.
- The classic variables (`--bg-primary`, `--text-primary`, `--accent`...) are redefined inside `.ofsa` and on `html.ofsa-on` (`styles/compat.css`), so classic pages shown inside the shell (Settings, Sharing, Family tree, Notifications, Billing, the classic editor and Smart Import) come out light. Stored theme preferences are untouched; the sample signs in with `theme_preference: 'dark'` on purpose so you always see the bridge at work.

## The shell

Phone: 52px top bar (wordmark, people search, bell) and a bottom tab bar (Stories, Map, New as a raised ink disc, Family, You) with safe-area padding. Family and You open bottom sheets (You holds Profile, Settings, plan, Notifications, What's new, FAQ, Send feedback, Install, Admin, Log out; "Use the previous look" was removed for the production release, and `?look=classic` still switches). Desktop: 64px bar with Stories / Map / Family menu, search, bell, solid **New story** (opens the three choices: From photos, Write it yourself, Find stories in a big batch) and the avatar menu with the same items as You. Signed-out visitors (the public pages under the layout) get Log in and Start free. The shell mounts the existing `WelcomeModal`, `TrialBanner`, `Footer` and `FeedbackWidget` unchanged, keeps the demo-account banner and routes the `open-ai-create` event to `/create?from=photos`. `main` clips sideways overflow, so a classic page cannot scroll the whole app sideways.

## Sample mode

```bash
cd frontend && export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"
P=5331   # feed 5331, story 5332, map 5333, create 5334
VITE_APP_LOOK=daylight VITE_DAYLIGHT_SAMPLE=1 VITE_API_URL=http://127.0.0.1:$P VITE_SUPABASE_URL=http://127.0.0.1:$P/__sb \
  npx vite --port $P --strictPort --host 127.0.0.1
# open http://127.0.0.1:$P/__fx/signin?as=maya&next=/feed      (any cast key: maya tom ruth joe kate ...)
```

- Always use `127.0.0.1`, never `localhost` (`AuthContext.jsx` hard-codes `localhost:8000` for that host).
- At every start the middleware rebuilds `scripts/daylight/fixtures/sample.json` (`node scripts/daylight/build-sample.mjs`) from the landing fixtures (read only) and answers `/api/v1/**`, `/__sb/**` (the stub auth server) and `/__fx/**` from it through `src/daylight/dev/sampleApi.js`. Writes (likes, comments, reactions, follow, mute, create, upload, captions, AI) change an in-memory copy; `GET /__fx/reset` restores it; `GET /__fx/log` lists the last requests.
- **The snapshot is production-shaped.** List items and details carry exactly the keys `EventResponse` serialises (`scripts/daylight/fixtures/contract.mjs`; check with `node scripts/daylight/check-contract.mjs`). So list items have no description, photos, stops, counts or author avatar, and detail photos always say `media_type: 'image'`. Design for that.
- Special routes: `/event/403` (audience excludes you), `/event/lapsed-plan` (author's plan lapsed), `/event/404`, `/share/tetons-share` (a working share link), `/share/expired-share` (410).
- **What the sample still needs.** This branch has the landing's round-one fixtures (a British family, nine stories). The round-two fixtures (Madison, the eight household stories and the relatives' trips) and the Tetons photos are being finished in the landing checkout and will be merged here; the snapshot picks them up with no change. Until then the Tetons story is `fixtures/teton.placeholder.mjs`: Tom, 14 to 20 June 2026, seven H1 days, thirteen named stops and thirty photos with the alternative plan's corrected coordinates and times, stand-in words, and labelled SVG placeholder photos. It is replaced, in order, by STORY's `fixtures/teton.mjs` (export `tetonFixture({photoUrl, users}) -> {event, comments, tagged}`), or a Tetons story in the landing fixtures. Photos `photo-tetons-01..30` come from the landing art manifest, else `daylight-public/sample/teton/photo-tetons-NN.{webp,jpg}`, else the placeholder; `sample.json.missing.photos` lists what is still a placeholder. Uploads in the create flow return the files in `daylight-public/sample/teton/` in order when that folder exists.
- `?only=feed|story|map|create` shows only that package's pages (the others render a labelled stub); `?only=ui` the primitives sheet; `?only=spike` the MapLibre spike; `?only=all` everything. It persists for the tab session.

## Shooting

```bash
node scripts/daylight/capture.mjs --base http://127.0.0.1:$P --out <pkg> --routes "/feed,/feed?view=map"
# options: --as maya | --signed-out   --device phone|desktop|both   --full   --wait '<css>'   --click '<css>'
#          --reduced   --focus N (Tab N times)   --settle ms   --scene shell|ui|spike|look
```

The integration walkthrough, `node scripts/daylight/walk.mjs [--base …] [--device phone|desktop|both]`, drives the whole app as the sample user (feed, a filter, calendar, timeline, the Tetons story with its map and Play, the lightbox, comments, the world map, the thirty kit photos to a published story, the profile) into `shots/daylight-walk-m/` and `daylight-walk-d/` with a contact sheet each. Shoot it from a snapshot copy of the checkout when other builders are saving into the tree (their saves hot-reload the server mid-run).

capture.mjs signs in through `/__fx/signin`, blocks service workers, aborts every host except the app and `tiles.openfreemap.org` / `tiles.mapterhorn.com`, writes `shots/daylight-<out>/{phone,desktop}-NN.jpg`, a labelled `sheet.jpg` (phone first) and `report.json`, and prints the hosts contacted, unanswered API routes, sideways scroll at 390, 768, 1280 and 1920, and console errors. It exits 1 on an unanswered route, a page error or sideways scroll. The fake clock is 26 November 2026, noon, America/Chicago. **Never use `--full` on a map:** resizing the viewport clears WebGL canvases. Wait on `[data-map-state="idle"]` (put that attribute on your map containers). Read the sheet as an image before you report; to see a long full-page shot, crop it (Python's PIL is installed).

## Checks

```bash
node --test src/daylight/lib/journey.test.js                  # wall time and journey days, read from several time zones
node scripts/daylight/check-classic.mjs                       # after a classic build: the byte proof
node scripts/daylight/check-bundle.mjs [--classic <dir>]      # after a Daylight build: map isolation and sizes
node scripts/daylight/check-contract.mjs                      # the snapshot's shapes
VERCEL_ENV=production node scripts/daylight/variant.mjs       # must print classic
```

## Known gaps and fragile spots

- Until the new look has a dark mode (planned with the account pages), `ui/Root.jsx` keeps `<html data-theme="light">` while any Daylight page is on screen, `shell/hideAppearance.js` hides the classic Settings page's Appearance tab, and `shell/classicLight.module.css` gives the classic billing page (drawn dark in every theme) a light skin. All three are marked TEMPORARY.
- In an `optin` build the Daylight base CSS (a few KB, all scoped under `.ofsa`) and the font-face rules ship in the main stylesheet, because the seams import `Root` statically. Fonts only download when Daylight renders.
- The sample-build shim for a real phone (PLAN 5.6 point 3, `dev/sampleBoot.js`) is not built yet; `sampleApi.js` is pure so it can back one.
- `vercel.json` serves `.mjs` (the MapLibre worker) with a JavaScript type by default; check the first preview's worker request.
