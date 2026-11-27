# Plan: the redesigned app ("Daylight"), built beside the live one

All paths are under `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/`. `frontend/src/pages/Feed.jsx:43` means line 43 of that file there.

Everything I did was read-only. I ran the backend's pure clustering function in memory, and made GET requests to npm, unpkg, GitHub, OpenFreeMap, Mapterhorn, OSM, Wikipedia, Anthropic's docs, and one unauthenticated GET of the live backend's public OpenAPI document.

## 0. Read this first

**The repo moved while I was reading, and it changes deliverable 6.** Round two of the landing arrived uncommitted in the working tree (about 10:50 to 11:10 today): `docs/landing/ROUND2.md`, `docs/landing/handover/ART2.md`, `docs/landing/handover/CAPTURE2.md`. Where it differs from the brief, it wins:

- The sample family is now American (home is Madison, Wisconsin), and Marcus is Kate's husband.
- There are two new washes, `sun` and `violet`, and a new audience order.
- **The Tetons story already exists.** It is "Seven days in the Tetons", by Tom, 14 to 20 June 2026.
  - All 30 photos are generated (`landing-art/raw/photo-tetons-01..30.png`, sheets `landing-art/sheets/photos-tetons-1..5.jpg`). They are bright and convincing.
  - A fixture is written (`frontend/scripts/landing/fixtures/stories.mjs:75-126`, record at `:398-407`).
  - An upload-kit script is written (`landing-art/kit-tetons.mjs`).

I adopt that story instead of planning a second one. Section 6 is an audit of it with corrections.

**The live app cannot make that story from those photos.** ART2.md:94 says the owner will upload the kit himself and "the app builds a journey map from the GPS in each photo". I checked each of the four routes in:

| Route in | What the kit produces today | Evidence |
|---|---|---|
| Smart Import | Six albums, all low confidence, none marked a trip, titled "Sunday afternoon in {place}" and so on. Nine photos are set aside (19 to 22 and 26 to 30), including the cover, photo 30. | I ran `cluster_photos` on the exact table in `landing-art/kit-tetons.mjs:36-43`. Causes: `backend/app/utils/photo_clustering.py:156-158`, `:216-240`, `:251-254`, `:330-336`. |
| AI Create | One story, dated the day of upload, pinned where the user's previous story was, with no stops. | `frontend/src/components/QuickAddModal.jsx:43`, `:567-568`, `:130`, `:443-445`, `:564-576`, `:586-591` |
| Create, photos added with the toolbar button | No stops. EXIF is read, then never reported. | `frontend/src/components/RichTextEditor.jsx:295`, `:354-359`; the only callers of `onGPSExtracted` are `:199`, `:214`, `:348` |
| Create, photos dragged in | Up to 30 stops named "Photo location 1" to "Photo location 30", with no cap. | `RichTextEditor.jsx:211-224`, `:673`; `backend/app/api/events.py:383-411` (name at `:400`) |

The thirteen named stops in the landing capture come from hand-written location markers in the fixture. That is the gap this redesign closes. Its acceptance test is "the kit test": drop in the 30 kit files and get one story, seven days, named stops and a route.

**Other findings that shape the plan:**

- **Fixtures are richer than production.** `frontend/scripts/landing/fixtures/api.mjs:57` serves the full story object as the feed item, adds `author_avatar_url` (`:51`) and reports video metadata (`:34`).
  - The real list returns an empty description, zero counts and no stops (`backend/app/api/events.py:254-283`).
  - The real detail endpoint never returns `category_2` or `media_type` (`events.py:112-186`).
  - The live OpenAPI document matches the repo's schemas. The redesign must be built against a production-shaped fixture mode (section 5).
- **Map stack, verified today:** MapLibre GL JS 6.19.0, OpenFreeMap vector tiles and Mapterhorn terrain tiles. All are open, keyless and free at this scale. MapLibre's own example combines exactly these with a globe and terrain.
- **Gate:** a build-time variant like the landing's, with no edits to any file in the classic module graph, so the classic `dist/` is byte-identical and `diff -r` prints nothing.

## 1. Design direction

**Daylight.** The app uses the landing's materials at a lower volume, because people use it every day.

- **Carried over:** ink `#101B3B`, paper `#F4F7FB`, white cards, 2px ink keylines, the three faces (Bricolage Grotesque for UI, Literata for reading a story, DM Mono for dates, places and counts), the seven washes, the sticker word, drawn SVG icons and the audience control.
- **Calmer:** paper is the resting background. Washes are accents with a meaning (a story's category colour, active states, the map), never full screens. Hard offset shadows appear on hover, press, the primary button and photo prints only. The sticker appears on a story's title and the lead feed card only (last word, skipped when longer than 14 characters).
- **Left on the landing:** ghost words, cut-out people, the scroll film and Lenis.
- **Motion:** 250ms at most for UI. Map and journey motion happens on request.
- **Icons:** emoji as icons go (`frontend/src/components/ViewToggle.jsx:4-7`, `frontend/src/pages/EventDetail.jsx:1412-1457`, `QuickAddModal.jsx:13-25`). Reactions stay emoji because they are content.
- **Words:** the UI says "story", URLs stay `/event/:id`, and the copy follows ROUND2's voice (American English, lead with the occasion).

**Category colours** (seven washes plus paper for eight categories): Vacations azure, Birthdays sun, Anniversaries fizz, Family Gatherings tide, Holidays lime, Projects zest, Milestones violet, Daily Life paper-deep. Custom categories get a neutral keylined chip.

**Text is ink on every wash.** White text fails contrast on all of them. The focus ring is 3px ink with a 2px white offset. Touch targets are at least 44px.

**Light and dark.** Today dark is the default for everyone:
- `frontend/src/styles/index.css:7-19`, `frontend/src/components/Header.jsx:39`, `frontend/src/context/AuthContext.jsx:75`, `backend/app/models/user.py:38`.
- AI Create is dark even in the light theme (`frontend/src/components/QuickAddModal.module.css:18`; 145 hard-coded colours, no theme rules).
- A signed-out relative opening a share link always gets dark, because `/share/:token` sits outside the layout that applies the theme (`frontend/src/App.jsx:157`).

In the redesign there is one light look:
- **Classic builds:** untouched.
- **New UI:** renders light whatever `theme_preference` says. The Preferences theme control is replaced by one line saying the new look is light only. The column and saved values are left alone, so switching back restores everyone's choice.
- **Pages not redesigned** (Billing, Sharing, Family tree, Notifications, Settings, Admin): they run with `data-theme="light"` and a variable bridge mapping the old variables to the new tokens. About 2,000 hard-coded colours in module CSS will not follow, so those pages look tidier but not redesigned.

## 2. Page by page

### 2.1 Navigation

**Wrong today**
- Phone: everything is behind a hamburger at the top (`Header.jsx:97-106`, `:161-239`), so creating is two taps deep and out of thumb reach.
- Desktop: the create options only appear on hover (`frontend/src/components/Header.module.css:295-317`), so keyboard and touch-laptop users cannot reach them.
- Three separate entry points for making a story: Create, AI Create, Smart Import (`Header.jsx:117-136`).
- The feed view is not in the URL (`Feed.jsx:145-148`), and the feed refetches and shows a skeleton on every visit (`Feed.jsx:57-63`, `:150-158`). Back from a story loses your view, filters and scroll.

**Desktop:** a white keylined top bar, 64px. Wordmark, then Stories, World, Family, Sharing. On the right: a solid "New story" button, a notifications bell and an avatar menu (Profile, Settings, Membership, What's new, Feedback, Log out).

**Phone (390):** a bottom tab bar, 64px plus the bottom safe area, with five slots: Stories, World, a raised centre "+" (New story), Family, You. The top bar shows only the page title and the bell. On a story page the tab bar is replaced by a reading bar: Like, Comment, Map, Share.

**Interactions**
- Views and filters live in the URL (`?view=`, `?cat=`, `?who=`, `?order=`).
- An in-memory events store makes Back instant and restores scroll.
- Real links and buttons, a "Skip to content" link, `aria-current` on the active tab.

**Data:** `GET /users/me/notification-counts`, polled every 30s as now (`Header.jsx:52-62`, `:76-83`). The new shell must keep the trial banner, welcome modal, feedback widget, install prompt and demo banner (`frontend/src/components/Layout.jsx:18-58`, `App.jsx:213`).

### 2.2 Feed, calendar, timeline

**Wrong today**
- The page is titled "Explore Events" (`Feed.jsx:209`), with a red and green arrow button to show filters (`Feed.jsx:213-221`).
- Cards are `div`s with a click handler: not focusable, no role (`frontend/src/components/FeedView.jsx:147-151`).
- Covers are CSS backgrounds with no alt text or lazy loading (`FeedView.jsx:153-156`).
- Titles are cut to four words (`FeedView.jsx:8-14`).
- On a phone the first tap only reveals the title and the second opens (`FeedView.jsx:92-103`).
- A three-size switch uses box glyphs (`FeedView.jsx:117-139`).
- Authors are initials on a gradient (`FeedView.jsx:190`).
- The filter block is 748 lines and mixes "find people to follow" into feed filters (`frontend/src/components/EventFilters.jsx:109-141`).
- A failed fetch silently shows mock stories (`frontend/src/services/api.js:99-116`).
- Filtering on the second category never matches, because no endpoint returns it (`Feed.jsx:107-113`, `events.py:254-283`).
- Calendar opens on the current month even when it is empty (`frontend/src/components/CalendarView.jsx:37`). A week-long trip shows on its first day only (`:66-74`). Stories are emoji (`:143-158`).
- Timeline is alternating left and right cards with emoji badges (`frontend/src/components/TimelineView.jsx:72`, `:80-82`).

**Desktop**
- Header row: "Stories" (Bricolage 800, 40px), a segmented view switch (Feed, Calendar, Map, Timeline) and an order menu ("Newest posted" or "When it happened").
- One filter row: scope (Everyone, Following, Mine), eight category chips, and "More filters" (date range, people, muted people) in a popover with a "Clear" link. People search moves to Family.
- Grid, 1240 wide. The lead story spans two of three columns with a 44px title and its sticker. The rest are three-column cards: white, 20px radius, 2px keyline, no shadow at rest; hover lifts 2px with a hard shadow.
- A card holds: a 4:3 cover image, a category chip in its wash, an audience tag (only when it is Close Family, Custom Group or Private), the full title on two lines, a mono meta line (`TOM · JUN 14–20, 2026 · JACKSON, WYOMING`) and a 28px avatar.
- Month dividers appear when ordered by "when it happened".

**Phone:** one column, 16px gutters, full-width cards (3:2 cover, 20px title). One tap opens. The filter row is sticky under the top bar, hides on scroll down and returns on scroll up. Filters open as a bottom sheet with a visible close control. Pull to refresh.

**Calendar:** a year at a glance.
- Desktop: twelve small month grids.
- Phone: a vertical list of only the months that have stories.
- A multi-day story is a bar from start to end in its category colour; a single day is a cover dot.
- It opens on the newest month that has a story.
- A day or bar opens a peek card. Arrow keys move between days.

**Timeline:** one column with sticky year headers, a mono date column and story rows with thumbnails.

**Data**
- `GET /events?order_by=&skip=&limit=100`, paged until a short page comes back. Today only the first 100 are ever loaded (`events.py:188-196`).
- Faces: joined in the browser from `GET /users/me/following` and the signed-in user; initials otherwise.
- `GET /users/me/muted`.

**Cards never show:** like or comment counts (the list returns 0, `events.py:279-280`), an excerpt (the list returns an empty description), or a journey badge (`has_multiple_locations` is hard-coded true by all three creation paths: `frontend/src/pages/CreateEvent.jsx:34`, `QuickAddModal.jsx:575`, `frontend/src/pages/SmartImport.jsx:303`). A one-line summary shows when present; the new creation flow starts writing it.

### 2.3 Story page

**Wrong today**
- The hero is a CSS background (`EventDetail.jsx:1390-1393`).
- Author actions are emoji buttons, with the same upgrade prompt pasted four times (`EventDetail.jsx:1402-1458`).
- Loading is the word "Loading..." (`EventDetail.jsx:1255-1257`).
- The page fetches stops a second time, though they arrive with the story (`EventDetail.jsx:335`, `:549-551`; `events.py:184`).
- Reaction badges are added to story images by hand-written DOM code with inline styles (`EventDetail.jsx:151-289`).
- The journey map sits after the whole story (`EventDetail.jsx:1594-1605`), in a fixed 600px box (`frontend/src/pages/EventDetail.module.css:560`), unconnected to the text. ROUND2.md:94 records that tapping a stop does not scroll the story.
- Comment authors are initials (`EventDetail.jsx:723-725`).

**Desktop**
- A hero band in the story's category wash. Left: a mono eyebrow (category, dates, place), the title at up to 72px with its sticker, author, the audience label ("Followers can open this"), tagged people and actions. Right: the cover as a print (10px white border, keyline, hard shadow, slight tilt).
- Below, three columns: a sticky contents rail (days and sections with a progress dot), a 680px reading column in Literata 19/1.6, and a sticky map card when the story has two or more stops.
- Consecutive images render as a photo set: one is full width, two sit side by side, three are one large and two stacked, four or more are a 2×2 with "+N". The stored HTML stays plain `<img>` tags, so the classic page and the editor are unaffected.
- Location markers render as stop headers: number, name, mono time, "Show on map".
- Then the full gallery, likes and comments.

**Phone**
- Full-bleed cover (at most 62svh), with the title block on the wash below it.
- Reading column with 20px gutters, Literata 18/1.6.
- A single image is edge to edge; a set is a snap carousel with a "2/4" pill.
- A sticky 44px journey bar under the top bar: "Day 3 · Stop 5 of 13 · Hidden Falls" with a dotted progress line. Tapping it opens the full-screen map at that stop.
- Contents open as a bottom sheet. The reading bar sits at the thumb, padded for the safe area.

**Interactions**
- Scrolling moves the map and the map moves the story (section 3).
- Tapping a photo opens the lightbox.
- Like is optimistic, as now (`EventDetail.jsx:831-867`).
- Keep the privacy and expired-link states (`EventDetail.jsx:1262-1374`), share mode, and Publish, Move to drafts and Trash.

**Reused as is:** the lightbox with its ten reactions and per-photo comments (`frontend/src/components/ImageGallery.jsx`). Its dark surround is the convention for photos and carries no regression risk. The story body's stylesheet is one standalone file, so the iOS reader can embed it. It currently carries its own dark CSS (`/Users/jpwilson/Documents/Projects/SGTG/OFS_iOS/App/StoryHTML.swift:12-45`).

**Data**
- `GET /events/{id or slug}` (`events.py:570-646`), which already carries `locations` and `event_images`; or `GET /share/{token}`.
- `GET /events/{id}/comments`, `/likes`, `/tags`; `GET /media/batch/stats?ids=`.
- Videos are detected from `<video>` tags in the HTML, as today (`EventDetail.jsx:993-1021`), because the detail response reports every item as an image.
- An author can rename a stop with `PUT /events/{id}/locations/{location_id}`, which exists (`backend/app/api/locations.py:74-108`).

### 2.4 World view

**Wrong today**
- Flat raster tiles from the `{s}.tile.openstreetmap.org` subdomains (`frontend/src/components/MapView.jsx:108-111`). OSM's policy says other subdomains may be withdrawn without notice.
- It opens centred on whichever story is first, at zoom 4, not on the family's spread (`MapView.jsx:43-48`).
- Pins are an emoji in a green teardrop (`MapView.jsx:61-86`). Popups say "View Event" (`:143-155`).
- A filmstrip opens over the bottom of the map by default (`:33`, `:161-210`).
- Stories without coordinates vanish silently (`:38-40`).
- Height is `calc(100vh - 250px)` with a 600px minimum (`frontend/src/components/MapView.module.css:3-4`).
- The scroll wheel zooms the map while you scroll the page (`MapView.jsx:102`).

**Desktop:** a full-bleed globe on paper under the nav. A 360px white panel on the left holds the scope, people (faces), category chips and the list of stories in view; hovering a row highlights its marker. A year rail along the bottom. Top right: zoom, a globe or flat toggle, and reset.

**Phone:** the globe fills the screen above the tab bar. One finger turns it; pinch zooms. A bottom sheet has three stops: a 96px peek ("23 stories on the map · 4 without a place"), half and full. Filter chips scroll in one row at the top.

**Interactions**
- Photo markers and clusters (section 3).
- Tapping a cluster flies in and fills the list. Tapping a story flies to it and, if it has stops, draws its route with one lazy `GET /events/{id}/locations`. A second tap opens the story.
- Every map action is also available from the list. That is the keyboard and screen-reader path.
- Stories without a place sit in a "Not on the map yet" drawer, with "Add a place" for your own.

**Data:** the same paged list as the feed. It keeps `/feed?view=map`; `/map` already redirects there (`App.jsx:180`).

### 2.5 Journey map inside a story

**Wrong today**
- The default layer is Esri satellite (`frontend/src/components/EventMap.jsx:82`), served from Esri's keyless endpoint with the credit "© Esri" (`:22-26`). I could not confirm that Esri's terms cover that use.
- The terrain layer's credit omits OpenStreetMap and SRTM, which OpenTopoMap requires (`EventMap.jsx:27-31`).
- Stop numbers are drawn rotated 45 degrees, because the number sits inside the rotated pin (`EventMap.jsx:204-223`).
- Numbering starts at 0 when the story has no place of its own (`EventMap.jsx:155-156`).
- The line always begins at the story's single place, shown as a flag (`EventDetail.jsx:573-586`). For an AI Create story that is the previous story's town.
- Stops are joined by a straight dashed line in array order (`EventMap.jsx:97`, `:141-150`). Order is `order_index` then time (`locations.py:64-69`), and photo stops and marker stops both count from 0, so a story with both zigzags.
- There are no days, no playback, no photo markers and no link to the text.
- One finger pans the map, so a phone reader gets stuck on it.

**Redesign:** see section 3. In short: terrain, a named and numbered route, day chips, photo markers, "Play the journey", and two-way sync with the text. The first paint is an SVG route poster that needs no WebGL and no tiles.

**Data:** the story payload only. That is `locations[]`, the `[data-location-marker]` spans in `description`, and `event_images[].latitude/longitude/timestamp` where present.

### 2.6 Creating a story

Full detail is in section 4. The three entry points become one flow at `/create` (`/import` opens it in "sort a big batch" mode). It is a full page, not a modal. Photos alone give an immediate draft with a route; a few words, a voice note or answered questions make it better. Nothing publishes without the author pressing Publish. The existing editor stays available as "Write it yourself".

### 2.7 Profile ("You")

**Wrong today:** it loads the whole feed and filters by author (`frontend/src/pages/Profile.jsx:120-128`). That inherits the 100-story cap and hides the owner's own Private stories from their own profile.

**Redesign:** the same cards as the feed. Tabs for Published, Drafts and Trash (`GET /events/drafts`, `/events/trash`). Follow and relationship actions as now. Sharing, Settings and Membership as rows.

### 2.8 What is real and what is new

| | Items |
|---|---|
| Exists today, re-presented | Date-ordered feed and its filters, mute, four views, contents from headings, inline captions, gallery and lightbox with ten reactions and per-photo comments, likes, three-level replies, tags, share links, drafts and trash, stops from GPS or markers, one pin per story with grouping, AI Create (photos, words, voice, interview), Smart Import |
| Built in this job, frontend only | Globe and terrain map style, photo markers, day chapters, route playback, story and map sync, tap a stop to jump the story, the on-device instant draft, one creation flow with an audience picker and correct dates and places, the one-trip merge, the phone tab bar, URL-addressable views, calendar spans, the summary line |
| Needs a backend change, not shown unless approved | Counts on cards, author faces for people you do not follow, second category, per-photo GPS on saved stories, AI stories by index |
| Not shown at all | Country counts, road distances, elevation figures, search by place, offline maps |

## 3. Maps in depth

| Choice | Decision | Verified fact and source |
|---|---|---|
| Library | `maplibre-gl` pinned exactly to **6.19.0** (BSD-3-Clause, released 2026-11-17). No React wrapper: one small in-house `MapCanvas` using the imperative API through refs. | https://registry.npmjs.org/maplibre-gl ; https://github.com/maplibre/maplibre-gl-js/blob/main/CHANGELOG.md |
| v6 notes | ESM only; the worker is a separate file, wired in Vite with `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` and `setWorkerUrl`. WebGL2 is required; the constructor throws `GPUInitializationError` without it. | https://github.com/maplibre/maplibre-gl-js/blob/main/docs/guides/v5-to-v6-migration-guide.md ; https://maplibre.org/maplibre-gl-js/docs/ |
| Globe and 3D terrain together | Supported. The official example uses the OpenFreeMap Liberty style, `projection: {type: 'globe'}`, Mapterhorn `raster-dem`, a hillshade layer and `sky`. | https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer-on-a-globe-with-terrain-elevation/ ; https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/ |
| Vector tiles | OpenFreeMap public instance, TileJSON `https://tiles.openfreemap.org/planet`. No key, registration or request limit; commercial use allowed; MIT; funded by donations; no SLA. OpenMapTiles schema to zoom 14, including `mountain_peak`, `park`, `water`, `waterway`, `transportation`, `landcover`. | https://openfreemap.org/ ; https://tiles.openfreemap.org/planet |
| Terrain | Mapterhorn, `https://tiles.mapterhorn.com/tilejson.json`. Terrarium encoding, 512px WebP. Commercial use allowed, no rate limiting at present, hosted on Cloudflare; code BSD-3. PMTiles downloads exist for self-hosting. | https://mapterhorn.com/ ; https://mapterhorn.com/data-access ; https://mapterhorn.com/faq |
| Style | Our own style JSON in the repo, referencing the two TileJSON URLs and OpenFreeMap's glyphs. The hosted Liberty style currently points at `backup_planet`, so it can change under us. | https://tiles.openfreemap.org/styles/liberty |
| Not used | Mapbox GL (proprietary since v2), Cesium (heavy, token for terrain), a separate globe library, satellite imagery (no keyless source with clear terms), `tile.openstreetmap.org` (no SLA; the policy asks for exactly `tile.openstreetmap.org`) | https://operations.osmfoundation.org/policies/tiles/ ; https://opentopomap.org/about |

**Fallback pin.** If the foundation's map scenes fail on 6.19.0, use 5.24.1 (single file, 2026-11-11). The adapter uses only calls present in both, so the change is one file. Two open issues to design around:
- Globe `fitBounds` goes off-centre with uneven padding (#9112). Compute centre and zoom ourselves when a phone sheet covers part of the map.
- Terrain tile volumes are rebuilt every frame (#9129). 3D is opt-in on phones.

**The style ("OFS Daylight")**
- Land is paper, with a 1.5px ink coastline and hairline borders.
- Water is tide at zoom 0 to 3, so the globe is a brand object, blending to light azure by zoom 6.
- Parks are lime at 35%, forest a soft green, ice white.
- Roads are white with an ink casing; trails are dashed ink.
- Peaks are small ink triangles with name and elevation in mono.
- Hillshade shadow is ink at 18% with a white highlight.
- Atmosphere is off (no glows). A CSS ink ring behind a transparent canvas, sized from the planet-size example, is a stretch detail to drop if it is unstable.

**Globe for the world view**
- One map instance: `projection: globe` becomes flat on its own as you zoom in.
- No terrain source below zoom 7.
- The start camera fits all pins. Under reduced motion there is no idle spin and flights become jumps (MapLibre does this for `flyTo`).

**Clustering and photo markers**
- A GeoJSON source with `cluster: true`, `clusterRadius: 56`, `clusterMaxZoom: 9`.
- Markers are HTML elements, as in the official "HTML clusters" example.
- A single story is a 48px print of its cover (56px on desktop), with a 100px thumbnail from `getImageUrl(url, 'micro')`.
- A cluster is up to three fanned prints, from `getClusterLeaves`, and a count sticker.
- Markers are real buttons in date order. They fade when behind the globe or terrain (`opacityWhenCovered`, class `maplibregl-marker-covered`).

**The journey.** A pure function `buildJourney({event, locations, eventImages, html})` returns stops, days, legs and bounds. It has no DOM or map inside, so Swift can port it with shared JSON test vectors. That is how the iOS `AlbumEngine` already mirrors the Python clustering.

- **Stops** are the story's locations.
  - The story's own single place is not drawn as a stop when real stops exist.
  - A stop named "Photo location N" displays as "Stop N" with its time.
  - Photos that carry their own GPS more than 300m from any stop are small unnumbered photo dots on the line.
- **Order** is by time when at least 80% of stops have a timestamp, otherwise `order_index`.
- **Days** come from timestamps with the 4am pivot the clustering uses (`photo_clustering.py:35`). The chips are All, Day 1 to Day 7.
- **Legs** are gently curved lines on the flat map and great-circle lines on the globe. They join stops in order and are labelled as such, never as the roads taken.
- **Drawing:** one line layer with `lineMetrics` and a `line-gradient` step on `line-progress`. Travelled is solid ink with a white casing; ahead is dashed ink at 40%. Progress is one `setPaintProperty` per frame.
- **Playback ("Play the journey"):** per day a title card, then per stop a camera ease, the stop's lead photo popping up as a print with its caption, then on.
  - Controls: play and pause (space), previous and next stop (arrow keys), 1× and 2×, and a scrubber that is a real range input with day ticks.
  - Under reduced motion it becomes a "Next stop" stepper with jumps.
- **3D:** terrain exaggeration 1.3 and pitch 50 degrees. On desktop this is the default when the stops span more than 300m of height. On phones it is behind a "3D" toggle.

**Keeping story and map in sync**
- Each stop has an anchor in the story body: its `[data-location-marker]` span, matched by coordinates as `EventDetail.jsx:349` already does; else the image whose saved GPS is nearest; else none.
- One requestAnimationFrame-throttled scroll reader finds the last anchor above 40% of the viewport. Between two anchors it interpolates progress, so the line draws as you read.
- The camera eases only when the active stop changes. That avoids tile thrash.
- Clicking a stop or a day chip scrolls the story to its anchor and sets `aria-current="step"`.
- On a phone the same state drives the journey bar and the full-screen map's card carousel. Swiping a card moves the map.

**Gestures**
- The inline journey map uses `cooperativeGestures`: one finger scrolls the page, two move the map. An "Explore map" button opens full screen.
- The world view and the full-screen map take one-finger drags.
- There is a "Skip map" link before every map.

**Weak devices: a four-step ladder**

| Level | What shows | When |
|---|---|---|
| L0 | SVG route poster, or a dot map for the world | No WebGL2, Save-Data, 2G or 3G, context lost, or the tile host unreachable |
| L1 | Flat vector map | `deviceMemory` of 2 or less, or a slow first 30 frames |
| L2 | Plus hillshade | Phone default |
| L3 | Plus 3D terrain | Desktop default; phone on request |

A drop of level is remembered for the session.

**Attribution.** One always-visible line at the bottom left of every tile map, never collapsed, with three links: "© OpenMapTiles · Data from OpenStreetMap · © Mapterhorn". The text comes from the two TileJSON `attribution` fields. The SVG poster uses no third-party data and needs none.

**Lazy loading, measured from unpkg today**

| Asset | Raw | gzip | Brotli |
|---|---|---|---|
| `maplibre-gl.mjs` 6.19.0 | 1,106,041 | 298,288 | 245,431 |
| `maplibre-gl-worker.mjs` | 550,754 | 157,403 | 130,006 |
| `maplibre-gl.css` | 71,596 | 10,191 | 8,326 |
| For comparison: 5.24.1, single file | 1,058,059 | 275,623 | 224,878 |
| Leaflet, markercluster and CSS, inside today's main bundle | about 196,000 | about 54,700 | |

- **Today's main bundle:** 1,984,874 bytes raw, 562,125 gzip.
- **Budget for our own map code and style:** 20KB gzip.
- **Tiles at the Tetons, measured:** a vector tile is 12 to 22KB; a terrain tile is 161 to 168KB.
  - A phone journey view with hillshade is roughly 1.3 to 1.6MB the first time.
  - The globe is far lighter because it loads no terrain.
- **Loading rule:** the map chunk is a dynamic import inside the map components. It is requested when the World view opens, or when a journey map comes within one viewport, and on a phone only if Save-Data is off and the connection is not 2G or 3G. Otherwise the poster stays, with a "Load the map" button.
- **Service worker:** both chunks get stable names and are excluded from the precache, which otherwise takes every JS file under 3MB (`frontend/vite.config.js:107-109`).

**iOS.** The MapLibre Native iOS changelog through 7.1.0 has no globe or terrain entry (https://github.com/maplibre/maplibre-native/blob/main/platform/ios/CHANGELOG.md). The native app can take the same style JSON flat with hillshade, or use MapKit for a globe. The journey contract, tokens and story stylesheet are renderer-neutral, so either works.

## 4. Auto-create in depth

### Today, and why it underwhelms

Beyond the four failures in section 0:

- **Uploads run one at a time** in AI Create (`QuickAddModal.jsx:232-298`), and Generate is disabled until they finish (`:859`).
- **Three modes are chosen up front**, labelled "1-shot", "Review first", "Richest stories" (`QuickAddModal.jsx:686-711`). Quick Publish posts with no review (`:466-470`). The audience is hard-coded to Followers (`:570`; `SmartImport.jsx:298`).
- **Review is two panels**, "Your Original" and "AI Enhanced", and editing means a raw HTML textarea (`QuickAddModal.jsx:954-1017`).
- **The prompt forbids names** ("the family", "everyone"; `backend/app/api/ai_creator.py:80`) and asks for captions that "describe what is happening" (`:453`), so captions read like alt text. The model is not told who the author is or who is in the family.
- **Every photo must appear inline exactly once**, with its exact URL echoed back (`ai_creator.py:445-451`). The reply is JSON holding HTML, capped at 4,096 tokens (`:483`), with no check for truncation (`:164-170`). A cut-off reply becomes "AI generated invalid response" (`:541-544`).
- **Every call resends every photo** (`ai_creator.py:334-340`, `:468-475`). A 1200×900 upload costs about 1,419 visual tokens, so 30 photos is about 43K input tokens per call.
- **Big albums cannot work.** The default model is Claude Haiku 4.5 (`ai_creator.py:115`), which accepts at most 100 images per request (https://platform.claude.com/docs/en/build-with-claude/vision). A Smart Import album above 100 photos fails, though import accepts 300 (`SmartImport.jsx:20`, `:245-262`).
- **The daily limit of 5 counts everything together** (`ai_creator.py:22`, `:47-62`). Transcribe, questions and each write or rewrite cost one each (`:262`, `:303`, `:385`). One interview story with a voice note uses three or four of the day's five.
- **Categories disagree.** The model may answer with any of 13 (`ai_creator.py:24-28`), but the app has 8 (`frontend/src/components/CategorySelector.jsx:13-22`). A "Wedding" or "Graduation" story matches no filter chip.
- **The place comes back as text only** (`ai_creator.py:537`) and is saved with no coordinates (`QuickAddModal.jsx:443-445`), so the story is missing from the world map.
- **Voice notes are always named `recording.webm`**, even when Safari records MP4 (`frontend/src/hooks/useVoiceRecorder.js:19-23`, `api.js:2798`). This probably breaks on iPhone; verify on a device.
- **Smart Import's "set aside" message is wrong** for dated, located photos: "(screenshots or missing dates)" (`SmartImport.jsx:506-510`).
- **The manual form saves dates through `toISOString()`** (`CreateEvent.jsx:452-453`, `:473-474`), which shifts the day back by one for anyone east of Greenwich. The new flow never does this. The classic form is untouched unless the owner wants a separate fix.

### The redesigned flow (one screen that keeps improving the same draft)

**1. Add photos.** One picker (photos, clips, HEIC). Below it, two optional things on the same screen: a text box ("Anything you want to say about it?") and a mic button ("Or just talk").

**2. Instantly, on the device, before any upload or AI finishes:**
- Read time and GPS from every file (eight workers, as `SmartImport.jsx:125-133` does).
- Sort by time and group into days at the 4am pivot.
- Group into stops: consecutive photos within 200m on the same day, merged down to the backend maximum of 20 (`locations.py:36-38`, `events.py:334-341`).
- Pick a cover and a title with the same rules as `_pick_cover` and `_title_hint` (`photo_clustering.py:353-403`).
- Set the dates from the first and last photo, as local wall-clock time.
- Set the place from the centroid.
- The draft appears in a second or two: title, dates, "30 photos · 15 stops", day chapters with photo sets and a drawn SVG route. It is already publishable.
- Run on the kit table this gives **7 days and 15 stops** (I computed it).
- Stop names fill in as reverse geocoding returns, one request about every 1.1s (the pace `SmartImport.jsx:163-182` uses). Coordinates show in mono until then.

**3. Uploads start at once,** four at a time, with per-photo progress and retry.

**4. One story by default.** The author's selection is the grouping signal. If the batch looks like several occasions (gaps over 40 hours or jumps over 200km, the clustering's own constants at `photo_clustering.py:38-39`), a banner offers to split it. Split mode is Smart Import's album cards, plus a client-side "This looks like one trip" merge card. That fixes the Tetons case without a backend change.

**5. Make it better, in place:**
- **Write the story:** `generate-story` from the photos. It starts by itself when uploads finish, unless the author has begun typing or recording; then it waits for them.
- **A few words or a voice note:** transcribe, show the transcript for editing, then "Rewrite with this".
  - The recorder caps at 3 minutes at 32kbps, to stay under Vercel's request limit.
  - The file is named by its real type.
- **Questions:** `generate-questions` after the first draft. Three to five chips appear under "What I can see so far", answered by typing or one recording. Any can be skipped.
- **A small meter** shows AI actions used today. When they run out, or a call fails, the draft is still publishable and "Write it yourself" still works. There is no dead end.

**6. The request, with today's endpoint.** Send per-photo place, coordinates and time, and pass the day structure in `user_text` (the channel `SmartImport.jsx:254-259` already uses). The browser then repairs the reply:
- Drop unknown image URLs and append missing photos to their day.
- Put a location-marker paragraph before each stop's first photo.
- Attach captions by URL, and sanitize.
- For stories over 40 photos, send a representative 40 (two per stop plus cover candidates) and place the rest by stop and time.

**7. Review and publish.**
- Fields: title; audience picker in ROUND2's order (Private, Close Family, Followers, Custom Group, Public; default Followers, as `CreateEvent.jsx:35`); category (the eight, or your own); dates; place; tagged people; cover.
- A stops list to rename, merge, remove and reorder.
- Captions edited in place.
- "Edit text" opens the existing rich-text editor seeded with the draft.
- Actions: Publish, or Save draft.

**8. Saving, with no backend change:**
- One `POST /events?is_published=true` carrying the assembled HTML. Publishing in that one call keeps the follower email, which is only sent on create (`events.py:427-460`; `:823-862` sends none).
- The backend turns each marker into a named stop in document order (`events.py:361-380`).
- Then `GET /events/{id}`, `PATCH /upload/event-image/{id}` for each caption, and `POST /events/{id}/tags`.
- Every photo must stay in the HTML, because the backend deletes the stored file of any image no longer referenced (`events.py:68-91`).

### What needs what

| Frontend only (this job) | Backend or prompt change (separate, additive, owner's call) |
|---|---|
| One flow, instant on-device draft, parallel uploads | B1: `generate-story` gains an optional `format: "chapters"`. Photos are referenced by index, not URL. The author's and tagged people's names are passed in. The story is in the first person. Captions are short and human, with alt text separate. `max_tokens` is raised to about 16,000 with a `stop_reason` check; the Anthropic path may use `output_config.format`. The category list is the app's eight. Old clients see no change. |
| Correct dates, place and coordinates from EXIF | B2: count only `generate_story` toward the daily 5, with a separate cap for transcribe and questions; add `GET /admin/ai/usage` |
| Named stops through inline markers; day chapters | B3: fill the list's `category_2`, `short_title`, counts and an author avatar |
| Audience picker; always review before publish | B4: let `PATCH /upload/event-image/{id}` take latitude, longitude and timestamp, with a bulk form, so per-photo GPS is stored without duplicate rows |
| Repair pass; 40-photo cap; category mapping to the eight | B5: a single-trip rule in `photo_clustering.py`, mirrored in the Swift `AlbumEngine`, which its README says must stay identical |
| Voice cap and correct file type; no dead ends | B6: send the follower email when a draft is published |

Nothing in sections 2 and 3 needs B1 to B6. The model is an admin setting. `claude-haiku-5-5` exists with a higher image limit and lower price, but I have not tested it on this prompt, so that is an owner decision. One entry in the admin model list looks like a mistyped ID (`backend/app/api/admin.py:484`).

## 5. Gating, architecture and files

**The switch.** `frontend/app.config.json` holds `{"production":"classic","preview":"next"}`. `frontend/scripts/app2/variant.mjs` resolves it exactly as `frontend/scripts/landing/variant.mjs:17-27` does, with a `VITE_APP_UI` override. There are three values, so going live is two one-line flips, each revertible:

| Value | What ships |
|---|---|
| `classic` | Today's app. The new code is not in the build. |
| `optin` | Both. The default is classic. A person turns the new look on with `?ui=next` or a Preferences switch, stored in localStorage. This is how the owner and a few relatives try it on real data, on their phones, on the real domain. |
| `next` | The new look by default, with `?ui=classic` as an escape for one release. This mirrors `?landing=legacy` (`App.jsx:89`). |

**How the two coexist with no edit to classic code.** A Vite plugin, added to the plugin list only when the variant is not classic, redirects the one import `./App` in `frontend/src/boot-app.jsx` to `frontend/src/app2/AppNext.jsx`.
- `AppNext.jsx` declares the same providers and routes as `App.jsx`. Every page is lazy.
- For the redesigned routes it renders the new or the classic page by the person's choice. Those routes are `/feed`, `/event/:id`, `/share/:token`, `/create`, `/import`, `/profile/:username`.
- `scripts/app2/check-routes.mjs` fails the build if the path sets of the two files differ, so they cannot drift.
- The extra chunk naming and precache exclusions are added to the Vite config only in non-classic variants.

**Proving the classic build unchanged**
1. Before any edit, build with `VITE_LANDING=classic` and copy `dist/` aside.
2. After the work, build with `VITE_LANDING=classic VITE_APP_UI=classic` and run `diff -r`. The expected output is nothing at all: no file in the classic graph changed, so even the content hashes match. (If the SEO prebuild stamps today's date, compare on the same day.)
3. `scripts/app2/classic-proof.mjs` also asserts three things:
   - The change set touches nothing under `frontend/src/` outside `src/app2/`, and not `index.html` or `public/`.
   - The classic `dist` contains none of the strings `ofsa`, `app2`, `maplibre`.
   - The file list and SHA-256 manifest equal the baseline.
4. If any byte ever differs, run the existing classic capture scenes before and after and pixel-compare them.

**Folders**

```
frontend/app.config.json
frontend/scripts/app2/      variant.mjs  check-routes.mjs  classic-proof.mjs  shots.mjs
                            fixtures/ (wraps the landing fixtures, read-only)  scenes/
frontend/src/app2/
  AppNext.jsx  Shell.jsx
  styles/   tokens.css  base.css  legacy-bridge.css
  ui/       Button IconButton Chip Segmented Card Avatar Sheet Dialog Field Skeleton Icon
  data/     events.js  story.js  journey.js  dates.js  people.js
  nav/  feed/  story/  map/  create/  profile/  sample/
docs/app/   SPEC.md  handover/*.md
```

**Styles**
- The app root is `<div class="ofsl ofsa">`.
- It imports the landing's `tokens.css` and `fonts.css` only. Those are pure declarations, so the brand has one source and the app gets `sun` and `violet` free. It does not import the landing's `base.css`, whose page-level `html` rules would leak onto classic pages.
- The app's own tokens are `--a-*` on `.ofsa`. There is no bare element selector anywhere. Page-level effects hang off `html.ofsa-on`, added on mount and removed on unmount.
- Every component carries a stable `data-ui` attribute, so capture scripts never select by hashed class names.
- It reuses the landing's `Sticker`, `Icon`, `Label` and `AudienceSwitch`, after checking that each depends only on tokens.

**Developing and showing it without production**
- `scripts/app2/shots.mjs` joins the capture method (stub session, every API call answered from fixtures, API base on a dead port) with the screenshot tool (1440×900 and 390×844, contact sheets, console errors, sideways-scroll check).
- It launches Chromium with the GPU flags the screenshot tool already uses, and allow-lists `tiles.openfreemap.org` and `tiles.mapterhorn.com`. Today's allow-list is OSM only (`frontend/scripts/landing/capture-ui.mjs:43`).
- It replays tiles from a git-ignored on-disk cache, so re-shoots are repeatable and polite.
- It waits on `[data-map-state="idle"]`.
- **Production-shaped mode is the default.** The feed item is trimmed to exactly the keys at `events.py:254-283`; the detail drops `category_2` and video fields. A check script compares fixture keys with those line ranges.
- **Sample preview.** A separate build flag, `VITE_APP_DATA=sample`, injects a small boot script through the HTML plugin. It answers the same fixtures in the browser, with no login and no backend, and adds a "Use the sample photos" button in Create that feeds the kit files through the real intake. This is the link the owner opens on his iPhone. It is stripped from every other build.

## 6. The Grand Teton sample story

**Decision: adopt "Seven days in the Tetons" as specified in ROUND2.md, ART2.md and CAPTURE2.md.** One story, one set of 30 photos and one kit, shared by the landing and the app.

- **By:** Tom. **Dates:** 14 to 20 June 2026. **Category:** Vacations. **Audience:** Followers.
- **Seven sections, each an H1** (`stories.mjs:132-178`): Day 1: Madison to Jackson · Day 2: Sunrise on Mormon Row · Day 3: Jenny Lake and Inspiration Point · Day 4: Taggart Lake · Day 5: The Snake River · Day 6: Signal Mountain and Colter Bay · Day 7: String Lake and the tram.
- **Stops:** thirteen named ones as inline markers, so the landing's "thirteen stops" stays true. The chapel (photo 15) and the overlook (photo 30) are unnumbered photo dots on the route.

**Coordinate audit.** Verified against OpenStreetMap (Nominatim) and Wikipedia.

| Stop | In ROUND2 and the kit | Verified | Action |
|---|---|---|---|
| Jackson Town Square | 43.4799, -110.7624 | 43.47996, -110.76180 | Keep |
| Mormon Row | 43.6608, -110.6653 | T. A. Moulton Barn 43.66069, -110.66500 | Keep |
| Schwabacher Landing | 43.7109, -110.6719 | Trailhead 43.71151, -110.67059 | Keep |
| Jenny Lake | 43.7510, -110.7228 | Visitor center 43.75149, -110.72233 | Keep. Put photo 8 (on the boat) mid-crossing at 43.7594, -110.7332. |
| **Hidden Falls** | 43.7654, -110.7447 | Waterfall 43.76632, -110.75120 | **Change to 43.7663, -110.7512.** The kit point is 532m east, beside the west boat dock. |
| **Inspiration Point** | 43.7663, -110.7430 | Viewpoint 43.76701, -110.74826 | **Change to 43.7670, -110.7483.** The kit point is 430m east and about 85m out on the lake (west dock is 43.76728, -110.74405). |
| Taggart Lake | 43.7069, -110.7541 | Lake 43.70405, -110.75461; trailhead 43.69314, -110.73294 | Keep |
| Moose (chapel, photo 15) | 43.6596, -110.7133 | Chapel of the Transfiguration 43.66011, -110.71533 | Change to 43.6601, -110.7153 |
| Snake River float | 43.7598, -110.6234 | Deadmans Bar Road 43.75908, -110.62151 | Keep for photo 16. Photos 17 and 18 must lie downstream. The fixture puts them north, upstream (`stories.mjs:113-114`); the kit stacks all three at the put-in. Start from 43.7262, -110.6529 and 43.6925, -110.6823 and snap each to the river line. |
| Oxbow Bend | 43.8660, -110.5490 | 43.86599, -110.55059 | Keep |
| Signal Mountain | 43.8504, -110.5713 | Jackson Point Overlook 43.84589, -110.57561; summit 43.84889, -110.56722 | Change to the overlook, which is the view in photo 21 |
| Colter Bay | 43.9020, -110.6413 | Marina 43.90182, -110.64397 | Keep |
| String Lake | 43.7870, -110.7290 | Trailhead 43.78445, -110.72739 | Keep |
| Teton Village tram | 43.5875, -110.8279 | Base 43.5875, -110.82806; Rendezvous Mountain 43.59722, -110.87056 | Keep the base for photo 28. Put photo 29 (waffles at the top) at the summit, 43.5972, -110.8706. The fixture has it about 2km off (`stories.mjs:125`). |
| Snake River Overlook (photo 30) | 43.7540, -110.6235 | 43.7539, -110.62409 | Keep |

On a flat street map nobody would notice the two bold rows. On a terrain map at zoom 14 a pin in the lake is the first thing you see.

**The 30 shots.** IDs are `photo-tetons-NN`; times are the kit's local times. All exist.

| # | Day, time | Place | Shot |
|---|---|---|---|
| 01 | 1, 14:10 | Town Square | The four under the antler arch |
| 02 | 1, 16:40 | Jackson | Leo asleep in the car seat, mountains in the window |
| 03 | 1, 18:30 | Jackson | Burgers and milkshakes, Ivy mid-laugh |
| 04 | 2, 05:50 | Mormon Row | The barn at sunrise, nobody in shot |
| 05 | 2, 06:15 | Mormon Row | Tom and Ivy on the rail fence, from behind |
| 06 | 2, 07:20 | Schwabacher Landing | Peaks mirrored in the beaver pond |
| 07 | 2, 07:45 | Schwabacher Landing | Leo pointing at the beaver dam |
| 08 | 3, 09:30 | Jenny Lake (mid-crossing) | The family on the shuttle boat |
| 09 | 3, 10:15 | Hidden Falls | The falls, Maya and Ivy small at the rocks |
| 10 | 3, 11:05 | Inspiration Point | The four on the ledge, arms up |
| 11 | 3, 14:30 | Jenny Lake dock | Leo's boots over the water |
| 12 | 4, 09:40 | Taggart Lake trail | Walking through aspens and wildflowers |
| 13 | 4, 10:50 | Taggart Lake | The lake and its reflection |
| 14 | 4, 12:20 | Taggart Lake | Picnic on a flat rock, Ivy drawing |
| 15 | 4, 15:10 | Moose | The log chapel and its window |
| 16 | 5, 10:00 | Deadman's Bar | Life jackets on, the raft, a guide at the oars |
| 17 | 5, 10:40 | Snake River (downstream) | A bald eagle on a dead tree |
| 18 | 5, 11:15 | Snake River (downstream) | Ivy trailing a hand in the water |
| 19 | 5, 17:30 | Oxbow Bend | A bull moose in the shallows |
| 20 | 5, 17:45 | Oxbow Bend | The family watching it, from behind |
| 21 | 6, 09:20 | Signal Mountain | The valley, lake and range |
| 22 | 6, 09:35 | Signal Mountain | Maya and Tom, selfie |
| 23 | 6, 13:40 | Colter Bay | The four in a red canoe |
| 24 | 6, 15:20 | Colter Bay | Leo and a very small fish |
| 25 | 6, 19:30 | Colter Bay | Marshmallows by the cabin |
| 26 | 7, 10:10 | String Lake | Ivy and Leo wading |
| 27 | 7, 11:00 | String Lake | Tom mid-jump off a rock |
| 28 | 7, 14:20 | Tram base | The view down from the cabin |
| 29 | 7, 15:00 | Tram summit | Waffles on the mountaintop deck |
| 30 | 7, 18:40 | Snake River Overlook | The S-bend and the range; the cover |

**Changes to ask of the art and capture builders**
1. **One source of truth.** The kit (`kit-tetons.mjs:36-43`) and the fixture (`stories.mjs:97-126`) already disagree on times and positions. Photo 1 is 14:10 in one and 17:40 in the other. Put the 30 rows in one `landing-art/kits/tetons/tetons.json` that both read.
2. **Apply the coordinate fixes** above in both places.
3. **Verify the kit with the app's own reader** (`exifreader`, as `frontend/src/utils/exifExtractor.js:41-57` uses it), not only `exifr`. Add `Make` and `Model`, which the app reads at `exifExtractor.js:57`.
4. **Add a second folder, `kits/tetons-mixed/`,** for testing the new flow: the same photos with five portrait crops and two files without GPS. Real camera rolls are mixed, and all 30 are 4:3 landscape now.

**How it becomes fixture data.** It already is: story 110 in the landing fixtures. The app's harness imports those files read-only and applies the production shape. The creation scenes feed the 30 kit JPEGs to the real file input, so the app's own EXIF reading builds the route. Uploads and AI calls are answered from fixtures.

## 7. Build sequence

Start after round two's foundation changes are committed, on a branch from `landing/rebuild`.

| Order | Package | Owns | Must screenshot (desktop 1440 and phone 390 unless noted) |
|---|---|---|---|
| 1, alone | **F: foundation** | The gate and proof scripts, `AppNext.jsx`, `Shell.jsx`, `nav/`, `styles/`, `ui/`, `data/`, `scripts/app2/**`, `sample/`, a stub for every page, the SVG `RoutePoster`, `docs/app/SPEC.md` | Every primitive on paper and on each wash; the shell with stubs; keyboard focus on each control; a legacy page (Billing) inside the new shell; the classic proof output |
| 2, parallel | **FEED** | `feed/`, `profile/` | Feed (lead and grid), filters open, calendar year, timeline, empty and loading states, profile with drafts |
| 2, parallel | **STORY** | `story/` | Tetons top, a day section with a photo set and a stop header, gallery, lightbox, comments; the Maine story as a reader; share mode signed out; the three privacy states |
| 2, parallel | **MAPS** | `map/` | Globe with all pins and a cluster; a cluster opened; a selected story with its route; Tetons journey flat, with hillshade and in 3D; playback at three points; sync at three scroll positions; phone full-screen map with cards; level 0 fallback; reduced motion |
| 2, parallel | **CREATE** | `create/` | Empty; 30 kit photos just dropped (instant draft with route); uploading; written; voice recording; transcript; questions; review with stops list and audience picker; publish; error and out-of-actions; split-batch banner |
| 2, parallel | **ART and CAPTURE** (existing owners) | The single data file, coordinate fixes, the mixed kit | Regenerated journey capture |
| 3 | Integration, then **QA** | `scripts/app2/scenes/` | Full sheets at 390, 768, 1280, 1920; a reduced-motion run; a keyboard walk; a bundle report; the classic proof; the kit test end to end |
| 4, optional | **BACKEND** B1 to B6 | `backend/` | Separate pull request with the owner's approval |

**Interfaces the foundation freezes first**

```js
// data/events.js
useEvents({orderBy}) -> {cards, status, refresh}        // paged GET /events, cached
toCard(item) -> {id, href, title, cover(size), author{username,name,avatarUrl|null},
                 start, end, place, lat, lng, category, audience, summary|null}
// data/story.js
useStory(idOrSlug, {shareToken}) -> {story, status, error}
// data/journey.js   (pure: no DOM, no map)
buildJourney({event, locations, eventImages, html}) -> {stops, days, legs, bounds, photoDots, hasRoute}
// Stop: {id, n, name, lat, lng, ts|null, day, anchorKey|null, photos:[{src, caption, id}], source}
// data/dates.js
parseLocal(isoNaive)  toLocalISO(date)  formatRange(start, end)   // never toISOString
// map/index.js   (the dynamic import of maplibre lives inside these)
<WorldMap cards selectedId onSelect onOpen />
<JourneyMap journey activeStopId progress onStopSelect mode="inline|sticky|full" />
<RoutePoster journey activeStopId />                    // SVG, first paint and fallback
useJourneySync(journey, bodyRef) -> {activeStopId, progress, scrollToStop}
// create/
buildDraft(photos, opts) -> {title, days, stops, html, cover, start, end, place, category, summary}  // pure
<CreateFlow mode="story|sort" />
```

**Working rules,** as for the landing:
- Edit only your own folder.
- Do not run `npm run build`; build to a scratch `--outDir`.
- No git commands that change state.
- Stop servers when finished.
- Look at your own sheets before reporting.
- Ports: 5330 to 5335.

## 8. Risks and decisions for the owner

| # | Decision or risk | Recommended default |
|---|---|---|
| 1 | The landing and the app must flip together. The landing says "It is a flat map" and prints three map layers (`frontend/src/landing/content/film.js:116-121`, `content/facts.js:31`), three AI modes and five "AI actions a day". Its captures show the classic interface, and its small print says "a story is called an event". All of that changes when the new look goes live. | Update the landing's facts, copy and captures in the same release as the `next` flip, never before |
| 2 | The kit uploaded to today's app will not produce the story (section 0) | Do not upload it to production until the new flow is on (`optin`) |
| 3 | Signed-in previews may not work. The backend's allowed origins are a fixed list (`backend/app/core/config.py:44`), and the landing never exercised it. | Review on the sample preview first, then on production in `optin`; or add one preview address to `CORS_ORIGINS` |
| 4 | Free tile services have no SLA, and tile requests show a third party roughly which area a reader is viewing, as OSM, Esri and OpenTopoMap tiles do today | Start on the public instances with the style in our repo, so the source is one line. Move to PMTiles on the existing R2 bucket after the first outage, or if the owner wants no third party. |
| 5 | MapLibre 6 is four months old and releases weekly | Pin 6.19.0 exactly; fall back to 5.24.1 if a map scene fails |
| 6 | Dark theme retired in the new look | Yes; keep stored preferences untouched |
| 7 | The daily limit of 5 makes one full "photos, voice and questions" story the whole day's allowance | Approve B2. Until then, show the meter and never dead-end. |
| 8 | No more Quick Publish; every AI story is reviewed before it posts | Yes |
| 9 | Whose pins are on "your family's world". The feed lists every member's non-private stories (`backend/app/utils/privacy.py:173-221`). | Default the World view to "People I follow and me". Leave the feed's default as it is. |
| 10 | Per-photo GPS is not stored on stories made by the new flow without B4. Stops are, and photos belong to stops. | Accept for the first version; approve B4 later |
| 11 | Stories with more than 100 photos cannot be written by the default model in one call | Use the 40-photo cap now; B1 later |
| 12 | The two files `App.jsx` and `AppNext.jsx` could drift | The route check fails the build |
| 13 | Pages that are not redesigned will look bridged, not finished | Accept; list them for a second pass |
| 14 | Classic bugs found on the way: dates shifting a day east of Greenwich, Esri as the default layer, tilted stop numbers, mock stories shown on error | Leave classic untouched for the proof; decide separately on small fixes |
| 15 | iOS direction | Port `buildJourney` and `buildDraft` with shared test vectors, reuse the tokens and the story stylesheet, and choose MapKit or flat MapLibre for maps later |

### Critical Files for Implementation
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/vite.config.js
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/src/App.jsx
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/src/pages/EventDetail.jsx
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/backend/app/api/events.py
- /Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/scripts/landing/fixtures/api.mjs