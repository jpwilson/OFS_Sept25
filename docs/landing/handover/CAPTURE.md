# CAPTURE handover: real screens of the real interface, with the sample family

You own `frontend/scripts/landing/capture-ui.mjs`, `frontend/scripts/landing/fixtures/**` and `frontend/public/landing/ui/**`, and you add `kind: "ui"` entries to `frontend/src/landing/art/manifest.json` (add only; never edit another builder's entries). Read `docs/landing/SPEC.md` first (sample family, sample stories, honesty rules).

## Why this exists

The landing page promises "real screenshots of the real UI". The interface on the page must be the actual OFS app rendering sample content, not a mock-up. It must not show any real user's photos or data, and nothing you do may touch production.

## Method

Run the real app locally and answer every network call yourself.

1. Start the dev server on port 5325 with the API pointed at a dead address so a missed route cannot reach production: `VITE_API_URL=http://127.0.0.1:59999 npx vite --port 5325 --strictPort`. Stop it when you finish.
2. Drive it with Playwright (load it as `/Users/jpwilson/Documents/Projects/otherwise/scripts/shots.mjs` does). Block service workers.
3. Sign in with a stub session. `fixtures/example-signed-in-session.mjs` is a script that already does this against this app: it puts a fake Supabase session in `localStorage` under `sb-vrquvdzoelvmwsxixqkt-auth-token`, answers `supabase.co/auth/v1/user`, and answers `/api/v1/users/me`. Use that path. The older `localStorage.token` path does not survive: the Supabase client fires an empty initial session and the app logs the user out.
4. Answer every `**/api/v1/**` request from fixture JSON with `page.route`. Shape each response from what the frontend actually reads (`frontend/src/services/api.js`, the page components) and the backend schemas (`backend/app/schemas/`). Log any request you did not answer; the run fails if one is unanswered.
5. Media: fixture image URLs point at the processed sample photos under `/landing/img/` (see `src/landing/art/manifest.json`, kinds `photo` and `plate`, and the `cover-*` crops). Avatars for the cast: crop faces from `landing-art/ref/cast-a.png` and `cast-b.png` into `fixtures/avatars/` and serve them by route.
6. Abort every other host (PostHog, Vercel, Cloudinary, DiceBear, Unsplash) except map tiles. Use the **Street** layer for maps (OpenStreetMap; keep its credit visible in the capture). Do not capture the Satellite layer.
7. For the voice-recording state, launch Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`.
8. Take element screenshots (not full pages unless listed), at device scale factor 2 for desktop (1440x900) and 3 for phone (390x844), save as WebP under `frontend/public/landing/ui/<id>.<hash8>.webp` with a phone-size copy `.m.webp` (long edge 900), and add manifest entries `{ src, srcM, w, h, kind: "ui", alpha: false }`.

Theme: capture everything in the app's **light** theme (set `localStorage.theme = 'light'`; confirm how the header applies it). Also capture `ui-feed-d`, `ui-story-head` and `ui-lightbox` in dark as `<id>-dark`, so the director can compare.

## The sample content (write it into fixtures; it is shown to visitors, so write it well)

Signed-in user: Maya. Everyone in SPEC's cast exists as a user with a name, username and avatar; Maya follows and is followed per SPEC (close family ticked for Ruth, Joe, Kate, Marcus; custom group "Run club" with Sam, Priya, Deb).

Five stories by the household, with SPEC's titles, months, categories and audiences. Each has: a cover (`cover-*`), a summary, a location, dates in 2026, and a real story body as the app stores it (rich-text HTML with H1 section headings and H2 sub-headings so the Contents panel fills, paragraphs, inline images with captions, and for the race story one inline video). Write each as a family member would: warm, specific, a little funny, 500 to 900 words for the kitchen, race and coast stories, shorter for the other two. No brand names. Use the matching `photo-*` images with a caption each.

- **A week on the coast path** (Maya): a real walkable route so the journey map is true to life. Stops in order with real coordinates: St Ives harbour, Zennor Head, Pendeen lighthouse, Botallack mine, Sennen Cove, Porthcurno. Photos: `photo-coast-harbour`, `-cliff`, `-mine`, `-beach`, `-van`, `-theatre`.
- **Six weeks without a kitchen** (Maya): sections Before, The rip-out, Living on a camping stove, Tiles and paint, The first pancakes.
- **Dad's first marathon** (Tom): sections The start, The wall, The people who came, The line.
- **Ivy turns nine** (Maya) and **Grandpa Joe at seventy** (Tom).

Four stories by relatives, for the world map and the feed, each with a cover (`photo-trip-*`) and a location: Grandpa Joe, Funchal, Madeira; Aunt Kate, Ben Nevis; Uncle Marcus, Osaka; Nana Ruth, the ferry to Mull.

Comments and reactions from named cast members on each story (two or three threads, one with a reply), per-photo reactions on a few photos, and a few tags (Ivy, Leo; "Biscuit" as a tag profile with no account).

## The captures (ids are final)

| Area | id | What to capture |
|---|---|---|
| Feed | `ui-feed-d`, `ui-feed-m` | The feed view with the nine stories, desktop and phone |
| | `ui-card-kitchen`, `ui-card-race`, `ui-card-coast`, `ui-card-year`, `ui-card-joe70` | One feed card each, as it looks with its title showing (hover or tapped state) |
| Views | `ui-calendar`, `ui-worldmap`, `ui-timeline` | Each view, phone size; the map zoomed to show all nine pins with at least one cluster |
| | `ui-worldmap-d` | The map view, desktop |
| | `ui-viewtoggle`, `ui-filters` | The view toggle; the filter row with the category chips open |
| Story | `ui-story-d` | The whole coast story page, desktop, full height (one tall image) |
| | `ui-story-head`, `ui-story-toc`, `ui-story-text`, `ui-story-journey`, `ui-story-gallery`, `ui-story-comments` | Its parts: cover and title block; Contents panel; a section of text with an inline captioned photo; the journey map with numbered stops and the dashed line; the gallery grid; the comments with a reply thread |
| | `ui-lightbox` | The gallery lightbox open on a race photo with its caption and the reaction picker showing |
| | `ui-story-race-m` | The race story page top, phone |
| Creating | `ui-quickadd-modes` | The Quick Add modal on AI Create showing the three modes |
| | `ui-quickadd-input`, `ui-quickadd-recording`, `ui-quickadd-review` | With six kitchen photos added; while recording; the AI Draft review with the kitchen story (answer the generate call from your fixture) |
| | `ui-import-drop`, `ui-import-albums` | Smart Import: the drop screen; the album cards after clustering (answer the cluster call from a fixture built with the real response shape) |
| | `ui-editor` | The full Create page editor with its toolbar and a captioned image |
| Sharing | `ui-privacy` | The "Who can see this event?" selector with all five options |
| | `ui-category`, `ui-share`, `ui-groups` | The category selector; the share-link modal with the day chips; the Sharing page showing followers with Close Family ticks and the Run club group |
| Family | `ui-profile`, `ui-tree` | Maya's profile; the family tree with the cast |

If a screen cannot be reached with stubs, say exactly why in your report; do not fake it and do not edit app code to make it reachable.

## Checks

- Build one contact sheet of all captures (`fixtures/sheet.jpg`) and look at it. Reject any capture with a broken image, a loading skeleton, an error toast, placeholder avatar initials where a face should be, cut-off content, or anything that is not sample data.
- Confirm from the request log that no request left the machine except map tiles.
- List every string in the captures that states a number or a claim (for example a plan badge) so the director can check it.

You depend on the sample photos. If `manifest.json` does not yet list the `photo-*` ids, write the fixtures and the script against the ids and run once they land; the director will tell you when.

Report: the sheet path, every capture made and any not made with the reason, the three dark comparisons, the request-log summary, and anything that looked wrong in the app itself while you were in it (bugs are useful to know about; do not fix them).
