# OFS app redesign plan (codename "Daylight")

Conventions. Paths are relative to `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/`. "Classic" is today's app; "Daylight" is the redesigned look. Sizes and library facts were measured or fetched on 2026-11-26. Nothing was modified.

## 0. Five findings that decide the plan

1. **The app is dark by default.** `frontend/src/styles/index.css:7-41` is a black `:root`; `Header.jsx:39`, `AuthContext.jsx:75` and `backend/app/models/user.py:38` all default to `dark`. Most users therefore see the look the owner reads as worse.
2. **Neither auto-create flow builds a journey.** `QuickAddModal.jsx:564-576` sends no locations at all (EXIF is used only for place names, `:259-263`, `:354-366`). `SmartImport.jsx:319-327` stores GPS on `event_images`, but the story page draws only `event_locations` (`EventDetail.jsx:549-594`). An auto-made trip shows one pin or none.
3. **The feed list returns very little.** `backend/app/api/events.py:254-283`: no description, no images, no locations, `like_count: 0`, `comment_count: 0` (`:279-280`), no `category_2`, no author avatar, and `limit=100` (`:191`) which the frontend never pages (`api.js:99-116`). The redesign's cards and globe must be designed from exactly that.
4. **MapLibre GL JS 6.19.0 does globe and 3D terrain with no key**, and both tile sources I recommend need no key. Verified below with URLs and measured bytes.
5. **A classic build can be proven byte-identical**, because the redesign can be wired in without editing a single existing file under `frontend/src/` (section 5).

---

## 1. Design direction

Daylight is the landing's brand at reading distance. It keeps ink `#101B3B` on paper `#F4F7FB` and white, the three faces (Bricolage Grotesque for interface and titles, Literata for story text, DM Mono for dates, coordinates and counts), 2px ink keylines, hard offset shadows, 14/20/12px radii, drawn SVG icons instead of emoji, and plain button labels that say what happens. It is calmer in six ways because people use it daily: colour moves from full-screen washes to accents (each destination owns one wash: Stories tide, Map azure, New fizz, Family lime, You zest; a wash never covers more than a header band, chip, marker or empty state); shadows appear only on hover, focus and floating layers (resting cards are keyline only); type steps down (page titles `clamp(28px, 3vw, 44px)`, card titles 20px); there are no ghost words, cut-out people or scroll scenes; the sticker is limited to one word in a page title or empty state; motion is 200ms state changes, with two purposeful exceptions, journey playback (on demand) and the map following the story as you read. Photos and maps carry the richness; chrome stays white and quiet.

Contrast (computed from the tokens): ink on tide 8.7:1, fizz 6.3, zest 7.2, azure 6.6, lime 12.9; white on ink 16.9; mute text (ink at 66%) on white 5.5. White text on any wash fails (about 2:1), so the rule is: text on a wash is always ink.

**Light and dark.** Daylight is light only. Every Daylight screen renders inside a `.ofsa` wrapper that sets its own tokens and also redefines the classic variables (`--bg-primary`, `--text-primary`, `--accent` and the rest), so `html[data-theme]` stops mattering and the non-redesigned pages (Settings, Sharing, Family tree, Billing, Notifications) re-skin to the Daylight palette without being edited. Only 3 of 99 CSS files reference `data-theme`, so this works broadly; 8 modules hard-code dark backgrounds (for example `QuickAddModal.module.css:8,18`) and are either replaced by this job or listed as a follow-up sweep. Each user's stored `theme_preference` is left untouched, so switching back to classic restores it. The Theme chooser in Settings is hidden in the Daylight look. The photo lightbox is light paper too.

---

## 2. Page by page

### 2.1 Navigation

**Wrong today.** Desktop is a row of text links (`Header.jsx:140-155`) plus a "+" that reveals Create / AI Create / Smart Import only on hover (`:114-138`), which keyboard and touch users cannot discover. Phone is a hamburger (`:98-106`) opening an overlay (`:162-238`): every destination is two taps away at the top of the screen. The map is not a destination, only a toggle inside the feed (`ViewToggle.jsx:4-7`, with emoji icons). The wordmark goes to `/` (`:93`).

**Desktop (900px and up).** White top bar, 64px, 2px ink bottom keyline. Left: wordmark to `/feed`. Centre: Stories, Map, Family (menu: Family tree, Sharing and groups, Tags). Right: people search, bell with count, a solid ink `New story` button, avatar menu (Profile, Settings, plan, What's new, FAQ, Feedback, Install, Admin for superusers, Use the previous look, Log out).

**Phone (390).** Top bar 52px (wordmark, search, bell). Bottom tab bar, 64px plus `env(safe-area-inset-bottom)`, five items with labels always visible: Stories, Map, New (raised 56px ink circle), Family, You. The bar is replaced by a contextual bar on the story page, in the creation flow, in the lightbox and in the full-screen map. `viewport-fit=cover` is already set (`frontend/index.html:5`).

**Interactions.** `New story` opens a three-choice menu: From photos (primary), Write it yourself, Find stories in a big batch. Skip link, `aria-current`, real buttons and links, 44px targets. The Shell listens for the existing `open-ai-create` window event (`Header.jsx:24-31`) and routes it to the new flow.

**Data.** `GET /users/me/notification-counts` every 30s as today (`Header.jsx:58-59`), paused while the tab is hidden. `GET /users/search/users` for people search (moved out of the feed filters, `EventFilters.jsx:280-420`).

**No new routes.** Map is `/feed?view=map` (already supported, `Feed.jsx:21-27`, `App.jsx:180`); the photo flow is `/create?from=photos`; Smart Import stays `/import`. `frontend/vercel.json` is not touched.

### 2.2 Feed

**Wrong today.**
- Titled "Explore Events" (`Feed.jsx:209`); a filter block that is open by default above 480px (`:46-48`) and duplicates the category control as both a dropdown and a ribbon (`EventFilters.jsx:490-527` and `:695-740`).
- Titles cut to four words (`FeedView.jsx:9-14`); a card-size switch made of glyphs (`:118-138`); on phones the first tap only "focuses" a card and a second tap opens it (`:92-103`).
- Avatars are a letter on a random gradient (`:30-48`, `:190`) even for people whose photo the app already has from `/users/me/following`.
- Covers are CSS backgrounds (`:153-156`): no lazy loading, no alt, no `srcset`.
- All stories render at once with no grouping by time.
- The view and filters are not in the URL (`Feed.jsx:145-148`), so Back loses them.
- If the API fails, the feed silently shows invented mock stories (`api.js:112-116`).

**Desktop.** Page title `Stories`, a segmented control (Feed, Calendar, Timeline) and one `Filter` button. Stories are grouped by month under a sticky DM Mono label (`AUGUST 2026 · 3 STORIES`). The first story of each group is a lead card (8 of 12 columns, 16:10 cover, 32px title, summary if the story has one, author avatar and name, date range, short place, category dot); the rest are 4-column cards (4:3 cover, 20px title on two lines). Title and meta are always visible under the image. Hover or focus lifts the card with the hard shadow.

**Phone.** One column, 16px margins, 4:3 covers, a single tap opens. Under the top bar, a horizontally scrolling chip row holds the view switch and active filters. Tapping the Stories tab while on Stories scrolls to top and refetches.

**Interactions.** One Filter sheet (popover on desktop, bottom sheet on phone): order (date it happened or date posted, newest or oldest), people (All, Following, Mine, plus a multi-select with faces), categories, date range, muted people. Active filters show as removable chips. View and filters live in the query string. Empty and error states are honest: an error shows Retry, never mock stories.

**Data.** `GET /events?order_by=&skip=&limit=100` (title, summary, dates, `location_name`, `latitude`, `longitude`, `cover_image_url`, author id, username and full name, `privacy_level`, `category`). The Daylight data layer pages with `skip` lazily (first 100 at once, more on scroll or when Calendar or Map needs them, cap 500); the parameters exist today (`events.py:189-191`) but `api.js` never sends them. Avatars are joined client-side from `GET /users/me/following` (`backend/app/api/users.py:289-296`) and the signed-in user; others get initials on a wash disc. `GET /users/me/muted`. Images are `<img loading="lazy">` with `srcset` from `utils/cloudinaryUrl.js`.

**Not shown, because the list does not return it:** like or comment counts, photo counts, stop counts, a second category.

### 2.3 Calendar view

**Wrong today.** Opens on the current month (`CalendarView.jsx:37`), which is usually empty; a multi-day story appears only on its first day (`:66-74`); days show category emoji, not photos (`:145-147`); reading a day needs a modal (`:168-207`).

**New.** A year view by default, opening on the year of the most recent story: twelve mini-months (4 by 3 on desktop, a vertical list on phone). A day with a story shows its cover thumbnail; a multi-day story is one continuous bar from start to end in its category colour. Selecting a day or bar opens a story card (popover on desktop, bottom sheet on phone). Clicking a month name zooms to a month grid with larger thumbnails. `role="grid"` with arrow-key movement and Enter to open. Data: the same list.

### 2.4 Timeline view

**Wrong today.** Cards alternate left and right (`TimelineView.jsx:72`), which wastes width and zig-zags on phones; it ignores the sort toggle (`:36`); it nests a link inside a link (`:75` and `:86-92`).

**New.** One vertical rail with year stickers and month ticks; cards in a single column to the right of it; dates in DM Mono on the rail; a sticky year index (2026, 2025, ...) for jumping, highlighted as you scroll. Always ordered by the date it happened. Phone: rail 20px from the left edge, full-width cards. Data: the same list.

### 2.5 Story page

**Wrong today.**
- The title sits on the cover photo (`EventDetail.jsx:1390-1399`), so legibility depends on the picture, with author actions as emoji-labelled buttons on top of it (`:1412-1457`). Phones show `@username` instead of the name (`:1464-1465`).
- The journey map is at the very bottom after the whole story (`:1594-1605`), 500px tall, 400 at 768 and 300 at 480 (`EventMap.module.css:3,180,197`), and nothing links text to map: `onLocationClick` exists (`EventMap.jsx:80`) but is never passed (`EventDetail.jsx:1599`).
- Photo-heavy stories are a stack of full-width images; AI stories are literally a list of `<p><img></p>` (`QuickAddModal.jsx:536-541`).
- Captions are injected with inline styles (`:1175-1181`); reaction badges are built by hand-editing the DOM with dark pills (`:150-289`).
- On a phone you cannot choose among the ten photo reactions: the picker opens on hover only (`ImageGallery.jsx:57-67`, `:101-105`); a tap applies a heart.
- Comment and like avatars are letters (`:723-725`, `:1687-1689`) although the API returns `author_avatar_url` (`backend/app/api/comments.py:31,173`).
- Loading is the word "Loading..." (`:1256`); blocked states use emoji (`:1267`, `:1291`, `:1315`).
- Five requests follow the event load (`:330-338`, `:384`), one of them redundant: locations are already in the event response (`events.py:184`) yet fetched again (`EventDetail.jsx:549-551`).

**Desktop.** Cover as a keylined 21:9 image, then on white: title (Bricolage 800, `clamp(34px, 4.4vw, 64px)`), a meta row (author face and name, date range in mono, place, read time, who it is shared with), tagged people as face chips, and an action row (Like with count, Comments, Share for the author, an overflow menu for Edit, Move to drafts or Publish, Move to trash). If the story has a journey (two or more located points) the body is two columns: a 680px reading column in Literata 19/31 and a sticky map panel filling the rest (section 2.7). Without a journey it is one 720px column with a sticky contents rail. Runs of two to four consecutive photos become a mosaic row; captions sit under photos in 15px mute; each photo carries a small keylined reaction chip. After the story: All photos (justified grid), likes, comments with real faces and a composer.

**Phone (390).** Full-bleed 4:5 cover, title and meta below it, action row, then a journey strip card (static route preview with `Play the journey` and `Open map`). Story text 18/29 with 20px margins; mosaics at most two across. A sticky bottom bar shows the current stop ("Day 3 · Hidden Falls · 9:26") with a route progress line and a map button, or a slim reading-progress bar when there is no journey. Its left button opens a Chapters bottom sheet. The inline strip is not interactive, so the page never traps a scroll; today's map takes one-finger drags and wheel zoom inside the page (`EventMap.jsx:123-131`).

**Interactions.** Tap a photo for the lightbox (same library, new light chrome); long-press or tap the reaction chip for a ten-reaction tray that works on touch. Like is optimistic as today. Replies nest three levels (`:717`). Share mode (`/share/:token`) uses the same page with likes and comments replaced by the sign-up prompt. Privacy and expiry states keep today's branches (`:1262-1374`) with drawn icons.

**How it renders.** A parser, `parseStory(html, eventImages)`, turns the sanitised HTML into blocks (heading, text, media group, location marker). Text blocks stay sanitised HTML; media blocks are React components. This is the contract the creation preview and the iOS app share (`OFS_iOS/App/StoryHTML.swift` is the existing counterpart).

**Data.** `GET /events/{id or slug}` gives the event, `event_images` (caption, latitude, longitude, timestamp: `events.py:134-153`) and `locations` (`:115-132`); the extra locations request is dropped. Then in parallel `GET /events/{id}/comments`, `/tags`, `/likes`; `GET /media/batch/stats` when the first photo nears the screen. Share mode: `GET /share/{token}`. Videos are detected from `<video>` tags, because the event response omits `media_type` (`events.py:138-153`), so `EventDetail.jsx:1028` never sees a video.

### 2.6 World map view

**Wrong today.** Flat raster tiles straight from `tile.openstreetmap.org` (`MapView.jsx:108-111`); it opens at `[20, 0]` zoom 2 and then jumps to the first story at zoom 4 instead of fitting them all (`:34-35`, `:43-48`); every pin is the same green teardrop with an emoji (`:61-86`); marker images come from a third-party CDN (`:14-16`); popups and the strip load full-size covers (`:146`, `:181`); a story with no coordinates is silently dropped (`:38-40`), which is every AI Create story, because that flow saves `latitude: null` (`QuickAddModal.jsx:443-445`, `:572-574`); the map is `calc(100vh - 300px)` on phones with a strip over it (`MapView.module.css:254-257`).

**Desktop.** A full-bleed map under the top bar. It opens as a globe when the family's pins span more than 60 degrees of longitude, otherwise fitted flat. The globe is a "sticker globe": azure-tinted water, white land, ink coastline keylines, on a pale azure stage with a hard elliptical contact shadow, no glow and no dark space. Pins are round cover thumbnails with a keyline; nearby pins group into a stack with a count. A collapsible 360px panel on the left lists the stories on the map with the same filter chips as the feed; hovering a row pulses its pin and the reverse. A year scrubber sits bottom-centre. Controls top-right: zoom, reset north, Globe or Flat.

**Phone.** Full-screen map above the tab bar. A filter pill at the top ("12 stories · All family"). A bottom sheet with three heights (96px peek, 45%, 92%) holds the stories as snap-scrolling cards; swiping a card flies the map to that story, so the whole view works with one thumb. Pinch to zoom, one finger to pan or spin the globe, two fingers to rotate. Controls sit bottom-right above the sheet. Sheet and controls respect the safe area.

**Interactions.** Selecting a pin opens a story card (cover, title, author, date, place, `Open story`). A cluster zooms to its expansion zoom; stories at one identical spot open as a list. A chip states "3 stories have no place yet" and lists them. Every pin is also a row in the list, which is the keyboard and screen-reader path.

**Data.** The same paged list (one pin per story from `latitude`, `longitude`), `cover_image_url` at the 100px size. No per-story detail is fetched for a peek, because `GET /events/{id}` increments `view_count` (`events.py:636`).

### 2.7 Journey map inside a story

**Wrong today.** It opens on the Satellite layer by default (`EventMap.jsx:82`), which is Esri imagery credited only as "© Esri" (`:22-26`); the route is a straight dashed purple line in array order (`:97`, `:141-150`); the digits on numbered pins are tilted 45 degrees because the rotated teardrop is never counter-rotated (`:204-223`); the event's main location is forced to be stop "Start" whether or not the trip began there (`EventDetail.jsx:573-586`); stops made from photo GPS are named "Photo location 3" (`events.py:400`); there are at most 20 stops (`backend/app/api/locations.py:35-38`); no terrain, no days, no playback.

**New.** A journey is built on the client by `buildJourney(event, parsed)` from three sources already in the event response: `locations` (named stops), `event_images` that carry coordinates (photo points, not limited to 20), and the location-marker spans inside the story HTML (`span[data-location-marker]`, `frontend/src/extensions/LocationMarker.js:40-55`), which give each stop a position in the text. Stops are ordered by timestamp when all have one, otherwise by `order_index`. Photos belong to the stop whose marker precedes them or that lies within 500m. Days come from the H1 chapters and photo timestamps. The event's main location becomes the world pin and the fallback centre, not a forced stop.

**Desktop.** The sticky panel: day chips along the top (each day has a wash colour), the route coloured by day with an ink casing, numbered stop discs with upright DM Mono digits, photo thumbnails fanned at their stop, hillshade always on, a `3D` toggle and a `Play` button.

**Phone.** A static strip in the page; `Open map` shows a full-screen sheet with the map above and a swipeable card per stop (name, time, photos), a visible close button, and pinch and rotate gestures.

Sync, playback and fallbacks are in section 3.

### 2.8 Creation flow

**Wrong today.** Three separate doors (classic form at `/create`, the Quick Add modal, `/import`). The classic form asks for title, audience, category, tags, story, dates, place and cover in that order before any reward (`CreateEvent.jsx:363-605`). The modal is dark in every theme (`QuickAddModal.module.css:8,18`), puts three mode cards first (`QuickAddModal.jsx:685-712`), and reviews the result as "Your Original" beside "AI Enhanced" with a raw HTML textarea labelled "Edit the HTML content..." (`:954-1016`). Section 4 covers the rest.

**New: one flow, `/create?from=photos`, in three moments.**

1. **Pick photos, see a story.** Within two to four seconds, with no upload and no AI, the screen shows the real story layout built from the photos' own data: days as chapters, stops, the route drawn on the map, a date range, a cover, a working title ("5 days in Grand Teton National Park"). A status row tells the truth about three background jobs: `Uploading 12 of 30`, `Naming places 6 of 19`, `Writing`.
2. **Tell it more, while it uploads.** A dock at the bottom offers a 64px mic ("While these upload, tell us about it"), a text field, and after the first write-up a few question cards. All optional. The write-up fills the chapters in place when it arrives.
3. **Publish bar.** Audience (all five options), people, dates, place, category, cover, then `Publish` and `Save draft`.

**Desktop.** Story preview on the left, journey map on the right, dock and publish bar pinned at the bottom of the preview column. **Phone.** The preview scrolls full width; dock and publish bar are one bottom bar in the thumb zone; settings open as bottom sheets; the mic is a single tap to start and a tap to stop, with a live waveform and timer.

`Write it yourself` opens the classic editor inside the new shell, unchanged. `Find stories in a big batch` is Smart Import restyled, with one addition: select several album cards and `Combine into one story`.

**Data.** `POST /upload` per photo, `GET /geocoding/reverse` per stop, `POST /admin/ai/transcribe`, `POST /admin/ai/generate-story`, optionally `POST /admin/ai/generate-questions`, then `POST /events`, `GET /upload/event-images/{id}`, `PATCH /upload/event-image/{id}` and `POST /events/{id}/tags`. All exist today.

### 2.9 Profile

**Wrong today.** It downloads the whole feed and filters by author in the browser (`Profile.jsx:120-128`), so a profile shows only that person's stories among the newest 100 overall. Avatar falls back to a letter (`:293-297`); follow state is plain text.

**New.** A header band in the You wash with a 96px keylined avatar, name, `@username` in mono, bio, three readouts (stories, followers, following), clear follow states, then Stories, Drafts and Trash as a segmented control over the same story cards. Same endpoints as today; the story list comes from the shared paged feed cache.

### 2.10 What exists, what this job builds, what is not shown

| Shown in Daylight | Status |
|---|---|
| Feed in date order, filters, mute, calendar, timeline, one pin per story with grouping, story page parts, likes, comments, reactions, share links, tags, drafts and trash, Smart Import, AI write-up from photos plus typed or spoken words | Exists today; re-presented |
| Globe view; terrain and hillshade; photo pins; route by day; playback; story and map in step; instant draft from photos; journey map on auto-made stories; audience, people, dates and cover choice in the auto flow; combining Smart Import albums; reactions on touch; month grouping; year calendar; bottom tab bar | Built in this job, frontend only |
| Like and comment counts on cards; a second category; satellite imagery; routes that follow roads; filtering by place; offline; push | Not shown and not claimed |

The landing page's own honesty list still says "a globe" is false. It becomes true only when production flips to Daylight; the landing copy must not change before then.

---

## 3. Maps in depth

### 3.1 Library: MapLibre GL JS 6.19.0, pinned exactly

| Fact | Value | Source |
|---|---|---|
| Version, licence | 6.19.0, published 2026-11-17, BSD-3-Clause | `npm view maplibre-gl` (registry) |
| Globe projection | Supported; `map.setProjection({type: 'globe'})` | https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/ |
| 3D terrain | Supported; `raster-dem` source, `terrain`, `hillshade`, `sky` | https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/ |
| Globe and terrain together | Listed example "Create a Heatmap layer on a globe with terrain elevation" | https://maplibre.org/maplibre-gl-js/docs/examples/ |
| v6 changes | ESM only; WebGL2 required; worker is a real file, so no `blob:` worker | https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.0.0 |
| Vite setup | `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'; setWorkerUrl(workerUrl)` | https://maplibre.org/maplibre-gl-js/docs/ |
| No-WebGL2 detection | constructor throws `GPUInitializationError` | https://github.com/maplibre/maplibre-gl-js/blob/main/docs/guides/v5-to-v6-migration-guide.md |
| Covered markers | class `maplibregl-marker-covered` when behind terrain or the far side of the globe | https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/ |
| Bytes (measured) | `maplibre-gl.mjs` 1,106,041 raw, 298,288 gzip; `maplibre-gl-worker.mjs` 550,754 raw, 157,403 gzip; CSS 71,596 raw, 10,191 gzip | https://cdn.jsdelivr.net/npm/maplibre-gl@6.19.0/dist/ |
| For comparison | 5.24.1 single file 1,058,059 raw, 275,623 gzip; Leaflet 1.9.4 42,445 gzip | same CDN; local `node_modules` |

Why v6 and not 5.24.1: ESM suits Vite, the worker is fetched in parallel off the main thread, and WebGL2 is in every current browser. The first task of the foundation builder is a spike proving a lazy globe-plus-terrain map in both `vite dev` and a production build on desktop Chrome and iPhone Safari. If Vite 5's worker bundling fights the module worker, fall back to 5.24.1 (globe since 5.0.0, 2024-12-31), same API for everything this plan uses.

Leaflet stays for the classic look only and is not used by Daylight.

### 3.2 Tiles, style, terrain

- **Vector tiles: OpenFreeMap public instance.** No key, no registration, "no limits on the number of map views or requests", commercial use allowed, no SLA, and the terms say it may be discontinued without notice. https://openfreemap.org/ , https://openfreemap.org/quick_start/ , https://openfreemap.org/tos/ . TileJSON `https://tiles.openfreemap.org/planet`, glyphs `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf` (checked live; CORS `*`).
- **Style: our own, generated in JS from the Daylight tokens** (OpenFreeMap says a customised style must be hosted by you). About 45 layers on the OpenMapTiles schema: paper land, azure-tint water, lime-tint parks and forest, white roads with a faint ink casing, hiking paths as dashed ink at 40%, country and state boundaries, place and water labels in Noto Sans from the OpenFreeMap glyph server, peaks with elevation. No points of interest and no sprite sheet (the one peak triangle is added with `map.addImage`). A low-zoom variant of the same style is the sticker globe.
- **Terrain: Mapterhorn**, the source the official MapLibre terrain example now uses. TileJSON `https://tiles.mapterhorn.com/tilejson.json` (checked live: Terrarium encoding, 512px WebP, CORS `*`, `max-age=604800`, attribution "© Mapterhorn"). Code is BSD-3; data is open (global Copernicus GLO-30; United States from USGS 3DEP, public domain, at 1m where available, which covers the Tetons). https://mapterhorn.com/ , https://mapterhorn.com/data-access/ , https://download.mapterhorn.com/attribution.json . The site states no usage terms for the hosted endpoint; treat it like OpenFreeMap (best effort). Named fallback: AWS Terrain Tiles, no account needed, https://registry.opendata.aws/terrain-tiles/ .
- **If either public service changes:** both publish PMTiles; OFS already has R2 with a custom domain. Sources live in one module (`map/sources.js`), so moving to self-hosted archives is a constant change plus the `pmtiles` protocol (4.5.0, BSD-3).
- **Dropped: the Satellite layer.** It is proprietary Esri imagery fetched with no key. I could not find terms that clearly permit that for a commercial app (Esri reserves the right to classify use as commercial: https://www.esri.com/en-us/legal/terms/web-site-service ), and it fails the open-source constraint anyway.
- **Also wrong today and fixed by this:** `tile.openstreetmap.org` has no SLA and "access may be withdrawn at any point" for commercial services (https://operations.osmfoundation.org/policies/tiles/); OpenTopoMap asks for a fuller credit than the app prints (https://opentopomap.org/about, `EventMap.jsx:27-31`).

### 3.3 Globe, clustering, photo markers

- Globe: set on `style.load`; no idle spin; Globe or Flat toggle remembered locally.
- Clustering: a GeoJSON source with `cluster: true`, `clusterRadius: 60`, `clusterMaxZoom: 11` (MapLibre's built-in clustering; example "Display HTML clusters with custom properties").
- Markers are DOM buttons (44px desktop, 48px phone): a round thumbnail, 3px white ring, 2px ink keyline, hard shadow. A cluster is a stack of up to three thumbnails (from `getClusterLeaves`) with a DM Mono count. At most 80 DOM markers at once; beyond that a circle layer. Covered markers are hidden with the documented class. Each has an `aria-label` ("Story: title, place, date").

### 3.4 The route

- **Order.** By photo or stop timestamp. Legs are straight lines between consecutive points, because the app has photo positions, not a GPS track; it does not pretend to follow roads. Hops over 300km are drawn as great-circle arcs.
- **Look.** 4px line coloured by day (washes in turn) over an 8px ink casing; the part not yet reached is ink at 25%, dashed. Reached and unreached are two layers switched by a filter on a per-leg sequence number, so reading costs no per-frame work.
- **Playback (only on `Play`, never on load).** Per leg: draw the line with a `line-gradient` on `line-progress` (`lineMetrics: true`), ease the camera to the next stop with the bearing along the leg and, on capable devices, pitch 55 degrees over terrain; hold 1.6s while the stop's photos pop in with their caption; at a day boundary show a title card ("Day 3 · Monday 28 July") and refit to that day. Controls: play or pause (Space), previous and next stop (arrow keys), day chips, 1x or 2x, a keyboard-operable scrubber, close.
- **Reduced motion.** Camera moves are non-essential animations, which MapLibre turns into jumps under `prefers-reduced-motion`; playback becomes Next stop steps with a cross-fade.

### 3.5 Story and map in step

- **Anchors.** The story body renders each location marker and each located photo with `data-stop-id`.
- **Reading.** A passive scroll listener, throttled to animation frames and writing to a ref, finds the last anchor above a reading line at 38% of the viewport (24px hysteresis). React state changes only when the active stop changes.
- **Map response.** When the chapter changes, fit the day's bounds once. Within a day, highlight the active stop and pan only if it is outside the middle 60% of the panel. There is no continuous scroll-scrubbed camera.
- **Reverse.** Selecting a stop scrolls the story so its anchor sits on the reading line and flashes that photo's outline.
- **Manual override.** If the reader moves the map, following pauses and a `Follow the story` chip resumes it.
- **Stories without anchors** (older stories with only a stops list) get the route and a stops list, with no scroll link.

### 3.6 Fallbacks on weak devices

| Level | When | What you get |
|---|---|---|
| Full | WebGL2, at least 4GB reported memory (or unreported), no Save-Data | Globe, terrain, camera flights |
| Lite | Low memory, Save-Data, or frames over 40ms in the first two seconds | Flat map, hillshade only, jump cuts, 60 markers |
| Static | No WebGL2, the map chunk fails, or no tiles arrive in 5s | Story: an SVG route sketch (stops projected on paper, names, day colours) plus the stops list. World: a Places list grouped by place name. Everything still links to stories |

The SVG sketch is also the phone's inline strip before the library loads, and the stub the other builders develop against.

### 3.7 Attribution

MapLibre's attribution control, always present, bottom-right, expanded on desktop and compact on phone. Text comes from the TileJSON: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" plus "© Mapterhorn" when terrain or hillshade is loaded. The static sketch uses no map data and needs none. `docs/app/ATTRIBUTION.md` lists MapLibre (BSD-3), OpenFreeMap (MIT), OpenMapTiles, OpenStreetMap (ODbL), Mapterhorn and its sources.

### 3.8 Lazy loading and expected bytes

The main bundle today is `boot-app-*.js`, 1,984,874 bytes, plus 556,833 bytes of CSS (`frontend/dist/assets`). The map must never join it.

- `map/engine.js` is the only importer: `await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'), import('maplibre-gl/dist/maplibre-gl.css')])`.
- Triggers: the world view opens; on desktop a journey panel comes within one viewport of the screen; on phone the reader taps `Open map` or `Play`. On a fast connection without Save-Data the chunk is preloaded on idle, never executed early.
- Cold cost of the first map: about 466KB gzip of library and worker, 10KB CSS, at most 35KB of our map code (style included), then 300 to 600KB of tiles and glyphs. Later visits come from cache.
- Service worker: `vite.config.js:107-109` precaches every JS file under 3MB, which would push the map onto every user. In Daylight builds only, add the map and worker chunks to `globIgnores` and give them a runtime cache rule.
- Guard: `scripts/daylight/check-bundle.mjs` reads `dist/.vite/manifest.json` and fails if `maplibre` is in the static import closure of the entry or of any route chunk except the map chunk.
- Side benefit to measure: in Daylight builds the five classic pages, Leaflet, the lightbox and the Quick Add modal become on-demand chunks (they are only the fallback), so the main bundle should shrink.

---

## 4. Auto-create in depth

### 4.1 What it does today and why it underwhelms

**AI Create (`QuickAddModal.jsx`).**
- **No journey.** Nothing sends stops or coordinates on publish (`:564-576`).
- **Wrong place.** The modal pre-fills the location of your previous story (`:130`, `:135-144`) and then ignores the AI's place if one is already set (`:443`), so a Teton story can be pinned to last month's kitchen. When there is no previous location it saves a name with no coordinates (`:444`), so the story never reaches the map.
- **Wrong date.** The date defaults to today (`:43`) and is saved as both start and end (`:567-568`); photo timestamps are never used. A five-day trip becomes one day, today.
- **No choices.** Audience is hard-coded to Followers (`:570`); no tags; cover is simply the first upload (`:528`).
- **Published before review in Quick Publish** (`:466-470`), and publishing emails every follower (`events.py:427-460`).
- **Slow and fragile.** Photos upload one at a time (`:232-298`); every photo is reverse-geocoded with no spacing (`:281-291`), against Nominatim's limit of one request per second (https://operations.osmfoundation.org/policies/nominatim/); captions are saved one request at a time with a field the server ignores (`display_order`, `:590`; the schema field is `order_index`, `backend/app/schemas/event_image.py:30`).
- **Duplicate rows that break trials.** Creating the event already inserts one `event_images` row per photo (`events.py:95-106`); the caption loop then inserts a second row per photo (`backend/app/api/upload.py:623-641` always inserts). Trial stories are capped at 50 rows (`upload.py:615`), so a 30-photo trial story hits the cap after 20 captions and the rest fail silently (`QuickAddModal.jsx:592-594`).
- **Voice is thin.** Recording errors are not caught (`:806`; the hook rethrows at `useVoiceRecorder.js:57-60`); the transcript is poured into a textarea; the upload is always named `recording.webm` (`api.js:2798`) even when Safari recorded MP4 (`useVoiceRecorder.js:19-23`), which I suspect breaks transcription on iPhone and should be tested on a device.

**Smart Import (`SmartImport.jsx`).**
- **A single trip is split up.** Trip merging needs a "home" inferred from at least two regions in the batch (`backend/app/utils/photo_clustering.py:216-235`); a batch that is only the holiday has none, so every gap over 8 hours (`:28`, `:156-158`) and every move over 5km (`:32`, `:164-169`) starts a new album. The iOS notes say the same: home inference "needs home days > trip days".
- Every photo is sent to the model with the same town name (`SmartImport.jsx:245-251`).
- Audience is hard-coded (`:298`); the same duplicate rows are created (`:307-331`); the journey is not drawn (finding 2); each Rewrite resends everything and spends a daily use (`:273-279`).

**The server (`backend/app/api/ai_creator.py`).**
- **Prompt makes generic stories.** "Do not invent names ... use generic terms like 'the family'" (`:80`) and "warm, positive, celebratory" (`:77`), while the app knows the author's name and tagged people and never passes them.
- **Output is not checked.** "Each photo MUST be included ... exactly once" (`:451`) is only a request; the handler (`:501-539`) never verifies URLs, so a dropped photo vanishes and an altered URL becomes a broken image.
- **Truncation becomes an error.** `max_tokens=4096` (`:483`) with thirty URLs, thirty captions and the story in one JSON string; a cut-off response fails `json.loads` (`:501`) and the user sees "AI generated invalid response" (`:544`).
- **One shared daily limit of 5** (`:22`) counts transcription, questions and the story alike (`:53-56`, `:262`, `:303`, `:385`). Photos plus a voice note plus questions costs three of five.
- **Questions cost a second full pass** over every photo (`:335-339`, then again `:468-475`), and the answers are typed only (`QuickAddModal.jsx:907-917`).
- One blocking request with every photo at 1200px. `backend/vercel.json` sets no time limit; I could not verify the plan's limit.

### 4.2 The redesigned flow

**Step 1: an instant draft, built on the device (no network).**
- Read EXIF from the first 256KB of each file, falling back to the whole file (today the whole file is always read, `exifExtractor.js:40`), eight at a time. Make small thumbnails with `createImageBitmap` so thirty 12MP photos do not exhaust a phone.
- Sort by time. Days use the same 4am pivot as the server (`photo_clustering.py:35`, `:349-350`).
- Stops: walk the photos in order; a photo within 500m of the stop's first photo and within 90 minutes joins it, otherwise it starts a new stop. If there are more than 20, merge the closest consecutive pair until there are 20 (the server limit).
- Dates from the first and last photo. Cover by the server's own rule (landscape, mid-story, peak hour: `:353-386`). Title from the server's templates (`:389-403`).
- Render it with the real story component and the journey map. This is "immediately with just photos".

**Step 2: three background jobs, shown honestly.**
- Uploads, four at a time, pre-resized with the editor's existing helper (`utils/imageProcessor.js:32`), each retryable.
- Place names: one reverse-geocode per stop (not per photo), 1.1s apart, as Smart Import already does (`SmartImport.jsx:163-182`).
- The write-up: one `generate-story` call when uploads finish. Structure travels in `user_text`, the channel Smart Import already uses (`:254-259`): the day and stop outline with place names and times, the author's first name and tagged people's names ("write as Maya, in the first person"), the voice transcript, typed notes and answers. The cap is 5,000 characters (`ai_creator.py:105-109`).
- Where the media host is a Cloudflare zone (`utils/cloudinaryUrl.js:21-26`), send the model 768px JPEG URLs and map them back afterwards: roughly 570 tokens a photo instead of about 1,400 (https://platform.claude.com/docs/en/build-with-claude/vision). Send at most 40 photos; the rest are placed by timestamp.

**Step 3: the app owns the final HTML.** `finalizeStoryHtml(aiHtml, photos, stops)`:
- keeps the model's text and its placement of photos;
- drops any image URL that was not uploaded; appends every missing photo to its own day;
- inserts a location-marker span before the first photo of each stop, with `data-timestamp` as a plain local `YYYY-MM-DDTHH:MM:SS` (the server parses it with no error handling, `events.py:373`).
If the write-up fails, times out, or the daily limit is reached, the draft is still a complete photo story with days, places and map, and can be published as it is.

**Step 4: better with more, and never blocking.**
- **Voice.** The mic is offered during the upload wait, so a note recorded then is included in the first and only write-up. Waveform, timer, three-minute cap, the transcript kept as an editable card ("What you said"), a file name that matches the recording type, and a caught permission error with `Type instead`.
- **Text.** The same dock.
- **Questions.** Two free ones always: "Who is in it?" (tag chips, which give the model names) and "Anything the photos don't show?" (voice or text). `Ask me questions` calls the existing questions endpoint and says it uses one of the day's five AI writes. Answers go in the existing `interview_answers` field (`ai_creator.py:191`).
- **Rewrite.** One button; the UI states the daily limit of five and counts the calls made this session.

**Step 5: publish in a way that fixes today's data problems.**
1. One `POST /events?is_published=true` with the final HTML, `summary`, the real date range, `location_name`, the centroid as `latitude` and `longitude`, the chosen cover, audience and category. Because the HTML carries the marker spans, the server itself creates the stops (`events.py:361-380`) and the image rows (`:422-425`), and the follower email goes out exactly as today.
2. `GET /upload/event-images/{id}`, then `PATCH /upload/event-image/{id}` for each caption, three at a time. No duplicate rows.
3. `POST /events/{id}/tags`.
The result has a journey in the classic look as well, since classic reads `event_locations`. `Save draft` is the same with `is_published=false`.

Nothing is created on the server before the user presses Publish or Save draft; the preview is a local object. That keeps the email behaviour identical (`POST /events/{id}/publish` sends none, `events.py:823-862`).

### 4.3 Frontend change or backend change

| Improvement | Stage 1: frontend only, in this job | Stage 2: backend or prompt, optional and additive |
|---|---|---|
| Story appears immediately with days, stops, route | Yes | |
| Real dates, real place, cover choice, audience, tags | Yes | |
| Journey map on auto-made stories | Yes, via marker spans | Per-photo coordinates: add optional `latitude`, `longitude`, `timestamp` to `EventImageUpdate` (`schemas/event_image.py:44-47`) |
| No duplicate image rows | Yes, PATCH instead of a second insert | |
| Names and structure reach the model | Yes, through `user_text` | Optional request fields `people`, `chapters`, `author_name` (default empty, old clients unaffected) |
| Dropped or altered photos | Yes, repaired on the client | Return photo ids instead of URLs |
| Tone | Partly, by instruction in `user_text` | Rewrite the system prompt (`:72-93`): plain, specific, first person, use given names |
| Invalid-response errors | Becomes a soft failure | Raise `max_tokens`, check for truncation, one repair retry; on the Anthropic path use structured outputs |
| Photo-specific questions at no extra cost | Uses the existing endpoint, costs one write | Return `follow_up_questions` with the story |
| Voice costs a daily write | Unchanged, stated in the UI | Count per story, or exempt transcription |
| Single trips split by Smart Import | Combine albums on the client | A `single_story` hint to the clusterer, mirrored in the Swift port |

Stage 1 needs no backend change. Stage 2 items each add optional fields or change wording inside one endpoint; none changes a response field the classic frontend reads.

---

## 5. Gating, architecture and files

### 5.1 The gate

The same method as the landing, with its own switch.

- `frontend/app.config.json`: `{"production":"classic","preview":"daylight"}`.
- `frontend/scripts/daylight/variant.mjs` exports `resolveAppLook(env)`: `VITE_APP_LOOK` if set, else `production` when `VERCEL_ENV === 'production'`, else `preview`. It is a copy of `scripts/landing/variant.mjs`.
- `vite.config.js` gains `define: { __APP_LOOK__ }` and, only when the look is `daylight`, one plugin: `scripts/daylight/vite-seam.mjs`.
- Going live is a one-line change to `app.config.json`. Going back is reverting it.
- Inside a Daylight build there is also a per-person escape: `Use the previous look` sets `localStorage['ofs.look'] = 'classic'` (and `?look=classic` does the same). It costs little because the classic pages stay in the build as on-demand chunks.

### 5.2 How the pages coexist: a seam, not edits

The plugin's `resolveId` (`enforce: 'pre'`) rewrites six imports, and only when the importer is `src/App.jsx`: `./pages/Feed`, `./pages/EventDetail`, `./pages/CreateEvent`, `./pages/SmartImport`, `./pages/Profile`, `./components/Layout`. Each resolves to `src/daylight/seam/<Name>.jsx`, a small switch:

```jsx
const Classic = lazy(() => import('../../pages/Feed.jsx'))   // importer is the seam, so not rewritten
const Daylight = lazy(() => import('../feed/FeedPage.jsx'))
export default function Feed(props) {
  return <Suspense fallback={<FeedSkeleton />}>{useLook() === 'classic' ? <Classic {...props} /> : <Daylight {...props} />}</Suspense>
}
```

`App.jsx`, every existing page, component, style and `services/api.js` stay untouched. The plugin fails the build if any of the six rewrites did not happen. The Layout seam renders the new Shell, which mounts the existing `TrialBanner`, `WelcomeModal`, `FeedbackWidget` and `Footer` as they are (`Layout.jsx:20-57`) so trial and welcome behaviour is preserved, and adds `html.ofsa-on` for the body background.

The same plugin, in Daylight builds only:
- transforms `index.html` (theme colour to paper, `apple-mobile-web-app-status-bar-style` from `black-translucent` to `default` so the clock is readable on a light page, a Bricolage preload; today `index.html:74,77`);
- patches the PWA manifest colours (`vite.config.js:46-47`);
- adds the service-worker ignores for the map chunks;
- sets the worker format for MapLibre;
- copies `frontend/daylight-public/` into `dist`.

### 5.3 Proving a classic build is unchanged

1. Before any work, in a clean worktree at the starting commit (tag `daylight-base`), run `VITE_LANDING=classic npm ci && npm run build` twice. Keep one `dist` as the baseline; compare the two to learn whether any file is nondeterministic, and record any such file with the reason.
2. After every integration: `VITE_LANDING=classic VITE_APP_LOOK=classic npm run build`, then `node scripts/daylight/check-classic.mjs --baseline <dir> --candidate dist`. It passes only if the file lists are identical and every file has the same SHA-256, with explicit checks on `index.html`, `sw.js` and the main chunk's hashed name, and if `grep -r "ofsa\|maplibre\|daylight" dist` finds nothing.
3. This is achievable because the inputs to a classic build do not change:
   - `git diff --stat daylight-base -- frontend/src ':!frontend/src/daylight'` must be empty (enforced by the same script);
   - `index.html`, `public/`, `vercel.json`, `prerender.mjs` and `package.json` scripts are untouched;
   - `vite.config.js` gains only an unused define and a plugin that is not added for classic;
   - `maplibre-gl` is installed with `--save-exact`, and the lockfile diff may only add packages. If an existing dependency's version moves, the byte check catches it.
4. `VERCEL_ENV=production node scripts/daylight/variant.mjs` must print `classic`, and Vercel Production must not define `VITE_APP_LOOK`.

### 5.4 Folder layout

```
frontend/app.config.json
frontend/daylight-public/                 static files for Daylight builds only (kept out of public/ so classic dist is identical)
frontend/scripts/daylight/
  variant.mjs  vite-seam.mjs  check-classic.mjs  check-bundle.mjs  check-contract.mjs
  build-sample.mjs  capture.mjs
  fixtures/  contract.mjs  teton.mjs  teton.photos.json  sample.json (generated)  _files/teton/*.jpg (gitignored)
frontend/src/daylight/
  seam/      Layout Feed EventDetail CreateEvent SmartImport Profile
  styles/    tokens.css  base.css  compat.css          every selector starts .ofsa or html.ofsa-on
  lib/       look.js  http.js  data.js  format.js  storyBlocks.js  journey.js  exif.js  geo.js  capability.js
  ui/        Button IconButton Card Chip Avatar Sheet Dialog Menu Segmented Field Skeleton EmptyState Head Label Sticker Readout Icon
  shell/     Shell.jsx  NewMenu.jsx
  feed/      FeedPage  StoryCard  FilterSheet  CalendarYear  Timeline
  profile/   ProfilePage
  story/     StoryPage  StoryView  StoryBody  Mosaic  Gallery  Lightbox  Comments  Likes  PrivacyBlock  ChaptersSheet
  map/       engine.js  sources.js  style.js  WorldPage  JourneyMap  markers.js  route.js  playback.js  sync.js  RouteSketch.jsx  PlacesList.jsx
  create/    NewStoryPage  draft.js  uploadQueue.js  places.js  compose.js  VoiceNote  Questions  PublishBar  ImportPage
  dev/       Only.jsx  sampleApi.js  sampleBoot.js
docs/app/    SPEC.md  ATTRIBUTION.md  tokens.json  handover/{F0,FEED,STORY,MAP,CREATE,ART}.md
landing-art/ prompts/tt1..tt4-teton.md  teton-exif.mjs
```

### 5.5 Style isolation

CSS Modules for every component. Tokens live on `.ofsa` (never `:root`) with the prefix `--a-`. No bare element selectors. `compat.css` redefines the classic variables inside `.ofsa`. `html.ofsa-on` carries page-level effects and is removed on unmount. The classic global reset (`index.css:1-5`) still applies; Daylight sets its own focus ring (`.ofsa :focus-visible`: 2px ink with a 2px white offset). Fonts are the landing's files under `/landing/fonts/`, already present in every build; Daylight imports the landing's `fonts.css`, which contains only `@font-face` rules. MapLibre's global CSS loads only with the map chunk, and our overrides are scoped under `.ofsa`.

### 5.6 Developing and screenshotting against fixtures

One snapshot, three consumers. `build-sample.mjs` imports the landing's fixtures read-only (`scripts/landing/fixtures/{cast,stories,comments}.mjs`; never edited, so the landing's captures still show nine stories) plus the Teton story, and writes `fixtures/sample.json`. The shapes pass through `contract.mjs`, which mirrors production exactly: list items as `events.py:254-283`, detail as `events.py:112-186` (no `media_type`, no `category_2`, no avatar). This matters because the landing's fixture returns the full event for list items (`scripts/landing/fixtures/api.mjs:56`), which is richer than production. `check-contract.mjs` fails if a key appears that production does not send.

1. **Sample dev server.** `VITE_APP_LOOK=daylight VITE_DAYLIGHT_SAMPLE=1 VITE_API_URL=http://127.0.0.1:5330 VITE_SUPABASE_URL=http://127.0.0.1:5330/__sb npx vite --port 5330 --strictPort --host 127.0.0.1`. A dev middleware in the plugin answers `/api/v1/**` and `/__sb/**` from the snapshot through `src/daylight/dev/sampleApi.js` and serves the sample photos. `/__fx/signin?as=maya` writes the stub session and redirects. It must be opened on `127.0.0.1`: `AuthContext.jsx:7-9` hard-codes `localhost:8000` for the host `localhost`, and `api.js:5-9` sends any other host to the production API unless `VITE_API_URL` is set, which is why it is always set.
2. **Screenshots.** `capture.mjs` drives the same server with Playwright (loaded as `scripts/landing/shots.mjs:23` does), blocks service workers, aborts every host except the two tile hosts, fails on any unanswered API route, and writes `frontend/shots/daylight-*/sheet.jpg` and a request log, following `capture-ui.mjs:57-93`. `?only=feed|story|map|create|ui` isolates a package.
3. **A sample build for a real phone.** With `VITE_DAYLIGHT_SAMPLE=1` the build includes `dev/sampleBoot.js`, a `fetch` shim answering from the same snapshot, so the owner can open a link on his iPhone and use the redesign with the sample family. The plugin refuses this flag when `VERCEL_ENV=production`.

Real data: Vercel previews build Daylight and talk to the production API, so the owner signs in on a preview and sees his own stories in the new look while production stays classic.

---

## 6. The Grand Teton sample story

**The family.** Reuse the Hartleys (Maya, Tom, Ivy, Leo): the art pipeline already has their reference sheets (`landing-art/ref/cast-a.png`, `cast-b.png`) and the fixtures already have their accounts. Biscuit stays with Nana Ruth; dogs are not allowed on the park's trails, which gives the comments a thread.

**The story.** Title: **Five days under the Tetons**. Author Maya. Saturday 26 to Wednesday 30 July 2025 (the summer before the landing's year, which gives the calendar and timeline a second year). Category Vacation. Audience Followers. Tagged: Tom, Ivy, Leo. Place: "Grand Teton National Park, Wyoming"; world pin at Jenny Lake (43.76389, -110.73000). Summary: "Jet lag, a boat across Jenny Lake, one very cold paddle and a moose that may have been a log." Cover: shot 21.

**Itinerary and the 30 shots.** Local time is Mountain Daylight Time (UTC-6). Coordinates come from Wikidata (queried 2026-11-26) unless marked ≈, which are my estimates to be confirmed on the rendered map. L is landscape 4:3, P is portrait 3:4.

| # | Day, time | Stop | Lat, Lng | Shot |
|---|---|---|---|---|
| 1 | Sat 14:12 | Jackson Hole Airport | 43.60733, -110.73775 | The four walking from the aircraft steps with bags, the whole range behind. L |
| 2 | Sat 16:41 | Jackson Town Square | ≈43.4799, -110.7624 | Ivy and Leo under the elk-antler arch, looking up. P |
| 3 | Sat 20:18 | Colter Bay cabins | 43.90420, -110.64100 | Cabin porch in evening light, bags by the door, Leo asleep on Tom's shoulder. L |
| 4 | Sun 05:58 | Mormon Row, Moulton Barn | 43.66056, -110.66500 | The barn lit by sunrise, range behind, nobody in frame. L |
| 5 | Sun 06:24 | Mormon Row | ≈43.6612, -110.6648 | The family in fleeces on the fence with flask cups, Ivy yawning, bison as dots in the sage. L |
| 6 | Sun 07:42 | Schwabacher Landing | 43.72910, -110.66200 (confirm) | Still beaver pond reflecting the peaks, Ivy crouched at the edge. L |
| 7 | Sun 07:55 | Schwabacher Landing | same, within 40m | Leo pointing at a beaver dam, Tom kneeling beside him. P |
| 8 | Sun 09:31 | Snake River Overlook | ≈43.7545, -110.6239 | The river bend below the range, Tom lifting Leo at the wall. L |
| 9 | Sun 12:48 | Oxbow Bend | 43.86278, -110.54889 | Mount Moran in the slack water, Maya with binoculars. L |
| 10 | Sun 12:57 | Oxbow Bend | same, within 30m | A far dark shape in the willows, Ivy's hand pointing into frame. L |
| 11 | Sun 18:34 | Colter Bay shore | 43.90317, -110.64367 | Ivy and Leo skimming stones on Jackson Lake. L |
| 12 | Mon 08:22 | Jenny Lake boat dock | 43.75191, -110.72667 | Boarding the shuttle boat in life jackets. L |
| 13 | Mon 08:31 | Just off the dock | ≈43.7535, -110.7290 | Maya's selfie on the boat, wind in hair, the canyon ahead. P |
| 14 | Mon 09:26 | Hidden Falls | 43.76660, -110.75600 | The falls behind the family on the viewing rocks. P |
| 15 | Mon 10:19 | Trail above the falls | ≈43.7669, -110.7525 | Leo on Tom's shoulders on the rock steps. P |
| 16 | Mon 10:52 | Inspiration Point | 43.76722, -110.74861 | Ivy with her arms out, Jenny Lake far below. L |
| 17 | Mon 10:58 | Inspiration Point | same | All four squeezed into one frame, lake behind. L |
| 18 | Mon 14:36 | String Lake | 43.78861, -110.72972 | Ivy and Leo wading knee-deep in clear water. L |
| 19 | Mon 15:41 | String Lake picnic area | same, within 50m | Sandwiches on a log, wet feet, towels. L |
| 20 | Tue 10:05 | Taggart Lake trail | ≈43.7040, -110.7500 | Ivy leading through wildflowers and aspens. P |
| 21 | Tue 10:33 | Taggart Lake shore | ≈43.7046, -110.7515 | The family on the boulders, the Grand reflected. L. Cover |
| 22 | Tue 10:44 | Taggart Lake | same | Leo's boots off, feet in the water, close. L |
| 23 | Tue 13:16 | Chapel of the Transfiguration | 43.66011, -110.71533 | The small log chapel with the range behind. L |
| 24 | Tue 13:52 | Menor's Ferry | 43.65890, -110.71176 | Ivy and Leo with ice-creams on the porch of the old store. L |
| 25 | Tue 17:47 | Signal Mountain summit | 43.84890, -110.56700 | The whole valley and Jackson Lake, Maya and Ivy at the rail. L |
| 26 | Tue 20:41 | Jackson Lake Dam | 43.85765, -110.58959 | Pink evening light on Mount Moran, Tom and Leo small on the shore; bright, not dusky. L |
| 27 | Wed 06:52 | Colter Bay lakeshore trail | 43.89660, -110.64900 | Maya and Ivy on the pebble beach, mist lifting. L |
| 28 | Wed 07:34 | Colter Bay | ≈43.8990, -110.6480 | Tom and Leo in a red canoe close to shore. L |
| 29 | Wed 10:17 | Jackson Lake Lodge | 43.87753, -110.57759 | Hot chocolates on the terrace, the view over the willow flats. L |
| 30 | Wed 15:06 | Jackson Hole Airport | 43.60733, -110.73775 | Leo waving at the mountains from the aircraft steps. P |

Under the 500m and 90-minute rule this yields 19 stops over 5 days (3, 5, 4, 4, 3), inside the 20-stop limit. The chapel and Menor's Ferry (about 320m apart) form one stop; the airport appears twice, which closes the loop. Wildlife is always distant. No text, logos or readable signs. Children are ordinarily dressed.

**Sections** (H1, then H2):
- Day one: straight off the plane (The arch made of antlers)
- Day two: jet lag pays off (Barns at six in the morning; The beaver pond; Oxbow Bend, and a moose that may have been a log)
- Day three: the boat, the falls and the point (Hidden Falls; Inspiration Point; String Lake, feet first)
- Day four: Taggart Lake and the top of Signal Mountain (The chapel; Signal Mountain)
- Day five: one more morning
- What we would do again

About 1,000 words in Maya's voice, the register of the coast story (`scripts/landing/fixtures/stories.mjs:23-72`). True details to use: you walk down steps onto the apron at this airport, and the boat shuttle crosses Jenny Lake.

**From art to fixture.**
1. Four prompt batches in the existing structure (`docs/landing/handover/ART.md`), snapshot look, cast sheets attached, ids `photo-teton-01` to `-30`, checked by eye on a contact sheet with the same reject rules.
2. `landing-art/teton-exif.mjs` reads `teton.photos.json` (id, lat, lng, local time, orientation, caption, alt) and writes 2048px JPEGs with `DateTimeOriginal`, `OffsetTimeOriginal -06:00`, GPS latitude and longitude with refs, pixel dimensions and a neutral make and model, into `fixtures/_files/teton/`, plus WebP web copies into `frontend/daylight-public/sample/teton/`. Each point is offset a few metres deterministically so no two are identical. Use sharp's `withExif`; if it cannot write GPS rationals correctly, use `piexifjs` inside `landing-art/` only.
3. **Acceptance test:** every JPEG is read back with the app's own `extractImportMetadata` (`utils/exifExtractor.js:31`) and must return the intended coordinates within 0.0001 degrees and the intended time.
4. `fixtures/teton.mjs` holds the story in the shape of the existing sample stories (body with marker spans and images, stops, captions, comments from Ruth, Joe, Kate and Marcus, a few photo reactions). `build-sample.mjs` adds it to the snapshot.
5. **The end-to-end demo:** the capture run drops the 30 JPEGs into the new flow. The sample API answers uploads with the web copies in order, reverse geocoding from the stop table, transcription with a Teton voice note and the write-up with the story body (built from the URLs in the request, as `scripts/landing/fixtures/api.mjs:110-128` does). It passes when the draft shows 5 days, 19 stops and the route with no coordinate typed by hand, and the published story then opens from the feed and the globe.

---

## 7. Build sequence

**Packages and ownership** (builders edit only what they own; nobody edits existing app files).

| Package | Owns | Depends on |
|---|---|---|
| F0 Foundation (first, alone) | Gate, seam plugin and the six seam files with stubs, `styles/`, `lib/`, `ui/`, `shell/`, `dev/`, `scripts/daylight/**` except Teton content, the snapshot with placeholder Teton photos, `docs/app/**` | Nothing |
| ART (alongside F0) | `landing-art/prompts/tt*.md`, `landing-art/teton-exif.mjs`, `fixtures/_files/teton/**`, `fixtures/teton.photos.json`, `daylight-public/sample/teton/**` | Nothing |
| FEED | `src/daylight/feed/**`, `src/daylight/profile/**` | F0 |
| STORY | `src/daylight/story/**`, `fixtures/teton.mjs` (story text and comments) | F0 |
| MAP | `src/daylight/map/**` | F0 |
| CREATE | `src/daylight/create/**` | F0; `StoryView` and `JourneyMap` by contract |
| Integration (director) | Wiring, full flows with the real photos, proofs, final sheets | All |

**Interfaces F0 freezes** (each with a working stub, so no builder waits on another):

```js
// lib/look.js
useLook() -> 'daylight' | 'classic'     setLook(value)
// lib/data.js   (wraps services/api.js; never edits it; throws on failure, never returns mock data)
useFeed({orderBy}) -> {events, loading, error, hasMore, loadMore, refresh}
usePeople() -> {following, faceFor(username), muted, refreshMuted}
useStory(idOrSlug, {shareToken}) -> {event, images, locations, privacyError, loading, reload}
useStoryExtras(eventId, {shareToken}) -> {comments, tags, likes, actions}
useMediaStats(mediaIds) -> {stats, react(id, type), unreact(id)}
// lib/format.js
dateRange(start, end, {short})   shortPlace(name, parts = 2)   readTime(html)
parseBackendDate(iso)            // naive strings are local wall time, the same rule as OFS_iOS/App/Theme.swift
// lib/storyBlocks.js
parseStory(html, eventImages) -> {blocks, chapters, media}
//  block: {type:'heading', level, id, text} | {type:'html', html} | {type:'media', items} | {type:'marker', stop}
//  media item: {id, kind:'image'|'video', src, caption, alt, w, h, lat, lng, ts}
// lib/journey.js
buildJourney(event, parsed) -> {stops, legs, days, bbox} | null
//  stop: {id, name, lat, lng, ts, dayIndex, photoIds, anchorId}    day: {index, date, label, stopIds, chapterId, bbox}
// map/   (F0 ships these rendering the SVG sketch and the Places list; MAP replaces the insides)
<WorldMap events selectedId onSelect />
<JourneyMap journey activeStopId onStopSelect mode="panel|sheet|strip" playing onPlayingChange />
useJourneySync({journey, containerRef}) -> {activeStopId, scrollToStop}
// story/
<StoryView event images locations extras mode="read|preview|share" />
// create/
buildDraft(files) -> Draft        composeEvent(draft, ai, edits) -> {eventData, captions, tags}
// dev/sampleApi.js
answer({method, path, query, body}, state) -> {status, json} | undefined
```

**Screenshots each builder must produce and read** (desktop 1440x900 and phone 390x844 unless noted; every run also reports console errors, sideways scroll at 390, 768, 1280 and 1920, a keyboard-focus shot, a reduced-motion shot, and a request log showing only the tile hosts left the machine):

- **F0:** the primitives sheet (`?only=ui`); the shell on every route with stubs; the previous-look toggle; the classic byte-proof report; the bundle report; the MapLibre spike in dev and in a production build.
- **FEED:** feed top and a scrolled month group; filter sheet open; active filter chips; empty, error and loading states; calendar year, a day card, the month zoom; timeline; own profile and another person's profile when not following.
- **STORY:** the Teton story top, a mosaic, mid-story beside the map; the kitchen story (single column, no journey); chapters sheet; gallery; lightbox with the reaction tray; comments with a reply thread; share mode; the three blocked states; a long title.
- **MAP:** the globe on opening; a cluster zoomed; a selected story card; the phone sheet at half and full height; filters applied; the static Places list; a 12-step scroll sheet of the Teton story showing the map following days one, three and five; six playback frames; the phone journey sheet with stop cards; 3D terrain over Jenny Lake and Cascade Canyon; the lite level; attribution legible in every map shot.
- **CREATE:** the New menu; the draft two seconds after picking (route drawn, text not yet written); uploading; recording (with the fake media stream flags from `capture-ui.mjs:97`); the transcript card; the write-up arrived; question cards; the publish bar with the audience sheet; the cover picker; the failure states (write-up failed and the photo story stands, daily limit reached, one upload failed, photos with no GPS); Smart Import with two albums selected for combining.

**Order.**
1. Director: write `docs/app/SPEC.md` and the handovers from this plan; branch from `landing/rebuild`; archive the classic baseline.
2. F0 and ART in parallel.
3. FEED, STORY, MAP and CREATE in parallel on ports 5331 to 5334 (F0 5330, capture 5335). Nobody runs `npm run build`; compile checks go to a scratch `--outDir`, as in `docs/landing/handover/FOUNDATION.md:77`.
4. Integration: real components behind the stubs, the 30-photo flow, the byte proof, the bundle guard, a keyboard pass, a real iPhone pass on the sample build.
5. Preview for the owner with his real account.
6. Optional Stage 2 backend work as its own branch.
7. Flip `app.config.json`.

---

## 8. Risks and decisions for the owner

| # | Decision or risk | Recommended default |
|---|---|---|
| 1 | How to go live | Previews build Daylight now; production stays classic until the one-line flip; keep `Use the previous look` for 60 days after |
| 2 | Dark theme | Light only. Most users are on dark today and will see a large change; the escape in 1 softens it. Design a night variant later only if asked for |
| 3 | Free public tile services have no SLA and can stop without notice | Use OpenFreeMap and Mapterhorn; the static fallback keeps every page usable; self-host PMTiles on R2 if either changes |
| 4 | MapLibre 6 is four months old (6.0.0 on 2026-07-22) | Pin 6.19.0 exactly after F0's spike; 5.24.1 is the named fallback |
| 5 | Satellite layer | Drop it. Restore only with an imagery source whose terms are verified |
| 6 | Routes are straight lines between photos | Keep and say so; road routing needs a routing service |
| 7 | New sample family or the Hartleys | The Hartleys |
| 8 | Should the Teton story exist in production | No. Sample mode only. If wanted live, upload the 30 JPEGs through the new flow on a preview with a sample account, set to Private |
| 9 | Follower email on publish | Keep it, by creating the story only at Publish |
| 10 | Lightbox backdrop | Light paper |
| 11 | Stage 2 backend work (section 4.3) | Decide after seeing Stage 1 on a preview |
| 12 | The shared daily limit of five AI actions makes voice plus questions costly | Stage 1 states the cost in the UI; Stage 2 counts per story |
| 13 | Feed pages beyond 100 stories mean extra requests for large families | Page lazily, one request at a time, cap 500 |
| 14 | Non-redesigned pages appear inside the new shell in classic layout with Daylight colours | Accept for this job; sweep them next |
| 15 | The iOS app | Follow the same tokens (`docs/app/tokens.json`), the same five-tab structure, the story-block and journey specs, and the style JSON. MapLibre Native's globe was still a pull request in August 2026 (https://maplibre.org/news/2026-09-02-maplibre-newsletter-august-2026/), so check before choosing the iOS world view |

**Existing defects found while reading.** Daylight avoids each of them; fixing them in classic changes live behaviour, so each is a separate small decision.
- `category_2` is saved but never returned: it appears nowhere in `events.py`, so the feed's second-category filter (`Feed.jsx:108-113`) can never match.
- The author's own Private stories are excluded from every list (`backend/app/utils/privacy.py:210-212`), so they are missing from the author's profile too.
- The classic location search is a 300ms autocomplete against Nominatim (`LocationAutocomplete.jsx:45-62`, `backend/app/api/geocoding.py:7`); its policy says "you must not implement such a service". Daylight searches on submit.
- The duplicate image rows, the previous-location pin and the today-date defects in AI Create (section 4.1).

**Not verified, to confirm early.**
- Whether preview origins are allowed by the production `CORS_ORIGINS` (default list at `backend/app/core/config.py:44`). If a preview cannot call the API, that is an environment variable, not code.
- The backend function time limit, and which AI model production has selected (`ai_creator.py:112-120`).
- Whether production media is served through a Cloudflare zone, which the 768px image optimisation needs.
- The exact Supabase storage key for a `127.0.0.1` URL; F0 should read it at runtime, not hard-code it.
- Whether sharp writes GPS EXIF correctly (the read-back test decides).
- The iPhone voice-note file-name issue.
- The three coordinates marked ≈, and Schwabacher Landing.

### Critical Files for Implementation
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/vite.config.js
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/src/App.jsx
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend/app/api/events.py
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/src/pages/EventDetail.jsx
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/scripts/landing/capture-ui.mjs