# Our Family Socials landing page: build spec

Read all of this before writing code. Your own handover brief in `docs/landing/handover/` adds detail for your package; where they disagree, this file wins and you tell the director.

**Then read `docs/landing/ROUND2.md`.** It records the owner's review of the first build and changes the sample family, the stories, the film's order, the audience order and most headlines. Where ROUND2.md and this file differ, ROUND2.md wins.

Repo: `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude`, branch `landing/rebuild`. Frontend in `frontend/` (React 19, Vite 5, react-router 7, JavaScript, CSS Modules). Reference implementation to port from: `/Users/jpwilson/Documents/Projects/otherwise` (read `docs/BUILD.md`, `docs/handover/FILM.md`, `src/lib`, `src/ui`, `src/film`, `scripts/shots.mjs`; look at `shots/film-d/sheet.jpg` and `shots/film-m/sheet.jpg`).

## What we are building

A long, bright, scroll-driven landing page for Our Family Socials (OFS), a private family network whose unit is the **story**: a long written, illustrated, mapped chapter of a family's life, opened only by the audience its author picks. The owner's bar is the Otherwise page: full-screen colour per chapter, photoreal people popping in with weight, something to grab in the first two seconds, then a lot of specific, true information.

**The scroll moment:** scrolling plays one family's year. Each story builds itself around the family from their photos, a couple of minutes of talk and the places in the pictures, and then the relatives chosen for that story rise up to read it.

**The grab:** the audience switch. Five real settings; change it and the crowd around the family changes.

OFS is live with real users. Nothing here may change what the production site serves (see "Variant" below). The app, auth, billing and backend are out of scope.

## Owner's taste (non-negotiable)

- Bright, clear, colourful, daytime. Never dark or moody. Every screen obviously designed and obviously different from the last.
- Something to do in the first seconds. Plain button labels that say what happens.
- No cream-and-coral, no purple-to-blue gradients, no emoji as icons, no glows, no stacked glass.
- Every pop-up or drawer has a visible close control.

## Honesty rules (a builder who breaks these has failed the job)

1. Every number printed on the page comes from `frontend/src/landing/content/facts.js` through `fact(id)`. Never type a digit into copy.
2. Never invent a feature, limit, policy, testimonial, user count, press quote, award, guarantee, refund rule, discount or scarcity. If a sentence you want is not backed by this spec, leave it out and tell the director.
3. Audience copy says who can **open** a story, never who can "see" it. Reason: any signed-in member's feed lists the card (title, cover, place) of every story that is not Private.
4. People are AI-generated illustrations of a sample family. Screens are the real interface showing sample content. Both are said in small print where they first appear and in the footer.
5. In the app a story is called an event. The page says "story" and says so once.

**Never claim any of these (each is false in the code today):** a globe or 3D earth; filtering by place; "only people you follow appear in your feed" or "no strangers"; data export; deleting your account in settings; trash that empties itself; unlimited photos; a native or app-store app; push notifications; sharing by email; printed photo books; "you keep access until the end of the billing period"; "60 days free"; a free account that can follow new people after the trial; that following is mutual; any time AI takes; any count of users or families; "most popular".

## Look

One light look. All colours are tokens on `.ofsl` (never `:root`), prefixed `--l-`.

| Token | Value | Use |
|---|---|---|
| `--l-ink` | `#101B3B` | text, keylines (midnight, not black) |
| `--l-paper` | `#F4F7FB` | quiet bands |
| `--l-white` | `#FFFFFF` | cards, stickers, nav |
| `--l-line` | `rgba(16,27,59,.14)` | hairlines |
| `--l-mute` | `rgba(16,27,59,.66)` | secondary text |

Washes (`data-wash="tide"` sets `--l-wash`, `--l-wash-deep`; text is ink on every wash):

| Wash | `--l-wash` | `--l-wash-deep` (ghost word, floor) | Used by |
|---|---|---|---|
| `tide` | `#19CFC7` | `#0FB8B1` | Hero, finale opening, brand colour |
| `fizz` | `#FF62C4` | `#F247AF` | 01 TELL |
| `zest` | `#FF8A1F` | `#F27405` | 02 READ |
| `azure` | `#3AA8FF` | `#1F93F0` | 03 MAP |
| `lime` | `#C6F135` | `#AEDB1C` | 04 YEAR |
| `paper` | `#F4F7FB` | `#E3E9F2` | finale reveal, quiet bands |

Type, self-hosted (no request to Google at run time; woff2 under `frontend/public/landing/fonts/`, declared only in landing CSS):
- **Bricolage Grotesque** (variable): display and UI. Heads weight 800, `wdth` 86, line-height 0.94, tracking -0.03em. Buttons and nav 600. Body 400/500 at 17-18px / 1.55.
- **Literata** (variable): only for sample story text shown as a story (the long-form voice).
- **DM Mono** 500: instruments and labels, 11.5px, uppercase, tracking 0.12em, tabular numerals.
- Sizes: hero `clamp(44px, 7.6vw, 128px)`; section heads `clamp(34px, 5vw, 72px)`; ghost word `clamp(150px, 32vw, 560px)` at `wdth` 75, lowercase.

**The emphasised word is a sticker, not italic.** One word per headline sits on a white label: same face, rotated -2deg, 6px radius, 2px ink keyline, hard offset shadow `4px 4px 0 var(--l-ink)`. Written in content as `{ before, mark, after }` and rendered by `<Head>`.

Shape: 2px ink keylines and hard offset shadows on buttons, cards and readouts. Buttons 14px radius. Cards 20px. Readouts 12px. Photo prints have a 10px white border and a small rotation. The nav is a solid white keylined pill. Motion: entrances `cubic-bezier(0.16,1,0.3,1)` 600-800ms; pops `cubic-bezier(0.34,1.56,0.64,1)`; hovers 200ms. Scroll-driven motion is arithmetic on progress, never a CSS transition on a property the scroll writes. Icons are drawn SVG. The app's emoji appear only inside real captures.

Stage: every wash has a wall and, below a horizon at about 80% height, a floor in the deep colour. Cut-outs stand on the floor with an elliptical contact shadow. Without shadows they float.

## The sample family (all invented)

Household: **Maya** 38 (the mum), **Tom** 40, **Ivy** 9, **Leo** 5, **Biscuit** the terrier. Grandparents: **Nana Ruth** 68 (Tom's mother), **Grandpa Joe** 71 (Maya's father). Relatives: **Aunt Kate** 43 (Tom's sister), **Uncle Marcus** 35 (Maya's brother), **Finn** 14 (Kate's son). Friends: **Priya** 37, **Sam** 41, **Deb** 56.

Maya's followers are the eight non-household people. Close Family is Ruth, Joe, Kate, Marcus (4). Her Custom Group "Run club" is Sam, Priya, Deb (3). These counts are computed from `content/cast.js`, not typed.

Sample stories: "Six weeks without a kitchen" (February, Projects, audience Followers). "Dad's first marathon" (April, Milestones, Custom Group: Run club). "A week on the coast path" (August, Vacations, Followers). "Ivy turns nine" (October, Birthdays, Close Family). "Grandpa Joe at seventy" (December, Family Gatherings, Followers).

## Page order

| # | Export | Package | id | What it is |
|---|---|---|---|---|
| 0 | `Nav` | close | | Wordmark, links (How it works, What's in a story, Plans), `Log in`, `Start free` |
| 1 | `Film` | film | `lp-film` | Hero, four chapters, finale. One pinned sequence, about 1,700svh |
| 2 | `Difference` | explain | `lp-difference` | Why this is not social media |
| 3 | `How` | explain | `lp-how` | Four steps, a path that draws itself (pinned) |
| 4 | `Create` | explain | `lp-create` | AI Create and its three modes |
| 5 | `Import` | explain | `lp-import` | Smart Import: photos sort themselves into stories (pinned canvas) |
| 6 | `Anatomy` | proof | `lp-anatomy` | One real story page, taken apart (pinned) |
| 7 | `Places` | proof | `lp-places` | Journey map and world map |
| 8 | `Views` | proof | `lp-views` | Feed, calendar, map, timeline; categories and filters |
| 9 | `Audience` | proof | `lp-audience` | The matrix: exactly who can open what |
| 10 | `Family` | proof | `lp-family` | Family tree and tag profiles |
| 11 | `Limits` | close | `lp-limits` | What it does not do |
| 12 | `Compare` | close | `lp-compare` | Where the alternatives are better; links to the compare pages |
| 13 | `Plans` | close | `lp-plans` | The three plans, exactly as the code has them |
| 14 | `Questions` | close | `lp-questions` | FAQ |
| 15 | `Start` | close | `lp-start` | Final call to action |
| 16 | `Footer` | close | | Fitted wordmark, every existing link, small print |

Section ids are `lp-` prefixed and never reuse a route or an old hash. Old hashes `#features` and `#pricing` are mapped to `lp-difference` and `lp-plans` on mount.

## Fixed lines (copy these exactly; write the rest in the same voice)

Voice: plain, warm, specific. Short sentences. No hype words, no exclamation marks, no "not X, but Y" constructions, no em-dash asides. The marked word is in [brackets].

- H1 (one element, two spans): eyebrow `Our Family Socials: a private family social network`, display `The whole story, for the people you [choose].`
- Hero sub: Our Family Socials is a private, ad-free place where a family shares the long version: written stories with photo galleries, video and journey maps. You decide who can open each one.
- Hero buttons: `Start free` (to `/login?signup=true`) · `See how it works` (scrolls to chapter 01)
- Hero note (mono): `FREE TO VIEW, FOREVER · 30-DAY TRIAL · 5 STORIES IN THE TRIAL · NO CARD`
- Switch label: `WHO CAN OPEN THIS STORY` · options in this order, with the app's exact names: `Private`, `Custom Group`, `Close Family`, `Followers`, `Public`
- 01 TELL · eyebrow `STORY 01 · FEBRUARY · PROJECTS` · head: Add the photos. Then just [talk].
- 02 READ · `STORY 02 · APRIL · MILESTONES` · head: Some days deserve a whole [chapter].
- 03 MAP · `STORY 03 · AUGUST · VACATIONS` · head: Your photos already know [where].
- 04 YEAR · `STORY 04 · OCTOBER · BIRTHDAYS` · head: A year you can actually [find].
- Finale head: One place for the whole [year]. · line: Free to view, forever. Free to try for 30 days. $9 a month, billed yearly, to keep writing. · buttons `Start free`, `See the plans`
- Difference: Social media is built for an audience. This is built for your [family]. · positioning line: LinkedIn is for work. Instagram and X are for audiences. Our Family Socials is for the few people who already know your kids' names.
- How: From camera roll to family in [four] steps.
- Create: Three ways in. The fast one is [talking].
- Import: Drop in a few hundred photos. It finds the [stories].
- Anatomy: Everything that fits in one [story].
- Places: Every stop, every story, on one [map].
- Views: Four views of the same [year].
- Audience: Exactly who can open [what].
- Family: It knows who is [who].
- Limits: What it does not [do].
- Compare: Where the others are [better].
- Plans: Readers are free. Storytellers [pay].
- Questions: Fair [questions].
- Start: Start with one [story].
- Small print (footer and first appearance): The people on this page are AI-generated illustrations of a sample family, not customers. Screens are the real interface showing sample content. In the app, a story is called an event.

## Facts (F0 turns this table into `content/facts.js`; `src` is where it was verified)

| id | Value as printed | src |
|---|---|---|
| `audiences` | 5 | `frontend/src/components/PrivacySelector.jsx:38-69` |
| `audienceDefault` | Followers | `frontend/src/pages/CreateEvent.jsx:35` |
| `shareLinkDays` | 1 to 5 days | `backend/app/api/share_links.py:14-60` |
| `photosPro` | 300 | `backend/app/api/upload.py:338` |
| `photosTrial` | 50 | `backend/app/api/upload.py:338` |
| `videoSeconds` | 60 | `frontend/src/components/VideoTrimmer.jsx:95` |
| `videosPerStory` | 50 | `frontend/src/components/RichTextEditor.jsx:19-20` |
| `reactions` | 10 | `frontend/src/components/ImageGallery.jsx:19-30` |
| `replyLevels` | 3 | `frontend/src/pages/EventDetail.jsx:717` |
| `mapLayers` | 3 (Street, Satellite, Terrain) | `frontend/src/components/EventMap.jsx:18-30` |
| `views` | 4 (Feed, Calendar, Map, Timeline) | `frontend/src/components/ViewToggle.jsx:4-7` |
| `categories` | 8 | `frontend/src/components/CategorySelector.jsx:5-22` |
| `categoriesPerStory` | 2 | `frontend/src/components/CategorySelector.jsx:5-22` |
| `aiModes` | 3 (Quick Publish, AI Draft, AI Interview) | `frontend/src/components/QuickAddModal.jsx:688-710` |
| `aiPerDay` | 5 | `backend/app/api/ai_creator.py:22` |
| `importMax` | 300 | `frontend/src/pages/SmartImport.jsx:20` |
| `trialDays` | 30 | `backend/app/api/auth.py:238-252` |
| `trialStories` | 5 | `backend/app/api/events.py:320-331` |
| `ads` | 0 | no ad code in the repo |
| prices | read at build from `frontend/src/content/site.js:17-22`: Free to View $0, Pro $108 a year (shown as $9 a month) or $12 a month, Lifetime $294 once | |

Category display names, in order: Birthdays, Anniversaries, Vacations, Family Gatherings, Holidays, Projects, Daily Life, Milestones (plus your own).

True statements you may use (each verified in code):
- Audiences: Followers means people whose follow request you accepted. Close Family is a tick you set per follower. Custom Group is a named list you build from people you follow. Private is only you, unless you make a share link for it. Public opens for anyone with the link, signed in or not.
- The feed card (title, cover, place) of any story that is not Private is listed to signed-in members. Opening it follows the audience.
- A share link is a key you hand out yourself: it opens that one story for anyone who has the link, whatever the story's audience, without an account, and ends after 1 to 5 days.
- While an author's plan or trial is not active, other people cannot open that author's stories in the app. A share link already made keeps working until it ends.
- Reading is free forever in this sense: with no plan and no trial you can still open stories by people you follow and any Public story, and like and comment. You cannot publish or follow new people. (A reader with no plan cannot open a story from someone they do not follow, even as a member of that person's group.)
- Say nothing about what tagging someone does to who can open a story: the code is inconsistent about it.
- Story editor: headings, bold, italic, links, lists; photos and video clips inline, each with a caption; location markers. HEIC photos are accepted. Clips are trimmed to 60 seconds in the editor. Photos are stored resized, so keep your originals.
- The story page builds a contents list from your headings, and ends with a gallery of everything. The gallery opens full screen with a slideshow and zoom. Ten reactions on photos and on comments; the story itself takes a like. Replies nest three levels.
- You can tag people, including people with no account (a child, a grandparent, a pet), who can claim their profile later. Confirmed relationships build a family tree.
- GPS and the time taken are read from each photo in your browser before upload. Each located photo becomes a stop on the story's map. Stops are numbered and joined by a dashed line in order.
- The map view shows one pin per story and groups nearby pins; it zooms out to the whole world. It is a flat map.
- The feed is ordered by date (the date posted or the date it happened, your choice). Nothing is ranked. Filters: person, category, date range. You can mute someone.
- AI Create: you add photos or clips and type or speak a description; it returns a title, a story with section headings, a caption per photo, a category and a place. AI Draft and AI Interview show you the draft to edit before publishing; Quick Publish posts it straight away. It is labelled Beta. It needs Pro or the trial. AI-made stories are published to Followers; you can change the audience by editing the story.
- Smart Import: choose up to 300 photos; the time and place of each are read on your device, and only those details (no images) are sent to be grouped into albums. No photo is uploaded until you pick an album. It needs Pro or the trial.
- Email: a follow request, a new comment on your story, a new story from someone you follow.
- It installs to a phone's home screen from the browser. There is no app-store app.
- The trial is 30 days with no card and allows 5 published stories and 50 photos or videos per story.

## Architecture

```
frontend/landing.config.json            {"production":"classic","preview":"story"}
frontend/index.html                     + inline boot script after <!-- SEO:END -->
frontend/vite.config.js                 + variant define, build.manifest, workbox globIgnores ['landing/**']
frontend/vite.landing-ssr.config.js     server build of src/landing/entry-server.jsx
frontend/scripts/prerender.mjs          + story-variant branch for "/"
frontend/scripts/landing/               variant.mjs, shots.mjs, capture-ui.mjs, check-facts.mjs, fixtures/
frontend/public/landing/                img/*.webp, ui/*.webp, fonts/*.woff2
frontend/src/main.jsx                   becomes a tiny bootstrap
frontend/src/boot-app.jsx               today's main.jsx body, unchanged
frontend/src/App.jsx                    only RootRedirect changes
frontend/src/landing/
  Page.jsx  entry-client.jsx  entry-server.jsx
  styles/{tokens,base,fonts}.css        every selector starts .ofsl or html[data-boot]
  lib/{scroll,math,analytics}.js
  ui/                                   primitives, each with a .module.css
  art/{manifest.json,manifest.js}
  content/{facts,cast,routes,seo}.js    + one file per package
  film/  explain/  proof/  close/  dev/Only.jsx
landing-art/                            prompts/, ref/, raw/ (gitignored), process.mjs, sheets.mjs
docs/landing/                           this file, handover/*.md
```

**Variant.** `scripts/landing/variant.mjs` resolves `VITE_LANDING` if set, else `production` from the config when `VERCEL_ENV === 'production'`, else `preview`. So previews and local builds show the new page ("story") and production keeps today's page ("classic") even after a merge. Going live is a one-line change to `landing.config.json`. In the classic variant the built site must behave as it does today.

**Bootstrap.** An inline script in `index.html` sets `data-boot` on `<html>` to `landing` only when the variant is story, the path is `/`, there is no session hint in localStorage (a key `token`, or one matching `sb-*-auth-token`) and the URL carries no auth parameters; otherwise `app`. `main.jsx` then dynamically imports either `landing/entry-client.jsx` or `boot-app.jsx`. A signed-out visitor to `/` never downloads the app. Inside the app, `RootRedirect` lazy-loads `landing/Page.jsx` for the story variant when there is no user. The landing uses plain `<a href>` links and no router or auth hooks, so it works in both places.

**Prerender.** In the story variant `/` is rendered from the real React page to a string and placed in `#root`; the client hydrates. All copy is therefore real text in the static HTML. Rules that follow: no `window`, `document`, `localStorage`, `matchMedia`, dates or random values at module scope or during render; effects only. The static landing markup is hidden by CSS when `data-boot="app"`, so `/feed` and `/login` never flash it. `npm run seo:check` must pass: exactly one `<h1>`, title, description and canonical unchanged, JSON-LD kept, every compare page linked with a plain anchor.

**Poster-first film.** Each chapter is a real `<section>` whose CSS alone draws its finished poster (every actor at its hold position, from CSS variables with a desktop set and a phone set). Three modes: pinned (script on, motion allowed: scenes stack in one sticky viewport and the engine animates arrivals and exits around the poster); poster (reduced motion: a column of posters, the switch still works); flow (no script: the same column). First paint, crawlers and reduced-motion visitors all get complete posters.

**Isolation.** Landing CSS never contains a bare element selector. The app's global CSS (`frontend/src/styles/index.css`) is not on the page in the standalone boot; when the landing renders inside the app it must still look right, so `.ofsl` sets its own background, font, link and focus rules. Page-level effects hang off `html.ofsl-on`, added on mount and removed on unmount. Lenis is destroyed on unmount.

**Images.** WebP only, under `frontend/public/landing/`, content-hashed names, two sizes, listed in `art/manifest.json` with `w`, `h`, `kind`, and for people `feet`, `headTop`, `ax`. A missing id renders a labelled placeholder and logs once; it never crashes. Excluded from the service-worker precache. First screen under 400KB of images.

**Analytics.** `lib/analytics.js` loads Vercel Analytics and PostHog after idle with the app's own privacy settings, and exports `track(name, props)`, safe to call before it loads.

## Contracts (F0 creates these; signatures are frozen)

```js
// lib/scroll.js
startScroll() -> stop      // reference-counted; Lenis lerp 0.09; no smoothing under reduced motion
onFrame(fn({scrollY, vh, vw, time})) -> unsubscribe
stageProgress(el) -> 0..1  // across a tall stage whose child is position: sticky
scrollToId(id, {offset, immediate})   scrollToY(y, {immediate})   setScrollLocked(bool)
prefersReducedMotion() -> bool
// lib/math.js
clamp, lerp, invLerp, remap, smoothstep, easeOutCubic, easeInOutCubic, easeOutBack, win(p, a, b)
// art/manifest.js
art(id) -> {id, src, srcM, w, h, kind, alpha, feet, headTop, ax}   maybeArt(id)   hasArt(id)
// content/facts.js
fact(id) -> string         FACTS (with src)        PRICES (from src/content/site.js)
// content/routes.js
ROUTES.signup '/login?signup=true', .login '/login', .pricing, .faq, .features, .about, .alternatives, .compare[...], .privacy, .terms, .contact
// lib/analytics.js
track(name, props)
// ui/
<Head as="h2" before mark after />      <Sticker>word</Sticker>
<Button variant="solid|ghost" size="md|lg" href onClick />
<Label>MONO</Label>   <Readout label value note />   <GhostWord>tell</GhostWord>
<Cutout id alt className style />       <Shot id alt caption />   // real capture with its mandatory caption
<Print id caption tilt />               <Device id />             // phone frame holding a capture
<Section id wash tone="wash|paper|white" />   <Stage id svh />    <Reveal delay />
<AudienceSwitch value onChange />       // the hero's control, reusable
<Stub name />
```

Each package exports its sections from `src/landing/<pkg>/index.js` under the names in "Page order", and its static copy from `content/<pkg>.js` as plain data (no JSX, no browser globals).

## Working rules

- Node 22: `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`. Lenis is the only new runtime dependency. No animation, chart or 3D libraries; draw in SVG, canvas or CSS.
- Scroll never goes through React state. Stages read progress in `onFrame` and write styles through refs. Find elements by `data-f` attributes, not class names.
- Phone (390 wide) is a designed layout with its own slots, not a squeezed desktop. No sideways scroll at 390, 768, 1280, 1920. Floating props keep clear of headlines, readouts and the nav (top 80px).
- No scroll-driven oscillation faster than one cycle per 25svh.
- `prefers-reduced-motion`, visible keyboard focus, real buttons and links.
- Edit only files your package owns. Do not touch app pages or components. Do not commit, push or run git commands that change state; the director does that.
- Do not leave servers running. Dev ports: f0 5320, film 5321, explain 5322, proof 5323, close 5324, capture 5325.
- Before you report: `cd frontend && npm run build` passes, and you have looked at your own work in real screenshots (`scripts/landing/shots.mjs`, 1440x900 and 390x844) and fixed what looked wrong. Report: files written, what you verified, what you could not verify, what is still placeholder, what looks weak to you.
- Playwright lives at `/Users/jpwilson/Documents/Projects/jpw-ops/node_modules` (see how `otherwise/scripts/shots.mjs` loads it). Do not install it.
